/**
 * NMS Backend Server
 * Version: 2.0.0
 * Updated: December 7, 2025
 * Enterprise Network Management System
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Import advanced monitoring services
const AdvancedSNMPMonitor = require('./services/advancedSNMPMonitor');
const AdvancedNetworkAnalytics = require('./services/advancedNetworkAnalytics');
const EnhancedMonitoring = require('./services/enhancedMonitoring');

const app = express();
const server = http.createServer(app);

// Configure allowed origins for CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || `http://${process.env.IP}:${process.env.FRONTEND_PORT}`,
  `http://${process.env.IP}:${process.env.FRONTEND_PORT}`,
  `http://frontend:${process.env.FRONTEND_INTERNAL_PORT || 80}`,
  "http://frontend",
  // Allow access from local network (192.168.x.x and 10.x.x.x ranges)
  new RegExp(`^http:\\/\\/192\\.168\\.\\d+\\.\\d+:${process.env.FRONTEND_PORT}$`),
  new RegExp(`^http:\\/\\/10\\.\\d+\\.\\d+\\.\\d+:${process.env.FRONTEND_PORT}$`),
  new RegExp(`^http:\\/\\/172\\.(1[6-9]|2[0-9]|3[0-1])\\.\\d+\\.\\d+:${process.env.FRONTEND_PORT}$`)
];

// Check if we should allow all origins (for development)
const allowAllOrigins = process.env.ALLOW_ALL_ORIGINS === 'true';

const io = socketIo(server, {
  cors: {
    origin: allowAllOrigins ? true : allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Initialize advanced monitoring services
let advancedSNMPMonitor;
let networkAnalytics;
let enhancedMonitoring;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting middleware - Development friendly settings
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs (increased for development)
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all API routes
app.use('/api/', limiter);

// More restrictive rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 auth requests per windowMs (increased for development)
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

app.use('/api/auth/', authLimiter);

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // If ALLOW_ALL_ORIGINS is true, allow all origins
    if (allowAllOrigins) {
      return callback(null, true);
    }
    
    // Check if origin matches any allowed origins (including regex patterns)
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      return callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      console.log('Allowed origins:', allowedOrigins);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increase JSON payload limit for profile pictures
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Increase URL encoded payload limit

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ Connected to MongoDB');
  
  // Initialize email service
  const emailService = require('./utils/emailService');
  const emailConfigured = emailService.autoConfigureFromEnv();
  console.log(`📧 Email service initialized: ${emailConfigured ? 'SUCCESS' : 'FAILED'}`);
  if (emailConfigured) {
    console.log('✅ Email verification is ready');
  } else {
    console.log('⚠️  Email verification disabled - SMTP not configured');
  }
  
  // Create admin user after MongoDB connection
  await createAdminUser();
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Create default admin user (remove this in production)
const createAdminUser = async () => {
  try {
    const User = require('./models/User');
    
    // Only create admin user if explicitly enabled in environment
    if (process.env.CREATE_ADMIN_USER !== 'true') {
      console.log('⚠️  Admin user creation disabled. Set CREATE_ADMIN_USER=true to enable.');
      return;
    }
    
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('👤 Admin user already exists');
      return;
    }
    
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('❌ ADMIN_PASSWORD environment variable is required for security');
      process.exit(1);
    }
    const adminUser = new User({
      username: process.env.ADMIN_USERNAME,
      email: process.env.ADMIN_EMAIL,
      password: adminPassword,
      role: 'admin',
      isActive: true,
      createdAt: new Date()
    });
    
    await adminUser.save();
    console.log('👤 ✅ Admin user created successfully');
  console.log(`👤 📝 Username: ${adminUser.username}`);
  console.log(`👤 🔑 Password: ${adminPassword}`);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Join monitoring room
  socket.join('monitoring');
  
  // Initialize advanced monitoring for this socket
  socket.emit('monitoring-initialized', {
    status: 'connected',
    services: ['advanced-snmp', 'network-analytics', 'enhanced-monitoring']
  });
  
  // Send initial system status
  socket.emit('system-status', {
    status: 'connected',
    timestamp: new Date().toISOString()
  });

  // Register session in session manager (so activeSessions can be accurate)
  try {
    const sessionManager = require('./utils/sessionManager');
    sessionManager.registerSession(socket.id);
  } catch (err) {
    console.warn('Session manager registration failed:', err.message);
  }

  // Provide an initial payload expected by frontend ('initialData')
  (async () => {
    try {
      const Device = require('./models/Device');

      const totalDevices = await Device.countDocuments();
      const onlineDevices = await Device.countDocuments({ status: 'online' });
      const devices = await Device.find().sort({ createdAt: -1 }).limit(50).lean();

      // Collect unacknowledged alerts across devices (simple scan)
      const alertDevices = await Device.find({ 'alerts.acknowledged': false }).lean();
      const alerts = [];
      alertDevices.forEach(d => {
        (d.alerts || []).forEach(a => {
          if (!a.acknowledged) {
            alerts.push({
              ...a,
              deviceId: d._id,
              deviceName: d.name,
              deviceIp: d.ipAddress
            });
          }
        });
      });

      const alertCount = alerts.length;
      const networkHealth = totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0;

      socket.emit('initialData', {
        devices,
        alerts: alerts.slice(0, 50),
        metrics: {},
        deviceCount: totalDevices,
        alertCount,
        onlineDevices,
        scanProgress: 0,
        networkHealth
      });
    } catch (err) {
      console.error('Failed to assemble initialData for socket:', err.message);
    }
  })();
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
    try {
      const sessionManager = require('./utils/sessionManager');
      sessionManager.unregisterSession(socket.id);
    } catch (err) {
      // ignore
    }
  });
  
  socket.on('monitor-request', (data) => {
    // Enhanced real-time monitoring with advanced SNMP data
    if (advancedSNMPMonitor && advancedSNMPMonitor.isMonitoring) {
      const monitoringStats = advancedSNMPMonitor.getMonitoringStatistics();
      socket.emit('monitor-response', {
        type: data.type,
        timestamp: new Date().toISOString(),
        data: {
          message: 'Advanced SNMP monitoring active',
          stats: monitoringStats,
          activeServices: ['SNMP Monitor', 'Network Analytics', 'Enhanced Monitoring']
        }
      });
    } else {
      socket.emit('monitor-response', {
        type: data.type,
        timestamp: new Date().toISOString(),
        data: { message: 'Advanced monitoring services starting...' }
      });
    }
  });
  
  socket.on('device-action', (data) => {
    console.log('🔧 Device action:', data);
    socket.emit('device-action-result', {
      success: true,
      action: data.action,
      device: data.device,
      timestamp: new Date().toISOString()
    });
  });

  // Allow client to explicitly register (useful after auth)
  socket.on('session.register', (payload) => {
    try {
      const sessionManager = require('./utils/sessionManager');
      sessionManager.registerSession(socket.id, payload?.userId || 'anonymous');
      socket.emit('session.registered', { success: true, activeSessions: sessionManager.getActiveSessionCount() });
    } catch (err) {
      socket.emit('session.registered', { success: false });
    }
  });
});

// Initialize real-time alert monitoring service
const alertService = require('./services/alertService');
alertService.initialize(io);

// Start alert service after a delay to allow database connections to stabilize
setTimeout(async () => {
  alertService.start(30); // Check every 30 seconds for real-time monitoring
  console.log('🚨 Real-time alert service started');
  
  // Initialize advanced monitoring services
  try {
    console.log('🚀 Initializing Advanced Enterprise Monitoring Services...');
    
    // Initialize Advanced SNMP Monitor
    advancedSNMPMonitor = new AdvancedSNMPMonitor(io);
    await advancedSNMPMonitor.startAdvancedMonitoring();
    
    // Initialize Network Analytics
    networkAnalytics = new AdvancedNetworkAnalytics(io);
    await networkAnalytics.startAnalytics();
    
    // Initialize Enhanced Monitoring
    enhancedMonitoring = new EnhancedMonitoring(io);
    await enhancedMonitoring.startEnhancedServices();
    
    console.log('✅ Advanced Enterprise Monitoring Services initialized successfully');
    
    // Broadcast monitoring status to all connected clients
    io.to('monitoring').emit('advanced-monitoring-status', {
      status: 'active',
      services: {
        snmpMonitor: advancedSNMPMonitor.isMonitoring,
        networkAnalytics: networkAnalytics.isRunning,
        enhancedMonitoring: enhancedMonitoring.isActive
      },
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize advanced monitoring services:', error);
  }
}, 5000); // 5 second delay

// Real-time device monitoring - ping devices every 60 seconds
setInterval(async () => {
  try {
    const Device = require('./models/Device');
    const SNMPManager = require('./utils/snmpManager');
    const snmpManager = new SNMPManager();
    const ping = require('ping');
    const devices = await Device.find({ ipAddress: { $ne: 'localhost' } });
    
    let statusChanges = 0;
    
    for (const device of devices) {
      try {
        // Use the enhanced alert generation with resolution logic
        const alerts = await snmpManager.generateAlertsForDevice(device, io);
        
        // Get updated device status
        const updatedDevice = await Device.findById(device._id);
        
        // Check if status changed
        if (device.status !== updatedDevice.status) {
          statusChanges++;
          
          // Emit real-time status update
          io.emit('device.statusChanged', {
            deviceId: device._id,
            ipAddress: device.ipAddress,
            name: device.name,
            status: updatedDevice.status,
            responseTime: updatedDevice.metrics?.responseTime || null,
            timestamp: new Date()
          });
          
          console.log(`📡 Device ${device.ipAddress} status: ${updatedDevice.status} (${updatedDevice.metrics?.responseTime || 0}ms) - ${alerts.length} alerts generated`);
        }
        
      } catch (err) {
        console.warn(`⚠️  Failed to ping device ${device.ipAddress}: ${err.message}`);
      }
    }
    
    // If there were status changes or every 5 minutes, send dashboard updates
    if (statusChanges > 0 || Date.now() % 300000 < 60000) {
      const totalDevices = await Device.countDocuments({});
      const onlineDevices = await Device.countDocuments({ 
        status: { $in: ['online', 'up'] }
      });
      const offlineDevices = totalDevices - onlineDevices;
      
      // Calculate network health
      const networkHealth = totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0;
      
      // Emit dashboard update to all clients
      io.emit('dashboard.update', {
        networkStatus: {
          totalDevices,
          onlineDevices,
          offlineDevices,
          networkHealth
        },
        timestamp: new Date()
      });
      
      if (statusChanges > 0) {
        console.log(`📊 Dashboard update sent: ${onlineDevices}/${totalDevices} devices online (${networkHealth}% health)`);
      }
    }
  } catch (error) {
    console.error('Real-time device monitoring failed:', error);
  }
}, 60000); // Check every 60 seconds

// TODO: Implement real background monitoring tasks
// TODO: Implement real network topology monitoring

// Make io available to routes
app.set('socketio', io);

// Import routes
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const dashboardRoutes = require('./routes/dashboard');
const metricsRoutes = require('./routes/metrics');
const discoveryRoutes = require('./routes/discovery');
const alertRoutes = require('./routes/alerts');
console.log('🔍 About to require admin routes...');
const adminRoutes = require('./routes/admin');
console.log('✅ Admin routes loaded successfully');
const reportsRoutes = require('./routes/reports');
const networkConfigRoutes = require('./routes/networkConfig');
const profileRoutes = require('./routes/profile');
const emailVerificationRoutes = require('./routes/emailVerification');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/admin', adminRoutes);
console.log('✅ Admin routes mounted at /api/admin');
app.use('/api/reports', reportsRoutes);
app.use('/api/network-config', networkConfigRoutes);
app.use('/api/profile', profileRoutes); // Add profile route
app.use('/api/email-verification', emailVerificationRoutes); // Add email verification routes

// Enhanced health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'NMS Backend is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    activeConnections: io.sockets.sockets.size,
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION || '1.0.0'
  });
});

// System stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid
    },
    database: {
      status: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      host: mongoose.connection.host,
      name: mongoose.connection.name
    },
    websocket: {
      activeConnections: io.sockets.sockets.size,
      rooms: Object.keys(io.sockets.adapter.rooms).length
    }
  });
});

// Admin endpoints
app.get('/api/admin/users', async (req, res) => {
  try {
    const User = require('./models/User');
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.BACKEND_PORT;

server.listen(PORT, '0.0.0.0', () => {
  const serverIP = process.env.IP;
  const frontendPort = process.env.FRONTEND_PORT;
  const backendPort = process.env.BACKEND_PORT;
  console.log(`🚀 NMS Backend server running on port ${PORT} (binding to all interfaces)`);
  console.log(`📊 API available at http://${serverIP}:${backendPort}/api`);
  console.log(`❤️  Health check: http://${serverIP}:${backendPort}/api/health`);
  console.log(`📈 System stats: http://${serverIP}:${backendPort}/api/stats`);
  console.log(`🌐 Frontend: http://${serverIP}:${frontendPort}`);
  console.log(`👤 Admin Login: ${process.env.ADMIN_USERNAME} / ${process.env.ADMIN_PASSWORD}`);
  console.log(`🔄 Real-time monitoring: Active`);
});

module.exports = { app, io };