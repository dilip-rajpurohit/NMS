const Device = require('../models/Device');
const logger = require('../utils/logger');
const ping = require('ping');
const os = require('os');

/**
 * Enhanced Monitoring Service
 * Real-time system health and network performance monitoring
 */
class EnhancedMonitoring {
  constructor(socketIO) {
    this.io = socketIO;
    this.isActive = false;
    this.monitoring = {
      devices: new Map(),
      system: new Map(),
      network: new Map(),
      alerts: new Map()
    };
    
    this.intervals = {
      deviceHealth: null,
      systemMetrics: null,
      networkPerformance: null,
      alertProcessing: null
    };
    
    this.config = {
      deviceHealthInterval: 30000, // 30 seconds
      systemMetricsInterval: 15000, // 15 seconds
      networkPerformanceInterval: 60000, // 1 minute
      alertProcessingInterval: 10000 // 10 seconds
    };
    
    this.metrics = {
      startTime: null,
      totalChecks: 0,
      successfulChecks: 0,
      alertsGenerated: 0,
      systemUptime: 0
    };
  }

  /**
   * Start enhanced monitoring services
   */
  async startEnhancedServices() {
    if (this.isActive) {
      logger.info('🔄 Enhanced monitoring already active');
      return;
    }

    try {
      logger.info('🚀 Starting Enhanced Monitoring Services...');
      this.isActive = true;
      this.metrics.startTime = new Date();

      // Start device health monitoring
      await this.startDeviceHealthMonitoring();
      
      // Start system metrics monitoring
      await this.startSystemMetricsMonitoring();
      
      // Start network performance monitoring
      await this.startNetworkPerformanceMonitoring();
      
      // Start alert processing
      await this.startAlertProcessing();

      logger.info('✅ Enhanced monitoring services started successfully');
      this.broadcastServiceStatus('started');

    } catch (error) {
      logger.error('❌ Failed to start enhanced monitoring:', error);
      this.isActive = false;
      throw error;
    }
  }

  /**
   * Start device health monitoring
   */
  async startDeviceHealthMonitoring() {
    this.intervals.deviceHealth = setInterval(async () => {
      await this.checkDevicesHealth();
    }, this.config.deviceHealthInterval);

    // Immediate check
    await this.checkDevicesHealth();
  }

  /**
   * Start system metrics monitoring
   */
  async startSystemMetricsMonitoring() {
    this.intervals.systemMetrics = setInterval(async () => {
      await this.collectSystemMetrics();
    }, this.config.systemMetricsInterval);

    // Immediate check
    await this.collectSystemMetrics();
  }

  /**
   * Start network performance monitoring
   */
  async startNetworkPerformanceMonitoring() {
    this.intervals.networkPerformance = setInterval(async () => {
      await this.analyzeNetworkPerformance();
    }, this.config.networkPerformanceInterval);

    // Immediate check
    await this.analyzeNetworkPerformance();
  }

  /**
   * Start alert processing
   */
  async startAlertProcessing() {
    this.intervals.alertProcessing = setInterval(async () => {
      await this.processAlerts();
    }, this.config.alertProcessingInterval);
  }

  /**
   * Check health of all devices
   */
  async checkDevicesHealth() {
    try {
      const devices = await Device.find({ status: { $ne: 'deleted' } });
      logger.debug(`🏥 Checking health for ${devices.length} devices`);

      const healthResults = [];

      for (const device of devices) {
        const healthStatus = await this.checkDeviceHealth(device);
        this.monitoring.devices.set(device._id.toString(), healthStatus);
        healthResults.push(healthStatus);
        this.metrics.totalChecks++;
        if (healthStatus.status === 'online') this.metrics.successfulChecks++;
      }

      // Broadcast health update
      this.broadcastHealthUpdate('devices', healthResults);

    } catch (error) {
      logger.error('❌ Device health check failed:', error);
    }
  }

  /**
   * Check individual device health
   */
  async checkDeviceHealth(device) {
    const startTime = Date.now();
    
    try {
      const pingResult = await ping.promise.probe(device.ipAddress, {
        timeout: 5,
        min_reply: 1
      });

      const responseTime = Date.now() - startTime;
      
      const healthStatus = {
        deviceId: device._id,
        deviceName: device.name || device.ipAddress,
        ipAddress: device.ipAddress,
        status: pingResult.alive ? 'online' : 'offline',
        responseTime: responseTime,
        pingTime: pingResult.time,
        packetLoss: pingResult.packetLoss || 0,
        lastCheck: new Date(),
        healthScore: this.calculateHealthScore(pingResult, responseTime)
      };

      // Update device status in database
      await Device.findByIdAndUpdate(device._id, {
        status: healthStatus.status,
        lastSeen: new Date(),
        responseTime: responseTime
      });

      return healthStatus;

    } catch (error) {
      logger.error(`❌ Health check failed for ${device.ipAddress}:`, error);
      
      const healthStatus = {
        deviceId: device._id,
        deviceName: device.name || device.ipAddress,
        ipAddress: device.ipAddress,
        status: 'error',
        responseTime: -1,
        error: error.message,
        lastCheck: new Date(),
        healthScore: 0
      };

      await Device.findByIdAndUpdate(device._id, {
        status: 'offline',
        lastSeen: new Date(),
        responseTime: -1
      });

      return healthStatus;
    }
  }

  /**
   * Calculate device health score
   */
  calculateHealthScore(pingResult, responseTime) {
    if (!pingResult.alive) return 0;

    let score = 100;
    
    // Deduct points for high response time
    if (responseTime > 100) score -= 10;
    if (responseTime > 200) score -= 10;
    if (responseTime > 500) score -= 20;

    // Deduct points for packet loss
    if (pingResult.packetLoss > 0) score -= pingResult.packetLoss * 5;

    // Deduct points for high ping time
    if (pingResult.time > 50) score -= 10;
    if (pingResult.time > 100) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    try {
      const metrics = {
        timestamp: new Date(),
        cpu: {
          usage: await this.getCPUUsage(),
          loadAverage: os.loadavg(),
          cores: os.cpus().length
        },
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
        },
        system: {
          uptime: os.uptime(),
          platform: os.platform(),
          hostname: os.hostname(),
          nodeVersion: process.version
        },
        process: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage()
        }
      };

      this.monitoring.system.set('current', metrics);
      this.metrics.systemUptime = metrics.process.uptime;

      // Broadcast system metrics
      this.broadcastHealthUpdate('system', metrics);

      logger.debug('📊 System metrics collected', {
        cpu: metrics.cpu.usage.toFixed(2) + '%',
        memory: metrics.memory.usagePercent.toFixed(2) + '%'
      });

    } catch (error) {
      logger.error('❌ System metrics collection failed:', error);
    }
  }

  /**
   * Get CPU usage percentage
   */
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = Date.now();
      
      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const currentTime = Date.now();
        const timeDiff = currentTime - startTime;
        
        const cpuPercent = (currentUsage.user + currentUsage.system) / (timeDiff * 1000) * 100;
        resolve(Math.min(100, Math.max(0, cpuPercent)));
      }, 100);
    });
  }

  /**
   * Analyze network performance
   */
  async analyzeNetworkPerformance() {
    try {
      logger.debug('🌐 Analyzing network performance');
      
      const devices = await Device.find({ status: 'online' });
      const networkMetrics = {
        timestamp: new Date(),
        totalDevices: devices.length,
        onlineDevices: devices.filter(d => d.status === 'online').length,
        averageResponseTime: 0,
        networkHealth: 0,
        topologyMetrics: await this.analyzeTopology()
      };

      if (devices.length > 0) {
        const responseTimes = devices
          .filter(d => d.responseTime > 0)
          .map(d => d.responseTime);
        
        if (responseTimes.length > 0) {
          networkMetrics.averageResponseTime = 
            responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        }

        networkMetrics.networkHealth = this.calculateNetworkHealth(devices);
      }

      this.monitoring.network.set('performance', networkMetrics);

      // Broadcast network performance
      this.broadcastHealthUpdate('network', networkMetrics);

    } catch (error) {
      logger.error('❌ Network performance analysis failed:', error);
    }
  }

  /**
   * Analyze network topology
   */
  async analyzeTopology() {
    try {
      const devices = await Device.find({ status: { $ne: 'deleted' } });
      
      return {
        totalNodes: devices.length,
        activeNodes: devices.filter(d => d.status === 'online').length,
        deviceTypes: devices.reduce((acc, device) => {
          const type = device.deviceType || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {}),
        networkSegments: this.identifyNetworkSegments(devices)
      };
    } catch (error) {
      logger.error('❌ Topology analysis failed:', error);
      return {};
    }
  }

  /**
   * Identify network segments
   */
  identifyNetworkSegments(devices) {
    const segments = {};
    
    devices.forEach(device => {
      const subnet = this.getSubnet(device.ipAddress);
      if (!segments[subnet]) {
        segments[subnet] = { count: 0, devices: [] };
      }
      segments[subnet].count++;
      segments[subnet].devices.push(device.name || device.ipAddress);
    });
    
    return segments;
  }

  /**
   * Get subnet from IP address
   */
  getSubnet(ipAddress) {
    const parts = ipAddress.split('.');
    return parts.slice(0, 3).join('.') + '.0/24';
  }

  /**
   * Calculate overall network health
   */
  calculateNetworkHealth(devices) {
    if (devices.length === 0) return 100;

    const onlineDevices = devices.filter(d => d.status === 'online').length;
    const deviceAvailability = (onlineDevices / devices.length) * 40;

    const avgResponseTime = devices
      .filter(d => d.responseTime > 0)
      .reduce((sum, d, _, arr) => sum + d.responseTime / arr.length, 0);
    
    let performanceScore = 25;
    if (avgResponseTime > 100) performanceScore -= 5;
    if (avgResponseTime > 200) performanceScore -= 10;
    if (avgResponseTime > 500) performanceScore -= 10;

    const infraScore = 20; // Base infrastructure score
    const systemScore = 10; // System resources score
    const alertScore = 5; // Alert impact score

    return Math.min(100, deviceAvailability + performanceScore + infraScore + systemScore + alertScore);
  }

  /**
   * Process alerts and notifications
   */
  async processAlerts() {
    try {
      const alerts = [];
      
      // Check for system alerts
      const systemMetrics = this.monitoring.system.get('current');
      if (systemMetrics) {
        if (systemMetrics.memory.usagePercent > 90) {
          alerts.push({
            type: 'critical',
            category: 'system',
            message: 'High memory usage detected',
            value: systemMetrics.memory.usagePercent.toFixed(2) + '%',
            timestamp: new Date()
          });
        }
        
        if (systemMetrics.cpu.usage > 95) {
          alerts.push({
            type: 'critical',
            category: 'system',
            message: 'High CPU usage detected',
            value: systemMetrics.cpu.usage.toFixed(2) + '%',
            timestamp: new Date()
          });
        }
      }

      // Check for device alerts
      for (const [deviceId, health] of this.monitoring.devices) {
        if (health.status === 'offline') {
          alerts.push({
            type: 'warning',
            category: 'device',
            message: `Device offline: ${health.deviceName}`,
            deviceId: deviceId,
            timestamp: new Date()
          });
        }
        
        if (health.responseTime > 1000) {
          alerts.push({
            type: 'warning',
            category: 'performance',
            message: `Slow response time: ${health.deviceName}`,
            value: health.responseTime + 'ms',
            deviceId: deviceId,
            timestamp: new Date()
          });
        }
      }

      if (alerts.length > 0) {
        this.metrics.alertsGenerated += alerts.length;
        this.broadcastAlerts(alerts);
        logger.warn(`🚨 ${alerts.length} alerts generated`);
      }

    } catch (error) {
      logger.error('❌ Alert processing failed:', error);
    }
  }

  /**
   * Broadcast health updates
   */
  broadcastHealthUpdate(category, data) {
    if (this.io) {
      this.io.to('monitoring').emit('enhanced-monitoring-update', {
        category,
        data,
        timestamp: new Date()
      });
    }
  }

  /**
   * Broadcast alerts
   */
  broadcastAlerts(alerts) {
    if (this.io) {
      this.io.to('monitoring').emit('enhanced-monitoring-alerts', {
        alerts,
        timestamp: new Date()
      });
    }
  }

  /**
   * Broadcast service status
   */
  broadcastServiceStatus(status) {
    if (this.io) {
      this.io.to('monitoring').emit('enhanced-service-status', {
        status,
        metrics: this.getServiceMetrics(),
        timestamp: new Date()
      });
    }
  }

  /**
   * Get service metrics
   */
  getServiceMetrics() {
    return {
      isActive: this.isActive,
      uptime: this.metrics.startTime ? Date.now() - this.metrics.startTime : 0,
      totalChecks: this.metrics.totalChecks,
      successfulChecks: this.metrics.successfulChecks,
      successRate: this.metrics.totalChecks > 0 ? 
        (this.metrics.successfulChecks / this.metrics.totalChecks) * 100 : 0,
      alertsGenerated: this.metrics.alertsGenerated,
      monitoredDevices: this.monitoring.devices.size
    };
  }

  /**
   * Check if service is active
   */
  isServiceActive() {
    return this.isActive;
  }

  /**
   * Stop enhanced monitoring
   */
  async stopEnhancedServices() {
    logger.info('🛑 Stopping Enhanced Monitoring Services...');
    this.isActive = false;

    // Clear all intervals
    Object.values(this.intervals).forEach(interval => {
      if (interval) clearInterval(interval);
    });

    // Clear monitoring data
    this.monitoring.devices.clear();
    this.monitoring.system.clear();
    this.monitoring.network.clear();
    this.monitoring.alerts.clear();

    logger.info('✅ Enhanced monitoring services stopped');
    this.broadcastServiceStatus('stopped');
  }
}

module.exports = EnhancedMonitoring;