const express = require('express');
const Device = require('../models/Device');
const jwt = require('jsonwebtoken');
const SNMPManager = require('../utils/snmpManager');
const router = express.Router();

// Initialize SNMP Manager
const snmpManager = new SNMPManager();

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

// Authorization middleware for admin actions
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// Get all devices with enhanced filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      type, 
      status, 
      location, 
      search, 
      page = 1, 
      limit = 50,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;
    
    const filter = { isActive: true };
    
    if (type) filter.deviceType = type;
    if (status) filter.status = status;
    if (location) filter['location.building'] = new RegExp(location, 'i');
    
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { ipAddress: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const devices = await Device.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortOptions)
      .populate('connectivity.neighbors.deviceId', 'name ipAddress deviceType');

    const total = await Device.countDocuments(filter);
    
    // Get device statistics
    const stats = await Device.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalDevices: { $sum: 1 },
          onlineDevices: { $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] } },
          offlineDevices: { $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] } },
          warningDevices: { $sum: { $cond: [{ $eq: ['$status', 'warning'] }, 1, 0] } },
          criticalDevices: { $sum: { $cond: [{ $eq: ['$status', 'critical'] }, 1, 0] } },
          avgCpuUsage: { $avg: '$metrics.cpuUsage' },
          avgMemoryUsage: { $avg: '$metrics.memoryUsage' }
        }
      }
    ]);

    res.json({
      devices,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      stats: stats[0] || {
        totalDevices: 0,
        onlineDevices: 0,
        offlineDevices: 0,
        warningDevices: 0,
        criticalDevices: 0,
        avgCpuUsage: 0,
        avgMemoryUsage: 0
      }
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      error: 'Failed to fetch devices',
      message: error.message
    });
  }
});

// Get device by ID with detailed information
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id)
      .populate('connectivity.neighbors.deviceId', 'name ipAddress deviceType status');
      
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json(device);
  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({
      error: 'Failed to fetch device',
      message: error.message
    });
  }
});

// Create new device
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Check if device with same IP already exists
    const existingDevice = await Device.findOne({ 
      ipAddress: req.body.ipAddress,
      isActive: true 
    });
    
    if (existingDevice) {
      return res.status(400).json({
        error: 'Device with this IP address already exists'
      });
    }

    const device = new Device({
      ...req.body,
      discoveredBy: 'manual',
      metrics: {
        ...req.body.metrics,
        lastSeen: new Date()
      }
    });

    await device.save();
    
    res.status(201).json({
      message: 'Device created successfully',
      device
    });
  } catch (error) {
    console.error('Create device error:', error);
    res.status(500).json({
      error: 'Failed to create device',
      message: error.message
    });
  }
});

// Update device
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Check if IP address is being changed and if it conflicts
    if (req.body.ipAddress && req.body.ipAddress !== device.ipAddress) {
      const existingDevice = await Device.findOne({ 
        ipAddress: req.body.ipAddress,
        isActive: true,
        _id: { $ne: req.params.id }
      });
      
      if (existingDevice) {
        return res.status(400).json({
          error: 'Another device with this IP address already exists'
        });
      }
    }

    Object.assign(device, req.body);
    await device.save();
    
    res.json({
      message: 'Device updated successfully',
      device
    });
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({
      error: 'Failed to update device',
      message: error.message
    });
  }
});

// Delete device (soft delete)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    device.isActive = false;
    await device.save();
    
    res.json({
      message: 'Device deleted successfully'
    });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({
      error: 'Failed to delete device',
      message: error.message
    });
  }
});

// Get device metrics
router.get('/:id/metrics', authenticateToken, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({
      deviceId: device._id,
      name: device.name,
      ipAddress: device.ipAddress,
      status: device.status,
      metrics: device.metrics,
      interfaces: device.interfaces,
      uptime: device.uptimeString
    });
  } catch (error) {
    console.error('Get device metrics error:', error);
    res.status(500).json({
      error: 'Failed to fetch device metrics',
      message: error.message
    });
  }
});

// Update device status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['online', 'offline', 'warning', 'critical', 'maintenance'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await device.updateStatus(status);
    
    res.json({
      message: 'Device status updated successfully',
      device: {
        id: device._id,
        name: device.name,
        status: device.status,
        lastSeen: device.metrics.lastSeen
      }
    });
  } catch (error) {
    console.error('Update device status error:', error);
    res.status(500).json({
      error: 'Failed to update device status',
      message: error.message
    });
  }
});

// Add alert to device
router.post('/:id/alerts', authenticateToken, async (req, res) => {
  try {
    const { type, severity, message } = req.body;
    
    if (!type || !severity || !message) {
      return res.status(400).json({ 
        error: 'Type, severity, and message are required' 
      });
    }

    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await device.addAlert(type, severity, message);
    
    res.status(201).json({
      message: 'Alert added successfully',
      device: {
        id: device._id,
        name: device.name,
        alerts: device.alerts
      }
    });
  } catch (error) {
    console.error('Add alert error:', error);
    res.status(500).json({
      error: 'Failed to add alert',
      message: error.message
    });
  }
});

// Acknowledge alert
router.patch('/:id/alerts/:alertId/acknowledge', authenticateToken, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await device.acknowledgeAlert(req.params.alertId, req.user.username);
    
    res.json({
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({
      error: 'Failed to acknowledge alert',
      message: error.message
    });
  }
});

// Bulk operations
router.post('/bulk/update-status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { deviceIds, status } = req.body;
    
    if (!deviceIds || !Array.isArray(deviceIds) || !status) {
      return res.status(400).json({ 
        error: 'Device IDs array and status are required' 
      });
    }

    const result = await Device.updateMany(
      { _id: { $in: deviceIds }, isActive: true },
      { 
        status: status,
        'metrics.lastSeen': new Date()
      }
    );
    
    res.json({
      message: `Updated ${result.modifiedCount} devices`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      error: 'Failed to update devices',
      message: error.message
    });
  }
});

// Get devices by type
router.get('/type/:type', authenticateToken, async (req, res) => {
  try {
    const devices = await Device.findByType(req.params.type);
    res.json(devices);
  } catch (error) {
    console.error('Get devices by type error:', error);
    res.status(500).json({
      error: 'Failed to fetch devices by type',
      message: error.message
    });
  }
});

// Get devices by location
router.get('/location/:building', authenticateToken, async (req, res) => {
  try {
    const { building } = req.params;
    const { floor, room } = req.query;
    
    const devices = await Device.findByLocation(building, floor, room);
    res.json(devices);
  } catch (error) {
    console.error('Get devices by location error:', error);
    res.status(500).json({
      error: 'Failed to fetch devices by location',
      message: error.message
    });
  }
});

// Get devices with active alerts
router.get('/alerts/active', authenticateToken, async (req, res) => {
  try {
    const devices = await Device.findWithAlerts();
    res.json(devices);
  } catch (error) {
    console.error('Get devices with alerts error:', error);
    res.status(500).json({
      error: 'Failed to fetch devices with alerts',
      message: error.message
    });
  }
});

// SNMP device discovery and polling
router.post('/:id/snmp-poll', authenticateToken, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Perform SNMP discovery
    const discoveryResult = await snmpManager.discoverDevice(
      device.ipAddress, 
      device.snmpCommunity || 'public'
    );

    if (discoveryResult.success) {
      // Update device with SNMP data
      Object.assign(device, {
        vendor: discoveryResult.device.vendor,
        deviceType: discoveryResult.device.deviceType,
        description: discoveryResult.device.description,
        interfaces: discoveryResult.device.interfaces,
        metrics: {
          ...device.metrics,
          ...discoveryResult.device.metrics
        }
      });

      await device.save();

      res.json({
        message: 'SNMP polling completed successfully',
        device,
        snmpData: discoveryResult.device
      });
    } else {
      res.status(400).json({
        error: 'SNMP polling failed',
        message: discoveryResult.error
      });
    }
  } catch (error) {
    console.error('SNMP polling error:', error);
    res.status(500).json({
      error: 'Failed to perform SNMP polling',
      message: error.message
    });
  }
});

// Enhanced device creation with SNMP discovery
router.post('/discover', authenticateToken, async (req, res) => {
  try {
    const { ipAddress, snmpCommunity = 'public', autoDiscover = true } = req.body;
    
    if (!ipAddress) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    // Check if device already exists
    const existingDevice = await Device.findOne({ 
      ipAddress, 
      isActive: true 
    });
    
    if (existingDevice) {
      return res.status(400).json({
        error: 'Device with this IP address already exists',
        device: existingDevice
      });
    }

    let deviceData = {
      name: `Device-${ipAddress}`,
      ipAddress,
      snmpCommunity,
      discoveredBy: 'manual',
      status: 'unknown'
    };

    if (autoDiscover) {
      // Perform SNMP discovery
      const discoveryResult = await snmpManager.discoverDevice(ipAddress, snmpCommunity);
      
      if (discoveryResult.success) {
        deviceData = {
          ...deviceData,
          ...discoveryResult.device,
          status: 'online'
        };
      } else {
        deviceData.status = 'offline';
        deviceData.notes = `Discovery failed: ${discoveryResult.error}`;
      }
    }

    const device = new Device(deviceData);
    await device.save();

    res.status(201).json({
      message: 'Device discovered and created successfully',
      device,
      discoverySuccess: autoDiscover ? deviceData.status === 'online' : null
    });

  } catch (error) {
    console.error('Device discovery error:', error);
    res.status(500).json({
      error: 'Failed to discover device',
      message: error.message
    });
  }
});

// Get device performance history
router.get('/:id/performance/history', authenticateToken, async (req, res) => {
  try {
    const { hours = 24, interval = 'hour' } = req.query;
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Generate mock historical data
    const dataPoints = [];
    const now = new Date();
    const hoursBack = parseInt(hours);
    
    for (let i = hoursBack; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
      dataPoints.push({
        timestamp,
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        network: {
          bytesIn: Math.floor(Math.random() * 1000000),
          bytesOut: Math.floor(Math.random() * 1000000)
        },
        responseTime: 10 + Math.random() * 50
      });
    }

    res.json({
      deviceId: device._id,
      deviceName: device.name,
      period: {
        hours: hoursBack,
        interval,
        from: new Date(now.getTime() - (hoursBack * 60 * 60 * 1000)),
        to: now
      },
      data: dataPoints
    });

  } catch (error) {
    console.error('Performance history error:', error);
    res.status(500).json({
      error: 'Failed to fetch performance history',
      message: error.message
    });
  }
});

module.exports = router;

// Create new device
router.post('/', authenticateToken, async (req, res) => {
  try {
    const deviceData = req.body;
    
    // Check if device with same IP already exists
    const existingDevice = await Device.findOne({ ipAddress: deviceData.ipAddress });
    if (existingDevice) {
      return res.status(400).json({
        error: 'Device with this IP address already exists'
      });
    }

    const device = new Device(deviceData);
    await device.save();

    // Emit real-time update
    const io = req.app.get('socketio');
    io.emit('device.created', device);

    res.status(201).json({
      message: 'Device created successfully',
      device
    });
  } catch (error) {
    console.error('Create device error:', error);
    res.status(500).json({
      error: 'Failed to create device',
      message: error.message
    });
  }
});

// Update device
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const device = await Device.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Emit real-time update
    const io = req.app.get('socketio');
    io.emit('device.updated', device);

    res.json({
      message: 'Device updated successfully',
      device
    });
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({
      error: 'Failed to update device',
      message: error.message
    });
  }
});

// Delete device
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Emit real-time update
    const io = req.app.get('socketio');
    io.emit('device.deleted', { id: req.params.id });

    res.json({
      message: 'Device deleted successfully'
    });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({
      error: 'Failed to delete device',
      message: error.message
    });
  }
});

// Update device metrics
router.post('/:id/metrics', authenticateToken, async (req, res) => {
  try {
    const { cpuUsage, memoryUsage, uptime } = req.body;
    
    const device = await Device.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          'metrics.cpuUsage': cpuUsage,
          'metrics.memoryUsage': memoryUsage,
          'metrics.uptime': uptime,
          'metrics.lastSeen': new Date(),
          status: 'online'
        }
      },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Emit real-time metrics update
    const io = req.app.get('socketio');
    io.emit('device.metrics', {
      deviceId: device._id,
      metrics: device.metrics
    });

    res.json({
      message: 'Metrics updated successfully',
      metrics: device.metrics
    });
  } catch (error) {
    console.error('Update metrics error:', error);
    res.status(500).json({
      error: 'Failed to update metrics',
      message: error.message
    });
  }
});

// Get device statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const stats = await Device.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          online: {
            $sum: {
              $cond: [{ $eq: ['$status', 'online'] }, 1, 0]
            }
          },
          offline: {
            $sum: {
              $cond: [{ $eq: ['$status', 'offline'] }, 1, 0]
            }
          },
          switches: {
            $sum: {
              $cond: [{ $eq: ['$deviceType', 'switch'] }, 1, 0]
            }
          },
          routers: {
            $sum: {
              $cond: [{ $eq: ['$deviceType', 'router'] }, 1, 0]
            }
          },
          hosts: {
            $sum: {
              $cond: [{ $eq: ['$deviceType', 'host'] }, 1, 0]
            }
          }
        }
      }
    ]);

    res.json(stats[0] || {
      total: 0,
      online: 0,
      offline: 0,
      switches: 0,
      routers: 0,
      hosts: 0
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

module.exports = router;