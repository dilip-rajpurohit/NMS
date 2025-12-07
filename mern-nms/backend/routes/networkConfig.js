const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { NetworkConfig, AnalyticsConfig } = require('../models/SystemConfig');
const logger = require('../utils/logger');

// Authorization middleware for admin actions
const requireAdminAccess = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// GET /api/network-config - Get all network configurations
router.get('/', authenticateToken, async (req, res) => {
  try {
    // First, clean up any invalid configs and ensure all have required fields
    await NetworkConfig.deleteMany({ 
      $or: [
        { createdBy: { $exists: false } },
        { updatedBy: { $exists: false } }
      ]
    });

    let configs;
    try {
      configs = await NetworkConfig.find({})
        .populate('createdBy', 'username email')
        .populate('updatedBy', 'username email')
        .sort({ createdAt: -1 });
    } catch (populateError) {
      // If populate fails, try without populate
      console.log('Populate failed, trying without populate:', populateError.message);
      configs = await NetworkConfig.find({}).sort({ createdAt: -1 });
    }

    // If no valid configs exist, create a default one
    if (configs.length === 0) {
      const defaultConfig = new NetworkConfig({
        name: 'Default Network Configuration',
        networkRange: '192.168.1.0/24',
        scanPorts: [22, 23, 80, 443, 8080, 8443],
        excludeRanges: ['169.254.0.0/16', '127.0.0.0/8'],
        enablePortScanning: true,
        enableOSDetection: false,
        maxConcurrentScans: 50,
        scanTimeout: 30,
        enableIPv6: false,
        dnsServers: ['8.8.8.8', '8.8.4.4', '1.1.1.1'],
        enableReverseDNS: true,
        createdBy: req.user.userId,
        updatedBy: req.user.userId
      });

      await defaultConfig.save();
      await defaultConfig.populate('createdBy', 'username email');
      await defaultConfig.populate('updatedBy', 'username email');

      configs = [defaultConfig];
    }

    res.json({
      configurations: configs,
      total: configs.length
    });
  } catch (error) {
    logger.error('Get network configs error:', error);
    res.status(500).json({
      error: 'Failed to fetch network configurations',
      details: error.message
    });
  }
});

// POST /api/network-config - Create new network configuration
router.post('/', authenticateToken, requireAdminAccess, async (req, res) => {
  try {
    const {
      name,
      networkRange,
      scanPorts,
      excludeRanges,
      enablePortScanning,
      enableOSDetection,
      maxConcurrentScans,
      scanTimeout,
      enableIPv6,
      dnsServers,
      enableReverseDNS
    } = req.body;

    if (!name || !networkRange) {
      return res.status(400).json({
        error: 'Name and network range are required'
      });
    }

    // Check if config with same name exists
    const existingConfig = await NetworkConfig.findOne({ name });
    if (existingConfig) {
      return res.status(409).json({
        error: 'Network configuration with this name already exists'
      });
    }

    const newConfig = new NetworkConfig({
      name,
      networkRange,
      scanPorts: scanPorts || [22, 23, 80, 443, 8080],
      excludeRanges: excludeRanges || [],
      enablePortScanning: enablePortScanning !== undefined ? enablePortScanning : true,
      enableOSDetection: enableOSDetection !== undefined ? enableOSDetection : false,
      maxConcurrentScans: maxConcurrentScans || 50,
      scanTimeout: scanTimeout || 30,
      enableIPv6: enableIPv6 !== undefined ? enableIPv6 : false,
      dnsServers: dnsServers || ['8.8.8.8', '8.8.4.4'],
      enableReverseDNS: enableReverseDNS !== undefined ? enableReverseDNS : true,
      createdBy: req.user.userId,
      updatedBy: req.user.userId
    });

    await newConfig.save();
    await newConfig.populate('createdBy', 'username email');
    await newConfig.populate('updatedBy', 'username email');

    res.status(201).json({
      message: 'Network configuration created successfully',
      configuration: newConfig
    });
  } catch (error) {
    logger.error('Create network config error:', error);
    res.status(500).json({
      error: 'Failed to create network configuration',
      details: error.message
    });
  }
});

// PUT /api/network-config/:id - Update network configuration
router.put('/:id', authenticateToken, requireAdminAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updatedBy: req.user.userId };

    const config = await NetworkConfig.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email')
     .populate('updatedBy', 'username email');

    if (!config) {
      return res.status(404).json({
        error: 'Network configuration not found'
      });
    }

    res.json({
      message: 'Network configuration updated successfully',
      configuration: config
    });
  } catch (error) {
    logger.error('Update network config error:', error);
    res.status(500).json({
      error: 'Failed to update network configuration',
      details: error.message
    });
  }
});

// DELETE /api/network-config/:id - Delete network configuration
router.delete('/:id', authenticateToken, requireAdminAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const config = await NetworkConfig.findByIdAndDelete(id);

    if (!config) {
      return res.status(404).json({
        error: 'Network configuration not found'
      });
    }

    res.json({
      message: 'Network configuration deleted successfully',
      configuration: config
    });
  } catch (error) {
    logger.error('Delete network config error:', error);
    res.status(500).json({
      error: 'Failed to delete network configuration',
      details: error.message
    });
  }
});

// GET /api/network-config/analytics - Get analytics configuration
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    let config = await AnalyticsConfig.findOne({})
      .populate('updatedBy', 'username email');

    if (!config) {
      // Create default analytics config
      config = new AnalyticsConfig({
        dataRetention: {
          metrics: 30,
          logs: 7,
          alerts: 90
        },
        aggregation: {
          enableHourlyAggregation: true,
          enableDailyAggregation: true,
          enableWeeklyAggregation: true
        },
        thresholds: {
          cpu: { warning: 70, critical: 85 },
          memory: { warning: 75, critical: 90 },
          disk: { warning: 80, critical: 95 },
          responseTime: { warning: 500, critical: 1000 },
          packetLoss: { warning: 1, critical: 5 }
        },
        notifications: {
          enableEmailAlerts: false,
          enableWebhooks: false,
          alertRecipients: []
        },
        updatedBy: req.user.userId
      });

      await config.save();
      await config.populate('updatedBy', 'username email');
    }

    res.json({
      analytics: config
    });
  } catch (error) {
    logger.error('Get analytics config error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics configuration',
      details: error.message
    });
  }
});

// PUT /api/network-config/analytics - Update analytics configuration
router.put('/analytics', authenticateToken, requireAdminAccess, async (req, res) => {
  try {
    const updates = { ...req.body, updatedBy: req.user.userId };

    let config = await AnalyticsConfig.findOne({});

    if (!config) {
      config = new AnalyticsConfig(updates);
    } else {
      Object.assign(config, updates);
    }

    await config.save();
    await config.populate('updatedBy', 'username email');

    res.json({
      message: 'Analytics configuration updated successfully',
      analytics: config
    });
  } catch (error) {
    logger.error('Update analytics config error:', error);
    res.status(500).json({
      error: 'Failed to update analytics configuration',
      details: error.message
    });
  }
});

module.exports = router;