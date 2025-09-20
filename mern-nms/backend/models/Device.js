const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  ipAddress: {
    type: String,
    required: true,
    unique: true,
    match: [/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Please enter a valid IP address']
  },
  macAddress: {
    type: String,
    unique: true,
    sparse: true,
    match: [/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Please enter a valid MAC address']
  },
  deviceType: {
    type: String,
    enum: ['router', 'switch', 'firewall', 'server', 'workstation', 'printer', 'access_point', 'load_balancer', 'host', 'unknown'],
    default: 'unknown'
  },
  vendor: {
    type: String,
    trim: true,
    maxlength: 50
  },
  model: {
    type: String,
    trim: true,
    maxlength: 100
  },
  serialNumber: {
    type: String,
    trim: true,
    maxlength: 100
  },
  firmwareVersion: {
    type: String,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  location: {
    building: String,
    floor: String,
    room: String,
    rack: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  snmpCommunity: {
    type: String,
    default: 'public'
  },
  snmpVersion: {
    type: String,
    enum: ['v1', 'v2c', 'v3'],
    default: 'v2c'
  },
  snmpPort: {
    type: Number,
    default: 161
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'warning', 'critical', 'maintenance', 'unknown'],
    default: 'unknown'
  },
  interfaces: [{
    name: String,
    index: Number,
    status: String,
    macAddress: String,
    ipAddress: String,
    speed: Number,
    mtu: Number,
    type: { type: String, enum: ['ethernet', 'wireless', 'fiber', 'serial'] },
    duplex: { type: String, enum: ['full', 'half', 'auto'] },
    vlan: Number,
    description: String,
    lastChange: Date
  }],
  metrics: {
    cpuUsage: Number,
    memoryUsage: Number,
    memoryTotal: Number,
    uptime: Number,
    temperature: Number,
    powerConsumption: Number,
    lastSeen: Date,
    responseTime: Number,
    packetLoss: Number,
    availability: Number
  },
  alerts: [{
    type: { type: String, required: true },
    severity: { type: String, enum: ['info', 'warning', 'critical'], required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    acknowledged: { type: Boolean, default: false },
    acknowledgedBy: String,
    resolvedAt: Date
  }],
  configuration: {
    ssh: {
      enabled: { type: Boolean, default: false },
      port: { type: Number, default: 22 },
      username: String
    },
    monitoring: {
      enabled: { type: Boolean, default: true },
      interval: { type: Number, default: 60 }, // seconds
      timeout: { type: Number, default: 5000 }  // milliseconds
    }
  },
  connectivity: {
    neighbors: [{
      deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
      interface: String,
      protocol: String
    }]
  },
  discoveredBy: {
    type: String,
    enum: ['manual', 'auto', 'mininet', 'snmp'],
    default: 'auto'
  },
  isVirtual: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [String],
  notes: String
}, {
  timestamps: true
});

// Indexes for performance
deviceSchema.index({ ipAddress: 1 });
deviceSchema.index({ deviceType: 1 });
deviceSchema.index({ status: 1 });
deviceSchema.index({ 'metrics.lastSeen': 1 });
deviceSchema.index({ 'location.building': 1 });
deviceSchema.index({ tags: 1 });

// Virtual for display name
deviceSchema.virtual('displayName').get(function() {
  return this.name || `${this.deviceType}-${this.ipAddress}`;
});

// Virtual for uptime string
deviceSchema.virtual('uptimeString').get(function() {
  if (!this.metrics.uptime) return 'Unknown';
  
  const seconds = this.metrics.uptime;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
});

// Ensure virtual fields are serialized
deviceSchema.set('toJSON', {
  virtuals: true
});

// Static methods
deviceSchema.statics.findByType = function(type) {
  return this.find({ deviceType: type, isActive: true });
};

deviceSchema.statics.findByStatus = function(status) {
  return this.find({ status: status, isActive: true });
};

deviceSchema.statics.findByLocation = function(building, floor = null, room = null) {
  const query = { 'location.building': building, isActive: true };
  if (floor) query['location.floor'] = floor;
  if (room) query['location.room'] = room;
  return this.find(query);
};

deviceSchema.statics.findWithAlerts = function() {
  return this.find({ 
    'alerts.acknowledged': false,
    isActive: true 
  });
};

// Instance methods
deviceSchema.methods.updateStatus = function(status) {
  this.status = status;
  this.metrics.lastSeen = new Date();
  return this.save();
};

deviceSchema.methods.addAlert = function(type, severity, message) {
  this.alerts.push({
    type: type,
    severity: severity,
    message: message,
    timestamp: new Date()
  });
  return this.save();
};

deviceSchema.methods.acknowledgeAlert = function(alertId, acknowledgedBy) {
  const alert = this.alerts.id(alertId);
  if (alert) {
    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
  }
  return this.save();
};

module.exports = mongoose.model('Device', deviceSchema);