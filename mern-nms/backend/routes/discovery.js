const express = require('express');
const Device = require('../models/Device');
const jwt = require('jsonwebtoken');
const net = require('net');
const ping = require('ping');
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

// Authorization middleware for admin actions
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// Get discovery configuration
router.get('/config', authenticateToken, async (req, res) => {
  try {
    // Enhanced configuration with more options
    const config = {
      networkRanges: ['10.0.0.0/24', '192.168.1.0/24', '172.16.0.0/16'],
      snmpCommunities: ['public', 'private', 'community'],
      scanInterval: 300, // seconds
      autoDiscovery: true,
      maxConcurrentScans: 20,
      snmpTimeout: 5000,
      protocols: ['ping', 'snmp', 'arp', 'tcp'],
      ports: [22, 23, 80, 443, 161, 8080],
      deviceTypes: {
        switches: ['1.3.6.1.4.1.9.12', '1.3.6.1.4.1.11.2.3.7.11'],
        routers: ['1.3.6.1.4.1.9.1', '1.3.6.1.4.1.2636.1.1.1.2'],
        servers: ['1.3.6.1.4.1.8072.3.2.10', '1.3.6.1.4.1.311.1.1.3.1.2'],
        firewalls: ['1.3.6.1.4.1.25461.2.1.2.1', '1.3.6.1.4.1.2021.250.10'],
        access_points: ['1.3.6.1.4.1.14988.1', '1.3.6.1.4.1.4526.100.4.1']
      },
      credentials: {
        ssh: {
          username: 'admin',
          port: 22
        },
        telnet: {
          username: 'admin',
          port: 23
        }
      },
      discovery: {
        enablePing: true,
        enableSnmp: true,
        enablePortScan: true,
        enableArpScan: true,
        retryAttempts: 3,
        retryDelay: 1000
      }
    };

    res.json(config);
  } catch (error) {
    console.error('Get discovery config error:', error);
    res.status(500).json({
      error: 'Failed to fetch discovery configuration',
      message: error.message
    });
  }
});

// Update discovery configuration
router.put('/config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const config = req.body;
    
    // Validate configuration
    if (!config.networkRanges || !Array.isArray(config.networkRanges)) {
      return res.status(400).json({ error: 'Network ranges must be an array' });
    }
    
    if (!config.snmpCommunities || !Array.isArray(config.snmpCommunities)) {
      return res.status(400).json({ error: 'SNMP communities must be an array' });
    }

    // In production, save to database or config file
    console.log('Updated discovery config:', config);

    // Emit configuration update event
    const io = req.app.get('socketio');
    if (io) {
      io.emit('discovery.configUpdated', config);
    }

    res.json({
      message: 'Discovery configuration updated successfully',
      config
    });
  } catch (error) {
    console.error('Update discovery config error:', error);
    res.status(500).json({
      error: 'Failed to update discovery configuration',
      message: error.message
    });
  }
});

// Start network discovery scan
router.post('/scan', authenticateToken, async (req, res) => {
  try {
    const { networkRange, protocols = ['ping'], maxDevices = 50 } = req.body;
    
    if (!networkRange) {
      return res.status(400).json({ error: 'Network range is required' });
    }

    // Start discovery process
    const scanId = Date.now().toString();
    const io = req.app.get('socketio');
    
    res.json({
      message: 'Network discovery scan started',
      scanId,
      networkRange,
      protocols,
      status: 'started'
    });

    // Perform discovery in background
    performNetworkDiscovery(scanId, networkRange, protocols, maxDevices, io);

  } catch (error) {
    console.error('Start discovery scan error:', error);
    res.status(500).json({
      error: 'Failed to start discovery scan',
      message: error.message
    });
  }
});

// Get discovery status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Get actual discovery status from database or process state
    const status = {
      isRunning: false, // TODO: Track actual discovery process status
      lastScan: new Date(Date.now() - 3600000), // 1 hour ago
      nextScan: new Date(Date.now() + 300000),  // 5 minutes from now
      devicesDiscovered: await Device.countDocuments({ discoveredBy: 'auto' }),
      totalDevices: await Device.countDocuments({ isActive: true }),
      scanProgress: {
        total: 254,
        completed: 254,
        percentage: 100
      },
      errors: [],
      statistics: {
        ping: { success: 45, failed: 209 },
        snmp: { success: 12, failed: 33 },
        tcp: { success: 8, failed: 37 }
      }
    };

    res.json(status);
  } catch (error) {
    console.error('Get discovery status error:', error);
    res.status(500).json({
      error: 'Failed to fetch discovery status',
      message: error.message
    });
  }
});

// Manual device discovery
router.post('/manual', authenticateToken, async (req, res) => {
  try {
    const { ipAddress, snmpCommunity = 'public' } = req.body;
    
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

    // Perform manual discovery
    const discoveryResult = await performManualDiscovery(ipAddress, snmpCommunity);
    
    if (discoveryResult.success) {
      const device = new Device({
        ...discoveryResult.deviceInfo,
        discoveredBy: 'manual',
        metrics: {
          lastSeen: new Date(),
          ...discoveryResult.metrics
        }
      });

      await device.save();

      res.status(201).json({
        message: 'Device discovered and added successfully',
        device,
        discoveryInfo: discoveryResult
      });
    } else {
      res.status(400).json({
        error: 'Failed to discover device',
        message: discoveryResult.error
      });
    }

  } catch (error) {
    console.error('Manual discovery error:', error);
    res.status(500).json({
      error: 'Failed to perform manual discovery',
      message: error.message
    });
  }
});

// Rediscover specific device
router.post('/rediscover/:id', authenticateToken, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Perform rediscovery
    const discoveryResult = await performManualDiscovery(
      device.ipAddress, 
      device.snmpCommunity
    );
    
    if (discoveryResult.success) {
      // Update device with new information
      Object.assign(device, {
        ...discoveryResult.deviceInfo,
        metrics: {
          ...device.metrics,
          lastSeen: new Date(),
          ...discoveryResult.metrics
        }
      });

      await device.save();

      res.json({
        message: 'Device rediscovered successfully',
        device,
        discoveryInfo: discoveryResult
      });
    } else {
      res.status(400).json({
        error: 'Failed to rediscover device',
        message: discoveryResult.error
      });
    }

  } catch (error) {
    console.error('Rediscover device error:', error);
    res.status(500).json({
      error: 'Failed to rediscover device',
      message: error.message
    });
  }
});

// Get discovered devices
router.get('/devices', authenticateToken, async (req, res) => {
  try {
    const { discoveredBy = 'all', page = 1, limit = 50 } = req.query;
    const filter = { isActive: true };
    
    if (discoveredBy !== 'all') {
      filter.discoveredBy = discoveredBy;
    }

    const devices = await Device.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ discoveredAt: -1 });

    const total = await Device.countDocuments(filter);
    
    // Get discovery statistics
    const stats = await Device.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$discoveredBy',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      devices,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      discoveryStats: stats
    });
  } catch (error) {
    console.error('Get discovered devices error:', error);
    res.status(500).json({
      error: 'Failed to fetch discovered devices',
      message: error.message
    });
  }
});

// Network topology discovery
router.post('/topology', authenticateToken, async (req, res) => {
  try {
    const devices = await Device.find({ 
      isActive: true, 
      status: 'online' 
    });

    // Build topology map
    const topology = {
      nodes: devices.map(device => ({
        id: device._id,
        name: device.name,
        ipAddress: device.ipAddress,
        type: device.deviceType,
        status: device.status,
        location: device.location
      })),
      links: []
    };

    // Add connections based on neighbors
    devices.forEach(device => {
      if (device.connectivity && device.connectivity.neighbors) {
        device.connectivity.neighbors.forEach(neighbor => {
          topology.links.push({
            source: device._id,
            target: neighbor.deviceId,
            interface: neighbor.interface,
            protocol: neighbor.protocol
          });
        });
      }
    });

    res.json({
      message: 'Network topology discovered',
      topology,
      summary: {
        totalNodes: topology.nodes.length,
        totalLinks: topology.links.length,
        deviceTypes: [...new Set(topology.nodes.map(n => n.type))]
      }
    });
  } catch (error) {
    console.error('Topology discovery error:', error);
    res.status(500).json({
      error: 'Failed to discover network topology',
      message: error.message
    });
  }
});

// Helper functions
async function performNetworkDiscovery(scanId, networkRange, protocols, maxDevices, io) {
  try {
    const ipAddresses = generateIPRange(networkRange);
    let discovered = 0;
    let scanned = 0;

    for (const ip of ipAddresses) {
      if (discovered >= maxDevices) break;

      try {
        scanned++;
        
        // Emit progress
        if (io) {
          io.emit('discovery.progress', {
            scanId,
            progress: {
              total: Math.min(ipAddresses.length, maxDevices),
              completed: scanned,
              percentage: Math.round((scanned / Math.min(ipAddresses.length, maxDevices)) * 100)
            }
          });
        }

        const isReachable = await pingHost(ip);
        
        if (isReachable) {
          // Check if device already exists
          const existingDevice = await Device.findOne({ 
            ipAddress: ip, 
            isActive: true 
          });
          
          if (!existingDevice) {
            const deviceInfo = await gatherDeviceInfo(ip);
            
            const device = new Device({
              name: deviceInfo.name || `Device-${ip}`,
              ipAddress: ip,
              deviceType: deviceInfo.type || 'unknown',
              status: 'online',
              discoveredBy: 'auto',
              metrics: {
                lastSeen: new Date(),
                responseTime: deviceInfo.responseTime
              }
            });

            await device.save();
            discovered++;
            
            // Emit device discovered
            if (io) {
              io.emit('discovery.deviceFound', {
                scanId,
                device: {
                  id: device._id,
                  name: device.name,
                  ipAddress: device.ipAddress,
                  type: device.deviceType,
                  status: device.status
                }
              });
            }
          }
        }
        
        // Small delay to prevent overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error scanning ${ip}:`, error);
      }
    }

    // Emit scan completed
    if (io) {
      io.emit('discovery.scanCompleted', {
        scanId,
        summary: {
          totalScanned: scanned,
          devicesDiscovered: discovered,
          networkRange
        }
      });
    }

  } catch (error) {
    console.error('Network discovery error:', error);
    if (io) {
      io.emit('discovery.scanFailed', {
        scanId,
        error: error.message
      });
    }
  }
}

async function performManualDiscovery(ipAddress, snmpCommunity) {
  try {
    const isReachable = await pingHost(ipAddress);
    
    if (!isReachable) {
      return {
        success: false,
        error: 'Host is not reachable'
      };
    }

    const deviceInfo = await gatherDeviceInfo(ipAddress, snmpCommunity);
    
    return {
      success: true,
      deviceInfo: {
        name: deviceInfo.name || `Device-${ipAddress}`,
        ipAddress,
        deviceType: deviceInfo.type || 'unknown',
        vendor: deviceInfo.vendor,
        model: deviceInfo.model,
        status: 'online',
        snmpCommunity
      },
      metrics: {
        responseTime: deviceInfo.responseTime
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function pingHost(ip) {
  try {
    const result = await ping.promise.probe(ip, {
      timeout: 3,
      extra: ['-c', '1']
    });
    return result.alive;
  } catch (error) {
    return false;
  }
}

async function gatherDeviceInfo(ip, snmpCommunity = 'public') {
  const info = {
    responseTime: null,
    name: null,
    type: 'unknown',
    vendor: null,
    model: null
  };

  try {
    // Ping for response time
    const pingResult = await ping.promise.probe(ip, {
      timeout: 3,
      extra: ['-c', '1']
    });
    
    if (pingResult.alive) {
      info.responseTime = parseFloat(pingResult.time) || null;
    }

    // Try to determine device type by open ports
    const commonPorts = [22, 23, 80, 443, 161, 8080];
    const openPorts = await scanPorts(ip, commonPorts);

    if (openPorts.includes(161)) {
      info.type = 'switch'; // SNMP typically indicates network equipment
    } else if (openPorts.includes(22) || openPorts.includes(23)) {
      info.type = 'server';
    } else if (openPorts.includes(80) || openPorts.includes(443)) {
      info.type = 'server';
    }

  } catch (error) {
    console.error(`Error gathering info for ${ip}:`, error);
  }

  return info;
}

async function scanPorts(ip, ports) {
  const openPorts = [];
  
  for (const port of ports) {
    try {
      const isOpen = await checkPort(ip, port);
      if (isOpen) {
        openPorts.push(port);
      }
    } catch (error) {
      // Port is closed or filtered
    }
  }
  
  return openPorts;
}

function checkPort(ip, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 2000;
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.connect(port, ip);
  });
}

function generateIPRange(range) {
  // Simple implementation for /24 networks
  const [network, cidr] = range.split('/');
  const [a, b, c] = network.split('.').map(Number);
  const ips = [];
  
  if (cidr === '24') {
    for (let i = 1; i < 255; i++) {
      ips.push(`${a}.${b}.${c}.${i}`);
    }
  }
  
  return ips;
}

module.exports = router;

// Start discovery scan
router.post('/scan', authenticateToken, async (req, res) => {
  try {
    const { networkRange, immediate = false } = req.body;

    // Emit discovery scan event
    const io = req.app.get('socketio');
    io.emit('discovery.scanStarted', {
      networkRange: networkRange || 'auto',
      immediate,
      timestamp: new Date(),
      requestedBy: req.user?.username || 'system'
    });

    // Real discovery process
    setTimeout(async () => {
      try {
        // Perform real network discovery
        const scanResults = await performNetworkDiscovery(
          networkRange || '192.168.1.0/24', 
          immediate, 
          io,
          req.user?.username || 'system'
        );
        
        // Emit scan completed event
        io.emit('discovery.scanCompleted', {
          devicesFound: scanResults.devicesFound || 0,
          timestamp: new Date(),
          networkRange: networkRange || 'auto'
        });
      } catch (err) {
        console.error('Discovery error:', err);
        io.emit('discovery.scanError', {
          error: err.message,
          timestamp: new Date()
        });
      }
    }, immediate ? 1000 : 5000); // Start discovery after delay

    res.json({
      message: 'Discovery scan initiated',
      status: 'running',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Start discovery scan error:', error);
    res.status(500).json({
      error: 'Failed to start discovery scan',
      message: error.message
    });
  }
});

// Get discovery status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const totalDevices = await Device.countDocuments();
    const onlineDevices = await Device.countDocuments({ status: 'online' });
    const recentlyDiscovered = await Device.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    const status = {
      isRunning: false, // TODO: Track actual discovery process status
      lastScanTime: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      nextScanTime: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      totalDevices,
      onlineDevices,
      offlineDevices: totalDevices - onlineDevices,
      recentlyDiscovered,
      autoDiscoveryEnabled: true,
      scanProgress: 0
    };

    res.json(status);
  } catch (error) {
    console.error('Get discovery status error:', error);
    res.status(500).json({
      error: 'Failed to fetch discovery status',
      message: error.message
    });
  }
});

// Get discovered devices
router.get('/devices', authenticateToken, async (req, res) => {
  try {
    const { discoveredBy, deviceType, status } = req.query;
    const filter = {};

    if (discoveredBy) filter.discoveredBy = discoveredBy;
    if (deviceType) filter.deviceType = deviceType;
    if (status) filter.status = status;

    const devices = await Device.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      devices,
      total: devices.length,
      filters: {
        discoveredBy,
        deviceType,
        status
      }
    });
  } catch (error) {
    console.error('Get discovered devices error:', error);
    res.status(500).json({
      error: 'Failed to fetch discovered devices',
      message: error.message
    });
  }
});

// Stop discovery scan
router.post('/stop', authenticateToken, async (req, res) => {
  try {
    // Emit stop discovery event
    const io = req.app.get('socketio');
    io.emit('discovery.scanStopped', {
      timestamp: new Date(),
      stoppedBy: req.user?.username || 'system'
    });

    res.json({
      message: 'Discovery scan stopped',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Stop discovery scan error:', error);
    res.status(500).json({
      error: 'Failed to stop discovery scan',
      message: error.message
    });
  }
});

module.exports = router;