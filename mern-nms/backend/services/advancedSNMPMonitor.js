const snmp = require('net-snmp');
const Device = require('../models/Device');
const logger = require('../utils/logger');

/**
 * Advanced SNMP Monitoring Service
 * Enterprise-grade network device monitoring with intelligent polling
 */
class AdvancedSNMPMonitor {
  constructor(socketIO) {
    this.io = socketIO;
    this.sessions = new Map(); // Active SNMP sessions
    this.pollingIntervals = new Map(); // Device-specific polling intervals
    this.deviceProfiles = new Map(); // Device-specific monitoring profiles
    this.performanceHistory = new Map(); // Historical performance data
    this.anomalyThresholds = {
      responseTime: { warning: 200, critical: 500 },
      cpuUtilization: { warning: 80, critical: 95 },
      memoryUtilization: { warning: 85, critical: 95 },
      interfaceUtilization: { warning: 80, critical: 95 },
      errorRate: { warning: 1, critical: 5 }
    };
    
    this.standardOIDs = {
      system: {
        sysDescr: '1.3.6.1.2.1.1.1.0',
        sysUpTime: '1.3.6.1.2.1.1.3.0',
        sysName: '1.3.6.1.2.1.1.5.0'
      },
      interfaces: {
        ifTable: '1.3.6.1.2.1.2.2.1',
        ifDescr: '1.3.6.1.2.1.2.2.1.2',
        ifType: '1.3.6.1.2.1.2.2.1.3',
        ifMtu: '1.3.6.1.2.1.2.2.1.4',
        ifSpeed: '1.3.6.1.2.1.2.2.1.5',
        ifPhysAddress: '1.3.6.1.2.1.2.2.1.6',
        ifOperStatus: '1.3.6.1.2.1.2.2.1.8',
        ifInOctets: '1.3.6.1.2.1.2.2.1.10',
        ifOutOctets: '1.3.6.1.2.1.2.2.1.16',
        ifInErrors: '1.3.6.1.2.1.2.2.1.14',
        ifOutErrors: '1.3.6.1.2.1.2.2.1.20'
      },
      cpu: {
        hrProcessorLoad: '1.3.6.1.2.1.25.3.3.1.2'
      },
      memory: {
        hrMemorySize: '1.3.6.1.2.1.25.2.2.0',
        hrStorageUsed: '1.3.6.1.2.1.25.2.3.1.6'
      }
    };
    
    this.isMonitoring = false;
    this.monitoringStats = {
      devicesMonitored: 0,
      successfulPolls: 0,
      failedPolls: 0,
      startTime: null
    };
  }

  /**
   * Start advanced monitoring for all network devices
   */
  async startAdvancedMonitoring() {
    if (this.isMonitoring) {
      logger.info('🔄 Advanced SNMP monitoring already running');
      return;
    }

    try {
      logger.info('🚀 Starting Advanced SNMP Monitoring Engine...');
      this.isMonitoring = true;
      this.monitoringStats.startTime = new Date();

      // Get all devices and initialize monitoring
      const devices = await Device.find({ status: { $ne: 'deleted' } });
      
      for (const device of devices) {
        await this.initializeDeviceMonitoring(device);
      }

      // Start global monitoring cycle
      this.startGlobalMonitoringCycle();
      
      // Start performance analysis cycle
      this.startPerformanceAnalysis();
      
      // Start anomaly detection cycle
      this.startAnomalyDetection();

      logger.info(`✅ Advanced SNMP monitoring started for ${devices.length} devices`);
      this.broadcastMonitoringStatus('started', devices.length);

    } catch (error) {
      logger.error('🚨 Failed to start advanced SNMP monitoring:', error);
      this.isMonitoring = false;
      throw error;
    }
  }

  /**
   * Initialize monitoring for a specific device
   */
  async initializeDeviceMonitoring(device) {
    try {
      const profile = await this.createDeviceProfile(device);
      this.deviceProfiles.set(device._id.toString(), profile);

      // Create SNMP session for device
      const session = this.createSNMPSession(device);
      this.sessions.set(device._id.toString(), session);

      // Set up device-specific polling
      const pollingInterval = this.calculateOptimalPollingInterval(device);
      this.startDevicePolling(device, pollingInterval);

      logger.info(`📊 Initialized advanced monitoring for ${device.name || device.ipAddress}`);
      
    } catch (error) {
      logger.error(`❌ Failed to initialize monitoring for ${device.ipAddress}:`, error);
    }
  }

  /**
   * Create device-specific monitoring profile
   */
  async createDeviceProfile(device) {
    const deviceType = device.deviceType || device.type || 'unknown';
    
    const baseProfile = {
      deviceId: device._id,
      deviceType,
      ipAddress: device.ipAddress,
      snmpCommunity: device.snmpCommunity || 'public',
      snmpVersion: device.snmpVersion || 1,
      criticality: this.calculateDeviceCriticality(device),
      monitoringLevel: 'comprehensive'
    };

    // Customize monitoring based on device type
    switch (deviceType) {
      case 'router':
      case 'core-switch':
        return {
          ...baseProfile,
          pollingInterval: 30000, // 30 seconds for critical devices
          metrics: ['cpu', 'memory', 'interfaces', 'routing'],
          alertThresholds: { ...this.anomalyThresholds, responseTime: { warning: 100, critical: 250 } }
        };
        
      case 'switch':
      case 'access-point':
        return {
          ...baseProfile,
          pollingInterval: 60000, // 1 minute for standard devices
          metrics: ['interfaces', 'cpu', 'memory'],
          alertThresholds: this.anomalyThresholds
        };
        
      case 'server':
        return {
          ...baseProfile,
          pollingInterval: 45000, // 45 seconds for servers
          metrics: ['cpu', 'memory', 'disk', 'network'],
          alertThresholds: { ...this.anomalyThresholds, cpuUtilization: { warning: 70, critical: 90 } }
        };
        
      default:
        return {
          ...baseProfile,
          pollingInterval: 120000, // 2 minutes for other devices
          metrics: ['basic'],
          alertThresholds: this.anomalyThresholds
        };
    }
  }

  /**
   * Create optimized SNMP session
   */
  createSNMPSession(device) {
    const options = {
      port: device.snmpPort || 161,
      retries: 2,
      timeout: 5000,
      version: device.snmpVersion === 2 ? snmp.Version2c : snmp.Version1
    };

    const session = snmp.createSession(device.ipAddress, device.snmpCommunity || 'public', options);
    
    // Handle session errors
    session.on('error', (error) => {
      logger.error(`SNMP session error for ${device.ipAddress}:`, error);
      this.handleDeviceError(device, error);
    });

    return session;
  }

  /**
   * Start device-specific polling
   */
  startDevicePolling(device, interval) {
    const deviceId = device._id.toString();
    
    // Clear any existing polling interval
    if (this.pollingIntervals.has(deviceId)) {
      clearInterval(this.pollingIntervals.get(deviceId));
    }

    const pollingTimer = setInterval(async () => {
      await this.pollDevice(device);
    }, interval);

    this.pollingIntervals.set(deviceId, pollingTimer);
    
    // Immediate first poll
    setImmediate(() => this.pollDevice(device));
  }

  /**
   * Comprehensive device polling
   */
  async pollDevice(device) {
    const startTime = Date.now();
    const deviceId = device._id.toString();
    const profile = this.deviceProfiles.get(deviceId);
    const session = this.sessions.get(deviceId);

    if (!session || !profile) return;

    try {
      logger.debug(`🔍 Polling device: ${device.name || device.ipAddress}`);

      const metrics = {};
      
      // Collect basic system information
      metrics.system = await this.collectSystemMetrics(session);
      
      // Collect performance metrics based on device profile
      if (profile.metrics.includes('cpu')) {
        metrics.cpu = await this.collectCPUMetrics(session);
      }
      
      if (profile.metrics.includes('memory')) {
        metrics.memory = await this.collectMemoryMetrics(session);
      }
      
      if (profile.metrics.includes('interfaces')) {
        const currentInterfaces = await this.collectInterfaceMetrics(session);
        const deviceHistory = this.performanceHistory.get(deviceId);
        const previousMetrics = deviceHistory && deviceHistory.length > 0 ? deviceHistory[deviceHistory.length - 1] : null;
        const previousInterfaces = previousMetrics ? previousMetrics.interfaces : null;
        
        // Calculate interface utilization with traffic rates
        metrics.interfaces = this.calculateInterfaceUtilization(deviceId, currentInterfaces, previousInterfaces);
        
        // Calculate network congestion metrics
        metrics.networkCongestion = this.calculateNetworkCongestion(metrics.interfaces);
      }

      // Calculate response time
      const responseTime = Date.now() - startTime;
      metrics.responseTime = responseTime;

      // Update device status based on successful poll
      await this.updateDeviceStatus(device, 'online', metrics);
      
      // Store performance history
      this.storePerformanceHistory(deviceId, metrics);
      
      // Analyze for anomalies
      await this.analyzeMetricsForAnomalies(device, metrics);
      
      // Broadcast real-time updates
      this.broadcastDeviceMetrics(device, metrics);
      
      this.monitoringStats.successfulPolls++;
      logger.debug(`✅ Successfully polled ${device.ipAddress} in ${responseTime}ms`);

    } catch (error) {
      logger.error(`❌ Failed to poll device ${device.ipAddress}:`, error);
      
      // Update device status to offline
      await this.updateDeviceStatus(device, 'offline', { error: error.message });
      
      this.monitoringStats.failedPolls++;
      this.handleDeviceError(device, error);
    }
  }

  /**
   * Collect system metrics via SNMP
   */
  async collectSystemMetrics(session) {
    return new Promise((resolve, reject) => {
      const oids = [
        this.standardOIDs.system.sysDescr,
        this.standardOIDs.system.sysUpTime,
        this.standardOIDs.system.sysName
      ];

      session.get(oids, (error, varbinds) => {
        if (error) {
          reject(error);
        } else {
          const metrics = {
            description: varbinds[0]?.value?.toString() || 'Unknown',
            uptime: varbinds[1]?.value ? parseInt(varbinds[1].value) / 100 : 0, // Convert to seconds
            systemName: varbinds[2]?.value?.toString() || 'Unknown'
          };
          resolve(metrics);
        }
      });
    });
  }

  /**
   * Collect CPU utilization metrics
   */
  async collectCPUMetrics(session) {
    return new Promise((resolve, reject) => {
      session.walk(this.standardOIDs.cpu.hrProcessorLoad, (varbinds) => {
        if (varbinds) {
          const cpuLoads = varbinds.map(vb => parseInt(vb.value) || 0);
          const avgCpuLoad = cpuLoads.reduce((sum, load) => sum + load, 0) / cpuLoads.length;
          
          resolve({
            utilization: avgCpuLoad,
            cores: cpuLoads.length,
            individualLoads: cpuLoads
          });
        }
      }, (error) => {
        if (error) reject(error);
        else resolve({ utilization: 0, cores: 1, individualLoads: [0] });
      });
    });
  }

  /**
   * Collect memory utilization metrics
   */
  async collectMemoryMetrics(session) {
    return new Promise((resolve, reject) => {
      const oids = [this.standardOIDs.memory.hrMemorySize];
      
      session.get(oids, (error, varbinds) => {
        if (error) {
          reject(error);
        } else {
          const totalMemory = varbinds[0]?.value ? parseInt(varbinds[0].value) : 0;
          
          // Get memory usage from storage table
          session.walk('1.3.6.1.2.1.25.2.3.1', (usageVarbinds) => {
            if (usageVarbinds && usageVarbinds.length > 0) {
              const memoryUsage = usageVarbinds
                .filter(vb => vb.oid.includes('.6')) // Used storage
                .reduce((sum, vb) => sum + parseInt(vb.value || 0), 0);
              
              const utilization = totalMemory > 0 ? (memoryUsage / totalMemory) * 100 : 0;
              
              resolve({
                totalMemory,
                usedMemory: memoryUsage,
                utilization: Math.min(100, utilization)
              });
            } else {
              resolve({ totalMemory: 0, usedMemory: 0, utilization: 0 });
            }
          }, (error) => {
            if (error) reject(error);
          });
        }
      });
    });
  }

  /**
   * Collect interface metrics with traffic rate and utilization calculation
   */
  async collectInterfaceMetrics(session) {
    return new Promise((resolve, reject) => {
      const interfaces = [];
      
      session.tableColumns(this.standardOIDs.interfaces.ifTable, [2, 5, 8, 10, 16, 14, 20], (error, table) => {
        if (error) {
          reject(error);
        } else {
          const timestamp = Date.now();
          
          for (const index in table) {
            const row = table[index];
            const interfaceData = {
              index: parseInt(index),
              description: row[2]?.toString() || `Interface ${index}`,
              speed: parseInt(row[5] || 0), // Interface speed in bps
              operStatus: row[8] === 1 ? 'up' : 'down',
              inOctets: parseInt(row[10] || 0),
              outOctets: parseInt(row[16] || 0),
              inErrors: parseInt(row[14] || 0),
              outErrors: parseInt(row[20] || 0),
              timestamp
            };
            
            interfaces.push(interfaceData);
          }
          
          resolve(interfaces);
        }
      });
    });
  }

  /**
   * Calculate traffic rates and interface utilization from deltas
   */
  calculateInterfaceUtilization(deviceId, currentInterfaces, previousInterfaces) {
    if (!previousInterfaces || previousInterfaces.length === 0) {
      return currentInterfaces.map(iface => ({
        ...iface,
        inRate: 0,
        outRate: 0,
        totalRate: 0,
        utilization: 0,
        errorRate: 0
      }));
    }

    return currentInterfaces.map(currentIface => {
      const prevIface = previousInterfaces.find(p => p.index === currentIface.index);
      
      if (!prevIface) {
        return {
          ...currentIface,
          inRate: 0,
          outRate: 0,
          totalRate: 0,
          utilization: 0,
          errorRate: 0
        };
      }

      const timeDelta = (currentIface.timestamp - prevIface.timestamp) / 1000; // seconds
      
      if (timeDelta <= 0) {
        return {
          ...currentIface,
          inRate: 0,
          outRate: 0,
          totalRate: 0,
          utilization: 0,
          errorRate: 0
        };
      }

      // Calculate byte rates (octets per second)
      const inOctetsDelta = Math.max(0, currentIface.inOctets - prevIface.inOctets);
      const outOctetsDelta = Math.max(0, currentIface.outOctets - prevIface.outOctets);
      const inErrorsDelta = Math.max(0, currentIface.inErrors - prevIface.inErrors);
      const outErrorsDelta = Math.max(0, currentIface.outErrors - prevIface.outErrors);
      
      const inRate = inOctetsDelta / timeDelta; // bytes per second
      const outRate = outOctetsDelta / timeDelta; // bytes per second
      const totalRate = inRate + outRate;
      const errorRate = (inErrorsDelta + outErrorsDelta) / timeDelta;

      // Calculate utilization percentage
      let utilization = 0;
      if (currentIface.speed > 0) {
        const speedInBytesPerSec = currentIface.speed / 8; // Convert bits to bytes
        utilization = (totalRate / speedInBytesPerSec) * 100;
      }

      return {
        ...currentIface,
        inRate: Math.round(inRate),
        outRate: Math.round(outRate), 
        totalRate: Math.round(totalRate),
        utilization: Math.min(100, Math.max(0, utilization)),
        errorRate: errorRate
      };
    });
  }

  /**
   * Calculate network congestion metrics from interface data
   */
  calculateNetworkCongestion(interfaces) {
    if (!interfaces || interfaces.length === 0) {
      return {
        avgUtilization: 0,
        maxUtilization: 0,
        totalTrafficRate: 0,
        congestionLevel: 'none',
        errorRate: 0,
        activeInterfaces: 0
      };
    }

    const activeInterfaces = interfaces.filter(iface => iface.operStatus === 'up');
    const totalTrafficRate = interfaces.reduce((sum, iface) => sum + (iface.totalRate || 0), 0);
    const totalErrorRate = interfaces.reduce((sum, iface) => sum + (iface.errorRate || 0), 0);
    const avgErrorRate = interfaces.length > 0 ? totalErrorRate / interfaces.length : 0;
    
    const utilizations = interfaces.map(iface => iface.utilization || 0);
    const avgUtilization = utilizations.length > 0 ? utilizations.reduce((sum, util) => sum + util, 0) / utilizations.length : 0;
    const maxUtilization = utilizations.length > 0 ? Math.max(...utilizations) : 0;

    // Determine congestion level
    let congestionLevel = 'none';
    if (maxUtilization > 90) congestionLevel = 'critical';
    else if (maxUtilization > 75) congestionLevel = 'high';
    else if (maxUtilization > 50) congestionLevel = 'moderate';
    else if (maxUtilization > 25) congestionLevel = 'low';

    return {
      avgUtilization: Math.round(avgUtilization * 100) / 100,
      maxUtilization: Math.round(maxUtilization * 100) / 100,
      totalTrafficRate: Math.round(totalTrafficRate),
      congestionLevel,
      errorRate: Math.round(avgErrorRate * 100) / 100,
      activeInterfaces: activeInterfaces.length
    };
  }

  /**
   * Update device status in database
   */
  async updateDeviceStatus(device, status, metrics) {
    try {
      const updateData = {
        status,
        lastSeen: new Date(),
        metrics: {
          responseTime: metrics.responseTime || 0,
          ...metrics
        }
      };

      await Device.findByIdAndUpdate(device._id, updateData);
      
    } catch (error) {
      logger.error(`Failed to update device status for ${device.ipAddress}:`, error);
    }
  }

  /**
   * Store performance history for trend analysis
   */
  storePerformanceHistory(deviceId, metrics) {
    if (!this.performanceHistory.has(deviceId)) {
      this.performanceHistory.set(deviceId, []);
    }
    
    const history = this.performanceHistory.get(deviceId);
    history.push({
      timestamp: new Date(),
      metrics: { ...metrics }
    });
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Analyze metrics for anomalies
   */
  async analyzeMetricsForAnomalies(device, metrics) {
    const deviceId = device._id.toString();
    const profile = this.deviceProfiles.get(deviceId);
    const anomalies = [];

    // Check response time
    if (metrics.responseTime > profile.alertThresholds.responseTime.critical) {
      anomalies.push({
        type: 'critical',
        metric: 'responseTime',
        value: metrics.responseTime,
        threshold: profile.alertThresholds.responseTime.critical,
        message: `Critical response time: ${metrics.responseTime}ms`
      });
    } else if (metrics.responseTime > profile.alertThresholds.responseTime.warning) {
      anomalies.push({
        type: 'warning',
        metric: 'responseTime',
        value: metrics.responseTime,
        threshold: profile.alertThresholds.responseTime.warning,
        message: `High response time: ${metrics.responseTime}ms`
      });
    }

    // Check CPU utilization
    if (metrics.cpu && metrics.cpu.utilization > profile.alertThresholds.cpuUtilization.critical) {
      anomalies.push({
        type: 'critical',
        metric: 'cpuUtilization',
        value: metrics.cpu.utilization,
        threshold: profile.alertThresholds.cpuUtilization.critical,
        message: `Critical CPU utilization: ${metrics.cpu.utilization}%`
      });
    }

    // Check memory utilization  
    if (metrics.memory && metrics.memory.utilization > profile.alertThresholds.memoryUtilization.critical) {
      anomalies.push({
        type: 'critical',
        metric: 'memoryUtilization',
        value: metrics.memory.utilization,
        threshold: profile.alertThresholds.memoryUtilization.critical,
        message: `Critical memory utilization: ${metrics.memory.utilization}%`
      });
    }

    // If anomalies detected, trigger alerts
    if (anomalies.length > 0) {
      await this.triggerAnomalyAlerts(device, anomalies);
    }
  }

  /**
   * Start global monitoring cycle
   */
  startGlobalMonitoringCycle() {
    setInterval(() => {
      this.broadcastMonitoringStats();
    }, 30000); // Broadcast stats every 30 seconds
  }

  /**
   * Start performance analysis cycle
   */
  startPerformanceAnalysis() {
    setInterval(() => {
      this.analyzeGlobalPerformance();
    }, 300000); // Analyze every 5 minutes
  }

  /**
   * Start anomaly detection cycle
   */
  startAnomalyDetection() {
    setInterval(() => {
      this.runAnomalyDetection();
    }, 60000); // Run anomaly detection every minute
  }

  /**
   * Broadcast real-time device metrics
   */
  broadcastDeviceMetrics(device, metrics) {
    this.io.emit('advanced.deviceMetrics', {
      deviceId: device._id,
      deviceName: device.name || device.ipAddress,
      metrics,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast monitoring status
   */
  broadcastMonitoringStatus(status, deviceCount) {
    this.io.emit('advanced.monitoringStatus', {
      status,
      deviceCount,
      stats: this.monitoringStats,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast monitoring statistics
   */
  broadcastMonitoringStats() {
    this.io.emit('advanced.monitoringStats', {
      ...this.monitoringStats,
      devicesMonitored: this.sessions.size,
      uptime: this.monitoringStats.startTime ? Date.now() - this.monitoringStats.startTime : 0
    });
  }

  /**
   * Helper methods
   */
  calculateDeviceCriticality(device) {
    const criticalTypes = ['router', 'core-switch', 'firewall'];
    const importantTypes = ['switch', 'server'];
    
    const deviceType = device.deviceType || device.type || '';
    
    if (criticalTypes.includes(deviceType)) return 'critical';
    if (importantTypes.includes(deviceType)) return 'important';
    return 'standard';
  }

  calculateOptimalPollingInterval(device) {
    const criticality = this.calculateDeviceCriticality(device);
    
    switch (criticality) {
      case 'critical': return 30000;  // 30 seconds
      case 'important': return 60000; // 1 minute  
      default: return 120000;         // 2 minutes
    }
  }

  handleDeviceError(device, error) {
    logger.error(`Device ${device.ipAddress} error: ${error.message}`);
    
    this.io.emit('advanced.deviceError', {
      deviceId: device._id,
      deviceName: device.name || device.ipAddress,
      error: error.message,
      timestamp: new Date()
    });
  }

  async triggerAnomalyAlerts(device, anomalies) {
    this.io.emit('advanced.anomalyAlert', {
      deviceId: device._id,
      deviceName: device.name || device.ipAddress,
      anomalies,
      timestamp: new Date()
    });
  }

  /**
   * Get monitoring statistics for dashboard
   */
  getMonitoringStatistics() {
    return {
      isRunning: this.isMonitoring,
      devicesMonitored: this.sessions.size,
      activeDevices: this.deviceProfiles.size,
      successfulPolls: this.monitoringStats.successfulPolls,
      failedPolls: this.monitoringStats.failedPolls,
      uptime: this.monitoringStats.startTime ? Date.now() - this.monitoringStats.startTime : 0,
      averageResponseTime: this.calculateAverageResponseTime(),
      performanceScore: this.calculatePerformanceScore()
    };
  }

  /**
   * Calculate average response time across all devices
   */
  calculateAverageResponseTime() {
    const allResponses = [];
    for (const [deviceId, history] of this.performanceHistory) {
      const recentData = history.slice(-10); // Last 10 data points
      const avgResponse = recentData.reduce((sum, data) => sum + (data.responseTime || 0), 0) / recentData.length;
      if (!isNaN(avgResponse)) allResponses.push(avgResponse);
    }
    return allResponses.length ? allResponses.reduce((sum, time) => sum + time, 0) / allResponses.length : 0;
  }

  /**
   * Calculate overall performance score
   */
  calculatePerformanceScore() {
    const successRate = this.monitoringStats.successfulPolls / 
      (this.monitoringStats.successfulPolls + this.monitoringStats.failedPolls) * 100;
    const avgResponseTime = this.calculateAverageResponseTime();
    
    let score = successRate;
    if (avgResponseTime < 100) score += 10;
    else if (avgResponseTime < 200) score += 5;
    else if (avgResponseTime > 500) score -= 10;
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Broadcast device metrics to connected clients
   */
  broadcastDeviceMetrics(device, metrics) {
    if (this.io) {
      this.io.to('monitoring').emit('device-metrics-update', {
        deviceId: device._id,
        deviceName: device.name || device.ipAddress,
        metrics,
        timestamp: new Date()
      });
    }
  }

  /**
   * Broadcast monitoring status updates
   */
  broadcastMonitoringStatus(status, deviceCount) {
    if (this.io) {
      this.io.to('monitoring').emit('snmp-monitoring-status', {
        status,
        deviceCount,
        timestamp: new Date(),
        stats: this.getMonitoringStatistics()
      });
    }
  }

  /**
   * Update device status in database
   */
  async updateDeviceStatus(device, status, metrics) {
    try {
      const Device = require('../models/Device');
      const updateData = {
        status,
        lastSeen: new Date(),
        responseTime: metrics?.responseTime || 0
      };
      
      // Include detailed metrics if available
      if (metrics) {
        updateData.metrics = {
          lastSeen: new Date(),
          responseTime: metrics.responseTime || 0,
          interfaces: metrics.interfaces || [],
          networkCongestion: metrics.networkCongestion || null,
          cpu: metrics.cpu || null,
          memory: metrics.memory || null,
          system: metrics.system || null
        };
      }
      
      await Device.findByIdAndUpdate(device._id, updateData);
    } catch (error) {
      logger.error(`Failed to update device status for ${device.ipAddress}:`, error);
    }
  }

  /**
   * Store performance history for analysis
   */
  storePerformanceHistory(deviceId, metrics) {
    if (!this.performanceHistory.has(deviceId)) {
      this.performanceHistory.set(deviceId, []);
    }
    
    const history = this.performanceHistory.get(deviceId);
    history.push({
      timestamp: new Date(),
      ...metrics
    });
    
    // Keep only last 100 data points
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * Analyze metrics for anomalies
   */
  async analyzeMetricsForAnomalies(device, metrics) {
    const profile = this.deviceProfiles.get(device._id.toString());
    if (!profile) return;

    const alerts = [];

    // Check response time
    if (metrics.responseTime > profile.alertThresholds.responseTime.critical) {
      alerts.push({
        type: 'critical',
        metric: 'responseTime',
        value: metrics.responseTime,
        threshold: profile.alertThresholds.responseTime.critical,
        message: `High response time: ${metrics.responseTime}ms`
      });
    }

    // Check CPU utilization
    if (metrics.cpu && metrics.cpu.utilization > profile.alertThresholds.cpuUtilization.critical) {
      alerts.push({
        type: 'critical',
        metric: 'cpuUtilization',
        value: metrics.cpu.utilization,
        threshold: profile.alertThresholds.cpuUtilization.critical,
        message: `High CPU utilization: ${metrics.cpu.utilization}%`
      });
    }

    // Check memory utilization
    if (metrics.memory && metrics.memory.utilization > profile.alertThresholds.memoryUtilization.critical) {
      alerts.push({
        type: 'critical',
        metric: 'memoryUtilization',
        value: metrics.memory.utilization,
        threshold: profile.alertThresholds.memoryUtilization.critical,
        message: `High memory utilization: ${metrics.memory.utilization}%`
      });
    }

    // Broadcast alerts if any
    if (alerts.length > 0) {
      this.broadcastAnomalyAlert(device, alerts);
    }
  }

  /**
   * Broadcast anomaly alerts
   */
  broadcastAnomalyAlert(device, alerts) {
    if (this.io) {
      this.io.to('monitoring').emit('anomaly-alert', {
        deviceId: device._id,
        deviceName: device.name || device.ipAddress,
        alerts,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle device errors
   */
  handleDeviceError(device, error) {
    logger.error(`Device error for ${device.ipAddress}:`, error);
    
    // Broadcast error to monitoring clients
    if (this.io) {
      this.io.to('monitoring').emit('device-error', {
        deviceId: device._id,
        deviceName: device.name || device.ipAddress,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Calculate device criticality for monitoring prioritization
   */
  calculateDeviceCriticality(device) {
    const type = device.deviceType || device.type || 'unknown';
    
    switch (type) {
      case 'core-router':
      case 'core-switch':
        return 'critical';
      case 'router':
      case 'switch':
        return 'high';
      case 'access-point':
      case 'server':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Calculate optimal polling interval based on device criticality
   */
  calculateOptimalPollingInterval(device) {
    const criticality = this.calculateDeviceCriticality(device);
    
    switch (criticality) {
      case 'critical':
        return 15000; // 15 seconds
      case 'high':
        return 30000; // 30 seconds
      case 'medium':
        return 60000; // 1 minute
      case 'low':
      default:
        return 120000; // 2 minutes
    }
  }

  /**
   * Start global monitoring cycle for system-wide analysis
   */
  startGlobalMonitoringCycle() {
    setInterval(async () => {
      await this.analyzeGlobalPerformance();
    }, 300000); // 5 minutes
  }

  /**
   * Start performance analysis cycle
   */
  startPerformanceAnalysis() {
    setInterval(async () => {
      logger.debug('🔍 Running performance analysis cycle');
      // Analyze trends and patterns
      this.analyzePerformanceTrends();
    }, 600000); // 10 minutes
  }

  /**
   * Start anomaly detection cycle
   */
  startAnomalyDetection() {
    setInterval(async () => {
      await this.runAnomalyDetection();
    }, 180000); // 3 minutes
  }

  /**
   * Analyze performance trends across all devices
   */
  analyzePerformanceTrends() {
    for (const [deviceId, history] of this.performanceHistory) {
      if (history.length < 10) continue;
      
      const recentData = history.slice(-10);
      const trends = this.calculateTrends(recentData);
      
      if (trends.degrading) {
        logger.warn(`Performance degradation detected for device ${deviceId}`);
        // Could emit alerts or notifications here
      }
    }
  }

  /**
   * Calculate trends from historical data
   */
  calculateTrends(data) {
    if (data.length < 2) return { degrading: false };
    
    const responseTimeSlope = this.calculateSlope(data.map((d, i) => [i, d.responseTime || 0]));
    const cpuSlope = this.calculateSlope(data.map((d, i) => [i, d.cpu?.utilization || 0]));
    
    return {
      degrading: responseTimeSlope > 10 || cpuSlope > 5, // Thresholds for trend detection
      responseTimeTrend: responseTimeSlope,
      cpuTrend: cpuSlope
    };
  }

  /**
   * Calculate slope of data points for trend analysis
   */
  calculateSlope(points) {
    if (points.length < 2) return 0;
    
    const n = points.length;
    const sumX = points.reduce((sum, [x]) => sum + x, 0);
    const sumY = points.reduce((sum, [, y]) => sum + y, 0);
    const sumXY = points.reduce((sum, [x, y]) => sum + x * y, 0);
    const sumXX = points.reduce((sum, [x]) => sum + x * x, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  async analyzeGlobalPerformance() {
    // Global performance analysis logic
    logger.info('🔍 Running global performance analysis...');
    
    const stats = this.getMonitoringStatistics();
    if (this.io) {
      this.io.to('monitoring').emit('global-performance-update', {
        stats,
        timestamp: new Date()
      });
    }
  }

  async runAnomalyDetection() {
    // ML-based anomaly detection logic
    logger.debug('🤖 Running anomaly detection cycle...');
    
    // Analyze patterns across all devices
    for (const [deviceId, history] of this.performanceHistory) {
      if (history.length >= 20) {
        const anomalies = this.detectAnomalies(history);
        if (anomalies.length > 0) {
          logger.warn(`Anomalies detected for device ${deviceId}:`, anomalies);
        }
      }
    }
  }

  /**
   * Simple anomaly detection using statistical methods
   */
  detectAnomalies(history) {
    const anomalies = [];
    const recentData = history.slice(-20);
    
    // Check for response time anomalies
    const responseTimes = recentData.map(d => d.responseTime || 0);
    const rtMean = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
    const rtStdDev = Math.sqrt(responseTimes.reduce((sum, rt) => sum + Math.pow(rt - rtMean, 2), 0) / responseTimes.length);
    
    const latestRT = responseTimes[responseTimes.length - 1];
    if (Math.abs(latestRT - rtMean) > 2 * rtStdDev) {
      anomalies.push({
        type: 'responseTime',
        value: latestRT,
        mean: rtMean,
        deviation: Math.abs(latestRT - rtMean)
      });
    }
    
    return anomalies;
  }

  /**
   * Stop monitoring
   */
  async stopAdvancedMonitoring() {
    logger.info('🛑 Stopping Advanced SNMP Monitoring...');
    this.isMonitoring = false;
    
    // Clear all polling intervals
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals.clear();
    
    // Close all SNMP sessions
    this.sessions.forEach(session => session.close());
    this.sessions.clear();
    
    // Clear device profiles
    this.deviceProfiles.clear();
    
    logger.info('✅ Advanced SNMP monitoring stopped');
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus() {
    return {
      isRunning: this.isMonitoring,
      devicesMonitored: this.sessions.size,
      stats: this.monitoringStats
    };
  }
}

module.exports = AdvancedSNMPMonitor;