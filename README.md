# Network Management System (NMS) - MERN Stack

A modern, secure, and high-performance Network Management System built with the MERN stack (MongoDB, Express.js, React, Node.js). Features real-time monitoring, SNMP device discovery, interactive topology visualization, and comprehensive alerting.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v5+-green)](https://www.mongodb.com/)

## ✨ Key Features

- 🔐 **Enhanced Security**: Rate limiting, input validation, JWT authentication
- ⚡ **Performance Optimized**: Lazy loading, code splitting, optimized builds
- 🔄 **Real-time Monitoring**: Live device status via Socket.IO
- 🗺️ **Network Topology**: Interactive visualization with React Force Graph
- 📊 **SNMP Discovery**: Automatic device detection and monitoring
- 🚨 **Alert Management**: Multi-level alerting system
- 🐳 **Docker Ready**: Complete containerization support
- 📱 **Responsive Design**: Modern Bootstrap-based UI

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **MongoDB** 5+ (or Docker)
- **Docker & Docker Compose** (recommended)

### Option 1: Docker Deployment (Recommended)
```bash
# Clone the repository
git clone https://github.com/dilip-rajpurohit/NMS.git
cd NMS/mern-nms

# Start with Docker Compose
docker compose up -d --build

# Check status
docker compose ps
```

### Option 2: Development Mode
```bash
# Install dependencies
npm run install-all

# Start both services
npm start
```

### 🌐 Access the Application
- **Web UI**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health
- **Authentication**: Register new account or use admin credentials (Docker only)

## 📁 Project Architecture

```
NMS/
├── mern-nms/                   # Main application directory
│   ├── backend/                # Express.js API server
│   │   ├── models/            # MongoDB data models (Device, User, Topology)
│   │   ├── routes/            # API route handlers
│   │   │   ├── auth.js        # Authentication endpoints
│   │   │   ├── devices.js     # Device management
│   │   │   ├── discovery.js   # SNMP discovery
│   │   │   ├── alerts.js      # Alert management
│   │   │   └── topology.js    # Network topology
│   │   ├── utils/             # Utility functions
│   │   │   └── snmpManager.js # SNMP operations
│   │   ├── scripts/           # Admin scripts
│   │   ├── server.js          # Main server file
│   │   └── Dockerfile         # Backend container config
│   ├── frontend/              # React application
│   │   ├── src/
│   │   │   ├── components/    # React components
│   │   │   │   ├── Auth/      # Authentication components
│   │   │   │   ├── Dashboard/ # Main dashboard views
│   │   │   │   ├── Admin/     # Administration panels
│   │   │   │   └── Layout/    # Layout components
│   │   │   ├── context/       # React context providers
│   │   │   ├── services/      # API service layer
│   │   │   └── utils/         # Frontend utilities
│   │   ├── build/             # Production build (ignored)
│   │   └── Dockerfile         # Frontend container config
│   ├── docker-compose.yml     # Multi-container orchestration
│   └── mongo-init.js          # MongoDB initialization
├── package.json               # Root package configuration
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

## � Development Guide

### Backend Development
```bash
cd mern-nms/backend

# Install dependencies
npm install

# Start development server
npm run dev                    # Uses nodemon for auto-restart

# Reset admin password
npm run reset-admin
```

### Frontend Development  
```bash
cd mern-nms/frontend

# Install dependencies
npm install

# Start development server
npm start                      # React dev server on port 3000

# Build for production
npm run build
```

### Full Stack Development
```bash
# From project root - starts both backend and frontend
npm start
```

## 🐳 Docker Deployment

### Production Deployment
```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Stop services
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Service Status
```bash
# Check running containers
docker compose ps

# Monitor specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb
```

## � Security Features

### ✅ Enhanced Security Implementation
- **No Demo Credentials**: Secure registration-based access
- **Rate Limiting**: 5 login attempts per 15 minutes per IP
- **Input Validation**: Comprehensive form validation with Joi
- **JWT Security**: Secure token-based authentication
- **Password Requirements**: Enforced strong password policies
- **CORS Protection**: Configured for secure cross-origin requests
- **Security Headers**: Helmet.js with CSP and XSS protection
- **Error Handling**: Secure error messages without information leakage

### Authentication Flow
1. **User Registration**: Secure account creation with email validation
2. **Login Security**: Rate-limited with input sanitization
3. **Token Management**: JWT with proper expiration and refresh
4. **Session Security**: Automatic cleanup on authentication errors

## ⚡ Performance Optimizations

### Frontend Enhancements
- **Lazy Loading**: Components load on-demand with React.Suspense
- **Code Splitting**: Reduced initial bundle size
- **Optimized Builds**: Production builds with tree shaking
- **Efficient Re-renders**: Optimized React component updates

### Backend Optimizations
- **Database Indexing**: Optimized MongoDB queries
- **Connection Pooling**: Efficient database connections
- **Response Compression**: Gzipped API responses
- **Caching**: Strategic caching for frequently accessed data

## 📊 Core Features Deep Dive

### Network Discovery
- **SNMP Integration**: Automatic device detection
- **IP Range Scanning**: Configurable network scanning
- **Device Classification**: Automatic device type identification
- **Live Status Updates**: Real-time device status monitoring

### Topology Visualization
- **Interactive Maps**: React Force Graph 2D implementation
- **Real-time Updates**: Live topology changes via Socket.IO
- **Customizable Views**: Multiple visualization modes
- **Export Functionality**: Save topology diagrams

### Alert Management
- **Multi-level Alerts**: Critical, Warning, Info severity levels
- **Real-time Notifications**: Instant alert delivery
- **Alert History**: Comprehensive alert logging
- **Customizable Rules**: Flexible alerting conditions

### Performance Metrics
- **Real-time Monitoring**: Live performance data
- **Historical Data**: Trend analysis and reporting
- **Custom Dashboards**: Configurable metric displays
- **Data Export**: CSV and JSON export capabilities

## 🔧 Configuration

### Environment Variables

**Backend Configuration (.env)**
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://admin:password123@localhost:27017/nms?authSource=admin

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# SNMP Configuration
SNMP_COMMUNITY=public
SNMP_VERSION=2c
SNMP_TIMEOUT=5000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5
```

**Frontend Configuration (.env)**
```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000

# Application Settings
REACT_APP_VERSION=1.0.0
REACT_APP_APP_NAME=NMS
```

**Docker Environment**
```env
# Docker-specific configurations
MONGODB_ROOT_USERNAME=admin
MONGODB_ROOT_PASSWORD=password123
MONGODB_DATABASE=nms
```

## � API Documentation

### Authentication Endpoints
```http
POST /api/auth/register      # User registration
POST /api/auth/login         # User authentication
POST /api/auth/refresh       # Token refresh
GET  /api/auth/me           # Get current user
```

### Device Management
```http
GET    /api/devices             # List all devices
POST   /api/devices             # Add new device
GET    /api/devices/:id         # Get device details
PUT    /api/devices/:id         # Update device
DELETE /api/devices/:id         # Remove device
GET    /api/devices/:id/metrics # Get device metrics
```

### Network Discovery
```http
POST /api/discovery/start       # Start network scan
GET  /api/discovery/status      # Get scan status
GET  /api/discovery/results     # Get scan results
POST /api/discovery/stop        # Stop current scan
```

### Topology Management
```http
GET  /api/topology              # Get network topology
POST /api/topology/refresh      # Refresh topology
GET  /api/topology/export       # Export topology data
```

### Alert System
```http
GET    /api/alerts              # List all alerts
POST   /api/alerts              # Create new alert
GET    /api/alerts/:id          # Get alert details
PUT    /api/alerts/:id          # Update alert
DELETE /api/alerts/:id          # Delete alert
POST   /api/alerts/:id/acknowledge  # Acknowledge alert
```

### Health & Monitoring
```http
GET /api/health                 # System health check
GET /api/metrics                # System metrics
GET /api/status                 # Service status
```

## 🚀 Deployment Options

### Production Deployment with Docker
```bash
# Clone and navigate
git clone https://github.com/dilip-rajpurohit/NMS.git
cd NMS/mern-nms

# Production deployment
docker compose -f docker-compose.yml up -d --build

# Monitor deployment
docker compose logs -f
```

### Manual Production Setup
```bash
# Backend setup
cd mern-nms/backend
npm install --production
npm start

# Frontend setup (separate terminal)
cd mern-nms/frontend
npm install
npm run build
# Serve build folder with nginx or similar
```

### Environment-specific Configurations
- **Development**: Uses nodemon, hot reloading, detailed logging
- **Production**: Optimized builds, compression, security headers
- **Docker**: Containerized with health checks and restart policies

## 🔍 Troubleshooting

### Common Issues

**Connection Issues**
```bash
# Check if services are running
docker compose ps

# Check logs for errors
docker compose logs backend
docker compose logs frontend
docker compose logs mongodb
```

**Database Issues**
```bash
# Reset MongoDB data
docker compose down -v
docker compose up -d

# Check MongoDB connection
docker compose exec mongodb mongosh
```

**Permission Issues**
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
chmod +x scripts/*.sh
```

### Development Tips
- Use `npm run dev` for backend auto-restart
- Enable React DevTools for frontend debugging
- Monitor network requests in browser DevTools
- Check MongoDB logs for query performance

## � Testing

### Running Tests
```bash
# Backend tests
cd mern-nms/backend
npm test

# Frontend tests
cd mern-nms/frontend
npm test

# End-to-end tests
npm run test:e2e
```

### Test Coverage
- Unit tests for API endpoints
- Component testing for React components
- Integration tests for database operations
- End-to-end tests for user workflows

## �🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the Repository**
   ```bash
   git fork https://github.com/dilip-rajpurohit/NMS.git
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow existing code style
   - Add tests for new features
   - Update documentation

4. **Test Your Changes**
   ```bash
   npm test
   npm run lint
   ```

5. **Submit Pull Request**
   - Provide clear description
   - Link any related issues
   - Ensure CI passes

### Development Guidelines
- Follow ESLint configuration
- Use TypeScript for type safety
- Write meaningful commit messages
- Include tests with new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **MERN Stack**: MongoDB, Express.js, React, Node.js
- **UI Components**: Bootstrap, React Bootstrap
- **Visualization**: React Force Graph 2D
- **Real-time**: Socket.IO
- **Network**: SNMP.js, Net-SNMP
- **Security**: Helmet.js, bcrypt, JWT

## 📞 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs via [GitHub Issues](https://github.com/dilip-rajpurohit/NMS/issues)
- **Discussions**: Join discussions in [GitHub Discussions](https://github.com/dilip-rajpurohit/NMS/discussions)

---

**Made with ❤️ for Network Administrators and DevOps Engineers**