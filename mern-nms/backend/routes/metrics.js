const express = require('express');
const router = express.Router();

// Middleware to authenticate requests
const authenticateToken = (req, res, next) => {
  next();
};

// Get device metrics
router.get('/devices/:deviceId', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { timeRange = '1h' } = req.query;

    // Mock metrics data for now
    // In production, this would query a time-series database like InfluxDB
    const mockMetrics = {
      deviceId,
      timeRange,
      cpu: generateMockTimeSeries('cpu', timeRange),
      memory: generateMockTimeSeries('memory', timeRange),
      network: generateMockTimeSeries('network', timeRange),
      interfaces: [
        {
          name: 'eth0',
          inBytes: generateMockTimeSeries('bytes', timeRange),
          outBytes: generateMockTimeSeries('bytes', timeRange),
          inPackets: generateMockTimeSeries('packets', timeRange),
          outPackets: generateMockTimeSeries('packets', timeRange)
        }
      ]
    };

    res.json(mockMetrics);
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

    const mockOverview = {
      timeRange,
      totalBandwidth: generateMockTimeSeries('bandwidth', timeRange),
      totalDevices: 15,
      onlineDevices: 12,
      offlineDevices: 3,
      alerts: 2,
      topTalkers: [
        { device: 'Switch-01', traffic: '1.2 Gbps' },
        { device: 'Router-01', traffic: '850 Mbps' },
        { device: 'Server-01', traffic: '650 Mbps' }
      ]
    };

    res.json(mockOverview);
  } catch (error) {
    console.error('Get overview metrics error:', error);
    res.status(500).json({
      error: 'Failed to fetch overview metrics',
      message: error.message
    });
  }
});

// Helper function to generate mock time series data
function generateMockTimeSeries(type, timeRange) {
  const now = Date.now();
  const points = [];
  let interval, count;

  switch (timeRange) {
    case '1h':
      interval = 60000; // 1 minute
      count = 60;
      break;
    case '6h':
      interval = 360000; // 6 minutes
      count = 60;
      break;
    case '24h':
      interval = 1440000; // 24 minutes
      count = 60;
      break;
    default:
      interval = 60000;
      count = 60;
  }

  for (let i = count; i >= 0; i--) {
    const timestamp = now - (i * interval);
    let value;

    switch (type) {
      case 'cpu':
        value = Math.random() * 100;
        break;
      case 'memory':
        value = 60 + Math.random() * 30;
        break;
      case 'network':
      case 'bandwidth':
        value = Math.random() * 1000;
        break;
      case 'bytes':
        value = Math.random() * 1000000;
        break;
      case 'packets':
        value = Math.random() * 10000;
        break;
      default:
        value = Math.random() * 100;
    }

    points.push({
      timestamp,
      value: Math.round(value * 100) / 100
    });
  }

  return points;
}

// Enhanced dashboard metrics endpoint
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const stats = {
      totalDevices: Math.floor(Math.random() * 50) + 10,
      activeDevices: Math.floor(Math.random() * 45) + 8,
      criticalAlerts: Math.floor(Math.random() * 5),
      warningAlerts: Math.floor(Math.random() * 10) + 2,
      networkLoad: Math.floor(Math.random() * 80) + 10,
      uptime: Date.now() - (Math.random() * 86400000 * 7), // Up to 7 days
      bandwidth: {
        incoming: Math.random() * 1000000000, // Random bytes/sec
        outgoing: Math.random() * 800000000
      },
      systemHealth: {
        cpu: Math.floor(Math.random() * 80) + 10,
        memory: Math.floor(Math.random() * 70) + 20,
        disk: Math.floor(Math.random() * 60) + 15
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