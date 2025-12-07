const mongoose = require('mongoose');

// Network Performance Metrics Schema
const networkMetricsSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Interface Metrics
  interfaces: [{
    interfaceIndex: Number,
    interfaceName: String,
    interfaceType: String,
    
    // Traffic Metrics
    inOctets: { type: Number, default: 0 },
    outOctets: { type: Number, default: 0 },
    inPackets: { type: Number, default: 0 },
    outPackets: { type: Number, default: 0 },
    inErrors: { type: Number, default: 0 },
    outErrors: { type: Number, default: 0 },
    inDiscards: { type: Number, default: 0 },
    outDiscards: { type: Number, default: 0 },
    
    // Calculated rates (per second)
    inBitsPerSec: { type: Number, default: 0 },
    outBitsPerSec: { type: Number, default: 0 },
    inPktsPerSec: { type: Number, default: 0 },
    outPktsPerSec: { type: Number, default: 0 },
    
    // Utilization percentages
    inUtilization: { type: Number, default: 0, min: 0, max: 100 },
    outUtilization: { type: Number, default: 0, min: 0, max: 100 },
    
    // Interface status
    operStatus: { type: String, enum: ['up', 'down', 'testing', 'unknown', 'dormant', 'notPresent', 'lowerLayerDown'] },
    adminStatus: { type: String, enum: ['up', 'down', 'testing'] },
    speed: Number, // Interface speed in bps
    mtu: Number
  }],
  
  // System Performance
  systemMetrics: {
    cpuUtilization: { type: Number, min: 0, max: 100 },
    memoryUtilization: { type: Number, min: 0, max: 100 },
    memoryTotal: Number,
    memoryUsed: Number,
    diskUtilization: { type: Number, min: 0, max: 100 },
    diskTotal: Number,
    diskUsed: Number,
    
    // System load and processes
    loadAverage: {
      oneMin: Number,
      fiveMin: Number,
      fifteenMin: Number
    },
    processCount: Number,
    threadCount: Number,
    
    // Temperature and power
    temperature: Number,
    powerConsumption: Number,
    fanSpeed: [Number],
    voltageReadings: [{
      sensor: String,
      value: Number,
      unit: String
    }]
  },
  
  // Network Health Indicators
  healthMetrics: {
    responseTime: { type: Number, min: 0 }, // in ms
    packetLoss: { type: Number, min: 0, max: 100 },
    availability: { type: Number, min: 0, max: 100 },
    jitter: { type: Number, min: 0 },
    bandwidth: {
      total: Number,
      available: Number,
      utilization: { type: Number, min: 0, max: 100 }
    }
  },
  
  // Quality of Service Metrics
  qosMetrics: {
    totalQueues: Number,
    queues: [{
      queueId: Number,
      queueName: String,
      packetsDropped: Number,
      bytesDropped: Number,
      packetsTransmitted: Number,
      bytesTransmitted: Number,
      priority: String
    }]
  },
  
  // Security Metrics
  securityMetrics: {
    securityViolations: Number,
    unauthorizedAccess: Number,
    blockedConnections: Number,
    suspiciousActivity: Number
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
networkMetricsSchema.index({ deviceId: 1, timestamp: -1 });
networkMetricsSchema.index({ timestamp: 1 });
networkMetricsSchema.index({ deviceId: 1 });
networkMetricsSchema.index({ 'healthMetrics.availability': 1 });
networkMetricsSchema.index({ 'systemMetrics.cpuUtilization': 1 });

// TTL index to automatically delete old metrics (keep 90 days by default)
networkMetricsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

// Virtual for total bandwidth utilization
networkMetricsSchema.virtual('totalBandwidthUtilization').get(function() {
  if (!this.interfaces || this.interfaces.length === 0) return 0;
  
  const totalUtil = this.interfaces.reduce((sum, iface) => {
    return sum + ((iface.inUtilization || 0) + (iface.outUtilization || 0)) / 2;
  }, 0);
  
  return totalUtil / this.interfaces.length;
});

// Static methods for aggregations
networkMetricsSchema.statics.getAverageMetrics = function(deviceId, hours = 24) {
  const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
  
  return this.aggregate([
    { $match: { deviceId: deviceId, timestamp: { $gte: since } } },
    {
      $group: {
        _id: null,
        avgCpuUtil: { $avg: '$systemMetrics.cpuUtilization' },
        avgMemUtil: { $avg: '$systemMetrics.memoryUtilization' },
        avgResponseTime: { $avg: '$healthMetrics.responseTime' },
        avgPacketLoss: { $avg: '$healthMetrics.packetLoss' },
        avgAvailability: { $avg: '$healthMetrics.availability' },
        maxCpuUtil: { $max: '$systemMetrics.cpuUtilization' },
        maxMemUtil: { $max: '$systemMetrics.memoryUtilization' },
        count: { $sum: 1 }
      }
    }
  ]);
};

networkMetricsSchema.statics.getTopTalkers = function(hours = 24, limit = 10) {
  const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
  
  return this.aggregate([
    { $match: { timestamp: { $gte: since } } },
    { $unwind: '$interfaces' },
    {
      $group: {
        _id: '$deviceId',
        totalInBytes: { $sum: '$interfaces.inOctets' },
        totalOutBytes: { $sum: '$interfaces.outOctets' },
        totalBytes: { $sum: { $add: ['$interfaces.inOctets', '$interfaces.outOctets'] } }
      }
    },
    { $sort: { totalBytes: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'devices',
        localField: '_id',
        foreignField: '_id',
        as: 'device'
      }
    },
    { $unwind: '$device' }
  ]);
};

networkMetricsSchema.statics.getCapacityTrends = function(deviceId, days = 30) {
  const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
  
  return this.aggregate([
    { $match: { deviceId: deviceId, timestamp: { $gte: since } } },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        },
        avgCpuUtil: { $avg: '$systemMetrics.cpuUtilization' },
        avgMemUtil: { $avg: '$systemMetrics.memoryUtilization' },
        avgBandwidthUtil: { $avg: '$healthMetrics.bandwidth.utilization' },
        maxCpuUtil: { $max: '$systemMetrics.cpuUtilization' },
        maxMemUtil: { $max: '$systemMetrics.memoryUtilization' },
        timestamp: { $first: '$timestamp' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
};

module.exports = mongoose.model('NetworkMetrics', networkMetricsSchema);