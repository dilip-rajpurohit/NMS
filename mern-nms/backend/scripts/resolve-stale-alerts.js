const mongoose = require('mongoose');
const Device = require('../models/Device');

async function resolveStaleAlerts() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://admin:admin123@localhost:27017/nms?authSource=admin');
    console.log('Connected to database');
    
    // Acknowledge Device Unreachable alerts for devices that are now online
    const result1 = await Device.updateMany(
      { 
        status: 'online',
        'alerts.type': 'Device Unreachable',
        'alerts.acknowledged': false
      },
      { 
        $set: { 
          'alerts.$[elem].acknowledged': true,
          'alerts.$[elem].resolvedAt': new Date(),
          'alerts.$[elem].resolvedBy': 'auto-resolution'
        }
      },
      { 
        arrayFilters: [{ 
          'elem.type': 'Device Unreachable', 
          'elem.acknowledged': false 
        }]
      }
    );
    console.log(`Resolved ${result1.modifiedCount} Device Unreachable alerts`);

    // Auto-acknowledge old Device Back Online alerts (older than 5 minutes)
    const result2 = await Device.updateMany(
      { 
        'alerts.type': 'Device Back Online',
        'alerts.acknowledged': false,
        'alerts.timestamp': { $lt: new Date(Date.now() - 5 * 60 * 1000) } // 5 minutes ago
      },
      { 
        $set: { 
          'alerts.$[elem].acknowledged': true,
          'alerts.$[elem].resolvedAt': new Date(),
          'alerts.$[elem].resolvedBy': 'auto-timeout'
        }
      },
      { 
        arrayFilters: [{ 
          'elem.type': 'Device Back Online', 
          'elem.acknowledged': false,
          'elem.timestamp': { $lt: new Date(Date.now() - 5 * 60 * 1000) }
        }]
      }
    );
    console.log(`Auto-acknowledged ${result2.modifiedCount} Device Back Online alerts`);

    // Show current alert status
    const devices = await Device.find({}).select('name ipAddress status alerts');
    console.log('\nCurrent Alert Status:');
    devices.forEach(device => {
      const activeAlerts = device.alerts.filter(alert => !alert.acknowledged);
      console.log(`${device.name} (${device.ipAddress}) - Status: ${device.status}, Active Alerts: ${activeAlerts.length}`);
      activeAlerts.forEach(alert => {
        console.log(`  - ${alert.type}: ${alert.severity} (${alert.timestamp})`);
      });
    });

    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
    
  } catch (error) {
    console.error('Error resolving alerts:', error);
    process.exit(1);
  }
}

resolveStaleAlerts();