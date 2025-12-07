const logger = require('../utils/logger');
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
    logger.error('Get device metrics error:', error);
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
    const totalDevices = await Device.countDocuments({});
    const onlineDevices = await Device.countDocuments({ 
      status: { $in: ['online', 'up'] } 
    });
    const offlineDevices = totalDevices - onlineDevices;

    // Count real alerts
    const alertsData = await Device.aggregate([
      { $match: {} },
      { $unwind: { path: '$alerts', preserveNullAndEmptyArrays: true } },
      { $match: { 'alerts.acknowledged': false } },
      { $count: 'totalAlerts' }
    ]);
    const totalAlerts = alertsData.length > 0 ? alertsData[0].totalAlerts : 0;

    // Get top devices by network utilization (if available)
    const topDevices = await Device.find({ 
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
    logger.error('Get overview metrics error:', error);
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
    const totalDevices = await Device.countDocuments({});
    const activeDevices = await Device.countDocuments({ 
      status: { $in: ['online', 'up'] } 
    });

    // Count alerts by severity
    const alertStats = await Device.aggregate([
      { $match: {} },
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
      { $match: { 'metrics.cpuUsage': { $exists: true } } },
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
    logger.error('Dashboard metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard metrics',
      details: error.message 
    });
  }
});

// Lightweight endpoint for real-time metrics updates
router.get('/live', authenticateToken, async (req, res) => {
  try {
    // Get only the most frequently changing metrics
    const onlineDevices = await Device.countDocuments({ 
      status: { $in: ['online', 'up'] },
      lastSeen: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
    });

    const totalDevices = await Device.countDocuments({});
    const offlineDevices = totalDevices - onlineDevices;

    // Calculate simple network health based on device status
    const networkHealth = totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0;
    
    // Get recent device activity
    const recentActivity = await Device.countDocuments({
      updatedAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
    });
    
    // Get device types distribution
    const deviceTypes = await Device.aggregate([
      { $match: {} },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Return comprehensive live metrics
    res.json({
      onlineDevices,
      offlineDevices,
      totalDevices,
      networkHealth,
      recentActivity,
      deviceTypes: deviceTypes.reduce((acc, item) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {}),
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Live metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch live metrics',
      details: error.message 
    });
  }
});

// Network metrics endpoint
router.get('/network', authenticateToken, async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    // Get all devices for network analysis
    const devices = await Device.find({});
    
    // Calculate network statistics
    const totalDevices = devices.length;
    const onlineDevices = devices.filter(d => d.status === 'online').length;
    const offlineDevices = devices.filter(d => d.status === 'offline').length;
    const unknownDevices = devices.filter(d => !d.status || d.status === 'unknown').length;
    
    // Calculate network health percentage
    const networkHealth = totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0;
    
    // Group devices by subnet for network topology info
    const subnetMap = new Map();
    devices.forEach(device => {
      if (device.ipAddress && device.ipAddress !== 'localhost') {
        const subnet = device.ipAddress.split('.').slice(0, 3).join('.');
        if (!subnetMap.has(subnet)) {
          subnetMap.set(subnet, { total: 0, online: 0, offline: 0 });
        }
        const subnetStats = subnetMap.get(subnet);
        subnetStats.total++;
        if (device.status === 'online') subnetStats.online++;
        else if (device.status === 'offline') subnetStats.offline++;
      }
    });
    
    // Convert subnet map to array
    const subnets = Array.from(subnetMap.entries()).map(([subnet, stats]) => ({
      subnet: subnet + '.0/24',
      ...stats,
      health: stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0
    }));
    
    // Mock bandwidth data (in a real app, this would come from SNMP or other monitoring)
    const bandwidthData = {
      inbound: Math.floor(Math.random() * 1000) + 100, // MB/s
      outbound: Math.floor(Math.random() * 800) + 50,  // MB/s
      utilization: Math.floor(Math.random() * 80) + 10 // %
    };
    
    // Mock latency data
    const latencyData = {
      average: Math.floor(Math.random() * 50) + 10, // ms
      minimum: Math.floor(Math.random() * 10) + 1,  // ms
      maximum: Math.floor(Math.random() * 100) + 50 // ms
    };

    res.json({
      success: true,
      networkMetrics: {
        health: {
          overall: networkHealth,
          totalDevices,
          onlineDevices,
          offlineDevices,
          unknownDevices
        },
        topology: {
          subnets,
          totalSubnets: subnets.length
        },
        performance: {
          bandwidth: bandwidthData,
          latency: latencyData
        },
        timestamp: new Date(),
        timeRange
      }
    });

  } catch (error) {
    console.error('Network metrics error:', error);
    res.status(500).json({
      error: 'Failed to fetch network metrics',
      message: error.message
    });
  }
});

module.exports = router;