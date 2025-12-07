const mongoose = require('mongoose');

// Network Report Schema
const networkReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'performance',
      'availability', 
      'capacity',
      'security',
      'compliance',
      'sla',
      'traffic_analysis',
      'network_health',
      'device_inventory',
      'bandwidth_utilization',
      'error_analysis',
      'topology_changes'
    ]
  },
  category: {
    type: String,
    enum: ['operational', 'executive', 'technical', 'compliance'],
    default: 'operational'
  },
  
  // Report Parameters
  parameters: {
    timeRange: {
      start: { type: Date, required: true },
      end: { type: Date, required: true }
    },
    devices: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device'
    }],
    deviceTypes: [String],
    locations: [String],
    interfaces: [String],
    metrics: [String],
    
    // Filtering options
    filters: {
      minAvailability: Number,
      maxResponseTime: Number,
      severityLevel: { type: String, enum: ['info', 'warning', 'critical'] },
      includeOfflineDevices: { type: Boolean, default: true },
      groupBy: { type: String, enum: ['device', 'location', 'type', 'interface'] }
    }
  },
  
  // Report Data
  data: {
    summary: {
      totalDevices: Number,
      onlineDevices: Number,
      offlineDevices: Number,
      averageAvailability: Number,
      averageResponseTime: Number,
      totalAlerts: Number,
      criticalAlerts: Number,
      warningAlerts: Number,
      infoAlerts: Number,
      
      // Performance summary
      networkHealth: { type: Number, min: 0, max: 100 },
      overallUtilization: { type: Number, min: 0, max: 100 },
      capacityUsed: Number,
      capacityTotal: Number,
      
      // Traffic summary
      totalTrafficIn: Number,
      totalTrafficOut: Number,
      peakTrafficIn: Number,
      peakTrafficOut: Number,
      averageBandwidthUtil: Number
    },
    
    // Detailed metrics by device
    deviceMetrics: [{
      deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
      deviceName: String,
      deviceType: String,
      location: String,
      
      // Availability metrics
      availability: {
        percentage: Number,
        uptime: Number,
        downtime: Number,
        outages: [{
          start: Date,
          end: Date,
          duration: Number,
          reason: String
        }]
      },
      
      // Performance metrics
      performance: {
        avgResponseTime: Number,
        maxResponseTime: Number,
        minResponseTime: Number,
        packetLoss: Number,
        jitter: Number,
        
        // System performance
        cpuUtilization: {
          average: Number,
          maximum: Number,
          minimum: Number,
          samples: Number
        },
        memoryUtilization: {
          average: Number,
          maximum: Number,
          minimum: Number
        },
        
        // Interface performance
        interfaces: [{
          name: String,
          utilization: {
            in: { average: Number, peak: Number },
            out: { average: Number, peak: Number }
          },
          errors: {
            inErrors: Number,
            outErrors: Number,
            discards: Number
          },
          traffic: {
            inBytes: Number,
            outBytes: Number,
            inPackets: Number,
            outPackets: Number
          }
        }]
      },
      
      // Security metrics
      security: {
        violations: Number,
        unauthorizedAttempts: Number,
        blockedConnections: Number,
        suspiciousActivity: Number
      },
      
      // Alerts summary
      alerts: {
        total: Number,
        critical: Number,
        warning: Number,
        info: Number,
        acknowledged: Number,
        resolved: Number
      }
    }],
    
    // Trend analysis
    trends: {
      availabilityTrend: [{
        date: Date,
        value: Number
      }],
      performanceTrend: [{
        date: Date,
        responseTime: Number,
        cpuUtil: Number,
        memUtil: Number,
        bandwidthUtil: Number
      }],
      trafficTrend: [{
        date: Date,
        inTraffic: Number,
        outTraffic: Number
      }],
      alertsTrend: [{
        date: Date,
        count: Number,
        severity: String
      }]
    },
    
    // Top lists
    topLists: {
      topTalkers: [{
        deviceId: mongoose.Schema.Types.ObjectId,
        deviceName: String,
        totalBytes: Number,
        inBytes: Number,
        outBytes: Number
      }],
      topUtilizers: [{
        deviceId: mongoose.Schema.Types.ObjectId,
        deviceName: String,
        resource: String, // 'cpu', 'memory', 'bandwidth'
        utilization: Number
      }],
      mostErrors: [{
        deviceId: mongoose.Schema.Types.ObjectId,
        deviceName: String,
        errorCount: Number,
        errorType: String
      }],
      leastAvailable: [{
        deviceId: mongoose.Schema.Types.ObjectId,
        deviceName: String,
        availability: Number,
        downtime: Number
      }]
    },
    
    // Compliance data (for compliance reports)
    compliance: {
      standards: [String], // ISO, NIST, SOX, etc.
      requirements: [{
        requirement: String,
        status: { type: String, enum: ['compliant', 'non_compliant', 'partial'] },
        evidence: String,
        notes: String
      }],
      complianceScore: { type: Number, min: 0, max: 100 }
    },
    
    // SLA data (for SLA reports)
    sla: {
      targets: [{
        metric: String, // 'availability', 'response_time', 'throughput'
        target: Number,
        actual: Number,
        status: { type: String, enum: ['met', 'missed', 'at_risk'] },
        variance: Number
      }],
      overallSLAStatus: { type: String, enum: ['met', 'missed', 'at_risk'] },
      breaches: [{
        date: Date,
        metric: String,
        target: Number,
        actual: Number,
        duration: Number,
        impact: String
      }]
    }
  },
  
  // Report metadata
  metadata: {
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    executionTime: Number, // milliseconds
    dataPoints: Number,
    status: {
      type: String,
      enum: ['generating', 'completed', 'failed'],
      default: 'generating'
    },
    error: String,
    
    // Export information
    formats: [{
      format: { type: String, enum: ['pdf', 'csv', 'xlsx', 'json'] },
      filePath: String,
      fileSize: Number,
      generatedAt: Date
    }],
    
    // Scheduling information (for scheduled reports)
    schedule: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ['hourly', 'daily', 'weekly', 'monthly'] },
      time: String, // HH:MM format
      dayOfWeek: Number, // 0-6 for weekly
      dayOfMonth: Number, // 1-31 for monthly
      recipients: [String], // email addresses
      nextRun: Date,
      lastRun: Date
    }
  },
  
  // Report configuration
  configuration: {
    includeCharts: { type: Boolean, default: true },
    includeRawData: { type: Boolean, default: false },
    chartTypes: [String],
    colorScheme: { type: String, default: 'default' },
    logoUrl: String,
    customBranding: {
      enabled: { type: Boolean, default: false },
      companyName: String,
      header: String,
      footer: String
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
networkReportSchema.index({ reportId: 1 });
networkReportSchema.index({ type: 1, 'metadata.generatedAt': -1 });
networkReportSchema.index({ 'parameters.timeRange.start': 1, 'parameters.timeRange.end': 1 });
networkReportSchema.index({ 'metadata.generatedBy': 1 });
networkReportSchema.index({ 'metadata.status': 1 });
networkReportSchema.index({ 'metadata.schedule.enabled': 1, 'metadata.schedule.nextRun': 1 });

// TTL index to automatically delete old reports (keep 1 year by default)
networkReportSchema.index({ 'metadata.generatedAt': 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

// Virtual for report age
networkReportSchema.virtual('age').get(function() {
  return Date.now() - this.metadata.generatedAt.getTime();
});

// Virtual for report size estimation
networkReportSchema.virtual('estimatedSize').get(function() {
  return this.metadata.dataPoints * 100; // rough estimation in bytes
});

// Static methods
networkReportSchema.statics.findByType = function(type, limit = 10) {
  return this.find({ type: type })
    .sort({ 'metadata.generatedAt': -1 })
    .limit(limit)
    .populate('metadata.generatedBy', 'username email')
    .populate('parameters.devices', 'name ipAddress deviceType');
};

networkReportSchema.statics.findScheduled = function() {
  return this.find({ 
    'metadata.schedule.enabled': true,
    'metadata.schedule.nextRun': { $lte: new Date() }
  }).sort({ 'metadata.schedule.nextRun': 1 });
};

networkReportSchema.statics.getReportStatistics = function(days = 30) {
  const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
  
  return this.aggregate([
    { $match: { 'metadata.generatedAt': { $gte: since } } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgExecutionTime: { $avg: '$metadata.executionTime' },
        totalDataPoints: { $sum: '$metadata.dataPoints' },
        lastGenerated: { $max: '$metadata.generatedAt' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Instance methods
networkReportSchema.methods.updateSchedule = function() {
  if (!this.metadata.schedule.enabled) return;
  
  const now = new Date();
  let nextRun = new Date();
  
  switch (this.metadata.schedule.frequency) {
    case 'hourly':
      nextRun.setHours(nextRun.getHours() + 1);
      break;
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(parseInt(this.metadata.schedule.time.split(':')[0]));
      nextRun.setMinutes(parseInt(this.metadata.schedule.time.split(':')[1]));
      break;
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay() + this.metadata.schedule.dayOfWeek) % 7 + 7);
      break;
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      nextRun.setDate(this.metadata.schedule.dayOfMonth);
      break;
  }
  
  this.metadata.schedule.nextRun = nextRun;
  this.metadata.schedule.lastRun = now;
  return this.save();
};

networkReportSchema.methods.addExportFormat = function(format, filePath, fileSize) {
  this.metadata.formats.push({
    format: format,
    filePath: filePath,
    fileSize: fileSize,
    generatedAt: new Date()
  });
  return this.save();
};

module.exports = mongoose.model('NetworkReport', networkReportSchema);