const mongoose = require('mongoose');

// System Settings Schema
const systemSettingsSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['general', 'monitoring', 'security', 'network', 'email'],
    unique: true
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Network Configuration Schema
const networkConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  networkRange: {
    type: String,
    required: true
  },
  scanPorts: [{
    type: Number
  }],
  excludeRanges: [{
    type: String
  }],
  enablePortScanning: {
    type: Boolean,
    default: true
  },
  enableOSDetection: {
    type: Boolean,
    default: false
  },
  maxConcurrentScans: {
    type: Number,
    default: 50
  },
  scanTimeout: {
    type: Number,
    default: 30
  },
  enableIPv6: {
    type: Boolean,
    default: false
  },
  dnsServers: [{
    type: String
  }],
  enableReverseDNS: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Report Configuration Schema
const reportConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['devices', 'network-health', 'performance', 'security', 'custom']
  },
  frequency: {
    type: String,
    required: true,
    enum: ['once', 'daily', 'weekly', 'monthly']
  },
  schedule: {
    time: String,
    day: String,
    date: Number
  },
  recipients: [{
    email: String,
    name: String
  }],
  parameters: {
    timeRange: String,
    deviceFilter: mongoose.Schema.Types.Mixed,
    includeCharts: Boolean,
    format: {
      type: String,
      enum: ['pdf', 'excel', 'csv', 'json'],
      default: 'pdf'
    }
  },
  enabled: {
    type: Boolean,
    default: true
  },
  lastRun: Date,
  nextRun: Date,
  runCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Analytics Configuration Schema
const analyticsConfigSchema = new mongoose.Schema({
  dataRetention: {
    metrics: {
      type: Number,
      default: 30 // days
    },
    logs: {
      type: Number,
      default: 7 // days
    },
    alerts: {
      type: Number,
      default: 90 // days
    }
  },
  aggregation: {
    enableHourlyAggregation: {
      type: Boolean,
      default: true
    },
    enableDailyAggregation: {
      type: Boolean,
      default: true
    },
    enableWeeklyAggregation: {
      type: Boolean,
      default: true
    }
  },
  thresholds: {
    cpu: {
      warning: { type: Number, default: 70 },
      critical: { type: Number, default: 85 }
    },
    memory: {
      warning: { type: Number, default: 75 },
      critical: { type: Number, default: 90 }
    },
    disk: {
      warning: { type: Number, default: 80 },
      critical: { type: Number, default: 95 }
    },
    responseTime: {
      warning: { type: Number, default: 500 },
      critical: { type: Number, default: 1000 }
    },
    packetLoss: {
      warning: { type: Number, default: 1 },
      critical: { type: Number, default: 5 }
    }
  },
  notifications: {
    enableEmailAlerts: {
      type: Boolean,
      default: false
    },
    enableWebhooks: {
      type: Boolean,
      default: false
    },
    webhookUrl: String,
    alertRecipients: [{
      email: String,
      name: String,
      alertTypes: [String]
    }]
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = {
  SystemSettings: mongoose.model('SystemSettings', systemSettingsSchema),
  NetworkConfig: mongoose.model('NetworkConfig', networkConfigSchema),
  ReportConfig: mongoose.model('ReportConfig', reportConfigSchema),
  AnalyticsConfig: mongoose.model('AnalyticsConfig', analyticsConfigSchema)
};