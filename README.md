# Network Management System (NMS)

## 🚀 Production-Ready Enterprise Network Monitoring

A comprehensive, real-world network management system built with the MERN stack, featuring advanced monitoring, analytics, and configuration management capabilities.

**Last Updated**: December 7, 2025  
**Version**: 2.0.0  
**Status**: Production Ready ✅

## ✨ Features

### 📊 Executive Dashboard
- **Network Health Scoring** - Real-time network performance assessment
- **Device Management** - Comprehensive device inventory and monitoring
- **Critical Alerts** - Immediate notification of network issues
- **Performance Metrics** - CPU, memory, bandwidth utilization tracking

### 📈 Advanced Reports & Analytics
- **Performance Analysis** - Time-series performance data with trend analysis
- **Availability & SLA Monitoring** - Uptime tracking and SLA compliance
- **Capacity Planning** - Forecasting and resource planning with 30-day predictions
- **Scheduled Reports** - Automated report generation and delivery
- **Export Capabilities** - CSV, PDF, and Excel export options

### ⚙️ Network Configuration Management
- **VLAN Management** - Virtual LAN configuration and deployment
- **Routing Protocols** - OSPF, BGP, and static routing configuration
- **QoS Policies** - Quality of Service traffic prioritization
- **Security Configuration** - Firewall rules, VPN, and access control
- **Deployment Management** - Automated configuration deployment to devices

### 🔒 Security & Authentication
- **JWT Authentication** - Secure user sessions
- **Role-Based Access Control** - Admin and user permission levels
- **Audit Logging** - Complete activity tracking
- **Session Management** - Secure session handling

## 🏗️ Architecture

### Backend (Node.js/Express)
```
├── models/           # MongoDB schemas
│   ├── Device.js           # Device inventory and status
│   ├── NetworkMetrics.js   # Performance metrics collection
│   ├── NetworkReport.js    # Advanced reporting framework
│   ├── NetworkConfiguration.js # Network config management
│   └── User.js             # User authentication
├── routes/           # API endpoints
│   ├── auth.js            # Authentication routes
│   ├── devices.js         # Device management
│   ├── reports.js         # Advanced reporting APIs
│   ├── dashboard.js       # Dashboard analytics
│   └── admin.js           # Administrative functions
├── services/         # Business logic
│   ├── advancedSNMPMonitor.js    # SNMP monitoring
│   ├── advancedNetworkAnalytics.js # Network analytics
│   └── alertService.js           # Alert management
└── middleware/       # Authentication & validation
```

### Frontend (React.js)
```
├── components/
│   ├── Dashboard/         # Real-time monitoring dashboards
│   ├── Reports/           # Production reporting interface
│   ├── Admin/             # Administrative panels
│   │   ├── NetworkConfiguration.js # Network config UI
│   │   ├── UsersManagement.js     # User management
│   │   └── SystemSettings.js      # System configuration
│   ├── Auth/              # Login and authentication
│   └── Layout/            # Navigation and layout
├── context/               # React context for state
├── services/              # API communication
└── styles/                # CSS and styling
```

## 🚀 Quick Start

### Prerequisites
- **Docker Desktop** (Windows/macOS) or **Docker Engine** (Linux)
- **Git** for repository cloning
- **4GB RAM minimum** (8GB recommended)
- **5GB free disk space**
- **Node.js 18+** (for development)

### Installation

#### Linux/macOS (Updated December 2025)
```bash
# Clone the repository
git clone <repository-url>
cd NMS/mern-nms

# Deploy with automatic configuration
./deploy.sh --non-interactive

# Or deploy with custom settings (recommended)
./deploy.sh
```

#### Windows
```cmd
# Clone the repository
git clone <repository-url>
cd NMS\mern-nms

# Deploy the system
deploy.bat
```

### Access the System
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Default Admin**: admin@localhost / admin123

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend directory:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://nms-mongodb:27017/nms
JWT_SECRET=your-secure-jwt-secret
CORS_ORIGIN=http://localhost:3000
```

### Network Access
For multi-device access, ensure the system accepts connections from any IP:
```bash
# Allow external connections
./deploy.sh --allow-external
```

## 📊 Production Data Models

### Network Metrics
- **Interface Statistics**: Bytes in/out, packets, errors, utilization
- **System Performance**: CPU, memory, disk usage
- **QoS Metrics**: Traffic classes, queue depths, dropped packets
- **Health Scoring**: Composite network health calculations

### Reporting Framework
- **SLA Monitoring**: Availability tracking and compliance
- **Capacity Planning**: Resource forecasting and trend analysis
- **Performance Analytics**: Time-series data analysis
- **Compliance Reporting**: Automated regulatory compliance

### Configuration Management
- **VLAN Configuration**: ID, subnets, DHCP, security policies
- **Routing Protocols**: OSPF areas, BGP peers, static routes
- **Security Policies**: Firewall rules, VPN configurations
- **QoS Policies**: Traffic classification and bandwidth management

## 🔍 Monitoring Capabilities

### Device Discovery
- **Auto-Discovery**: Automatic network device detection
- **SNMP Monitoring**: Real-time SNMP data collection
- **Performance Tracking**: Continuous performance monitoring
- **Alert Generation**: Intelligent alerting based on thresholds

### Analytics
- **Trend Analysis**: Historical performance trends
- **Capacity Forecasting**: Predictive resource planning
- **Traffic Analysis**: Network traffic patterns and top talkers
- **Health Scoring**: Composite network health metrics

## 🛡️ Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure authentication mechanism
- **Role-Based Access**: Admin and user permission levels
- **Session Management**: Secure session handling
- **Password Security**: Bcrypt hashing for passwords

### Network Security
- **Firewall Configuration**: Rule management and deployment
- **VPN Management**: IPSec and SSL VPN configuration
- **Access Control**: 802.1X and MAC address filtering
- **Security Monitoring**: Real-time security event tracking

## 📈 API Endpoints

### Dashboard
- `GET /api/dashboard` - Real-time dashboard data
- `GET /api/dashboard/metrics` - Performance metrics
- `GET /api/dashboard/alerts` - Active alerts

### Reports
- `GET /api/reports/dashboard` - Executive dashboard
- `GET /api/reports/performance` - Performance analysis
- `GET /api/reports/availability` - Availability tracking
- `GET /api/reports/capacity` - Capacity planning

### Device Management
- `GET /api/devices` - Device inventory
- `POST /api/devices/discover` - Device discovery
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Remove device

### Configuration
- `GET /api/network-config` - Network configurations
- `POST /api/network-config/vlan` - VLAN configuration
- `POST /api/network-config/routing` - Routing configuration
- `POST /api/network-config/:id/deploy` - Deploy configuration

## 🐳 Docker Configuration

### Services
- **nms-frontend**: React.js application (Port 3000)
- **nms-backend**: Node.js API server (Port 5000)
- **nms-mongodb**: MongoDB database (Port 27017)

### Volumes
- **mongodb-data**: Persistent database storage
- **logs**: Application logging

### Networks
- **nms-network**: Internal container communication

## 🔧 Development

### Backend Development
```bash
cd backend
npm install
npm run dev
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

### Database Access
```bash
# Connect to MongoDB container
docker exec -it nms-mongodb mongosh nms
```

## 📝 Production Deployment

### Health Checks
- **Frontend**: Nginx health endpoint
- **Backend**: Express health endpoint
- **Database**: MongoDB connection monitoring

### Scaling
- **Horizontal Scaling**: Multiple backend instances
- **Load Balancing**: Nginx reverse proxy
- **Database Replication**: MongoDB replica sets

### Monitoring
- **Application Logs**: Centralized logging
- **Performance Metrics**: Real-time monitoring
- **Alert Notifications**: Email and webhook alerts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and support:
- **Documentation**: Check this README and inline comments
- **Issues**: Report bugs via GitHub issues
- **Configuration**: See environment variable documentation

---

## 🎯 System Status

✅ **Production Ready**: Fully functional network management system
✅ **Clean Codebase**: No debug files, optimized structure
✅ **Comprehensive Features**: Enterprise-grade monitoring and configuration
✅ **Docker Deployment**: Containerized for easy deployment
✅ **Cross-Platform**: Works on Linux, macOS, and Windows