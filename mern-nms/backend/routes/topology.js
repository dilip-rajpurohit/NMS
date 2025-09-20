const express = require('express');
const jwt = require('jsonwebtoken');
const Device = require('../models/Device');
const router = express.Router();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ message: 'JWT_SECRET environment variable is required' });
  }
  
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Get network topology
router.get('/', authenticateToken, async (req, res) => {
  try {
    const devices = await Device.find({ isActive: true })
      .select('name ipAddress deviceType vendor status lastSeen alerts');
    
    const nodes = devices.map(device => ({
      id: device._id.toString(),
      label: device.name,
      ipAddress: device.ipAddress,
      deviceType: device.deviceType,
      vendor: device.vendor,
      status: device.status,
      lastSeen: device.lastSeen,
      alertCount: device.alerts ? device.alerts.filter(a => !a.acknowledged).length : 0
    }));

    const statistics = {
      totalDevices: devices.length,
      deviceTypes: devices.reduce((acc, device) => {
        acc[device.deviceType] = (acc[device.deviceType] || 0) + 1;
        return acc;
      }, {}),
      vendors: devices.reduce((acc, device) => {
        if (device.vendor) {
          acc[device.vendor] = (acc[device.vendor] || 0) + 1;
        }
        return acc;
      }, {})
    };

    res.json({
      nodes,
      edges: [],
      statistics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Topology error:', error);
    res.status(500).json({
      error: 'Failed to fetch topology',
      message: error.message
    });
  }
});

module.exports = router;
