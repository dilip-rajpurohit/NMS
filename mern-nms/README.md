# Network Management System (NMS) - Enhanced

A modern MERN stack application for network monitoring and management with enhanced security and performance optimizations.

## ✨ Recent Enhancements

- ✅ **Security Hardened**: Removed demo credentials, added rate limiting, enhanced validation
- ✅ **Performance Optimized**: Lazy loading, code splitting, reduced load times
- ✅ **Docker Ready**: Complete containerization setup with multi-stage builds
- ✅ **Production Ready**: Security headers, error boundaries, health checks

## 🚀 Features

- **Secure Authentication**: Enhanced login system with validation and rate limiting
- **Real-time Monitoring**: Live device status and metrics updates
- **Device Management**: SNMP-based device discovery and monitoring
- **Network Topology**: Interactive network visualization
- **Alerting System**: Customizable alerts and notifications
- **Performance Optimized**: Lazy loading, code splitting, and optimized bundle size
- **Docker Support**: Full containerization with Docker Compose

## 🔧 Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (v5 or higher)
- **Docker & Docker Compose** (for containerized deployment)

## 🏃‍♂️ Quick Start

### Option 1: Development Mode (Recommended for testing)

1. **Clone and Navigate**
   ```bash
   cd /home/wifi/nms-project/mern-nms
   ```

2. **Install Dependencies**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend  
   cd ../frontend && npm install
   ```

3. **Setup Environment**
   ```bash
   # Backend
   cd backend && cp .env.example .env
   
   # Frontend
   cd ../frontend && cp .env.example .env
   ```

4. **Start Development Servers**
   ```bash
   # From project root
   cd /home/wifi/nms-project && npm start
   ```

### Option 2: Docker Deployment

1. **Prerequisites Check**
   ```bash
   docker --version
   docker compose version
   ```

2. **Start with Docker Compose**
   ```bash
   cd /home/wifi/nms-project/mern-nms
   docker compose up -d --build
   ```

3. **View Status**
   ```bash
   docker compose ps
   docker compose logs -f
   ```

### 🌐 Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

### 🔑 Authentication
- **Development**: Create your own account via registration
- **Docker (Admin)**: Username: `admin`, Password: `SecureAdminPassword123!`

## 💻 Development Setup

### 1. Environment Configuration
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your configuration

# Frontend
cd ../frontend
cp .env.example .env
# Edit .env with your configuration
```

### 2. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Start Development Servers
```bash
# From project root
npm start

# OR start individually
# Backend
cd backend && npm run dev

# Frontend (new terminal)
cd frontend && npm start
```

## 🔒 Security Enhancements

### ✅ Implemented Security Features
- **No Demo Credentials**: Removed all hardcoded demo accounts and auto-fill functionality
- **Input Validation**: Enhanced form validation with proper error handling
- **Rate Limiting**: Login attempts limited to 5 per 15 minutes per IP
- **Password Requirements**: Minimum 6 characters, proper validation
- **JWT Security**: Enhanced token validation and refresh mechanism
- **CORS Protection**: Configured for secure cross-origin requests
- **Security Headers**: Helmet.js implementation with CSP, XSS protection

### Authentication Flow
1. **Registration**: Secure user creation with email validation
2. **Login**: Rate-limited with input sanitization
3. **Token Management**: JWT with proper expiration handling
4. **Session Security**: Automatic token cleanup on errors

## ⚡ Performance Optimizations

### ✅ Frontend Improvements
- **Lazy Loading**: Components load only when needed using React.Suspense
- **Code Splitting**: Reduced initial bundle size for faster loading
- **Error Boundaries**: Graceful error handling with fallback UI
- **Loading States**: Enhanced user feedback during operations
- **Bundle Optimization**: Tree shaking and dead code elimination

### ✅ Backend Improvements
- **Request Optimization**: Improved timeout handling and retry logic
- **Database Indexing**: Optimized MongoDB queries with proper indexes
- **Health Checks**: Comprehensive monitoring endpoints
- **Error Handling**: Structured error responses and logging

### ✅ Infrastructure
- **Docker Multi-stage**: Optimized container builds
- **Nginx Configuration**: Gzip compression and caching
- **Environment Management**: Proper configuration separation

## 🐳 Docker Configuration

### Services
- **MongoDB**: Database with automated initialization
- **Backend**: Node.js API server
- **Frontend**: Nginx-served React application

### Docker Commands
```bash
# Build and start
docker-compose up --build -d

# View service status
docker-compose ps

# View logs for specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb

# Scale services
docker-compose up -d --scale backend=2

# Update and restart
docker-compose pull
docker-compose up -d

# Clean up
docker-compose down -v
docker system prune
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nms_db
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
CREATE_ADMIN_USER=false
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@nms.local
ADMIN_PASSWORD=SecureAdminPassword123!
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=http://localhost:5000
GENERATE_SOURCEMAP=false
REACT_APP_ENV=production
```

## 🏗️ Project Structure
```
mern-nms/
├── backend/
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── utils/          # Utility functions
│   ├── Dockerfile      # Backend container config
│   └── server.js       # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── context/    # React context
│   │   └── services/   # API services
│   ├── Dockerfile      # Frontend container config
│   └── nginx.conf      # Nginx configuration
├── docker-compose.yml  # Multi-service orchestration
└── mongo-init.js       # MongoDB initialization
```

## 🚀 Production Deployment

### 1. Environment Setup
```bash
# Clone to production server
git clone <your-repository> /opt/nms
cd /opt/nms/mern-nms

# Set production environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit environment files with production values
nano backend/.env
nano frontend/.env
```

### 2. Security Checklist
- [ ] Change default admin credentials
- [ ] Set strong JWT secret (32+ characters)
- [ ] Configure secure MongoDB connection with authentication
- [ ] Enable HTTPS/SSL certificates
- [ ] Set up firewall rules (allow only 80, 443, 22)
- [ ] Configure backup strategy for MongoDB
- [ ] Set up log rotation and monitoring
- [ ] Enable Docker security scanning

### 3. Production Deployment
```bash
# Using Docker (recommended)
docker compose -f docker-compose.yml up -d --build

# Or using systemd services
sudo systemctl enable nms-backend
sudo systemctl enable nms-frontend
sudo systemctl start nms-backend
sudo systemctl start nms-frontend
```

### 4. Monitoring & Maintenance
```bash
# Health monitoring
curl https://your-domain.com/api/health

# System monitoring
docker stats
docker compose logs --tail=100 -f

# Backup MongoDB
docker compose exec mongodb mongodump --out /backup/$(date +%Y%m%d)

# Update deployment
git pull
docker compose up -d --build
```

## � Troubleshooting

### Common Issues & Solutions

#### 🔐 Authentication Problems
```bash
# Issue: Cannot login or registration fails
# Solution: Verify backend is running and MongoDB is connected
cd /home/wifi/nms-project/mern-nms/backend
npm run dev

# Check MongoDB connection
docker ps | grep mongo
# or start local MongoDB if using development mode
```

#### 🌐 Connection Issues
```bash
# Issue: Frontend cannot reach backend
# Solution: Check if both services are running on correct ports
# Frontend: http://localhost:3000
# Backend: http://localhost:5000

# Development mode check
netstat -tulpn | grep :3000
netstat -tulpn | grep :5000

# Docker mode check
docker compose ps
docker compose logs backend
docker compose logs frontend
```

#### 🐳 Docker Issues
```bash
# Issue: Docker containers not starting
# Solution: Check Docker daemon and rebuild
sudo systemctl status docker
docker compose down
docker compose up -d --build

# Issue: Port conflicts
# Solution: Stop existing services
sudo lsof -i :3000
sudo lsof -i :5000
# Kill processes if needed

# Issue: Permission errors
# Solution: Fix file permissions
sudo chown -R $USER:$USER /home/wifi/nms-project
```

#### 🚀 Performance Issues
```bash
# Issue: Slow loading times
# Solution: Check resource usage
docker stats  # For containerized setup
htop         # For development setup

# Clear browser cache and refresh
# Check network tab in browser dev tools
```

### Debug Commands
```bash
# Health checks
curl http://localhost:5000/api/health
curl http://localhost:3000/health

# View logs
# Development
tail -f /home/wifi/nms-project/mern-nms/backend/logs/*.log

# Docker
docker compose logs --tail=100 -f
docker compose logs backend
docker compose logs frontend
docker compose logs mongodb

# Container shell access
docker compose exec backend sh
docker compose exec frontend sh
docker compose exec mongodb mongosh nms_db
```

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Token verification
- `GET /api/auth/profile` - User profile

### Device Management
- `GET /api/devices` - List all devices
- `POST /api/devices` - Add new device
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Remove device

### Monitoring
- `GET /api/metrics` - Device metrics
- `GET /api/alerts` - System alerts
- `GET /api/topology` - Network topology

## 📋 Recent Changes & Status

### ✅ Completed Enhancements
1. **Security Hardening**
   - Removed demo account auto-fill functionality
   - Implemented rate limiting (5 attempts/15 min)
   - Enhanced input validation and sanitization
   - Added proper password requirements

2. **Performance Optimization**
   - Implemented lazy loading with React.Suspense
   - Added code splitting for reduced bundle size
   - Enhanced error boundaries and loading states
   - Optimized API response handling

3. **Docker Implementation**
   - Created multi-stage Dockerfiles
   - Configured docker-compose.yml with health checks
   - Added production-ready Nginx configuration
   - Implemented proper security practices

4. **Developer Experience**
   - Enhanced error handling and user feedback
   - Improved development setup instructions
   - Added comprehensive troubleshooting guide
   - Created environment configuration templates

### 🔄 Current Status
- **Authentication**: ✅ Secure, no demo credentials
- **Performance**: ✅ Optimized with lazy loading
- **Docker**: ✅ Ready for containerized deployment
- **Security**: ✅ Hardened with rate limiting and validation
- **Documentation**: ✅ Complete setup and troubleshooting guides

### 🎯 Next Steps
1. Test Docker deployment in your environment
2. Configure production environment variables
3. Set up SSL/HTTPS for production
4. Implement monitoring and logging
5. Configure automated backups

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting guide
- Review the logs for error details