const mongoose = require('mongoose');

const topologySchema = new mongoose.Schema({
  sourceDevice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  targetDevice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  sourceInterface: {
    name: String,
    index: Number
  },
  targetInterface: {
    name: String,
    index: Number
  },
  linkType: {
    type: String,
    enum: ['ethernet', 'wireless', 'virtual', 'unknown'],
    default: 'unknown'
  },
  protocol: {
    type: String,
    enum: ['lldp', 'cdp', 'manual', 'ping', 'arp'],
    default: 'unknown'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5
  },
  bandwidth: {
    type: Number,
    default: 0
  },
  latency: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'down'],
    default: 'active'
  },
  discoveredAt: {
    type: Date,
    default: Date.now
  },
  lastVerified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate links
topologySchema.index({ 
  sourceDevice: 1, 
  targetDevice: 1, 
  'sourceInterface.name': 1, 
  'targetInterface.name': 1 
}, { unique: true });

topologySchema.index({ linkType: 1 });
topologySchema.index({ status: 1 });
topologySchema.index({ lastVerified: 1 });

module.exports = mongoose.model('Topology', topologySchema);