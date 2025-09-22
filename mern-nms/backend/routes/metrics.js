const express = require('express');
const Device = require('../models/Device');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get device metrics
router.get('/devices/:deviceId', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { timeRange = '1h' } = req.query;

    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Return real device metrics
    const deviceMetrics = {
      deviceId,
      deviceName: device.name,
      ipAddress: device.ipAddress,
      timeRange,
      status: device.status,
      lastSeen: device.metrics?.lastSeen,
      responseTime: device.metrics?.responseTime || 0,
      uptime: device.metrics?.uptime || 0,
      interfaces: device.interfaces || [],
      snmpData: device.snmpData || {},
      // Real-time metrics would come from SNMP polling
      realTimeData: {
        cpuUsage: device.metrics?.cpuUsage || 0,
        memoryUsage: device.metrics?.memoryUsage || 0,
        networkUtilization: device.metrics?.networkUtilization || 0
      }
    };

    res.json(deviceMetrics);
  } catch (error) {
    console.error('Get device metrics error:', error);
    res.status(500).json({
      error: 'Failed to fetch device metrics',
      message: error.message
    });
  }
});

// Get network overview metrics
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const { timeRange = '1h' } = req.query;

    // Get real device statistics
    const totalDevices = await Device.countDocuments({ isActive: true });
    const onlineDevices = await Device.countDocuments({ 
      isActive: true, 
      status: { $in: ['online', 'up'] } 
    });
    const offlineDevices = totalDevices - onlineDevices;

    // Count real alerts
    const alertsData = await Device.aggregate([
      { $match: { isActive: true } },
      { $unwind: { path: '$alerts', preserveNullAndEmptyArrays: true } },
      { $match: { 'alerts.acknowledged': false } },
      { $count: 'totalAlerts' }
    ]);
    const totalAlerts = alertsData.length > 0 ? alertsData[0].totalAlerts : 0;

    // Get top devices by network utilization (if available)
    const topDevices = await Device.find({ 
      isActive: true,
      'metrics.networkUtilization': { $exists: true }
    })
    .sort({ 'metrics.networkUtilization': -1 })
    .limit(5)
    .select('name metrics.networkUtilization ipAddress');

    const overview = {
      timeRange,
      totalDevices,
      onlineDevices,
      offlineDevices,
      alerts: totalAlerts,
      topTalkers: topDevices.map(device => ({
        device: device.name,
        ipAddress: device.ipAddress,
        utilization: `${device.metrics?.networkUtilization || 0}%`
      })),
      lastUpdate: new Date()
    };

    res.json(overview);
  } catch (error) {
    console.error('Get overview metrics error:', error);
    res.status(500).json({
      error: 'Failed to fetch overview metrics',
      message: error.message
    });
  }
});

module.exports = router;

// Enhanced dashboard metrics endpoint
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get real statistics from database
    const totalDevices = await Device.countDocuments({ isActive: true });
    const activeDevices = await Device.countDocuments({ 
      isActive: true, 
      status: { $in: ['online', 'up'] } 
    });

    // Count alerts by severity
    const alertStats = await Device.aggregate([
      { $match: { isActive: true } },
      { $unwind: { path: '$alerts', preserveNullAndEmptyArrays: true } },
      { $match: { 'alerts.acknowledged': false } },
      {
        $group: {
          _id: '$alerts.severity',
          count: { $sum: 1 }
        }
      }
    ]);

    const criticalAlerts = alertStats.find(s => s._id === 'critical')?.count || 0;
    const warningAlerts = alertStats.find(s => s._id === 'warning')?.count || 0;

    // Calculate average metrics
    const avgMetrics = await Device.aggregate([
      { $match: { isActive: true, 'metrics.cpuUsage': { $exists: true } } },
      {
        $group: {
          _id: null,
          avgCpu: { $avg: '$metrics.cpuUsage' },
          avgMemory: { $avg: '$metrics.memoryUsage' },
          avgNetworkUtil: { $avg: '$metrics.networkUtilization' }
        }
      }
    ]);

    const stats = {
      totalDevices,
      activeDevices,
      criticalAlerts,
      warningAlerts,
      networkLoad: Math.round(avgMetrics[0]?.avgNetworkUtil || 0),
      systemHealth: {
        cpu: Math.round(avgMetrics[0]?.avgCpu || 0),
        memory: Math.round(avgMetrics[0]?.avgMemory || 0),
        network: Math.round(avgMetrics[0]?.avgNetworkUtil || 0)
      },
      lastUpdate: new Date()
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard metrics',
      details: error.message 
    });
  }
});

module.exports = router;