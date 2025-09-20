// MongoDB initialization script
db = db.getSiblingDB('nms_db');

// Create a user for the application
db.createUser({
  user: 'nms_user',
  pwd: 'nms_password',
  roles: [
    {
      role: 'readWrite',
      db: 'nms_db'
    }
  ]
});

// Create indexes for better performance
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.devices.createIndex({ "ip": 1 }, { unique: true });
db.devices.createIndex({ "macAddress": 1 }, { unique: true });
db.metrics.createIndex({ "deviceId": 1, "timestamp": 1 });
db.alerts.createIndex({ "deviceId": 1, "timestamp": 1 });

print('NMS Database initialized successfully');