const express = require('express');
const router = express.Router();

// Middleware to authenticate requests
const authenticateToken = (req, res, next) => {
  next();
};

// Generate mock activity data
const generateMockActivity = (limit = 10) => {
  const events = [
    'Device connected',
    'Device disconnected', 
    'Alert triggered',
    'Alert resolved',
    'Configuration changed',
    'User login',
    'User logout',
    'Backup completed',
    'Update installed',
    'Monitoring started'
  ];
  
  const devices = [
    'Router-01', 'Switch-02', 'Firewall-01', 'Server-03', 
    'AP-04', 'Switch-05', 'Router-02', 'Server-01'
  ];
  
  const users = ['admin', 'operator', 'monitor', 'tech'];
  
  const activities = [];
  
  for (let i = 0; i < limit; i++) {
    const timestamp = new Date(Date.now() - Math.random() * 86400000); // Last 24 hours
    activities.push({
      id: i + 1,
      event: events[Math.floor(Math.random() * events.length)],
      source: Math.random() > 0.5 
        ? devices[Math.floor(Math.random() * devices.length)]
        : users[Math.floor(Math.random() * users.length)],
      status: Math.random() > 0.2 ? 'success' : 'warning',
      timestamp: timestamp.toISOString(),
      details: 'System activity recorded'
    });
  }
  
  return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// GET /api/activity/recent
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const activities = generateMockActivity(limit);
    
    res.json({
      activities,
      total: activities.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recent activity',
      details: error.message 
    });
  }
});

// GET /api/activity/summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const summary = {
      todayEvents: Math.floor(Math.random() * 100) + 20,
      weekEvents: Math.floor(Math.random() * 500) + 150,
      monthEvents: Math.floor(Math.random() * 2000) + 800,
      mostActiveDevice: 'Router-01',
      mostCommonEvent: 'Device connected',
      lastActivity: new Date(Date.now() - Math.random() * 3600000).toISOString()
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Activity summary error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch activity summary',
      details: error.message 
    });
  }
});

module.exports = router;