const SNMPManager = require('../utils/snmpManager');
const Device = require('../models/Device');
const logger = require('../utils/logger');
const os = require('os');

class AlertService {
  constructor() {
    this.snmpManager = new SNMPManager();
    this.monitoringInterval = null;
    this.isRunning = false;
    this.io = null;
  }

  // Initialize the service with Socket.io instance
  initialize(io) {
    this.io = io;
    logger.info('Alert Service initialized with Socket.io');
  }

  // Start monitoring service
  start(intervalMinutes = 5) {
    if (this.isRunning) {
      logger.warn('Alert service is already running');
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    
    logger.info(`Starting alert service with ${intervalMinutes} minute interval`);
    this.isRunning = true;

    // Initial system check
    this.performSystemChecks();
    
    // Device monitoring check
    this.performDeviceMonitoring();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.performSystemChecks();
      await this.performDeviceMonitoring();
    }, intervalMs);
  }

  // Stop monitoring service
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
    logger.info('Alert service stopped');
  }

  // Check system-level conditions and generate alerts
  async performSystemChecks() {
    try {
      logger.debug('Performing system checks...');
      const alerts = [];

      // Check system memory usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memoryUsage = (usedMem / totalMem) * 100;

      if (memoryUsage > 90) {
        alerts.push(await this.createSystemAlert(
          'High Memory Usage',
          'critical',
          `System memory usage is critically high: ${memoryUsage.toFixed(1)}%`,
          memoryUsage,
          90
        ));
      } else if (memoryUsage > 80) {
        alerts.push(await this.createSystemAlert(
          'High Memory Usage',
          'warning',
          `System memory usage is high: ${memoryUsage.toFixed(1)}%`,
          memoryUsage,
          80
        ));
      }

      // Check system load average (Linux/Unix only)
      if (os.platform() !== 'win32') {
        const loadAvg = os.loadavg()[0]; // 1-minute load average
        const cpuCount = os.cpus().length;
        const loadPercentage = (loadAvg / cpuCount) * 100;

        if (loadPercentage > 90) {
          alerts.push(await this.createSystemAlert(
            'High CPU Load',
            'critical',
            `System CPU load is critically high: ${loadPercentage.toFixed(1)}% (${loadAvg.toFixed(2)})`,
            loadPercentage,
            90
          ));
        } else if (loadPercentage > 80) {
          alerts.push(await this.createSystemAlert(
            'High CPU Load',
            'warning',
            `System CPU load is high: ${loadPercentage.toFixed(1)}% (${loadAvg.toFixed(2)})`,
            loadPercentage,
            80
          ));
        }
      }

      // Check system uptime (if system just restarted)
      const uptimeMinutes = os.uptime() / 60;
      if (uptimeMinutes < 10) {
        alerts.push(await this.createSystemAlert(
          'System Restart',
          'info',
          `System was recently restarted. Uptime: ${Math.round(uptimeMinutes)} minutes`,
          uptimeMinutes,
          10
        ));
      }

      // Emit alerts if any were generated
      if (alerts.length > 0 && this.io) {
        alerts.forEach(alert => {
          this.io.emit('newAlert', alert);
        });
      }

      return alerts;
    } catch (error) {
      logger.error('System checks failed:', error);
      return [];
    }
  }

  // Monitor all devices for connectivity and performance issues
  async performDeviceMonitoring() {
    try {
      logger.debug('Performing device monitoring...');
      const alerts = await this.snmpManager.monitorAllDevices(this.io);
      return alerts;
    } catch (error) {
      logger.error('Device monitoring failed:', error);
      return [];
    }
  }

  // Create a system-level alert
  async createSystemAlert(type, severity, message, value, threshold) {
    const alert = {
      type,
      severity,
      message,
      timestamp: new Date(),
      acknowledged: false,
      value,
      threshold,
      deviceId: 'system',
      deviceName: 'NMS Server',
      deviceIp: 'localhost'
    };

    // Store system alerts in a way that they can be retrieved
    // For now, we'll create a virtual "system" device to store system alerts
    try {
      let systemDevice = await Device.findOne({ ipAddress: 'localhost', deviceType: 'system' });
      
      if (!systemDevice) {
        systemDevice = new Device({
          name: 'NMS Server',
          ipAddress: 'localhost',
          deviceType: 'system',
          status: 'online',
          alerts: []
        });
        await systemDevice.save();
      }

      // Add alert to system device
      systemDevice.alerts.push({
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp,
        acknowledged: alert.acknowledged,
        value: alert.value,
        threshold: alert.threshold
      });

      await systemDevice.save();
      
    } catch (error) {
      logger.error('Failed to store system alert:', error);
    }

    return alert;
  }

  // Get current status of the alert service
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasSocketIO: !!this.io,
      uptime: process.uptime(),
      nextCheck: this.monitoringInterval ? 'Running' : 'Stopped'
    };
  }

  // Manually trigger all checks
  async triggerChecks() {
    logger.info('Manually triggering alert checks...');
    const systemAlerts = await this.performSystemChecks();
    const deviceAlerts = await this.performDeviceMonitoring();
    
    return {
      systemAlerts: systemAlerts.length,
      deviceAlerts: deviceAlerts.length,
      totalAlerts: systemAlerts.length + deviceAlerts.length
    };
  }
}

// Create singleton instance
const alertService = new AlertService();

module.exports = alertService;