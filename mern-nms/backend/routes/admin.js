const logger = require('../utils/logger');
const express = require('express');
const User = require('../models/User');
const { SystemSettings, NetworkConfig, AnalyticsConfig } = require('../models/SystemConfig');
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
    logger.error('Get users error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      details: error.message 
    });
  }
});

// Create new user (admin only)
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role, profile } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Username, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists with this email or username'
      });
    }

    // Validate role
    const validRoles = ['admin', 'operator', 'viewer'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role specified'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      role: role || 'operator',
      profile: profile || {},
      isActive: true
    });

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    logger.info(`New user created by admin: ${username} (${email})`);
    
    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ 
      error: 'Failed to create user',
      details: error.message 
    });
  }
});

// Update user (admin only)
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow password updates through this route
    delete updates.password;

    const user = await User.findByIdAndUpdate(
      id, 
      updates, 
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`User updated by admin: ${user.username}`);
    
    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ 
      error: 'Failed to update user',
      details: error.message 
    });
  }
});

// Delete user (admin only) - Actually delete the user
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user._id) {
      return res.status(400).json({
        error: 'Cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`User deleted by admin: ${user.username}`);
    
    res.json({
      message: 'User deleted successfully',
      deletedUser: { id: user._id, username: user.username }
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ 
      error: 'Failed to delete user',
      details: error.message 
    });
  }
});

// Toggle user status (admin only)
router.patch('/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Prevent admin from deactivating themselves
    if (id === req.user._id && !isActive) {
      return res.status(400).json({
        error: 'Cannot deactivate your own account'
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`User status changed by admin: ${user.username} - ${isActive ? 'activated' : 'deactivated'}`);
    
    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    logger.error('Toggle user status error:', error);
    res.status(500).json({ 
      error: 'Failed to update user status',
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
    logger.error('Get settings error:', error);
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
    logger.error('Update settings error:', error);
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
    logger.error('Get system info error:', error);
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
    logger.error('Restart system error:', error);
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
    logger.error('Get network stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch network statistics',
      details: error.message 
    });
  }
});

// System Settings Endpoints
// Test endpoint
router.get('/test', authenticateToken, requireAdmin, async (req, res) => {
  console.log('=== TEST endpoint called ===');
  res.json({ message: 'Test endpoint works', user: req.user });
});

// Simple debug endpoint for settings
router.get('/debug-settings', authenticateToken, requireAdmin, async (req, res) => {
  console.log('=== DEBUG SETTINGS endpoint called ===');
  console.log('req.user:', req.user);
  res.json({ 
    message: 'Debug endpoint works', 
    user: req.user,
    userIdType: typeof req.user._id,
    userId: req.user._id
  });
});

// GET /api/admin/settings/general
router.get('/settings/general', authenticateToken, requireAdmin, async (req, res) => {
  console.log('=== STARTING GET /settings/general ===');
  console.log('User ID:', req.user._id);
  try {
    console.log('=== GET /settings/general endpoint called ===');
    console.log('User object:', JSON.stringify(req.user, null, 2));
    
    let settings = await SystemSettings.findOne({ category: 'general' });
    
    if (!settings) {
      // Create default settings if none exist
      const defaultSettings = {
        siteName: 'Network Management System',
        siteDescription: 'Advanced network monitoring and management platform',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
        language: 'en',
        logo: null,
        maintenanceMode: false,
        maxUsers: 100,
        sessionTimeout: 24
      };
      
      console.log('Creating default settings, user ID:', req.user._id, 'type:', typeof req.user._id);
      console.log('Full user object:', JSON.stringify(req.user, null, 2));
      
      settings = new SystemSettings({
        category: 'general',
        settings: defaultSettings,
        updatedBy: req.user._id
      });
      await settings.save();
    }

    res.json(settings.settings);
  } catch (error) {
    logger.error('Get general settings error:', error);
    res.status(500).json({
      error: 'Failed to fetch general settings',
      details: error.message
    });
  }
});

// PUT /api/admin/settings/general
router.put('/settings/general', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updatedSettings = req.body;
    
    let settings = await SystemSettings.findOne({ category: 'general' });
    
    if (!settings) {
      settings = new SystemSettings({
        category: 'general',
        settings: updatedSettings,
        updatedBy: req.user._id
      });
    } else {
      settings.settings = { ...settings.settings, ...updatedSettings };
      settings.updatedBy = req.user._id;
    }
    
    await settings.save();
    
    res.json({
      message: 'General settings updated successfully',
      settings: settings.settings
    });
  } catch (error) {
    logger.error('Update general settings error:', error);
    res.status(500).json({
      error: 'Failed to update general settings',
      details: error.message
    });
  }
});

// GET /api/admin/settings/monitoring
router.get('/settings/monitoring', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let settings = await SystemSettings.findOne({ category: 'monitoring' });
    
    if (!settings) {
      const defaultSettings = {
        defaultScanInterval: 60,
        pingTimeout: 5000,
        retryAttempts: 3,
        enableSNMP: true,
        snmpCommunity: 'public',
        snmpVersion: 'v2c',
        enableNetworkDiscovery: true,
        discoverySchedule: 'hourly',
        alertThresholds: {
          cpu: 80,
          memory: 85,
          disk: 90,
          responseTime: 1000
        },
        dataRetention: {
          metrics: 30,
          logs: 7,
          alerts: 90
        }
      };
      
      settings = new SystemSettings({
        category: 'monitoring',
        settings: defaultSettings,
        updatedBy: req.user._id
      });
      await settings.save();
    }

    res.json(settings.settings);
  } catch (error) {
    logger.error('Get monitoring settings error:', error);
    res.status(500).json({
      error: 'Failed to fetch monitoring settings',
      details: error.message
    });
  }
});

// PUT /api/admin/settings/monitoring
router.put('/settings/monitoring', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updatedSettings = req.body;
    
    let settings = await SystemSettings.findOne({ category: 'monitoring' });
    
    if (!settings) {
      settings = new SystemSettings({
        category: 'monitoring',
        settings: updatedSettings,
        updatedBy: req.user._id
      });
    } else {
      settings.settings = { ...settings.settings, ...updatedSettings };
      settings.updatedBy = req.user._id;
    }
    
    await settings.save();
    
    res.json({
      message: 'Monitoring settings updated successfully',
      settings: settings.settings
    });
  } catch (error) {
    logger.error('Update monitoring settings error:', error);
    res.status(500).json({
      error: 'Failed to update monitoring settings',
      details: error.message
    });
  }
});

// GET /api/admin/settings/security
router.get('/settings/security', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let settings = await SystemSettings.findOne({ category: 'security' });
    
    if (!settings) {
      const defaultSettings = {
        passwordPolicy: {
          minLength: 6,
          requireUppercase: false,
          requireLowercase: true,
          requireNumbers: false,
          requireSpecialChars: false,
          expireDays: 0
        },
        sessionSecurity: {
          timeout: 24,
          maxConcurrentSessions: 5,
          requireSecureCookies: false
        },
        authentication: {
          enableTwoFactor: false,
          maxLoginAttempts: 5,
          lockoutDuration: 15
        },
        encryption: {
          dataEncryption: true,
          sslEnabled: false
        }
      };
      
      settings = new SystemSettings({
        category: 'security',
        settings: defaultSettings,
        updatedBy: req.user._id
      });
      await settings.save();
    }

    res.json(settings.settings);
  } catch (error) {
    logger.error('Get security settings error:', error);
    res.status(500).json({
      error: 'Failed to fetch security settings',
      details: error.message
    });
  }
});

// PUT /api/admin/settings/security
router.put('/settings/security', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updatedSettings = req.body;
    
    let settings = await SystemSettings.findOne({ category: 'security' });
    
    if (!settings) {
      settings = new SystemSettings({
        category: 'security',
        settings: updatedSettings,
        updatedBy: req.user._id
      });
    } else {
      settings.settings = { ...settings.settings, ...updatedSettings };
      settings.updatedBy = req.user._id;
    }
    
    await settings.save();
    
    res.json({
      message: 'Security settings updated successfully',
      settings: settings.settings
    });
  } catch (error) {
    logger.error('Update security settings error:', error);
    res.status(500).json({
      error: 'Failed to update security settings',
      details: error.message
    });
  }
});

// GET /api/admin/settings/network
router.get('/settings/network', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let settings = await SystemSettings.findOne({ category: 'network' });
    
    if (!settings) {
      const defaultSettings = {
        defaultNetworkRange: '192.168.1.0/24',
        excludeRanges: ['169.254.0.0/16'],
        scanPorts: [22, 23, 80, 443, 8080],
        enablePortScanning: true,
        enableOSDetection: false,
        maxConcurrentScans: 50,
        scanTimeout: 30,
        enableIPv6: false,
        dnsServers: ['8.8.8.8', '8.8.4.4'],
        enableReverseDNS: true
      };
      
      settings = new SystemSettings({
        category: 'network',
        settings: defaultSettings,
        updatedBy: req.user._id
      });
      await settings.save();
    }

    res.json(settings.settings);
  } catch (error) {
    logger.error('Get network settings error:', error);
    res.status(500).json({
      error: 'Failed to fetch network settings',
      details: error.message
    });
  }
});

// PUT /api/admin/settings/network
router.put('/settings/network', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updatedSettings = req.body;
    
    let settings = await SystemSettings.findOne({ category: 'network' });
    
    if (!settings) {
      settings = new SystemSettings({
        category: 'network',
        settings: updatedSettings,
        updatedBy: req.user._id
      });
    } else {
      settings.settings = { ...settings.settings, ...updatedSettings };
      settings.updatedBy = req.user._id;
    }
    
    await settings.save();
    
    res.json({
      message: 'Network settings updated successfully',
      settings: settings.settings
    });
  } catch (error) {
    logger.error('Update network settings error:', error);
    res.status(500).json({
      error: 'Failed to update network settings',
      details: error.message
    });
  }
});

// GET /api/admin/settings/email
router.get('/settings/email', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let settings = await SystemSettings.findOne({ category: 'email' });
    
    if (!settings) {
      const defaultSettings = {
        smtpEnabled: false,
        smtpHost: '',
        smtpPort: 587,
        smtpSecure: true,
        smtpUsername: '',
        smtpPassword: '',
        fromEmail: 'nms@example.com',
        fromName: 'Network Management System',
        enableEmailAlerts: false,
        alertRecipients: ['admin@example.com'],
        reportRecipients: ['admin@example.com'],
        testEmailSent: false
      };
      
      settings = new SystemSettings({
        category: 'email',
        settings: defaultSettings,
        updatedBy: req.user._id
      });
      await settings.save();
    }

    res.json(settings.settings);
  } catch (error) {
    logger.error('Get email settings error:', error);
    res.status(500).json({
      error: 'Failed to fetch email settings',
      details: error.message
    });
  }
});

// PUT /api/admin/settings/email
router.put('/settings/email', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updatedSettings = req.body;
    
    let settings = await SystemSettings.findOne({ category: 'email' });
    
    if (!settings) {
      settings = new SystemSettings({
        category: 'email',
        settings: updatedSettings,
        updatedBy: req.user._id
      });
    } else {
      settings.settings = { ...settings.settings, ...updatedSettings };
      settings.updatedBy = req.user._id;
    }
    
    await settings.save();
    
    res.json({
      message: 'Email settings updated successfully',
      settings: settings.settings
    });
  } catch (error) {
    logger.error('Update email settings error:', error);
    res.status(500).json({
      error: 'Failed to update email settings',
      details: error.message
    });
  }
});

// Network Configuration Endpoints
// GET /api/admin/network/interfaces
router.get('/network/interfaces', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Mock network interfaces data
    const interfaces = [
      {
        id: 'eth0',
        name: 'eth0',
        ip: '10.114.214.235',
        subnet: '10.114.214.0/24',
        gateway: '10.114.214.1',
        mtu: 1500,
        status: 'active',
        type: 'ethernet',
        speed: '1000 Mbps',
        description: 'Primary network interface'
      },
      {
        id: 'lo',
        name: 'lo',
        ip: '127.0.0.1',
        subnet: '127.0.0.0/8',
        gateway: '',
        mtu: 65536,
        status: 'active',
        type: 'loopback',
        speed: '',
        description: 'Loopback interface'
      }
    ];

    res.json({
      interfaces,
      total: interfaces.length
    });
  } catch (error) {
    logger.error('Get network interfaces error:', error);
    res.status(500).json({
      error: 'Failed to fetch network interfaces',
      details: error.message
    });
  }
});

// GET /api/admin/network/routes
router.get('/network/routes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const routes = [
      {
        id: 'default',
        destination: '0.0.0.0/0',
        gateway: '10.114.214.1',
        interface: 'eth0',
        metric: 100,
        type: 'static',
        flags: 'UG'
      },
      {
        id: 'local',
        destination: '10.114.214.0/24',
        gateway: '0.0.0.0',
        interface: 'eth0',
        metric: 0,
        type: 'connected',
        flags: 'U'
      }
    ];

    res.json({
      routes,
      total: routes.length
    });
  } catch (error) {
    logger.error('Get network routes error:', error);
    res.status(500).json({
      error: 'Failed to fetch network routes',
      details: error.message
    });
  }
});

// GET /api/admin/network/vlans
router.get('/network/vlans', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const vlans = [
      {
        id: 1,
        name: 'Management',
        vlanId: 100,
        interface: 'eth0',
        description: 'Management VLAN',
        status: 'active'
      },
      {
        id: 2,
        name: 'Guest',
        vlanId: 200,
        interface: 'eth0',
        description: 'Guest network VLAN',
        status: 'active'
      }
    ];

    res.json({
      vlans,
      total: vlans.length
    });
  } catch (error) {
    logger.error('Get network VLANs error:', error);
    res.status(500).json({
      error: 'Failed to fetch network VLANs',
      details: error.message
    });
  }
});

// GET /api/admin/network/subnets
router.get('/network/subnets', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const subnets = [
      {
        id: 1,
        name: 'Primary Network',
        network: '10.114.214.0/24',
        gateway: '10.114.214.1',
        dhcpRange: '10.114.214.100-10.114.214.200',
        dnsServers: ['8.8.8.8', '8.8.4.4'],
        status: 'active',
        description: 'Main network subnet'
      },
      {
        id: 2,
        name: 'Management Network',
        network: '192.168.100.0/24',
        gateway: '192.168.100.1',
        dhcpRange: '192.168.100.10-192.168.100.50',
        dnsServers: ['192.168.100.1'],
        status: 'active',
        description: 'Management subnet'
      }
    ];

    res.json({
      subnets,
      total: subnets.length
    });
  } catch (error) {
    logger.error('Get network subnets error:', error);
    res.status(500).json({
      error: 'Failed to fetch network subnets',
      details: error.message
    });
  }
});

// POST /api/admin/network/interfaces
router.post('/network/interfaces', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, ip, subnet, gateway, mtu, status, description } = req.body;

    if (!name || !ip) {
      return res.status(400).json({
        error: 'Interface name and IP address are required'
      });
    }

    // Mock interface creation (in a real system, this would configure actual network interface)
    const newInterface = {
      id: `${name}-${Date.now()}`,
      name,
      ip,
      subnet: subnet || '',
      gateway: gateway || '',
      mtu: mtu || 1500,
      status: status || 'active',
      type: 'ethernet',
      speed: '1000 Mbps',
      description: description || ''
    };

    res.status(201).json({
      message: 'Network interface created successfully',
      interface: newInterface
    });
  } catch (error) {
    logger.error('Create network interface error:', error);
    res.status(500).json({
      error: 'Failed to create network interface',
      details: error.message
    });
  }
});

// POST /api/admin/network/routes
router.post('/network/routes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { destination, gateway, interface: iface, metric, type } = req.body;

    if (!destination || !gateway || !iface) {
      return res.status(400).json({
        error: 'Destination, gateway, and interface are required'
      });
    }

    // Mock route creation
    const newRoute = {
      id: `route-${Date.now()}`,
      destination,
      gateway,
      interface: iface,
      metric: metric || 1,
      type: type || 'static',
      flags: 'UG'
    };

    res.status(201).json({
      message: 'Network route created successfully',
      route: newRoute
    });
  } catch (error) {
    logger.error('Create network route error:', error);
    res.status(500).json({
      error: 'Failed to create network route',
      details: error.message
    });
  }
});

// GET /api/admin/network/stats
router.get('/network/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = {
      totalInterfaces: 2,
      activeInterfaces: 2,
      totalRoutes: 2,
      staticRoutes: 1,
      totalVlans: 2,
      activeVlans: 2,
      totalSubnets: 2,
      utilizedSubnets: 2,
      trafficIn: Math.floor(Math.random() * 1000000), // bytes
      trafficOut: Math.floor(Math.random() * 800000), // bytes
      packetsIn: Math.floor(Math.random() * 50000),
      packetsOut: Math.floor(Math.random() * 40000),
      errors: Math.floor(Math.random() * 10),
      drops: Math.floor(Math.random() * 5)
    };

    res.json(stats);
  } catch (error) {
    logger.error('Get network stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch network statistics',
      details: error.message
    });
  }
});

module.exports = router;