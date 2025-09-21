const express = require('express');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Authorization middleware for admin actions
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// Get all users (admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      details: error.message 
    });
  }
});

// Get system settings
router.get('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Return mock settings for now
    res.json({
      general: {
        siteName: 'Network Management System',
        siteDescription: 'Enterprise Network Monitoring',
        maintenanceMode: false,
        maxDevices: 1000,
        sessionTimeout: 24
      },
      monitoring: {
        pollInterval: 60,
        enableSNMP: true,
        enablePing: true,
        snmpTimeout: 5000,
        maxRetries: 3
      },
      security: {
        enableTwoFactor: false,
        passwordPolicy: {
          minLength: 8,
          requireNumbers: true,
          requireSymbols: false
        },
        sessionSecurity: 'standard'
      },
      notifications: {
        email: {
          enabled: false,
          smtpHost: '',
          smtpPort: 587,
          smtpUser: '',
          smtpPassword: '',
          useTLS: true,
          fromAddress: '',
          adminEmail: ''
        },
        sms: {
          enabled: false,
          provider: 'twilio',
          apiKey: '',
          apiSecret: '',
          fromNumber: ''
        },
        webhook: {
          enabled: false,
          url: '',
          secret: ''
        }
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch system settings',
      details: error.message 
    });
  }
});

// Update system settings
router.put('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, settings } = req.body;
    
    // In a real implementation, save to database
    // For now, just return success
    
    res.json({ 
      message: `${category} settings updated successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ 
      error: 'Failed to update system settings',
      details: error.message 
    });
  }
});

// Get system information
router.get('/system-info', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const systemInfo = {
      version: '2.0.0',
      uptime: Math.floor(process.uptime()),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuUsage: Math.floor(Math.random() * 50) + 10, // Mock CPU usage
      diskUsage: Math.floor(Math.random() * 40) + 20, // Mock disk usage
      activeUsers: await User.countDocuments({ isActive: true }),
      totalDevices: Math.floor(Math.random() * 100) + 50, // Mock device count
      activeAlerts: Math.floor(Math.random() * 10) + 1 // Mock alert count
    };

    res.json(systemInfo);
  } catch (error) {
    console.error('Get system info error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch system information',
      details: error.message 
    });
  }
});

// Restart system (admin only)
router.post('/restart', authenticateToken, requireAdmin, async (req, res) => {
  try {
    res.json({ 
      message: 'System restart initiated',
      timestamp: new Date().toISOString()
    });
    
    // In a real implementation, you might:
    // - Gracefully close connections
    // - Restart the server process
    // - Send notification to monitoring systems
    
    // For demo purposes, just log the restart request
    console.log('System restart requested by admin:', req.user.username);
  } catch (error) {
    console.error('Restart system error:', error);
    res.status(500).json({ 
      error: 'Failed to restart system',
      details: error.message 
    });
  }
});

// Get network configuration stats
router.get('/network-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = {
      totalDevices: Math.floor(Math.random() * 200) + 100,
      activeDevices: Math.floor(Math.random() * 180) + 90,
      downDevices: Math.floor(Math.random() * 10) + 1,
      pendingDevices: Math.floor(Math.random() * 5) + 1,
      networkUtilization: Math.floor(Math.random() * 70) + 20,
      avgLatency: Math.floor(Math.random() * 20) + 5,
      packetLoss: Math.random() * 2,
      bandwidth: {
        total: 1000,
        used: Math.floor(Math.random() * 600) + 200,
        available: Math.floor(Math.random() * 400) + 200
      },
      topTalkers: [
        { device: '192.168.1.10', traffic: Math.floor(Math.random() * 100) + 50 },
        { device: '192.168.1.20', traffic: Math.floor(Math.random() * 80) + 40 },
        { device: '192.168.1.30', traffic: Math.floor(Math.random() * 60) + 30 }
      ]
    };

    res.json(stats);
  } catch (error) {
    console.error('Get network stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch network statistics',
      details: error.message 
    });
  }
});

module.exports = router;