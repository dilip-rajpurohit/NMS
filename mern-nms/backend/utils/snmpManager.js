const ping = require('ping');
const net = require('net');
const dns = require('dns').promises;
const Device = require('../models/Device');
const logger = require('./logger');
const { execSync } = require('child_process');

class SNMPManager {
  constructor() {
    console.log('📡 Enhanced SNMP Manager initialized');
    this.discoveryMethods = ['ping', 'arp', 'port-scan', 'snmp'];
  }

  // Resolve hostname for better device identification
  async resolveHostname(ipAddress) {
    try {
      const hostnames = await dns.reverse(ipAddress);
      if (hostnames && hostnames.length > 0) {
        const hostname = hostnames[0];
        console.log(`✅ Resolved hostname: ${ipAddress} -> ${hostname}`);
        // Extract meaningful name (remove domain suffixes)
        return hostname.split('.')[0] || hostname;
      }
    } catch (error) {
      // Silent fail for hostname resolution
    }
    
    // Fallback: Try to identify by IP pattern
    const ipParts = ipAddress.split('.');
    const lastOctet = ipParts[ipParts.length - 1];
    
    // Common device identification patterns
    if (lastOctet === '1') return `Gateway-${ipAddress}`;
    if (lastOctet === '254') return `Router-${ipAddress}`;
    if (parseInt(lastOctet) >= 100 && parseInt(lastOctet) <= 199) return `Device-${lastOctet}`;
    
    return `Device-${ipAddress}`;
  }

  // Enhanced device type detection
  async identifyDeviceType(openPorts, snmpData) {
    const deviceTypes = {
      router: ['22', '23', '80', '443', '161'],
      switch: ['22', '23', '80', '161'],
      printer: ['9100', '631', '515'],
      camera: ['80', '554', '8080'],
      nas: ['22', '80', '443', '139', '445', '2049'],
      computer: ['22', '80', '135', '139', '445', '3389']
    };

    // Check SNMP system description if available
    if (snmpData && snmpData.sysDescr) {
      const sysDescr = snmpData.sysDescr.toLowerCase();
      if (sysDescr.includes('router')) return 'router';
      if (sysDescr.includes('switch')) return 'switch';
      if (sysDescr.includes('printer')) return 'printer';
      if (sysDescr.includes('camera')) return 'camera';
      if (sysDescr.includes('linux') || sysDescr.includes('windows')) return 'computer';
    }

    // Fallback to port-based detection
    for (const [type, ports] of Object.entries(deviceTypes)) {
      const matchingPorts = openPorts.filter(port => ports.includes(port.toString()));
      if (matchingPorts.length >= 2) return type;
    }

    return 'unknown';
  }

  async discoverDevice(ipAddress, community = 'public', methods = ['ping', 'port-scan']) {
    console.log(`🔍 Discovering device: ${ipAddress} using methods: ${methods.join(', ')}`);
    
    const discoveryResults = {
      reachable: false,
      deviceType: 'unknown',
      vendor: 'Unknown',
      model: 'Unknown',
      name: await this.resolveHostname(ipAddress), // Resolve hostname first
      responseTime: null,
      openPorts: [],
      snmpData: null,
      macAddress: null,
      services: []
    };

    try {
      // Method 1: Ping test
      if (methods.includes('ping')) {
        const pingResult = await this.pingTest(ipAddress);
        discoveryResults.reachable = pingResult.alive;
        discoveryResults.responseTime = pingResult.time;
        
        if (!pingResult.alive && methods.length === 1) {
          throw new Error('Device is not reachable via ping');
        }
      }

      // Method 2: ARP discovery (for local network)
      if (methods.includes('arp')) {
        const arpData = await this.arpDiscovery(ipAddress);
        if (arpData.macAddress) {
          discoveryResults.macAddress = arpData.macAddress;
          discoveryResults.vendor = arpData.vendor || 'Unknown';
          discoveryResults.reachable = true;
        }
      }

      // Method 3: Port scanning
      if (methods.includes('port-scan')) {
        const portData = await this.portScanDiscovery(ipAddress);
        discoveryResults.openPorts = portData.openPorts;
        discoveryResults.services = portData.services;
        discoveryResults.deviceType = portData.deviceType;
        
        if (portData.openPorts.length > 0) {
          discoveryResults.reachable = true;
        }
      }

      // Method 4: SNMP discovery
      if (methods.includes('snmp')) {
        try {
          // If ping/port-scan didn't mark the device reachable, but UDP/161 is open,
          // still attempt SNMP. This helps for devices that block ICMP but expose SNMP.
          let allowSnmp = discoveryResults.reachable;
          if (!allowSnmp) {
            try {
              const udpOpen = await this.checkPort(ipAddress, 161);
              if (udpOpen) allowSnmp = true;
            } catch (e) {
              // ignore
            }
          }

          if (allowSnmp) {
            // Try SNMP with provided community, and fallback to a small list if it fails.
            const communitiesToTry = Array.isArray(community) ? community : [community, 'public', 'private'];
            let snmpData = null;
            for (const comm of communitiesToTry) {
              try {
                const result = await this.snmpDiscovery(ipAddress, comm);
                if (result && result.success && result.data) {
                  snmpData = result.data;
                  discoveryResults.snmpData = snmpData;
                  discoveryResults.name = snmpData.sysName || discoveryResults.name;
                  discoveryResults.vendor = snmpData.vendor || discoveryResults.vendor;
                  discoveryResults.deviceType = snmpData.deviceType || discoveryResults.deviceType;
                  break;
                }
              } catch (err) {
                logger.debug(`SNMP try with community ${comm} failed for ${ipAddress}: ${err.message}`);
              }
            }
          }
        } catch (snmpError) {
          logger.debug(`SNMP discovery failed for ${ipAddress}: ${snmpError.message}`);
        }
      }

      // If device is not reachable by any method
      if (!discoveryResults.reachable) {
        throw new Error('Device is not reachable by any discovery method');
      }

      // Enhanced device type identification
      if (discoveryResults.deviceType === 'unknown') {
        discoveryResults.deviceType = await this.identifyDeviceType(discoveryResults.openPorts, discoveryResults.snmpData);
      }
      
      return {
        ipAddress,
        name: discoveryResults.name,
        deviceType: discoveryResults.deviceType,
        vendor: discoveryResults.vendor,
        model: discoveryResults.model,
        status: 'online',
        responseTime: discoveryResults.responseTime,
        lastSeen: new Date(),
        macAddress: discoveryResults.macAddress,
        openPorts: discoveryResults.openPorts,
        services: discoveryResults.services,
        snmpData: discoveryResults.snmpData,
        metrics: {
          responseTime: discoveryResults.responseTime || 0,
          lastSeen: new Date()
        }
      };
      
    } catch (error) {
      console.error('Discovery failed for', ipAddress, ':', error.message);
      throw error;
    }
  }

  async pingTest(ipAddress) {
    try {
      const result = await ping.promise.probe(ipAddress, {
        timeout: 3,
        extra: ['-c', '1']
      });
      return {
        alive: result.alive,
        time: parseFloat(result.time) || null
      };
    } catch (error) {
      return { alive: false, time: null };
    }
  }

  async arpDiscovery(ipAddress) {
    try {
      // Try to get MAC address from ARP table
      let arpOutput = '';
      
      if (process.platform === 'linux') {
        arpOutput = execSync(`arp -n ${ipAddress} 2>/dev/null || echo "not found"`, { encoding: 'utf8' });
      } else if (process.platform === 'darwin') {
        arpOutput = execSync(`arp -n ${ipAddress} 2>/dev/null || echo "not found"`, { encoding: 'utf8' });
      } else if (process.platform === 'win32') {
        arpOutput = execSync(`arp -a ${ipAddress} 2>nul || echo "not found"`, { encoding: 'utf8' });
      }

      const macMatch = arpOutput.match(/([0-9a-f]{2}[:-]){5}[0-9a-f]{2}/i);
      if (macMatch) {
        const macAddress = macMatch[0];
        return {
          macAddress,
          vendor: this.getVendorFromMac(macAddress)
        };
      }

      return { macAddress: null, vendor: null };
    } catch (error) {
      logger.debug(`ARP discovery failed for ${ipAddress}: ${error.message}`);
      return { macAddress: null, vendor: null };
    }
  }

  async portScanDiscovery(ipAddress) {
    const commonPorts = {
      22: { service: 'SSH', deviceType: 'server' },
      23: { service: 'Telnet', deviceType: 'router' },
      25: { service: 'SMTP', deviceType: 'server' },
      53: { service: 'DNS', deviceType: 'server' },
      80: { service: 'HTTP', deviceType: 'server' },
      110: { service: 'POP3', deviceType: 'server' },
      143: { service: 'IMAP', deviceType: 'server' },
      161: { service: 'SNMP', deviceType: 'switch' },
      443: { service: 'HTTPS', deviceType: 'server' },
      993: { service: 'IMAPS', deviceType: 'server' },
      995: { service: 'POP3S', deviceType: 'server' },
      3389: { service: 'RDP', deviceType: 'server' },
      5900: { service: 'VNC', deviceType: 'server' }
    };

    const results = {
      openPorts: [],
      services: [],
      deviceType: 'unknown'
    };

    try {
      for (const [port, info] of Object.entries(commonPorts)) {
        const isOpen = await this.checkPort(ipAddress, parseInt(port));
        if (isOpen) {
          results.openPorts.push(parseInt(port));
          results.services.push(info.service);
          
          // Prioritize device type detection
          if (results.deviceType === 'unknown') {
            results.deviceType = info.deviceType;
          }
        }
      }

      // Better device type detection based on port combinations
      if (results.openPorts.includes(161)) {
        results.deviceType = 'switch'; // SNMP usually indicates network equipment
      } else if (results.openPorts.includes(23) && !results.openPorts.includes(80)) {
        results.deviceType = 'router'; // Telnet without HTTP
      } else if (results.openPorts.includes(80) || results.openPorts.includes(443)) {
        results.deviceType = 'server'; // Web services
      }

      return results;
    } catch (error) {
      logger.debug(`Port scan failed for ${ipAddress}: ${error.message}`);
      return results;
    }
  }

  async snmpDiscovery(ipAddress, community = 'public') {
    // Real SNMP polling using net-snmp
    try {
      const snmp = require('net-snmp');

      const oids = [
        '1.3.6.1.2.1.1.1.0', // sysDescr
        '1.3.6.1.2.1.1.5.0', // sysName
        '1.3.6.1.2.1.1.2.0', // sysObjectID
        '1.3.6.1.2.1.1.3.0'  // sysUpTime
      ];

      const options = {
        timeout: 3000,
        retries: 1
      };

      const session = snmp.createSession(ipAddress, community, options);

      const getAsync = (oids) => new Promise((resolve, reject) => {
        session.get(oids, (error, varbinds) => {
          if (error) return reject(error);
          resolve(varbinds);
        });
      });

      let varbinds;
      try {
        varbinds = await getAsync(oids);
      } catch (err) {
        session.close();
        return { success: false, data: null, error: err.message };
      }

      const parsed = {};
      for (const vb of varbinds) {
        if (snmp.isVarbindError(vb)) continue;
        const oid = vb.oid;
        const val = vb.value;
        switch (oid) {
          case '1.3.6.1.2.1.1.1.0': // sysDescr
            parsed.sysDescr = val.toString();
            break;
          case '1.3.6.1.2.1.1.5.0': // sysName
            parsed.sysName = val.toString();
            break;
          case '1.3.6.1.2.1.1.2.0': // sysObjectID
            parsed.sysObjectID = val.toString();
            break;
          case '1.3.6.1.2.1.1.3.0': // sysUpTime
            parsed.sysUpTime = val; // may be a Buffer or number
            break;
          default:
            break;
        }
      }

      // Try to collect basic interface list (if available) - using ifDescr table (1.3.6.1.2.1.2.2.1.2)
      const interfaces = [];
      try {
        const tableOptions = { oid: '1.3.6.1.2.1.2.2.1.2' };
        const tableAsync = () => new Promise((resolve, reject) => {
          const result = [];
          session.table('1.3.6.1.2.1.2.2', 25, (error, table) => {
            if (error) return reject(error);
            resolve(table || {});
          });
        });

        const table = await tableAsync();
        // table is an object keyed by index
        Object.keys(table || {}).forEach(index => {
          const row = table[index];
          // row[2] should correspond to ifDescr
          const ifDescr = row['2'] ? row['2'].toString() : undefined;
          interfaces.push({ index: parseInt(index, 10), name: ifDescr });
        });
      } catch (err) {
        // Not critical, continue
      }

      session.close();

      const data = {
        sysName: parsed.sysName || null,
        sysDescr: parsed.sysDescr || null,
        sysObjectID: parsed.sysObjectID || null,
        sysUpTime: parsed.sysUpTime || null,
        interfaces: interfaces,
        vendor: parsed.sysDescr ? (parsed.sysDescr.split(' ')[0] || 'Unknown') : 'Unknown'
      };

      return { success: true, data };
    } catch (error) {
      logger.debug(`SNMP polling failed for ${ipAddress}: ${error.message}`);
      return { success: false, data: null, error: error.message };
    }
  }

  getVendorFromMac(macAddress) {
    // Basic vendor identification from MAC OUI
    const oui = macAddress.substring(0, 8).replace(/[:-]/g, '').toLowerCase();
    const vendors = {
      '00505b': 'Cisco',
      '001b67': 'Cisco', 
      '00906d': 'Cisco',
      '3c0754': 'Cisco',
      '000c29': 'VMware',
      '005056': 'VMware',
      '000569': 'VMware',
      '001c42': 'Parallels',
      '080027': 'VirtualBox',
      '001dd8': 'Hewlett Packard',
      '70b3d5': 'Hewlett Packard',
      '3cdcbc': 'Hewlett Packard'
    };

    return vendors[oui] || 'Unknown';
  }

  async determineDeviceType(ipAddress) {
    const commonPorts = {
      22: 'server',    // SSH
      80: 'server',    // HTTP
      443: 'server',   // HTTPS
      161: 'switch',   // SNMP
      23: 'router',    // Telnet
      3389: 'server'   // RDP
    };

    try {
      for (const [port, type] of Object.entries(commonPorts)) {
        const isOpen = await this.checkPort(ipAddress, parseInt(port));
        if (isOpen) {
          return type;
        }
      }
    } catch (error) {
      console.warn('Port scanning failed for', ipAddress);
    }

    return 'unknown';
  }

  async checkPort(ip, port) {
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

  async getSystemInfo(ipAddress, community = 'public') {
    return {
      name: `Device-${ipAddress}`,
      description: 'Network Device',
      contact: '',
      location: '',
      uptime: 0
    };
  }

  async getInterfaceInfo(ipAddress, community = 'public') {
    return [];
  }

  async getPerformanceMetrics(ipAddress, community = 'public') {
    return {
      cpu: null,
      memory: null,
      interfaces: []
    };
  }

  // Real alert generation based on device status with stability improvements
  async generateAlertsForDevice(device, io = null) {
    try {
      // CRITICAL FIX: Check if scan is running to prevent false offline status
      try {
        const fs = require('fs');
        const path = require('path');
        const scanStateFile = path.join(__dirname, '../.scan_state');
        
        if (fs.existsSync(scanStateFile)) {
          const scanData = JSON.parse(fs.readFileSync(scanStateFile, 'utf8'));
          if (scanData.isRunning) {
            console.log(`⏸️ Skipping device monitoring for ${device.name} - scan in progress`);
            return [];
          }
        }
      } catch (stateError) {
        // If we can't read scan state, be conservative and skip monitoring
        console.log(`⚠️ Cannot read scan state for ${device.name}, skipping monitoring to prevent false offline`);
        return [];
      }
      
      const alerts = [];
      
      // Check device reachability with better error handling
      let pingResult;
      try {
        pingResult = await ping.promise.probe(device.ipAddress, {
          timeout: 5, // Increased timeout
          extra: ['-c', '2'] // Send 2 pings for better reliability
        });
      } catch (error) {
        // If ping fails, assume device is unreachable
        pingResult = { alive: false, time: 0 };
      }

      // Initialize failure count if not exists
      if (!device.metrics.failureCount) {
        device.metrics.failureCount = 0;
      }

      // Device unreachable alert - require 3 consecutive failures
      if (!pingResult.alive) {
        device.metrics.failureCount++;
        
        // Only mark offline after 3 consecutive failures
        if (device.metrics.failureCount >= 3 && device.status === 'online') {
          const alert = {
            type: 'Device Unreachable',
            severity: 'critical',
            message: `Device ${device.name} (${device.ipAddress}) is not responding to ping (${device.metrics.failureCount} consecutive failures)`,
            timestamp: new Date(),
            acknowledged: false,
            value: 0,
            threshold: 1
          };
          alerts.push(alert);
          
          // Update device status to offline
          await Device.updateOne(
            { _id: device._id },
            { 
              status: 'offline',
              'metrics.lastSeen': new Date(),
              'metrics.failureCount': device.metrics.failureCount
            }
          );
          
          console.log(`📴 Device ${device.name} (${device.ipAddress}) marked offline after ${device.metrics.failureCount} failures`);
        } else {
          // Just update the failure count without changing status
          await Device.updateOne(
            { _id: device._id },
            { 'metrics.failureCount': device.metrics.failureCount }
          );
        }
      } else {
        // Device is responding - reset failure count and potentially mark online
        const wasOffline = device.status === 'offline';
        
        // Reset failure count
        await Device.updateOne(
          { _id: device._id },
          { 
            'metrics.failureCount': 0,
            'metrics.lastSeen': new Date(),
            'metrics.responseTime': parseFloat(pingResult.time) || 0
          }
        );

        // Device back online - only if it was previously offline
        if (wasOffline) {
          // Acknowledge all previous "Device Unreachable" alerts for this device
          await Device.updateOne(
            { _id: device._id },
            { 
              $set: { 
                "alerts.$[elem].acknowledged": true,
                "alerts.$[elem].resolvedAt": new Date()
              }
            },
            { 
              arrayFilters: [{ 
                "elem.type": "Device Unreachable", 
                "elem.acknowledged": false 
              }]
            }
          );

          // Check if we recently created a "Device Back Online" alert to prevent spam
          const recentBackOnlineAlerts = device.alerts?.filter(alert => 
            alert.type === 'Device Back Online' && 
            !alert.acknowledged &&
            (new Date() - new Date(alert.timestamp)) < 300000 // 5 minutes
          ) || [];

          // Only create alert if no recent "back online" alert exists
          if (recentBackOnlineAlerts.length === 0) {
            const alert = {
              type: 'Device Back Online',
              severity: 'info',
              message: `Device ${device.name} (${device.ipAddress}) is back online`,
              timestamp: new Date(),
              acknowledged: false,
              value: 1,
              threshold: 1
            };
            alerts.push(alert);
          }
          
          // Update device status to online
          await Device.updateOne(
            { _id: device._id },
            { 
              status: 'online',
              'metrics.lastSeen': new Date(),
              'metrics.responseTime': parseFloat(pingResult.time) || 0
            }
          );
          
          console.log(`📶 Device ${device.name} (${device.ipAddress}) back online`);
        }
      }

      // High response time alert (only if device is online and no recent alerts)
      if (pingResult.alive && pingResult.time > 1000) { // > 1 second
        // Check if we recently created a high response time alert to prevent spam
        const recentHighResponseAlerts = device.alerts?.filter(alert => 
          alert.type === 'High Response Time' && 
          !alert.acknowledged &&
          (new Date() - new Date(alert.timestamp)) < 300000 // 5 minutes
        ) || [];

        // Only create alert if no recent high response alert exists
        if (recentHighResponseAlerts.length === 0) {
          const alert = {
            type: 'High Response Time',
            severity: 'warning',
            message: `Device ${device.name} has high response time: ${pingResult.time}ms`,
            timestamp: new Date(),
            acknowledged: false,
            value: parseFloat(pingResult.time),
            threshold: 1000
          };
          alerts.push(alert);
        }
      }

      // Auto-acknowledge informational alerts older than 1 hour
      await Device.updateOne(
        { _id: device._id },
        { 
          $set: { 
            "alerts.$[elem].acknowledged": true,
            "alerts.$[elem].resolvedAt": new Date()
          }
        },
        { 
          arrayFilters: [{ 
            "elem.severity": "info", 
            "elem.acknowledged": false,
            "elem.timestamp": { $lt: new Date(Date.now() - 3600000) } // 1 hour ago
          }]
        }
      );

      // Add alerts to device if any were generated
      if (alerts.length > 0) {
        await Device.updateOne(
          { _id: device._id },
          { $push: { alerts: { $each: alerts } } }
        );

        // Emit real-time alerts
        if (io) {
          alerts.forEach(alert => {
            io.emit('newAlert', {
              ...alert,
              deviceId: device._id,
              deviceName: device.name,
              deviceIp: device.ipAddress
            });
          });
        }

        logger.info(`Generated ${alerts.length} alerts for device ${device.name}`);
      }

      return alerts;

    } catch (error) {
      logger.error(`Failed to generate alerts for device ${device.name}:`, error);
      return [];
    }
  }

  // Monitor all devices and generate alerts (skip if scan is running)
  async monitorAllDevices(io = null) {
    try {
      // Check if a discovery scan is currently running by checking the global scan state
      // This prevents device monitoring conflicts during network scanning
      try {
        const fs = require('fs');
        const path = require('path');
        const scanStateFile = path.join(__dirname, '../.scan_state');
        
        if (fs.existsSync(scanStateFile)) {
          const scanData = JSON.parse(fs.readFileSync(scanStateFile, 'utf8'));
          if (scanData.isRunning) {
            console.log('⏸️ Skipping device monitoring - discovery scan in progress');
            return [];
          }
        }
      } catch (stateError) {
        // If we can't read scan state, continue with monitoring
        console.log('ℹ️ Could not read scan state, continuing with monitoring');
      }

      const devices = await Device.find({});
      if (devices.length === 0) {
        console.log('ℹ️ No devices found for monitoring');
        return [];
      }

      console.log(`📊 Starting device monitoring for ${devices.length} devices`);
      const alertPromises = devices.map(device => this.generateAlertsForDevice(device, io));
      const allAlerts = await Promise.all(alertPromises);
      
      const totalAlerts = allAlerts.reduce((count, alerts) => count + alerts.length, 0);
      console.log(`✅ Device monitoring completed. Generated ${totalAlerts} total alerts.`);
      
      return allAlerts.flat();
    } catch (error) {
      console.error('❌ Device monitoring failed:', error);
      return [];
    }
  }
}

module.exports = SNMPManager;
