const mongoose = require('mongoose');

// Advanced Network Configuration Schema
const networkConfigurationSchema = new mongoose.Schema({
  configId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Network Infrastructure Configuration
  infrastructure: {
    // Global network settings
    global: {
      domain: String,
      dnsPrimary: String,
      dnsSecondary: String,
      ntpServers: [String],
      syslogServer: String,
      snmpCommunities: [{
        name: String,
        access: { type: String, enum: ['read', 'write', 'read-write'] },
        hosts: [String]
      }],
      managementVlan: Number
    },
    
    // IP Address Management
    ipam: {
      networks: [{
        networkId: String,
        cidr: String,
        vlan: Number,
        description: String,
        gateway: String,
        dhcpEnabled: Boolean,
        dhcpRange: {
          start: String,
          end: String
        },
        reservedIPs: [{
          ip: String,
          description: String,
          macAddress: String
        }],
        usage: {
          total: Number,
          used: Number,
          available: Number
        }
      }],
      
      // Subnetting configuration
      subnets: [{
        subnetId: String,
        parentNetwork: String,
        cidr: String,
        purpose: String, // 'management', 'user', 'dmz', 'server', etc.
        vlan: Number
      }]
    },
    
    // VLAN Configuration
    vlans: [{
      vlanId: Number,
      name: String,
      description: String,
      type: { type: String, enum: ['data', 'voice', 'management', 'guest', 'iot'] },
      subnet: String,
      
      // VLAN policies
      policies: {
        accessControl: Boolean,
        qosClass: String,
        bandwidthLimit: Number,
        stormControl: {
          broadcast: Number,
          multicast: Number,
          unicast: Number
        }
      },
      
      // Trunk and Access ports
      ports: [{
        deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
        interface: String,
        mode: { type: String, enum: ['access', 'trunk'] },
        nativeVlan: Number, // for trunk ports
        allowedVlans: [Number]
      }]
    }],
    
    // Routing Configuration
    routing: {
      // Static routes
      staticRoutes: [{
        destination: String, // CIDR notation
        nextHop: String,
        metric: Number,
        interface: String,
        description: String,
        enabled: Boolean
      }],
      
      // Dynamic routing protocols
      protocols: {
        ospf: {
          enabled: Boolean,
          processId: Number,
          routerId: String,
          areas: [{
            areaId: String,
            type: { type: String, enum: ['standard', 'stub', 'nssa'] },
            networks: [String],
            authentication: {
              type: { type: String, enum: ['none', 'simple', 'md5'] },
              key: String
            }
          }]
        },
        
        bgp: {
          enabled: Boolean,
          asNumber: Number,
          routerId: String,
          neighbors: [{
            ip: String,
            remoteAs: Number,
            description: String,
            authentication: String
          }]
        },
        
        eigrp: {
          enabled: Boolean,
          asNumber: Number,
          networks: [String]
        }
      },
      
      // Route redistribution
      redistribution: [{
        from: String, // protocol name
        to: String,
        metric: Number,
        routeMap: String
      }]
    },
    
    // Quality of Service (QoS)
    qos: {
      enabled: Boolean,
      
      // Traffic classes
      trafficClasses: [{
        name: String,
        priority: Number,
        bandwidthPercent: Number,
        burstSize: Number,
        
        // Classification criteria
        classification: {
          dscp: [Number],
          ipPrecedence: [Number],
          protocols: [String],
          ports: [Number],
          sourceNetworks: [String],
          destinationNetworks: [String]
        }
      }],
      
      // QoS policies per interface
      interfacePolicies: [{
        deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
        interface: String,
        direction: { type: String, enum: ['inbound', 'outbound'] },
        policyName: String,
        shaping: {
          rate: Number, // bps
          burstSize: Number
        },
        policing: {
          rate: Number,
          action: { type: String, enum: ['drop', 'remark'] }
        }
      }]
    },
    
    // Security Configuration
    security: {
      // Access Control Lists
      acls: [{
        name: String,
        type: { type: String, enum: ['standard', 'extended'] },
        rules: [{
          sequence: Number,
          action: { type: String, enum: ['permit', 'deny'] },
          protocol: String,
          source: {
            network: String,
            wildcard: String,
            ports: String
          },
          destination: {
            network: String,
            wildcard: String,
            ports: String
          },
          options: String,
          description: String
        }]
      }],
      
      // Firewall zones
      firewallZones: [{
        name: String,
        description: String,
        interfaces: [String],
        securityLevel: Number,
        
        // Inter-zone policies
        policies: [{
          fromZone: String,
          toZone: String,
          action: { type: String, enum: ['permit', 'deny', 'inspect'] },
          services: [String]
        }]
      }],
      
      // VPN Configuration
      vpn: {
        siteToSite: [{
          name: String,
          localEndpoint: String,
          remoteEndpoint: String,
          localNetworks: [String],
          remoteNetworks: [String],
          encryption: String,
          authentication: String,
          presharedKey: String,
          enabled: Boolean
        }],
        
        remoteAccess: {
          enabled: Boolean,
          protocol: { type: String, enum: ['ikev2', 'l2tp', 'pptp', 'sstp'] },
          addressPool: String,
          dnsServers: [String],
          splitTunneling: Boolean
        }
      },
      
      // Network Access Control
      nac: {
        enabled: Boolean,
        mode: { type: String, enum: ['monitor', 'enforce'] },
        
        // 802.1X configuration
        dot1x: {
          enabled: Boolean,
          authenticationServer: String,
          accountingServer: String,
          sharedSecret: String,
          
          // Per-port configuration
          portConfig: [{
            deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
            interface: String,
            mode: { type: String, enum: ['auto', 'force-authorized', 'force-unauthorized'] },
            guestVlan: Number,
            authFailVlan: Number
          }]
        }
      }
    },
    
    // Monitoring and SNMP
    monitoring: {
      snmp: {
        version: { type: String, enum: ['v1', 'v2c', 'v3'] },
        communities: [{
          name: String,
          access: { type: String, enum: ['read', 'write'] },
          hosts: [String]
        }],
        
        // SNMPv3 users (if v3 is used)
        users: [{
          username: String,
          authProtocol: { type: String, enum: ['md5', 'sha'] },
          authPassword: String,
          privProtocol: { type: String, enum: ['des', 'aes'] },
          privPassword: String
        }],
        
        // SNMP traps
        traps: {
          enabled: Boolean,
          servers: [String],
          community: String,
          types: [String] // link-up, link-down, cold-start, etc.
        }
      },
      
      // NetFlow/sFlow configuration
      flowMonitoring: {
        netflow: {
          enabled: Boolean,
          version: Number,
          collector: String,
          port: Number,
          sourceInterface: String,
          
          // Flow sampling
          sampling: {
            enabled: Boolean,
            rate: Number
          }
        },
        
        sflow: {
          enabled: Boolean,
          collector: String,
          port: Number,
          samplingRate: Number,
          pollingInterval: Number
        }
      },
      
      // Performance monitoring
      performance: {
        thresholds: {
          cpuUtilization: { warning: Number, critical: Number },
          memoryUtilization: { warning: Number, critical: Number },
          interfaceUtilization: { warning: Number, critical: Number },
          responseTime: { warning: Number, critical: Number },
          packetLoss: { warning: Number, critical: Number }
        },
        
        // Polling intervals
        polling: {
          systemMetrics: Number, // seconds
          interfaceMetrics: Number,
          environmentalMetrics: Number
        }
      }
    }
  },
  
  // Device-specific configurations
  deviceConfigurations: [{
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
    deviceType: String,
    
    // Device-specific settings
    settings: {
      hostname: String,
      management: {
        ip: String,
        vlan: Number,
        gateway: String
      },
      
      // Interface configuration
      interfaces: [{
        name: String,
        description: String,
        enabled: Boolean,
        ipAddress: String,
        subnetMask: String,
        vlan: Number,
        duplex: { type: String, enum: ['auto', 'half', 'full'] },
        speed: { type: String, enum: ['auto', '10', '100', '1000', '10000'] },
        
        // Security settings per interface
        security: {
          portSecurity: Boolean,
          maxMacAddresses: Number,
          violationAction: { type: String, enum: ['shutdown', 'restrict', 'protect'] }
        }
      }],
      
      // Device-specific routing
      routing: {
        defaultRoute: String,
        staticRoutes: [{
          destination: String,
          gateway: String,
          metric: Number
        }]
      },
      
      // Device users and access
      users: [{
        username: String,
        privilege: Number,
        password: String, // should be hashed
        sshKeys: [String]
      }],
      
      // Services configuration
      services: {
        ssh: { enabled: Boolean, port: Number },
        telnet: { enabled: Boolean, port: Number },
        http: { enabled: Boolean, port: Number },
        https: { enabled: Boolean, port: Number },
        snmp: { enabled: Boolean, community: String }
      }
    },
    
    // Configuration templates
    templates: [{
      name: String,
      commands: [String],
      variables: [{
        name: String,
        value: String
      }]
    }],
    
    // Configuration backup
    backup: {
      lastBackup: Date,
      backupPath: String,
      autoBackup: Boolean,
      backupInterval: Number // hours
    }
  }],
  
  // Configuration metadata
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    version: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft'
    },
    
    // Change tracking
    changes: [{
      timestamp: Date,
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      section: String,
      action: { type: String, enum: ['create', 'update', 'delete'] },
      description: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }],
    
    // Deployment information
    deployment: {
      lastDeployed: Date,
      deployedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      deploymentStatus: { 
        type: String, 
        enum: ['pending', 'deploying', 'deployed', 'failed'],
        default: 'pending'
      },
      affectedDevices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Device' }],
      rollbackData: mongoose.Schema.Types.Mixed
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
networkConfigurationSchema.index({ configId: 1 });
networkConfigurationSchema.index({ name: 1 });
networkConfigurationSchema.index({ 'metadata.status': 1 });
networkConfigurationSchema.index({ 'metadata.createdBy': 1 });
networkConfigurationSchema.index({ 'deviceConfigurations.deviceId': 1 });

// Virtual for active configuration
networkConfigurationSchema.virtual('isActive').get(function() {
  return this.metadata.status === 'active';
});

// Static methods
networkConfigurationSchema.statics.getActiveConfiguration = function() {
  return this.findOne({ 'metadata.status': 'active' });
};

networkConfigurationSchema.statics.getConfigurationHistory = function(deviceId) {
  return this.find({ 
    'deviceConfigurations.deviceId': deviceId 
  }).sort({ updatedAt: -1 });
};

// Instance methods
networkConfigurationSchema.methods.activate = function(userId) {
  // Deactivate all other configurations first
  return this.constructor.updateMany(
    { 'metadata.status': 'active' },
    { $set: { 'metadata.status': 'archived' } }
  ).then(() => {
    this.metadata.status = 'active';
    this.metadata.lastModifiedBy = userId;
    this.metadata.deployment.deploymentStatus = 'pending';
    return this.save();
  });
};

networkConfigurationSchema.methods.addChange = function(userId, section, action, description, oldValue = null, newValue = null) {
  this.metadata.changes.push({
    timestamp: new Date(),
    user: userId,
    section: section,
    action: action,
    description: description,
    oldValue: oldValue,
    newValue: newValue
  });
  
  this.metadata.lastModifiedBy = userId;
  this.metadata.version += 1;
  
  return this.save();
};

networkConfigurationSchema.methods.createBackup = function() {
  const backup = {
    configId: this.configId + '_backup_' + Date.now(),
    name: this.name + ' (Backup)',
    infrastructure: this.infrastructure,
    deviceConfigurations: this.deviceConfigurations,
    metadata: {
      ...this.metadata,
      status: 'archived',
      createdBy: this.metadata.lastModifiedBy
    }
  };
  
  return new this.constructor(backup).save();
};

module.exports = mongoose.model('NetworkConfiguration', networkConfigurationSchema);