const express = require('express');
const Device = require('../models/Device');
const { authenticateToken } = require('../middleware/auth');
const ping = require('ping');
const { getDashboardStats } = require('../utils/dashboardUtils');
const logger = require('../utils/logger');
const os = require('os');
const fs = require('fs');
const router = express.Router();

// Network interface detection utility
const NetworkDetector = {
  async getDeploymentEnvironment() {
    // Detect if running in Docker or bare metal
    try {
      const fs = require('fs');
      const isDocker = fs.existsSync('/.dockerenv') || fs.existsSync('/proc/1/cgroup');
      return {
        isDocker,
        isBareMetal: !isDocker,
        containerNetwork: isDocker ? await this.getContainerNetworks() : null,
        hostNetwork: await this.getHostNetworks()
      };
    } catch (error) {
      logger.error('Environment detection error:', error);
      return { isDocker: false, isBareMetal: true, hostNetwork: null };
    }
  },

  async getContainerNetworks() {
    try {
      // For Docker environments, try to detect host network gateway
      const { execSync } = require('child_process');
      const routes = execSync('ip route show', { encoding: 'utf8' });
      const defaultGateway = routes.match(/default via (\d+\.\d+\.\d+\.\d+)/);
      
      if (defaultGateway) {
        const gatewayIP = defaultGateway[1];
        const networkRange = this.calculateHostNetworkFromGateway(gatewayIP);
        return [{
          type: 'host_bridge',
          gateway: gatewayIP,
          networkRange,
          description: 'Host network via Docker bridge'
        }];
      }
    } catch (error) {
      logger.warn('Container network detection failed:', error.message);
    }
    return [];
  },

  async getHostNetworks() {
    try {
      const { execSync } = require('child_process');
      
      // Try to get host network information through various methods
      const networks = [];
      
      // Method 1: Check if we can access host network interfaces - STRICT Docker exclusion
      try {
        const routes = execSync('ip route show | grep -E "^[0-9]"', { encoding: 'utf8' });
        const routeLines = routes.split('\n').filter(line => line.trim());
        
        for (const route of routeLines) {
          const match = route.match(/^(\d+\.\d+\.\d+\.\d+\/\d+).*dev (\w+)/);
          if (match) {
            const [, networkRange, interface] = match;
            
            // COMPREHENSIVE Docker network exclusion - never scan these
            const isDockerNetwork = 
              networkRange.startsWith('127.') ||           // Loopback
              networkRange.startsWith('172.17.') ||        // Default Docker bridge
              networkRange.startsWith('172.18.') ||        // Docker compose networks
              networkRange.startsWith('172.19.') ||        // Docker compose networks  
              networkRange.startsWith('172.2') ||          // All 172.2x.x.x ranges
              networkRange.startsWith('172.3') ||          // All 172.3x.x.x ranges
              interface.startsWith('docker') ||            // Docker interfaces
              interface.startsWith('br-') ||               // Docker bridge interfaces
              interface.startsWith('veth');                // Docker virtual interfaces
              
            if (!isDockerNetwork) {
              networks.push({
                interface,
                networkRange,
                type: 'host',
                description: `Host network via ${interface}`,
                priority: networkRange.startsWith('192.168.') ? 1 : 
                          networkRange.startsWith('10.') ? 2 : 
                          networkRange.startsWith('172.1') ? 3 : 4  // 172.16.x.x private ranges
              });
              logger.info(`✅ Detected valid host network: ${networkRange} (${interface})`);
            } else {
              logger.info(`🚫 Excluded Docker network: ${networkRange} (${interface})`);
            }
          }
        }
      } catch (routeError) {
        logger.warn('Route detection failed:', routeError.message);
      }
      
      // Method 2: Multiple IP detection strategies - with Docker IP filtering
      try {
        let currentIP = null;
        
        // Strategy 1: Route to external DNS
        try {
          currentIP = execSync("ip route get 8.8.8.8 | awk '/src/ {print $7}'", { encoding: 'utf8' }).trim();
        } catch (e) {
          logger.warn('Strategy 1 failed:', e.message);
        }
        
        // Strategy 2: Default route interface IP
        if (!currentIP || !currentIP.match(/^\d+\.\d+\.\d+\.\d+$/)) {
          try {
            currentIP = execSync("ip route show default | awk '/dev/ {print $7}' | head -1 | xargs ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d'/' -f1 | head -1", { encoding: 'utf8' }).trim();
          } catch (e) {
            logger.warn('Strategy 2 failed:', e.message);
          }
        }
        
        // Strategy 3: First non-loopback IP
        if (!currentIP || !currentIP.match(/^\d+\.\d+\.\d+\.\d+$/)) {
          try {
            currentIP = execSync("hostname -I | awk '{print $1}'", { encoding: 'utf8' }).trim();
          } catch (e) {
            logger.warn('Strategy 3 failed:', e.message);
          }
        }
        
        // CRITICAL: Validate that detected IP is NOT a Docker IP
        if (currentIP && currentIP.match(/^\d+\.\d+\.\d+\.\d+$/)) {
          const isDockerIP = 
            currentIP.startsWith('127.') ||
            currentIP.startsWith('172.17.') ||
            currentIP.startsWith('172.18.') ||
            currentIP.startsWith('172.19.') ||
            currentIP.startsWith('172.2') ||
            currentIP.startsWith('172.3');
            
          if (!isDockerIP) {
            const networkRange = this.ipToNetworkRange(currentIP);
            networks.unshift({
              interface: 'current',
              networkRange,
              type: 'current',
              description: `Auto-detected host network (IP: ${currentIP})`,
              priority: 0 // Highest priority
            });
            logger.info(`🎯 Universal deployment - detected REAL host network: ${networkRange} (IP: ${currentIP})`);
          } else {
            logger.warn(`🚫 Detected Docker IP ${currentIP} - will use fallback detection`);
            currentIP = null; // Reset to try fallback methods
          }
        }
        
        if (!currentIP) {
          logger.warn('⚠️  Could not detect real host IP - will use fallback networks');
        }
      } catch (currentIPError) {
        logger.warn('Current IP detection failed:', currentIPError.message);
      }
      
      // Method 3: Environment variable override
      if (process.env.HOST_NETWORK_RANGE) {
        networks.push({
          interface: 'env',
          networkRange: process.env.HOST_NETWORK_RANGE,
          type: 'environment',
          description: 'Environment variable override'
        });
      }
      
      // Method 3: Default common ranges as fallback
      if (networks.length === 0) {
        networks.push(
          { interface: 'auto', networkRange: '192.168.1.0/24', type: 'common', description: 'Common home network' },
          { interface: 'auto', networkRange: '192.168.0.0/24', type: 'common', description: 'Common router network' },
          { interface: 'auto', networkRange: '10.0.0.0/24', type: 'common', description: 'Common corporate network' },
          { interface: 'auto', networkRange: '172.16.0.0/24', type: 'common', description: 'Common private network' }
        );
      }
      
      return networks;
    } catch (error) {
      logger.error('Host network detection failed:', error);
      return [
        { interface: 'fallback', networkRange: '192.168.1.0/24', type: 'fallback', description: 'Fallback network range' }
      ];
    }
  },

  // Convert IP address to network range
  ipToNetworkRange(ip, cidr = 24) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
      throw new Error('Invalid IP address');
    }
    
    // Calculate network address based on CIDR
    const networkParts = [...parts];
    if (cidr === 24) {
      networkParts[3] = 0;
    } else if (cidr === 16) {
      networkParts[2] = 0;
      networkParts[3] = 0;
    } else if (cidr === 8) {
      networkParts[1] = 0;
      networkParts[2] = 0;
      networkParts[3] = 0;
    }
    
    return `${networkParts.join('.')}/${cidr}`;
  },

  calculateHostNetworkFromGateway(gatewayIP) {
    const parts = gatewayIP.split('.').map(Number);
    // Assume /24 network
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  },

  getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const networks = [];
    
    for (const [name, addrs] of Object.entries(interfaces)) {
      addrs
        .filter(addr => addr.family === 'IPv4' && !addr.internal)
        .forEach(addr => {
          const networkRange = this.calculateNetworkRange(addr.address, addr.netmask);
          networks.push({
            interface: name,
            ip: addr.address,
            netmask: addr.netmask,
            networkRange,
            cidr: this.netmaskToCidr(addr.netmask),
            type: 'container',
            description: `Container interface ${name}`
          });
        });
    }
    
    return networks;
  },

  calculateNetworkRange(ip, netmask) {
    const ipParts = ip.split('.').map(Number);
    const maskParts = netmask.split('.').map(Number);
    
    const networkParts = ipParts.map((part, i) => part & maskParts[i]);
    const cidr = this.netmaskToCidr(netmask);
    
    return `${networkParts.join('.')}/${cidr}`;
  },

  netmaskToCidr(netmask) {
    const maskParts = netmask.split('.').map(Number);
    let cidr = 0;
    
    for (const part of maskParts) {
      cidr += part.toString(2).split('1').length - 1;
    }
    
    return cidr;
  },

  async getRecommendedRanges() {
    const environment = await this.getDeploymentEnvironment();
    const containerInterfaces = this.getNetworkInterfaces();
    const recommended = [];
    
    // Add deployment environment networks first
    if (environment.hostNetwork) {
      environment.hostNetwork.forEach(net => {
        recommended.push({
          label: `${net.description} (${net.networkRange})`,
          value: net.networkRange,
          type: net.type,
          priority: 1,
          interface: net.interface
        });
      });
    }
    
    // Add container networks with lower priority
    containerInterfaces.forEach(iface => {
      if (!iface.networkRange.startsWith('127.')) {
        recommended.push({
          label: `${iface.description} (${iface.ip})`,
          value: iface.networkRange,
          type: 'container',
          priority: 3,
          interface: iface.interface,
          currentIp: iface.ip
        });
      }
    });
    
    // Add common networks as fallback
    const commonRanges = [
      { label: 'Auto-detect Network', value: 'auto', type: 'auto', priority: 0 },
      { label: 'Home Network (192.168.1.x)', value: '192.168.1.0/24', type: 'common', priority: 4 },
      { label: 'Corporate (192.168.0.x)', value: '192.168.0.0/24', type: 'common', priority: 4 },
      { label: 'Office (10.0.0.x)', value: '10.0.0.0/24', type: 'common', priority: 4 },
      { label: 'Local (172.16.0.x)', value: '172.16.0.0/24', type: 'common', priority: 4 }
    ];
    
    // Only add common ranges that aren't already detected
    const detectedRanges = new Set(recommended.map(r => r.value));
    commonRanges.forEach(range => {
      if (!detectedRanges.has(range.value)) {
        recommended.push(range);
      }
    });
    
    // Sort by priority (lower number = higher priority)
    return recommended.sort((a, b) => a.priority - b.priority);
  },

  async autoDetectBestNetwork() {
    // Use production-ready detection by default in containers and when explicitly set
    const useProductionMode = process.env.PRODUCTION_MODE === 'true' || 
                             process.env.NODE_ENV === 'production' ||
                             fs.existsSync('/.dockerenv');  // Default to production in Docker
    
    if (useProductionMode) {
      logger.info('🏭 Using production-grade network detection');
      const result = await this.getProductionNetworkRange();
      return result.networkRange;
    }

    // Legacy detection for development
    const environment = await this.getDeploymentEnvironment();
    
    // Prioritize current network first, then host networks
    if (environment.hostNetwork && environment.hostNetwork.length > 0) {
      // Sort by priority (0 = highest)
      const sortedNetworks = environment.hostNetwork.sort((a, b) => 
        (a.priority || 99) - (b.priority || 99)
      );
      const bestNetwork = sortedNetworks[0].networkRange;
      logger.info(`🎯 Auto-detected best network: ${bestNetwork} (${sortedNetworks[0].description})`);
      return bestNetwork;
    }
    
    const containers = this.getNetworkInterfaces();
    const nonLoopback = containers.filter(c => !c.networkRange.startsWith('127.'));
    if (nonLoopback.length > 0) {
      const fallbackNetwork = nonLoopback[0].networkRange;
      logger.info(`🔄 Using container network: ${fallbackNetwork}`);
      return fallbackNetwork;
    }
    
    logger.warn('⚠️  Using ultimate fallback network: 192.168.1.0/24');
    return '192.168.1.0/24'; // Ultimate fallback
  },

  // Production-ready network detection methods
  isDockerNetwork(ipOrNetwork) {
    const ip = ipOrNetwork.split('/')[0];
    
    // Comprehensive Docker network exclusion patterns
    const dockerPatterns = [
      // Docker default ranges (be more specific)
      /^172\.17\./,        // Default Docker bridge (172.17.x.x)
      /^172\.18\./,        // Docker custom networks
      /^172\.19\./,        // Docker custom networks
      
      // Localhost and virtual interfaces
      /^127\./,            // Loopback
      /^169\.254\./,       // Link-local
      /^0\.0\.0\.0$/,      // Default route
    ];
    
    // Check against Docker patterns first
    const isDefaultDockerRange = dockerPatterns.some(pattern => pattern.test(ip));
    
    if (isDefaultDockerRange) {
      logger.warn(`🚫 Blocked Docker network IP: ${ip}`);
      return true;
    }
    
    // For 172.x networks, we need to be more careful - check if it's actually Docker
    if (ip.startsWith('172.')) {
      try {
        const { execSync } = require('child_process');
        
        // Check if this IP is associated with Docker interfaces
        const dockerInterfaceCmd = "ip addr show | grep -E 'docker|br-|veth' | grep -o 'inet [0-9./]*' | awk '{print $2}'";
        const dockerIPs = execSync(dockerInterfaceCmd, { encoding: 'utf8', timeout: 5000 });
        
        const dockerIPList = dockerIPs.split('\n')
          .filter(dockerIP => dockerIP.trim())
          .map(dockerIP => dockerIP.split('/')[0]);
        
        if (dockerIPList.includes(ip)) {
          logger.warn(`🚫 Blocked Docker interface IP: ${ip}`);
          return true;
        }
        
        // Check if the interface name contains docker
        const interfaceCmd = `ip addr show | grep -B2 "${ip}/" | grep -o "^[0-9]*: [^:]*" | awk '{print $2}'`;
        const interfaceName = execSync(interfaceCmd, { encoding: 'utf8', timeout: 5000 }).trim();
        
        if (interfaceName && (interfaceName.includes('docker') || interfaceName.includes('br-') || interfaceName.includes('veth'))) {
          logger.warn(`🚫 Blocked Docker interface: ${interfaceName} (${ip})`);
          return true;
        }
        
        // Check if it's in a Docker network range but on a real interface
        const realInterfaceCmd = `ip addr show | grep -B2 "${ip}/" | grep -o "^[0-9]*: [^:]*" | awk '{print $2}'`;
        const realInterface = execSync(realInterfaceCmd, { encoding: 'utf8', timeout: 5000 }).trim();
        
        if (realInterface && (realInterface === 'eth0' || realInterface === 'ens' || realInterface.startsWith('en'))) {
          logger.info(`✅ Validated real network IP on interface ${realInterface}: ${ip}`);
          return false; // This is a real network interface, not Docker
        }
        
      } catch (error) {
        // If we can't check interfaces, be conservative for known Docker ranges
        if (ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.')) {
          logger.warn(`🚫 Blocked suspected Docker IP (interface check failed): ${ip}`);
          return true;
        }
      }
    }
    
    logger.info(`✅ Validated real network IP: ${ip}`);
    return false;
  },

  isDockerBridgeNetwork(ip) {
    try {
      // Check if this IP is on a Docker bridge by examining the network namespace
      const { execSync } = require('child_process');
      const interfaces = execSync("ip addr show | grep -A1 'docker\\|br-'", { encoding: 'utf8' });
      return interfaces.includes(ip.substring(0, ip.lastIndexOf('.') + 1));
    } catch (error) {
      return false;
    }
  },

  async getProductionNetworkRange() {
    const { execSync } = require('child_process');
    
    try {
      // Method 1: Environment variable (highest priority)
      if (process.env.HOST_NETWORK_RANGE && process.env.HOST_NETWORK_RANGE !== 'auto') {
        logger.info(`🌍 Using environment network: ${process.env.HOST_NETWORK_RANGE}`);
        return {
          networkRange: process.env.HOST_NETWORK_RANGE,
          method: 'environment',
          description: 'Environment variable override'
        };
      }

      // Method 2: Default gateway route detection
      try {
        const gatewayCmd = "ip route show default | awk '/default/ {print $3, $5}' | head -1";
        const gatewayInfo = execSync(gatewayCmd, { encoding: 'utf8' }).trim();
        
        if (gatewayInfo) {
          const [gateway, iface] = gatewayInfo.split(' ');
          if (gateway && !this.isDockerNetwork(gateway)) {
            const networkRange = this.ipToNetworkRange(gateway);
            logger.info(`🌐 Using gateway network: ${networkRange} (gateway: ${gateway})`);
            return {
              networkRange,
              method: 'gateway',
              description: `Network via default gateway ${gateway} on ${iface}`,
              gateway,
              interface: iface
            };
          }
        }
      } catch (error) {
        logger.warn('Gateway detection failed:', error.message);
      }

      // Method 3: Real network interface detection
      try {
        const interfacesCmd = "ip -4 addr show scope global | grep inet | awk '{print $2}' | cut -d/ -f1";
        const interfaces = execSync(interfacesCmd, { encoding: 'utf8' });
        const ips = interfaces.split('\n').filter(ip => ip.trim());
        
        for (const ip of ips) {
          if (ip && !this.isDockerNetwork(ip)) {
            const networkRange = this.ipToNetworkRange(ip);
            logger.info(`🖥️  Using interface network: ${networkRange} (IP: ${ip})`);
            return {
              networkRange,
              method: 'interface',
              description: `Real network interface IP ${ip}`,
              ip
            };
          }
        }
      } catch (error) {
        logger.warn('Interface detection failed:', error.message);
      }

      // Method 4: Current route detection (what we use to reach external IPs)
      try {
        const currentIPCmd = "ip route get 8.8.8.8 | awk '/src/ {print $7}'";
        const currentIP = execSync(currentIPCmd, { encoding: 'utf8' }).trim();
        
        if (currentIP && /^\d+\.\d+\.\d+\.\d+$/.test(currentIP) && !this.isDockerNetwork(currentIP)) {
          const networkRange = this.ipToNetworkRange(currentIP);
          logger.info(`🎯 Using current route network: ${networkRange} (IP: ${currentIP})`);
          return {
            networkRange,
            method: 'route',
            description: `Current IP route ${currentIP}`,
            ip: currentIP
          };
        }
      } catch (error) {
        logger.warn('Route detection failed:', error.message);
      }

      // Fallback
      logger.warn('⚠️  Using fallback network range');
      return {
        networkRange: '192.168.1.0/24',
        method: 'fallback',
        description: 'Fallback network range'
      };
    } catch (error) {
      logger.error('Production network detection failed:', error);
      return {
        networkRange: '192.168.1.0/24',
        method: 'error',
        description: 'Error fallback network'
      };
    }
  }
};

// Network scanning state
let scanState = {
  isRunning: false,
  currentNetwork: null,
  progress: 0,
  startTime: null,
  totalHosts: 0,
  scannedHosts: 0,
  foundDevices: [],
  aborted: false
};

// Scan state file management
const path = require('path');
const scanStateFile = path.join(__dirname, '../.scan_state');

const writeScanState = (state) => {
  try {
    const fs = require('fs');
    fs.writeFileSync(scanStateFile, JSON.stringify(state, null, 2));
  } catch (error) {
    logger.warn('Failed to write scan state file:', error.message);
  }
};

const clearScanState = () => {
  try {
    const fs = require('fs');
    if (fs.existsSync(scanStateFile)) {
      fs.unlinkSync(scanStateFile);
    }
  } catch (error) {
    logger.warn('Failed to clear scan state file:', error.message);
  }
};

// CRITICAL STARTUP FIX: Clear any orphaned scan state on module load
try {
  const fs = require('fs');
  if (fs.existsSync(scanStateFile)) {
    const staleState = JSON.parse(fs.readFileSync(scanStateFile, 'utf8'));
    logger.warn(`🧹 Found stale scan state from ${staleState.startTime}, cleaning up...`);
    fs.unlinkSync(scanStateFile);
    logger.info('✅ Stale scan state file removed on startup');
  }
} catch (cleanupError) {
  logger.error('❌ Failed to cleanup stale scan state on startup:', cleanupError.message);
}

// Network scanning service with advanced methods
const NetworkScanner = {
  async scanNetworkRange(networkRange, io, options = {}) {
    if (scanState.isRunning) {
      throw new Error('Scan already in progress');
    }

    // Auto-detect network if 'auto' is specified
    if (networkRange === 'auto') {
      networkRange = await NetworkDetector.autoDetectBestNetwork();
      logger.info(`Auto-detected network range: ${networkRange}`);
    }

    // CRITICAL: Ensure we never scan Docker networks
    if (NetworkDetector.isDockerNetwork(networkRange)) {
      const error = `🚫 BLOCKED: Refusing to scan Docker network ${networkRange}`;
      logger.error(error);
      throw new Error(`Cannot scan Docker network range: ${networkRange}. This would only scan container interfaces, not real network devices.`);
    }

    // Additional validation: ensure the base IP is not a Docker IP
    const baseIP = networkRange.split('/')[0];
    if (NetworkDetector.isDockerNetwork(baseIP)) {
      const error = `🚫 BLOCKED: Base IP ${baseIP} is in Docker network range`;
      logger.error(error);
      throw new Error(`Cannot scan from Docker base IP: ${baseIP}. Please specify a real network range.`);
    }

    logger.info(`✅ Validated scan target: ${networkRange} (not Docker network)`);

    scanState = {
      isRunning: true,
      currentNetwork: networkRange,
      progress: 0,
      startTime: new Date(),
      totalHosts: 0,
      scannedHosts: 0,
      foundDevices: [],
      aborted: false,
      scanMethods: options.methods || ['ping', 'dns', 'arp', 'snmp']
    };

    // Write scan state to file to prevent monitoring conflicts
    writeScanState(scanState);

    logger.info(`🚀 Starting advanced network scan for range: ${networkRange} with methods: ${scanState.scanMethods.join(', ')}`);
    
    // Notify scan started
    if (io) {
      io.emit('discovery.scanStarted', {
        networkRange,
        startTime: scanState.startTime,
        methods: scanState.scanMethods
      });
      logger.info(`📡 Emitted scan started event for ${networkRange}`);
    }

    try {
      // Parse network range
      const { baseIp, subnetMask } = this.parseNetworkRange(networkRange);
      const hosts = this.generateHostList(baseIp, subnetMask);
      
      scanState.totalHosts = hosts.length;
      logger.info(`📊 Generated ${hosts.length} hosts to scan in range ${networkRange}`);
      
      // Use smaller batches for more responsive updates
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < hosts.length; i += batchSize) {
        batches.push(hosts.slice(i, i + batchSize));
      }

      logger.info(`🔄 Processing ${batches.length} batches of ${batchSize} hosts each`);

      for (const batch of batches) {
        if (scanState.aborted) {
          logger.info('🛑 Network scan aborted');
          break;
        }

        logger.info(`🔍 Scanning batch: ${batch.join(', ')}`);

        const promises = batch.map(async (host) => {
          if (scanState.aborted) return null;

          try {
            logger.info(`🔎 Scanning host: ${host}`);
            const deviceInfo = await this.scanHost(host, scanState.scanMethods);
            logger.info(`📊 Scan result for ${host}: alive=${deviceInfo?.isAlive}, methods=${deviceInfo?.methods?.join(',') || 'none'}`);
            
            scanState.scannedHosts++;
            scanState.progress = Math.round((scanState.scannedHosts / scanState.totalHosts) * 100);

            // Emit progress update every 5 hosts for more frequent updates
            if (io && scanState.scannedHosts % 5 === 0) {
              io.emit('discovery.scanProgress', {
                progress: scanState.progress,
                scannedHosts: scanState.scannedHosts,
                totalHosts: scanState.totalHosts,
                currentHost: host,
                foundDevices: scanState.foundDevices.length
              });
            }

            if (deviceInfo && deviceInfo.isAlive) {
              logger.info(`✅ Device found at ${host}: ${JSON.stringify(deviceInfo)}`);
              // Check if device already exists
              const existingDevice = await Device.findOne({ ipAddress: host });
              
              if (!existingDevice) {
                // Create meaningful device name from actual hostname
                let deviceName = deviceInfo.hostname || `host-${host}`;
                
                const newDevice = new Device({
                  ipAddress: host,
                  name: deviceName,
                  hostname: deviceInfo.hostname || null,
                  displayName: deviceName, // Use actual hostname as display name
                  deviceType: deviceInfo.deviceType || 'host',
                  description: `Auto-discovered via ${deviceInfo.methods.join(', ')}${deviceInfo.description ? '. ' + deviceInfo.description : ''}`,
                  status: 'online',
                  snmpCommunity: 'public',
                  discoveredBy: 'auto_scan',
                  isVirtual: false,
                  notes: `Discovered via ${deviceInfo.methods.join(', ')}. Hostname resolution: ${deviceInfo.hostname ? 'Success' : 'Failed'}`,
                  metrics: {
                    lastSeen: new Date(),
                    responseTime: deviceInfo.responseTime || 0
                  },
                  connectivity: {
                    ports: deviceInfo.openPorts || [],
                    services: deviceInfo.services || []
                  }
                });

                await newDevice.save();
                scanState.foundDevices.push(newDevice);
                
                logger.info(`Advanced scan discovered device: ${host} (${deviceInfo.hostname || 'no hostname'}) via ${deviceInfo.methods.join(', ')}`);
                
                // Notify about new device with more details
                if (io) {
                  io.emit('device.discovered', {
                    device: newDevice,
                    method: 'advanced_scan',
                    details: deviceInfo,
                    hostname: deviceInfo.hostname
                  });
                }
              } else {
                // Update existing device with new hostname information
                let updated = false;
                
                if (deviceInfo.hostname && (!existingDevice.displayName || existingDevice.displayName.startsWith('host-'))) {
                  existingDevice.displayName = deviceInfo.hostname;
                  existingDevice.name = deviceInfo.hostname;
                  updated = true;
                  logger.info(`Updated device name for ${host}: ${deviceInfo.hostname}`);
                }
                
                existingDevice.metrics.lastSeen = new Date();
                existingDevice.metrics.responseTime = deviceInfo.responseTime || 0;
                
                if (deviceInfo.openPorts) {
                  existingDevice.connectivity.ports = deviceInfo.openPorts;
                  updated = true;
                }
                if (deviceInfo.services) {
                  existingDevice.connectivity.services = deviceInfo.services;
                  updated = true;
                }
                
                await existingDevice.save();
                
                if (updated && io) {
                  io.emit('device.updated', {
                    device: existingDevice,
                    hostname: deviceInfo.hostname
                  });
                }
              }
            }
          } catch (error) {
            logger.error(`Error scanning ${host}: ${error.message}`);
          }
        });

        await Promise.all(promises);
      }

      // Scan completed
      const endTime = new Date();
      const duration = endTime - scanState.startTime;
      
      logger.info(`Advanced network scan completed. Found ${scanState.foundDevices.length} new devices in ${duration}ms`);
      
      // AUTOMATIC NETWORK UPDATE: Refresh dashboard stats after scan
      try {
        const updatedStats = await getDashboardStats();
        logger.info(`📊 Network stats updated after scan: ${updatedStats.totalDevices} total devices, ${updatedStats.onlineDevices} online`);
        
        if (io) {
          // Emit scan completion with network changes
          io.emit('discovery.scanCompleted', {
            networkRange,
            duration,
            foundDevices: scanState.foundDevices.length,
            totalScanned: scanState.totalHosts,
            endTime,
            methods: scanState.scanMethods,
            updatedStats // Include updated network statistics
          });
          
          // Emit updated dashboard stats to all connected clients
          io.emit('dashboard.update', {
            ...updatedStats,
            lastScanTime: endTime,
            scanResults: {
              newDevices: scanState.foundDevices.length,
              totalScanned: scanState.totalHosts
            }
          });
          
          logger.info('📡 Real-time network updates sent to all clients');
        }
      } catch (statsError) {
        logger.error('Failed to update network stats after scan:', statsError.message);
      }
      
      return {
        success: true,
        foundDevices: scanState.foundDevices.length,
        totalScanned: scanState.totalHosts,
        duration,
        methods: scanState.scanMethods,
        networkUpdated: true
      };

    } catch (error) {
      logger.error(`Network scan error: ${error.message}`);
      
      if (io) {
        io.emit('discovery.scanError', {
          error: error.message,
          networkRange
        });
      }
      
      throw error;
    } finally {
      scanState.isRunning = false;
      clearScanState(); // Remove scan state file to allow monitoring to resume
    }
  },

  async scanHost(host, methods = ['ping']) {
    const result = {
      isAlive: false,
      methods: [],
      responseTime: 0,
      openPorts: [],
      services: [],
      hostname: null,
      deviceType: 'unknown',
      description: ''
    };

    // Method 1: Ping scan
    if (methods.includes('ping')) {
      try {
        const pingResult = await ping.promise.probe(host, {
          timeout: 2,
          min_reply: 1
        });
        
        if (pingResult.alive) {
          result.isAlive = true;
          result.methods.push('ping');
          result.responseTime = pingResult.time || 0;
        }
      } catch (error) {
        // Ping failed, try other methods
      }
    }

    // Enhanced Method: DNS Reverse Lookup for actual device names
    if (result.isAlive || methods.includes('dns')) {
      try {
        const hostname = await this.getDNSHostname(host);
        if (hostname) {
          result.hostname = hostname;
          result.methods.push('dns');
          logger.info(`DNS resolved hostname for ${host}: ${hostname}`);
        }
      } catch (error) {
        // DNS lookup failed, will try other methods
      }
    }

    // Method 2: ARP scan (for local network)
    if (methods.includes('arp')) {
      try {
        const arpResult = await this.arpScan(host);
        if (arpResult.found) {
          result.isAlive = true;
          result.methods.push('arp');
          if (arpResult.mac) {
            result.description += `MAC: ${arpResult.mac} `;
          }
        }
      } catch (error) {
        // ARP scan failed
      }
    }

    // Method 3: Port scan for common services
    if (methods.includes('port') && (result.isAlive || methods.length === 1)) {
      try {
        const portResult = await this.portScan(host);
        if (portResult.openPorts.length > 0) {
          result.isAlive = true;
          result.methods.push('port');
          result.openPorts = portResult.openPorts;
          result.services = portResult.services;
          result.deviceType = this.identifyDeviceType(portResult.openPorts);
        }
      } catch (error) {
        // Port scan failed
      }
    }

    // Method 4: Enhanced SNMP discovery with better hostname detection
    if (methods.includes('snmp') && result.isAlive) {
      try {
        const snmpResult = await this.enhancedSNMPScan(host);
        if (snmpResult.success) {
          result.methods.push('snmp');
          if (snmpResult.hostname && !result.hostname) {
            result.hostname = snmpResult.hostname;
          }
          result.deviceType = snmpResult.deviceType || result.deviceType;
          result.description += snmpResult.description || '';
          logger.info(`SNMP discovered hostname for ${host}: ${snmpResult.hostname || 'none'}`);
        }
      } catch (error) {
        // SNMP scan failed
      }
    }

    // Fallback: Use NetBIOS name resolution for Windows devices
    if (!result.hostname && result.isAlive) {
      try {
        const netbiosName = await this.getNetBIOSName(host);
        if (netbiosName) {
          result.hostname = netbiosName;
          result.methods.push('netbios');
          logger.info(`NetBIOS resolved hostname for ${host}: ${netbiosName}`);
        }
      } catch (error) {
        // NetBIOS lookup failed
      }
    }

    return result.isAlive ? result : null;
  },

  // Enhanced DNS hostname resolution
  async getDNSHostname(host) {
    return new Promise((resolve) => {
      const dns = require('dns');
      dns.reverse(host, (err, hostnames) => {
        if (err || !hostnames || hostnames.length === 0) {
          resolve(null);
        } else {
          // Return the first hostname, cleaned up
          const hostname = hostnames[0].replace(/\.$/, ''); // Remove trailing dot
          resolve(hostname);
        }
      });
    });
  },

  // NetBIOS name resolution for Windows devices
  async getNetBIOSName(host) {
    try {
      const { execSync } = require('child_process');
      // Try nmblookup if available
      const result = execSync(`timeout 3 nmblookup -A ${host} 2>/dev/null | grep '<00>' | head -1`, 
        { encoding: 'utf8', timeout: 4000 });
      
      if (result) {
        const match = result.match(/^\s*([A-Z0-9\-_]+)\s+<00>/);
        return match ? match[1] : null;
      }
    } catch (error) {
      // nmblookup not available or failed
    }
    return null;
  },

  // Enhanced SNMP scanning with multiple hostname OIDs
  async enhancedSNMPScan(host) {
    try {
      const snmp = require('net-snmp');
      
      return new Promise((resolve) => {
        const session = snmp.createSession(host, 'public', {
          version: snmp.Version2c,
          timeout: 3000,
          retries: 1
        });

        const timeout = setTimeout(() => {
          session.close();
          resolve({ success: false });
        }, 4000);

        // Query multiple OIDs for hostname and system info
        const oids = [
          '1.3.6.1.2.1.1.1.0',    // sysDescr
          '1.3.6.1.2.1.1.5.0',    // sysName (hostname)
          '1.3.6.1.2.1.1.4.0',    // sysContact
          '1.3.6.1.2.1.1.6.0'     // sysLocation
        ];

        session.get(oids, (error, varbinds) => {
          clearTimeout(timeout);
          session.close();
          
          if (error) {
            resolve({ success: false });
          } else {
            const sysDescr = varbinds[0]?.value?.toString() || '';
            const sysName = varbinds[1]?.value?.toString() || '';
            const sysContact = varbinds[2]?.value?.toString() || '';
            const sysLocation = varbinds[3]?.value?.toString() || '';
            
            // Prefer sysName (actual hostname) over extracted names
            let hostname = sysName || this.extractHostnameFromSysDescr(sysDescr);
            
            // Clean up hostname
            if (hostname) {
              hostname = hostname.replace(/\..+$/, ''); // Remove domain suffix
              hostname = hostname.trim();
            }
            
            resolve({
              success: true,
              hostname: hostname,
              deviceType: this.identifyDeviceTypeFromSysDescr(sysDescr),
              description: sysDescr,
              contact: sysContact,
              location: sysLocation
            });
          }
        });
      });
    } catch (error) {
      return { success: false };
    }
  },

  async arpScan(host) {
    try {
      const { execSync } = require('child_process');
      const arpOutput = execSync(`arp -n ${host}`, { encoding: 'utf8', timeout: 2000 });
      
      if (arpOutput && !arpOutput.includes('no entry')) {
        const macMatch = arpOutput.match(/([0-9a-f]{2}[:-]){5}[0-9a-f]{2}/i);
        return {
          found: true,
          mac: macMatch ? macMatch[0] : null
        };
      }
    } catch (error) {
      // ARP lookup failed
    }
    return { found: false };
  },

  async portScan(host) {
    const commonPorts = [22, 23, 53, 80, 135, 139, 443, 445, 993, 995, 1723, 3389, 5900, 8080, 8443];
    const openPorts = [];
    const services = [];

    const promises = commonPorts.map(async (port) => {
      try {
        const net = require('net');
        const socket = new net.Socket();
        
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            socket.destroy();
            resolve(false);
          }, 1000);

          socket.connect(port, host, () => {
            clearTimeout(timeout);
            socket.destroy();
            openPorts.push(port);
            services.push(this.identifyService(port));
            resolve(true);
          });

          socket.on('error', () => {
            clearTimeout(timeout);
            resolve(false);
          });
        });
      } catch (error) {
        return false;
      }
    });

    await Promise.all(promises);
    
    return { openPorts, services: services.filter(s => s) };
  },

  async snmpScan(host) {
    try {
      // Simple SNMP system description query
      const snmp = require('net-snmp');
      const session = snmp.createSession(host, 'public');
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          session.close();
          resolve({ success: false });
        }, 3000);

        session.get(['1.3.6.1.2.1.1.1.0'], (error, varbinds) => {
          clearTimeout(timeout);
          session.close();
          
          if (error) {
            resolve({ success: false });
          } else {
            const sysDescr = varbinds[0]?.value?.toString() || '';
            resolve({
              success: true,
              hostname: this.extractHostnameFromSysDescr(sysDescr),
              deviceType: this.identifyDeviceTypeFromSysDescr(sysDescr),
              description: sysDescr
            });
          }
        });
      });
    } catch (error) {
      return { success: false };
    }
  },

  identifyService(port) {
    const serviceMap = {
      22: 'SSH',
      23: 'Telnet',
      53: 'DNS',
      80: 'HTTP',
      135: 'RPC',
      139: 'NetBIOS',
      443: 'HTTPS',
      445: 'SMB',
      993: 'IMAPS',
      995: 'POP3S',
      1723: 'PPTP',
      3389: 'RDP',
      5900: 'VNC',
      8080: 'HTTP-Alt',
      8443: 'HTTPS-Alt'
    };
    return serviceMap[port] || `Port-${port}`;
  },

  identifyDeviceType(openPorts) {
    if (openPorts.includes(3389)) return 'windows-server';
    if (openPorts.includes(22) && openPorts.includes(80)) return 'linux-server';
    if (openPorts.includes(445) || openPorts.includes(139)) return 'windows-workstation';
    if (openPorts.includes(22)) return 'linux-device';
    if (openPorts.includes(80) || openPorts.includes(443)) return 'web-server';
    if (openPorts.includes(53)) return 'dns-server';
    return 'unknown';
  },

  identifyDeviceTypeFromSysDescr(sysDescr) {
    const desc = sysDescr.toLowerCase();
    if (desc.includes('cisco')) return 'cisco-device';
    if (desc.includes('hp') || desc.includes('hewlett')) return 'hp-device';
    if (desc.includes('juniper')) return 'juniper-device';
    if (desc.includes('linux')) return 'linux-server';
    if (desc.includes('windows')) return 'windows-server';
    if (desc.includes('router')) return 'router';
    if (desc.includes('switch')) return 'switch';
    return 'network-device';
  },

  extractHostnameFromSysDescr(sysDescr) {
    // Try to extract hostname from system description
    const match = sysDescr.match(/hostname\s*[:=]\s*(\S+)/i) || 
                  sysDescr.match(/name\s*[:=]\s*(\S+)/i);
    return match ? match[1] : null;
  },

  parseNetworkRange(networkRange) {
    const [baseIp, cidr] = networkRange.split('/');
    const subnetMask = parseInt(cidr);
    return { baseIp, subnetMask };
  },

  generateHostList(baseIp, subnetMask) {
    const ipParts = baseIp.split('.').map(Number);
    const hosts = [];
    
    // For /24 networks (most common)
    if (subnetMask === 24) {
      for (let i = 1; i <= 254; i++) {
        hosts.push(`${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.${i}`);
      }
    } else if (subnetMask === 16) {
      // For /16 networks - scan first 10 subnets to avoid overwhelming
      for (let subnet = 0; subnet <= 10; subnet++) {
        for (let host = 1; host <= 254; host++) {
          hosts.push(`${ipParts[0]}.${ipParts[1]}.${subnet}.${host}`);
        }
      }
    } else {
      // Default to /24 behavior
      for (let i = 1; i <= 254; i++) {
        hosts.push(`${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.${i}`);
      }
    }
    
    return hosts;
  },

  getScanStatus() {
    return scanState;
  },

  stopScan() {
    // Always attempt to stop scan, regardless of current state
    const wasRunning = scanState.isRunning;
    
    scanState.aborted = true;
    scanState.isRunning = false;  // Reset isRunning flag
    logger.info(`Network scan stop requested - was running: ${wasRunning}`);
    
    // CRITICAL FIX: Force clear scan state file
    try {
      clearScanState();
      logger.info('✅ Scan state file cleared successfully');
    } catch (error) {
      logger.error('❌ Failed to clear scan state file:', error.message);
      // Force remove file if clearScanState fails
      try {
        const fs = require('fs');
        const path = require('path');
        const scanStateFile = path.join(__dirname, '../.scan_state');
        if (fs.existsSync(scanStateFile)) {
          fs.unlinkSync(scanStateFile);
          logger.info('✅ Scan state file force-removed');
        }
      } catch (forceError) {
        logger.error('❌ Failed to force-remove scan state file:', forceError.message);
      }
    }
    
    // Return true regardless - stopping should always succeed
    return true;
  }
};

// Get available network ranges endpoint
router.get('/networks', authenticateToken, async (req, res) => {
  try {
    const environment = await NetworkDetector.getDeploymentEnvironment();
    const recommended = await NetworkDetector.getRecommendedRanges();
    const autoBest = await NetworkDetector.autoDetectBestNetwork();
    
    res.json({
      success: true,
      environment: {
        isDocker: environment.isDocker,
        isBareMetal: environment.isBareMetal
      },
      networks: environment.hostNetwork || [],
      containerNetworks: NetworkDetector.getNetworkInterfaces(),
      recommended: recommended,
      current: autoBest
    });
  } catch (error) {
    logger.error(`Network detection error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
      fallback: {
        current: 'auto',
        recommended: [
          { label: 'Auto-detect Best Network', value: 'auto', type: 'auto', priority: 0 },
          { label: 'Default (192.168.1.x)', value: '192.168.1.0/24', type: 'fallback', priority: 5 }
        ]
      }
    });
  }
});

// Start network scan endpoint (alias: /start)
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { 
      networkRange = 'auto', 
      immediate = true,
      methods = ['ping', 'arp', 'port'],
      autoScan = true
    } = req.body;
    
    if (scanState.isRunning) {
      return res.status(409).json({
        success: false,
        message: 'Network scan already in progress'
      });
    }

    scanState.isRunning = true;
    scanState.startTime = new Date();
    scanState.progress = 0;
    scanState.currentTarget = null;
    scanState.devices = [];
    scanState.errors = [];

    logger.info(`🔍 Starting network discovery scan for range: ${networkRange}`);

    // Start the scan process
    setImmediate(async () => {
      try {
        await performNetworkScan(networkRange, methods);
      } catch (error) {
        logger.error('🚨 Network scan error:', error);
        scanState.isRunning = false;
        scanState.error = error.message;
      }
    });

    res.json({
      success: true,
      message: 'Network discovery started',
      scanId: Date.now(),
      config: {
        networkRange,
        methods,
        immediate,
        autoScan
      }
    });

  } catch (error) {
    logger.error('🚨 Failed to start discovery:', error);
    scanState.isRunning = false;
    res.status(500).json({
      success: false,
      error: 'Failed to start network discovery',
      details: error.message
    });
  }
});

// Start network scan endpoint
router.post('/scan', authenticateToken, async (req, res) => {
  try {
    const { 
      networkRange = 'auto', 
      immediate = true,
      methods = ['ping', 'arp', 'port'],
      autoScan = true
    } = req.body;
    
    if (scanState.isRunning) {
      return res.status(409).json({
        success: false,
        message: 'Network scan already in progress'
      });
    }

    let targetRange = networkRange;
    
    // Auto-detect best network if needed
    if (networkRange === 'auto' || autoScan) {
      targetRange = await NetworkDetector.autoDetectBestNetwork();
      logger.info(`Auto-detected target network: ${targetRange}`);
    }

    // CRITICAL: Validate that target range is not a Docker network
    if (targetRange !== 'auto' && NetworkDetector.isDockerNetwork(targetRange)) {
      return res.status(400).json({
        success: false,
        message: `Cannot scan Docker network range: ${targetRange}. Docker networks only contain container interfaces, not real network devices. Please specify a real network range.`,
        error: 'DOCKER_NETWORK_BLOCKED',
        suggestedRange: await NetworkDetector.autoDetectBestNetwork()
      });
    }

    // Validate network range format (unless it's 'auto')
    if (targetRange !== 'auto' && !/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(targetRange)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid network range format. Expected format: 192.168.1.0/24 or "auto"'
      });
    }

    // Start scan (async)
    const io = req.app.get('socketio');
    
    if (immediate) {
      // Start scan immediately and return status
      NetworkScanner.scanNetworkRange(targetRange, io, { methods })
        .then(result => {
          logger.info(`Advanced network scan completed: ${JSON.stringify(result)}`);
        })
        .catch(error => {
          logger.error(`Advanced network scan failed: ${error.message}`);
        });
      
      res.json({
        success: true,
        message: `Advanced network scan started`,
        networkRange: targetRange,
        methods: methods,
        autoDetected: networkRange === 'auto',
        scanId: scanState.startTime?.getTime()
      });
    } else {
      // Wait for scan completion
      const result = await NetworkScanner.scanNetworkRange(targetRange, io, { methods });
      res.json({
        success: true,
        message: 'Advanced network scan completed',
        networkRange: targetRange,
        autoDetected: networkRange === 'auto',
        ...result
      });
    }

  } catch (error) {
    logger.error(`Network scan endpoint error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Stop network scan endpoint
router.post('/stop', authenticateToken, async (req, res) => {
  try {
    const stopped = NetworkScanner.stopScan();
    
    const io = req.app.get('socketio');
    if (io) {
      io.emit('discovery.scanStopped', {
        stoppedAt: new Date(),
        progress: scanState.progress
      });
    }
    
    // Always return success since stopScan now always returns true
    res.json({
      success: true,
      message: 'Network scan stopped'
    });
  } catch (error) {
    logger.error(`Stop scan endpoint error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get scan status endpoint
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = NetworkScanner.getScanStatus();
    res.json({
      success: true,
      scanStatus: status
    });
  } catch (error) {
    logger.error(`Scan status endpoint error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get devices endpoint
router.get('/devices', authenticateToken, async (req, res) => {
  try {
    const devices = await Device.find({});
    res.status(200).json({
      success: true,
      devices,
      total: devices.length
    });
  } catch (error) {
    logger.error('Get devices error:', error);
    res.status(500).json({
      error: 'Failed to fetch devices',
      message: error.message
    });
  }
});

// Manual device discovery - Enhanced ping-based approach with robust error handling
router.post('/manual', authenticateToken, async (req, res) => {
  try {
    const { ipAddress, name, snmpCommunity = 'public' } = req.body;
    
    // Enhanced input validation
    if (!ipAddress) {
      return res.status(400).json({ 
        error: 'IP address is required',
        message: 'Please provide a valid IP address for device discovery'
      });
    }

    // Validate IP address format
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ipAddress)) {
      return res.status(400).json({
        error: 'Invalid IP address format',
        message: 'Please provide a valid IPv4 address (e.g., 192.168.1.100)'
      });
    }

    logger.info(`🔍 Manual discovery initiated for ${ipAddress}`);

    // Check if device already exists - with enhanced hard deletion approach
    const existingDevice = await Device.findOne({ ipAddress });
    
    if (existingDevice) {
      logger.info(`📋 Device ${ipAddress} already exists, performing hard deletion: ${existingDevice._id}`);
      
      // Delete existing device completely for clean re-addition
      await Device.findByIdAndDelete(existingDevice._id);
      
      // Emit single consolidated deletion event with updated dashboard stats
      const io = req.app.get('socketio');
      if (io) {
        const dashboardStats = await getDashboardStats();
        
        io.emit('dashboard.deviceDeleted', { 
          deletedDevice: {
            deviceId: existingDevice._id, 
            ipAddress: existingDevice.ipAddress,
            name: existingDevice.name
          },
          dashboardStats,
          timestamp: new Date()
        });
      }
      
      logger.info(`✅ Existing device ${ipAddress} removed, proceeding with fresh discovery`);
    }

    logger.info(`🆕 Starting discovery process for ${ipAddress}`);

    // Enhanced ping test with better timeout and retry logic
    const pingResult = await ping.promise.probe(ipAddress, { 
      timeout: 10,  // Increased timeout for better reliability
      extra: ['-c', '3']  // Send 3 pings for better accuracy
    });
    
    if (!pingResult.alive) {
      logger.warn(`❌ Device ${ipAddress} is not reachable via ping`);
      return res.status(400).json({
        error: 'Device not reachable',
        message: `Device at ${ipAddress} is not responding to ping. Please verify:`,
        troubleshooting: [
          'Device is powered on and connected to the network',
          'Network firewall allows ICMP traffic',
          'IP address is correct and accessible',
          'Device is not behind a restrictive firewall'
        ],
        suggestions: [
          'Check device power and network connectivity',
          'Verify IP address configuration', 
          'Test network connectivity from this server',
          'Try again after a few moments'
        ]
      });
    }

    // Enhanced device data with better defaults and validation
    const deviceData = {
      name: name || `Device-${ipAddress}`,
      ipAddress,
      deviceType: 'unknown',
      vendor: 'Unknown',
      model: 'Unknown', 
      description: `Manually discovered device at ${ipAddress}`,
      status: 'online',
      discoveredBy: 'manual',
      snmpCommunity,
      snmpVersion: 'v2c',
      snmpPort: 161,
      metrics: {
        lastSeen: new Date(),
        responseTime: parseFloat(pingResult.time) || 0
      },
      configuration: {
        ssh: { enabled: false, port: 22 },
        monitoring: { enabled: true, interval: 60, timeout: 5000 }
      },
      connectivity: { neighbors: [] },
      isVirtual: false,
      tags: [],
      interfaces: [],
      alerts: []
    };

    // Create and save device with enhanced error handling
    const device = new Device(deviceData);
    await device.save();

    // Enhanced real-time notification - single consolidated event
    const io = req.app.get('socketio');
    if (io) {
      // Get updated dashboard statistics
      const dashboardStats = await getDashboardStats();
      
      // Emit single comprehensive update event
      io.emit('dashboard.deviceAdded', {
        device: device.toObject(),
        dashboardStats,
        discoveryInfo: {
          discoveredBy: 'manual',
          discoveryMethod: 'manual',
          responseTime: deviceData.metrics.responseTime,
          timestamp: new Date()
        }
      });
    }

    logger.info(`✅ Device ${ipAddress} successfully discovered and added (${deviceData.metrics.responseTime}ms response)`);
    
    res.status(201).json({
      success: true,
      message: 'Device discovered and added successfully',
      device: {
        id: device._id,
        name: device.name,
        ipAddress: device.ipAddress,
        status: device.status,
        responseTime: device.metrics.responseTime,
        discoveredAt: device.createdAt
      },
      metadata: {
        discoveryMethod: 'manual',
        pingSuccess: true,
        responseTime: deviceData.metrics.responseTime
      }
    });

  } catch (error) {
    logger.error('Manual discovery error:', error);
    
    // Enhanced error handling with specific error types
    if (error.code === 11000) {
      // Duplicate key error - should be rare now with hard deletion
      const duplicateField = Object.keys(error.keyValue || {})[0] || 'unknown';
      return res.status(409).json({
        error: 'Duplicate device detected',
        message: `A device with this ${duplicateField} already exists in the database`,
        field: duplicateField,
        value: error.keyValue?.[duplicateField] || 'unknown'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Device data validation failed',
        details: Object.values(error.errors).map(e => e.message)
      });
    }
    
    // Network or ping related errors
    if (error.message?.includes('ping') || error.message?.includes('timeout')) {
      return res.status(400).json({
        error: 'Network connectivity issue',
        message: 'Failed to reach the device during discovery',
        details: error.message
      });
    }
    
    // Generic server error
    res.status(500).json({
      error: 'Discovery failed',
      message: 'An unexpected error occurred during device discovery',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Basic discovery config endpoint
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const config = {
      networkRanges: ['192.168.29.0/24'],
      snmpCommunities: ['public'],
      scanInterval: 300,
      autoDiscovery: false,
      maxConcurrentScans: 5,
      protocols: ['ping'],
      ports: [22, 80, 443, 161]
    };
    
    res.status(200).json(config);
  } catch (error) {
    logger.error('Get discovery config error:', error);
    res.status(500).json({
      error: 'Failed to get discovery configuration',
      message: error.message
    });
  }
});

// Enhanced hostname resolution endpoint to update device names
router.post('/resolve-hostnames', authenticateToken, async (req, res) => {
  try {
    const { ipAddresses } = req.body;
    
    if (!ipAddresses || !Array.isArray(ipAddresses)) {
      return res.status(400).json({
        success: false,
        message: 'IP addresses array is required'
      });
    }

    const results = [];
    const { io } = require('../server');

    for (const ip of ipAddresses) {
      try {
        // Find the device
        const device = await Device.findOne({ ipAddress: ip });
        if (!device) {
          results.push({ ip, status: 'not_found' });
          continue;
        }

        // Attempt to resolve hostname using multiple methods
        const deviceInfo = await NetworkDetector.scanHost(ip, ['dns', 'snmp']);
        
        if (deviceInfo && deviceInfo.hostname) {
          // Update device with new hostname
          const oldName = device.name;
          device.name = deviceInfo.hostname;
          device.displayName = deviceInfo.hostname;
          device.notes = `${device.notes || ''}. Hostname updated: ${new Date().toISOString()}`;
          
          await device.save();
          
          results.push({
            ip,
            status: 'updated',
            oldName,
            newName: deviceInfo.hostname,
            methods: deviceInfo.methods
          });
          
          // Notify clients of hostname update
          if (io) {
            io.emit('device.hostnameUpdated', {
              device: device,
              oldName,
              newName: deviceInfo.hostname
            });
          }
          
          logger.info(`Updated hostname for ${ip}: ${oldName} -> ${deviceInfo.hostname}`);
        } else {
          results.push({
            ip,
            status: 'no_hostname_found',
            message: 'Could not resolve hostname'
          });
        }
      } catch (error) {
        results.push({
          ip,
          status: 'error',
          message: error.message
        });
      }
    }

    res.json({
      success: true,
      results,
      totalProcessed: ipAddresses.length,
      successCount: results.filter(r => r.status === 'updated').length
    });
  } catch (error) {
    logger.error('Hostname resolution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve hostnames',
      error: error.message
    });
  }
});

// Discovery history endpoint
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0, days = 30 } = req.query;
    
    // Get discovery history from the last X days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Get devices created in the specified time range as discovery history
    const discoveredDevices = await Device.find({
      createdAt: { $gte: startDate }
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .select('name ipAddress deviceType status createdAt discoveryMethod');

    // Mock scan history data (in a real app, this would be stored separately)
    const scanHistory = [
      {
        id: 'scan_' + Date.now(),
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        endTime: new Date(Date.now() - 3300000),   // 55 minutes ago
        status: 'completed',
        devicesFound: discoveredDevices.length,
        networkRange: '192.168.1.0/24',
        methods: ['ping', 'arp'],
        duration: 300000 // 5 minutes
      }
    ];

    res.json({
      success: true,
      history: {
        scans: scanHistory,
        recentDiscoveries: discoveredDevices,
        summary: {
          totalScans: scanHistory.length,
          devicesDiscovered: discoveredDevices.length,
          lastScan: scanHistory[0]?.endTime || null
        }
      },
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: discoveredDevices.length
      }
    });

  } catch (error) {
    logger.error('Discovery history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch discovery history',
      message: error.message
    });
  }
});

module.exports = router;