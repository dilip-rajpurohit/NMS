const logger = require('../utils/logger');
const express = require('express');
const Device = require('../models/Device');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all alerts with filtering and pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      severity, 
      acknowledged = 'all', 
      deviceId,
      page = 1, 
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    // Build aggregation pipeline
    const pipeline = [
      { $match: {} },
      { $unwind: '$alerts' },
      {
        $match: {
          ...(severity && { 'alerts.severity': severity }),
          ...(acknowledged !== 'all' && { 
            'alerts.acknowledged': acknowledged === 'true' 
          }),
          ...(deviceId && { '_id': require('mongoose').Types.ObjectId(deviceId) })
        }
      },
      {
        $project: {
          alertId: '$alerts._id',
          deviceId: '$_id',
          deviceName: '$name',
          deviceIp: '$ipAddress',
          deviceType: '$deviceType',
          type: '$alerts.type',
          severity: '$alerts.severity',
          message: '$alerts.message',
          timestamp: '$alerts.timestamp',
          acknowledged: '$alerts.acknowledged',
          acknowledgedBy: '$alerts.acknowledgedBy',
          resolvedAt: '$alerts.resolvedAt'
        }
      },
      { $sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 } },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) }
    ];

    const alerts = await Device.aggregate(pipeline);
    
    // Get total count
    const countPipeline = [
      { $match: {} },
      { $unwind: '$alerts' },
      {
        $match: {
          ...(severity && { 'alerts.severity': severity }),
          ...(acknowledged !== 'all' && { 
            'alerts.acknowledged': acknowledged === 'true' 
          }),
          ...(deviceId && { '_id': require('mongoose').Types.ObjectId(deviceId) })
        }
      },
      { $count: 'total' }
    ];
    
    const countResult = await Device.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Get alert statistics
    const statsResult = await Device.aggregate([
      { $match: {} },
      { $unwind: '$alerts' },
      {
        $group: {
          _id: null,
          totalAlerts: { $sum: 1 },
          criticalAlerts: { 
            $sum: { $cond: [{ $eq: ['$alerts.severity', 'critical'] }, 1, 0] }
          },
          warningAlerts: { 
            $sum: { $cond: [{ $eq: ['$alerts.severity', 'warning'] }, 1, 0] }
          },
          infoAlerts: { 
            $sum: { $cond: [{ $eq: ['$alerts.severity', 'info'] }, 1, 0] }
          },
          acknowledgedAlerts: { 
            $sum: { $cond: ['$alerts.acknowledged', 1, 0] }
          },
          unacknowledgedAlerts: { 
            $sum: { $cond: [{ $not: '$alerts.acknowledged' }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      alerts,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      },
      statistics: statsResult[0] || {
        totalAlerts: 0,
        criticalAlerts: 0,
        warningAlerts: 0,
        infoAlerts: 0,
        acknowledgedAlerts: 0,
        unacknowledgedAlerts: 0
      }
    });

  } catch (error) {
    logger.error('Get alerts error:', error);
    res.status(500).json({
      error: 'Failed to fetch alerts',
      message: error.message
    });
  }
});

// Acknowledge multiple alerts
router.post('/acknowledge', authenticateToken, async (req, res) => {
  try {
    const { alertIds, deviceIds, acknowledgedBy, bulkAcknowledgeAll } = req.body;
    
    if (!alertIds && !deviceIds && !bulkAcknowledgeAll) {
      return res.status(400).json({ 
        error: 'Either alertIds, deviceIds, or bulkAcknowledgeAll must be provided' 
      });
    }

    let updateResult;
    
    // Handle bulk acknowledge ALL alerts
    if (bulkAcknowledgeAll) {
      logger.info('🧹 Bulk acknowledging ALL unacknowledged alerts...');
      updateResult = await Device.updateMany(
        { 'alerts.acknowledged': false },
        {
          $set: {
            'alerts.$[alert].acknowledged': true,
            'alerts.$[alert].acknowledgedBy': acknowledgedBy || req.user.username,
            'alerts.$[alert].acknowledgedAt': new Date()
          }
        },
        {
          arrayFilters: [{ 'alert.acknowledged': false }]
        }
      );
      
      logger.info(`✅ Bulk acknowledged ALL alerts - Modified ${updateResult.modifiedCount} devices`);
    } else if (alertIds && alertIds.length > 0) {
      // Acknowledge specific alerts
      updateResult = await Device.updateMany(
        { 'alerts._id': { $in: alertIds } },
        { 
          $set: { 
            'alerts.$.acknowledged': true,
            'alerts.$.acknowledgedBy': acknowledgedBy || req.user.username,
            'alerts.$.acknowledgedAt': new Date()
          }
        }
      );
    } else if (deviceIds && deviceIds.length > 0) {
      // Acknowledge all alerts for specific devices
      updateResult = await Device.updateMany(
        { _id: { $in: deviceIds } },
        { 
          $set: { 
            'alerts.$[].acknowledged': true,
            'alerts.$[].acknowledgedBy': acknowledgedBy || req.user.username,
            'alerts.$[].acknowledgedAt': new Date()
          }
        }
      );
    }

    // Emit real-time update
    const io = req.app.get('socketio');
    if (io) {
      io.emit('alerts-acknowledged', {
        alertIds,
        deviceIds,
        acknowledgedBy: acknowledgedBy || req.user.username,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      message: 'Alerts acknowledged successfully',
      modifiedCount: updateResult.modifiedCount,
      acknowledgedBy: acknowledgedBy || req.user.username
    });

  } catch (error) {
    logger.error('Acknowledge alerts error:', error);
    res.status(500).json({
      error: 'Failed to acknowledge alerts',
      message: error.message
    });
  }
});

// Create custom alert
router.post('/custom', authenticateToken, async (req, res) => {
  try {
    const { deviceId, type, severity, message, autoResolve = false } = req.body;
    
    if (!deviceId || !type || !severity || !message) {
      return res.status(400).json({
        error: 'Device ID, type, severity, and message are required'
      });
    }

    const device = await Device.findById(deviceId);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const alert = {
      type,
      severity,
      message,
      timestamp: new Date(),
      acknowledged: false,
      createdBy: req.user.username,
      autoResolve
    };

    device.alerts.push(alert);
    await device.save();

    // Emit real-time alert
    const io = req.app.get('socketio');
    if (io) {
      io.emit('new-alert', {
        ...alert,
        deviceId: device._id,
        deviceName: device.name,
        deviceIp: device.ipAddress
      });
    }

    res.status(201).json({
      message: 'Custom alert created successfully',
      alert,
      device: {
        id: device._id,
        name: device.name,
        ipAddress: device.ipAddress
      }
    });

  } catch (error) {
    logger.error('Create custom alert error:', error);
    res.status(500).json({
      error: 'Failed to create custom alert',
      message: error.message
    });
  }
});

// Auto-resolve alerts
router.post('/auto-resolve', authenticateToken, async (req, res) => {
  try {
    const { criteria } = req.body;
    
    // Default criteria: resolve info alerts older than 24 hours
    const defaultCriteria = {
      severity: 'info',
      olderThan: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      acknowledged: true
    };
    
    const resolveCriteria = { ...defaultCriteria, ...criteria };
    const cutoffTime = new Date(Date.now() - resolveCriteria.olderThan);

    const updateFilter = {
      'alerts.severity': resolveCriteria.severity,
      'alerts.timestamp': { $lt: cutoffTime },
      'alerts.resolvedAt': { $exists: false }
    };

    if (resolveCriteria.acknowledged !== undefined) {
      updateFilter['alerts.acknowledged'] = resolveCriteria.acknowledged;
    }

    const updateResult = await Device.updateMany(
      updateFilter,
      {
        $set: {
          'alerts.$[elem].resolvedAt': new Date(),
          'alerts.$[elem].resolvedBy': 'auto-resolver'
        }
      },
      {
        arrayFilters: [{
          'elem.severity': resolveCriteria.severity,
          'elem.timestamp': { $lt: cutoffTime },
          'elem.resolvedAt': { $exists: false }
        }]
      }
    );

    res.json({
      message: 'Auto-resolve completed',
      criteria: resolveCriteria,
      resolvedCount: updateResult.modifiedCount
    });

  } catch (error) {
    logger.error('Auto-resolve alerts error:', error);
    res.status(500).json({
      error: 'Failed to auto-resolve alerts',
      message: error.message
    });
  }
});

// Get alert trends and analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Calculate time range
    const periodMap = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const timeRange = periodMap[period] || periodMap['7d'];
    const startTime = new Date(Date.now() - timeRange);

    // Alerts by severity over time
    const alertTrends = await Device.aggregate([
      { $match: {} },
      { $unwind: '$alerts' },
      { $match: { 'alerts.timestamp': { $gte: startTime } } },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$alerts.timestamp'
              }
            },
            severity: '$alerts.severity'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Top devices by alert count
    const topDevices = await Device.aggregate([
      { $match: {} },
      {
        $project: {
          name: 1,
          ipAddress: 1,
          deviceType: 1,
          alertCount: { $size: '$alerts' },
          criticalAlerts: {
            $size: {
              $filter: {
                input: '$alerts',
                cond: { $eq: ['$$this.severity', 'critical'] }
              }
            }
          }
        }
      },
      { $sort: { alertCount: -1 } },
      { $limit: 10 }
    ]);

    // Alert types distribution
    const alertTypes = await Device.aggregate([
      { $match: {} },
      { $unwind: '$alerts' },
      { $match: { 'alerts.timestamp': { $gte: startTime } } },
      {
        $group: {
          _id: '$alerts.type',
          count: { $sum: 1 },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $ne: ['$alerts.resolvedAt', null] },
                {
                  $subtract: ['$alerts.resolvedAt', '$alerts.timestamp']
                },
                null
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      period,
      timeRange: {
        start: startTime,
        end: new Date()
      },
      trends: alertTrends,
      topDevices,
      alertTypes,
      summary: {
        totalAlerts: alertTrends.reduce((sum, item) => sum + item.count, 0),
        avgAlertsPerDay: alertTrends.length > 0 ? 
          alertTrends.reduce((sum, item) => sum + item.count, 0) / 
          Math.max(1, new Set(alertTrends.map(item => item._id.date)).size) : 0
      }
    });

  } catch (error) {
    logger.error('Alert analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch alert analytics',
      message: error.message
    });
  }
});

// Export alerts to CSV
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { format = 'csv', severity, acknowledged, days = 30 } = req.query;
    
    const startDate = new Date(Date.now() - (parseInt(days) * 24 * 60 * 60 * 1000));
    
    const pipeline = [
      { $match: {} },
      { $unwind: '$alerts' },
      {
        $match: {
          'alerts.timestamp': { $gte: startDate },
          ...(severity && { 'alerts.severity': severity }),
          ...(acknowledged !== undefined && { 
            'alerts.acknowledged': acknowledged === 'true' 
          })
        }
      },
      {
        $project: {
          deviceName: '$name',
          deviceIp: '$ipAddress',
          deviceType: '$deviceType',
          alertType: '$alerts.type',
          severity: '$alerts.severity',
          message: '$alerts.message',
          timestamp: '$alerts.timestamp',
          acknowledged: '$alerts.acknowledged',
          acknowledgedBy: '$alerts.acknowledgedBy',
          resolvedAt: '$alerts.resolvedAt'
        }
      },
      { $sort: { timestamp: -1 } }
    ];

    const alerts = await Device.aggregate(pipeline);

    if (format === 'csv') {
      const csvHeader = 'Device Name,Device IP,Device Type,Alert Type,Severity,Message,Timestamp,Acknowledged,Acknowledged By,Resolved At\n';
      const csvData = alerts.map(alert => [
        alert.deviceName,
        alert.deviceIp,
        alert.deviceType,
        alert.alertType,
        alert.severity,
        `"${alert.message.replace(/"/g, '""')}"`,
        alert.timestamp.toISOString(),
        alert.acknowledged,
        alert.acknowledgedBy || '',
        alert.resolvedAt ? alert.resolvedAt.toISOString() : ''
      ].join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=alerts_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvHeader + csvData);
    } else {
      res.json({
        alerts,
        metadata: {
          exportDate: new Date().toISOString(),
          filters: { severity, acknowledged, days },
          totalRecords: alerts.length
        }
      });
    }

  } catch (error) {
    logger.error('Export alerts error:', error);
    res.status(500).json({
      error: 'Failed to export alerts',
      message: error.message
    });
  }
});

// Acknowledge a specific alert
router.put('/:alertId/acknowledge', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.params;
    const acknowledgedBy = req.user.username || 'unknown';

    // Find the device containing this alert and update it
    const updateResult = await Device.updateOne(
      { 'alerts._id': alertId },
      {
        $set: {
          'alerts.$.acknowledged': true,
          'alerts.$.acknowledgedBy': acknowledgedBy,
          'alerts.$.acknowledgedAt': new Date()
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Emit real-time update
    const io = req.app.get('socketio');
    if (io) {
      io.emit('alert-acknowledged', {
        alertId,
        acknowledgedBy,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      message: 'Alert acknowledged successfully',
      alertId,
      acknowledgedBy
    });

  } catch (error) {
    logger.error('Acknowledge single alert error:', error);
    res.status(500).json({
      error: 'Failed to acknowledge alert',
      message: error.message
    });
  }
});

// Simple bulk acknowledge all unacknowledged alerts
router.post('/bulk-acknowledge', authenticateToken, async (req, res) => {
  try {
    const acknowledgedBy = req.user.username || 'unknown';
    
    // Simply acknowledge ALL unacknowledged alerts
    const result = await Device.updateMany(
      { 'alerts.acknowledged': false },
      {
        $set: {
          'alerts.$[alert].acknowledged': true,
          'alerts.$[alert].acknowledgedBy': acknowledgedBy,
          'alerts.$[alert].acknowledgedAt': new Date()
        }
      },
      {
        arrayFilters: [{ 'alert.acknowledged': false }]
      }
    );

    logger.info(`Bulk acknowledged ALL alerts - Modified ${result.modifiedCount} devices`);

    res.json({
      success: true,
      message: 'All alerts acknowledged successfully',
      modifiedDevices: result.modifiedCount,
      acknowledgedBy
    });

  } catch (error) {
    logger.error('Bulk acknowledge alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk acknowledge alerts',
      message: error.message
    });
  }
});

// Resolve a specific alert
router.put('/:alertId/resolve', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.params;
    const resolvedBy = req.user.username || 'unknown';

    // Find the device containing this alert and update it
    const updateResult = await Device.updateOne(
      { 'alerts._id': alertId },
      {
        $set: {
          'alerts.$.resolvedAt': new Date(),
          'alerts.$.resolvedBy': resolvedBy,
          'alerts.$.acknowledged': true,
          'alerts.$.acknowledgedBy': resolvedBy,
          'alerts.$.acknowledgedAt': new Date()
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Emit real-time update
    const io = req.app.get('socketio');
    if (io) {
      io.emit('alert-resolved', {
        alertId,
        resolvedBy,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      message: 'Alert resolved successfully',
      alertId,
      resolvedBy
    });

  } catch (error) {
    logger.error('Resolve alert error:', error);
    res.status(500).json({
      error: 'Failed to resolve alert',
      message: error.message
    });
  }
});

// Delete a specific alert
router.delete('/:alertId', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.params;

    // Find the device containing this alert and remove it
    const updateResult = await Device.updateOne(
      { 'alerts._id': alertId },
      {
        $pull: { alerts: { _id: alertId } }
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Emit real-time update
    const io = req.app.get('socketio');
    if (io) {
      io.emit('alert-deleted', {
        alertId,
        deletedBy: req.user.username || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      message: 'Alert deleted successfully',
      alertId
    });

  } catch (error) {
    logger.error('Delete alert error:', error);
    res.status(500).json({
      error: 'Failed to delete alert',
      message: error.message
    });
  }
});

// Lightweight endpoint for real-time alert statistics
router.get('/live', authenticateToken, async (req, res) => {
  try {
    // Get alert counts by severity
    const alertStats = await Device.aggregate([
      { $match: { alerts: { $exists: true, $ne: [] } } },
      { $unwind: '$alerts' },
      { $group: { 
          _id: '$alerts.severity', 
          count: { $sum: 1 },
          unacknowledged: { $sum: { $cond: [{ $eq: ['$alerts.acknowledged', false] }, 1, 0] } }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Format alert statistics
    const stats = {
      total: 0,
      critical: 0,
      warning: 0,
      info: 0,
      acknowledged: 0,
      unacknowledged: 0
    };

    alertStats.forEach(stat => {
      stats.total += stat.count;
      stats.unacknowledged += stat.unacknowledged;
      stats.acknowledged += (stat.count - stat.unacknowledged);
      
      switch(stat._id) {
        case 'critical': stats.critical = stat.count; break;
        case 'warning': stats.warning = stat.count; break;
        case 'info': stats.info = stat.count; break;
      }
    });

    // Get recent alerts (last 24 hours)
    const recentAlerts = await Device.aggregate([
      { $match: { alerts: { $exists: true, $ne: [] } } },
      { $unwind: '$alerts' },
      { $match: { 'alerts.timestamp': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
      { $sort: { 'alerts.timestamp': -1 } },
      { $limit: 10 },
      { $project: {
          _id: '$alerts._id',
          type: '$alerts.type',
          message: '$alerts.message',
          severity: '$alerts.severity',
          timestamp: '$alerts.timestamp',
          deviceName: '$name',
          acknowledged: '$alerts.acknowledged'
      }}
    ]);

    res.json({
      stats,
      recentAlerts,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Live alerts error:', error);
    res.status(500).json({
      error: 'Failed to fetch live alert data',
      message: error.message
    });
  }
});

// Manual alert check trigger (for testing)
router.post('/trigger-check', authenticateToken, async (req, res) => {
  try {
    const alertService = require('../services/alertService');
    const result = await alertService.triggerChecks();
    
    res.json({
      message: 'Alert checks triggered successfully',
      ...result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Manual alert trigger error:', error);
    res.status(500).json({
      error: 'Failed to trigger alert checks',
      message: error.message
    });
  }
});

// Bulk acknowledge all unacknowledged alerts - FINAL ROUTE
router.post('/clear-all-alerts', authenticateToken, async (req, res) => {
  try {
    const acknowledgedBy = req.user.username || 'unknown';
    
    // Simply acknowledge ALL unacknowledged alerts
    const result = await Device.updateMany(
      { 'alerts.acknowledged': false },
      {
        $set: {
          'alerts.$[alert].acknowledged': true,
          'alerts.$[alert].acknowledgedBy': acknowledgedBy,
          'alerts.$[alert].acknowledgedAt': new Date()
        }
      },
      {
        arrayFilters: [{ 'alert.acknowledged': false }]
      }
    );

    logger.info(`✅ CLEARED ALL ALERTS - Modified ${result.modifiedCount} devices`);

    res.json({
      success: true,
      message: `Successfully cleared all alerts from ${result.modifiedCount} devices`,
      modifiedDevices: result.modifiedCount,
      acknowledgedBy,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ Clear all alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear all alerts',
      message: error.message
    });
  }
});

module.exports = router;