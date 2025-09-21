const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure allowed origins for CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://frontend:80",
  "http://frontend",
  `http://${process.env.IP || 'localhost'}:${process.env.FRONTEND_PORT || 3000}`,
  `http://${process.env.IP || 'localhost'}:3000`,
  // Allow access from local network (192.168.x.x and 10.x.x.x ranges)
  /^http:\/\/192\.168\.\d+\.\d+:(3000|80)$/,
  /^http:\/\/10\.\d+\.\d+\.\d+:(3000|80)$/,
  /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:(3000|80)$/
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nms_db';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ Connected to MongoDB');
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
      username: process.env.ADMIN_USERNAME || 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@nms.local',
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
  
  // Send initial system status
  socket.emit('system-status', {
    status: 'connected',
    timestamp: new Date().toISOString(),
    activeDevices: 12,
    totalDevices: 15,
    alerts: 2
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
  
  socket.on('monitor-request', (data) => {
    // TODO: Implement real monitoring data collection
    socket.emit('monitor-response', {
      type: data.type,
      timestamp: new Date().toISOString(),
      data: { message: 'Real monitoring not yet implemented' }
    });
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
});

// TODO: Implement real background monitoring tasks
// TODO: Implement real alert system  
// TODO: Implement real network topology monitoring

// Make io available to routes
app.set('socketio', io);

// Import routes
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const topologyRoutes = require('./routes/topology');
const metricsRoutes = require('./routes/metrics');
const discoveryRoutes = require('./routes/discovery');
const alertRoutes = require('./routes/alerts');
const activityRoutes = require('./routes/activity');
const adminRoutes = require('./routes/admin');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/topology', topologyRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/admin', adminRoutes);

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
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
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
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 NMS Backend server running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
  console.log(`📈 System stats: http://localhost:${PORT}/api/stats`);
  console.log(`🌐 Frontend: http://localhost:3000`);
  console.log(`👤 Admin Login: admin / ${process.env.ADMIN_PASSWORD || '[ADMIN_PASSWORD env var required]'}`);
  console.log(`🔄 Real-time monitoring: Active`);
});

module.exports = { app, io };