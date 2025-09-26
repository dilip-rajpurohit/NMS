# 🌐 Network Management System (NMS)

> **Professional Network Monitoring Suite** - A modern MERN stack Network Management System with elegant UI, automated deployment, and comprehensive real-time monitoring capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED.svg)](https://www.docker.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18-339933.svg)](https://nodejs.org/)

## ✨ Key Features

### 🎨 **Modern Interface** *(Recently Enhanced)*
- **Elegant Authentication** - Smooth 20px rounded corners, gradient backgrounds, professional styling
- **Responsive Sidebar** - Hover-expand navigation with 20px icons, smooth animations and perfect alignment  
- **Enhanced Form Controls** - 12px border-radius, smooth transitions, no visual shifting
- **Dark/Light Themes** - Consistent design system with enhanced visual hierarchy
- **Mobile-First Design** - Fully responsive across all devices

### 🔧 **Core Functionality**
- **📊 Real-time Monitoring** - Live network metrics and device status tracking
- **🔍 SNMP Discovery** - Automated network scanning and device identification
- **🚨 Smart Alerts** - Configurable notifications for network events
- **👥 User Management** - Secure role-based access control system
- **🌐 Multi-Device Access** - Responsive design works on any device
- **⚡ One-Command Deploy** - Complete Docker containerization

## 🚀 Quick Deploy

### Prerequisites
- **Docker & Docker Compose** (Latest versions recommended)
- **4GB RAM minimum** for optimal performance
- **Network access** to target devices for monitoring

### 🎯 One-Command Deploy
```bash
git clone https://github.com/dilip-rajpurohit/NMS.git
cd NMS/mern-nms
chmod +x deploy.sh
./deploy.sh --non-interactive
```

**That's it!** 🎉 Access from any device: `http://[YOUR-IP]:3000`

### 🔑 Default Credentials
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@example.com`

> ⚠️ **Security Note**: Change default credentials after first login

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern component-based UI framework
- **Bootstrap 5** - Responsive design system
- **Chart.js** - Beautiful data visualization
- **Socket.io Client** - Real-time data updates

### Backend  
- **Node.js 18** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **JWT** - Secure authentication
- **SNMP** - Network protocol support

### Infrastructure
- **Docker** - Containerization platform
- **Docker Compose** - Multi-container orchestration
- **Nginx** - High-performance web server
- **Alpine Linux** - Lightweight container base

## 📁 Project Structure

```
NMS/                             # 🏠 Root project directory
├── .gitignore                   # 🚫 Git ignore configuration
├── README.md                    # 📖 Project documentation  
└── mern-nms/                   # 🏠 Main application directory
    ├── backend/                 # 🚀 Express.js API Server
    │   ├── middleware/          # 🔒 Express middleware
    │   │   └── auth.js         # JWT authentication
    │   ├── models/             # 🗃️ MongoDB data models
    │   │   ├── Device.js       # Network device schema
    │   │   ├── Topology.js     # Network topology schema
    │   │   └── User.js         # User authentication schema
    │   ├── routes/             # 🛣️ API endpoints
    │   │   ├── admin.js        # Admin management APIs
    │   │   ├── alerts.js       # Alert system APIs
    │   │   ├── auth.js         # Authentication APIs
    │   │   ├── dashboard.js    # Dashboard data APIs
    │   │   ├── devices.js      # Device management APIs
    │   │   ├── discovery.js    # Network discovery APIs
    │   │   └── metrics.js      # Performance metrics APIs
    │   ├── scripts/            # 🔧 Backend utilities
    │   │   └── reset-admin-password.js # Password reset utility
    │   ├── utils/              # 🛠️ Helper functions
    │   │   ├── logger.js       # Logging utility
    │   │   └── snmpManager.js  # SNMP operations
    │   ├── Dockerfile          # 🐳 Backend container config
    │   ├── .dockerignore       # 🚫 Docker ignore rules
    │   ├── package.json        # 📦 Backend dependencies
    │   ├── package-lock.json   # 🔒 Dependency lock file
    │   └── server.js           # 🎯 Main server entry point
    ├── frontend/               # ⚛️ React Application
    │   ├── public/             # 🌐 Static assets
    │   │   ├── health          # ❤️ Health check endpoint
    │   │   └── index.html      # 📄 Main HTML template
    │   ├── src/               # 💻 React source code
    │   │   ├── assets/        # 🎨 UI assets
    │   │   │   └── logo-mark.svg # 🏷️ Brand logo
    │   │   ├── components/    # 🧩 React components
    │   │   │   ├── Admin/     # 👑 Admin management UI
    │   │   │   │   ├── NetworkConfiguration.js
    │   │   │   │   ├── SystemSettings.js
    │   │   │   │   └── UsersManagement.js
    │   │   │   ├── Auth/      # � Authentication UI
    │   │   │   │   └── Login.js # Enhanced login/signup
    │   │   │   ├── Dashboard/ # 📊 Main dashboard components
    │   │   │   │   ├── Dashboard.js
    │   │   │   │   ├── Devices.js
    │   │   │   │   ├── Discovery.js
    │   │   │   │   ├── Metrics.js
    │   │   │   │   └── Topology.js
    │   │   │   ├── Layout/    # 🏗️ Navigation & layout
    │   │   │   │   ├── Header.js
    │   │   │   │   ├── Layout.js
    │   │   │   │   └── Sidebar.js # Enhanced hover navigation
    │   │   │   ├── Profile/   # � User profile management
    │   │   │   │   └── ProfileSettings.js
    │   │   │   ├── Reports/   # 📈 Reporting system
    │   │   │   │   └── Reports.js
    │   │   │   ├── shared/    # 🔄 Shared components
    │   │   │   │   ├── CommonComponents.js
    │   │   │   │   └── ErrorBoundary.js
    │   │   │   └── Alerts.js  # 🚨 Alert components
    │   │   ├── context/       # 🔗 React context providers
    │   │   │   ├── AuthContext.js # Authentication state
    │   │   │   └── SocketContext.js # Real-time connections
    │   │   ├── services/      # 🌐 API services
    │   │   │   └── api.js     # API service layer
    │   │   ├── styles/        # 🎨 CSS stylesheets
    │   │   │   ├── dark-theme.css # 🌙 Dark mode styles
    │   │   │   ├── enhanced.css   # ✨ Enhanced UI styles
    │   │   │   └── sidebar.css    # 📱 Responsive sidebar
    │   │   ├── utils/         # 🛠️ Frontend utilities
    │   │   │   ├── common.js      # Common utilities
    │   │   │   ├── ErrorHandler.js # Error handling
    │   │   │   └── validation.js   # Input validation
    │   │   ├── App.js         # 🏠 Main React component
    │   │   ├── index.css      # � Global styles with auth enhancements
    │   │   └── index.js       # 🚀 React entry point
    │   ├── default.conf.template  # ⚙️ Nginx configuration
    │   ├── docker-entrypoint.sh  # 🐳 Container startup script
    │   ├── Dockerfile         # 🐳 Frontend container config
    │   ├── .dockerignore      # 🚫 Docker ignore rules
    │   ├── package.json       # 📦 Frontend dependencies
    │   └── package-lock.json  # 🔒 Dependency lock file
    ├── scripts/               # 🛠️ Utility scripts
    │   ├── auto-detect-ip.sh  # 🌐 Automatic IP detection
    │   └── get-server-ip.js   # 🌐 Server IP configuration
    ├── CROSS_PLATFORM_SETUP.md # 🔧 Cross-platform setup guide
    ├── DEPLOYMENT.md          # 📚 Detailed deployment guide
    ├── deploy.sh              # ⭐ One-command deployment script
    ├── docker-compose.yml     # 🐳 Container orchestration
    ├── .env.template          # 🔧 Environment configuration template
    ├── LICENSE                # 📄 MIT License
    ├── mongo-init.js          # 🗄️ Database initialization
    └── NETWORK_ACCESS_GUIDE.md # 🌐 Network troubleshooting

```
## 📱 Network Access & Usage

### Multi-Device Access
Deploy once, access everywhere:
- **💻 Laptops/Desktops**: `http://[SERVER-IP]:3000`
- **📱 Phones/Tablets**: Same URL with full responsive design
- **🌐 Remote Access**: Configure port forwarding for internet access

### Core Workflows
1. **📊 Dashboard** - Real-time network overview
2. **🔍 Discovery** - Scan and add network devices
3. **📈 Monitoring** - Track device performance
4. **🚨 Alerts** - Configure notifications
5. **👥 Administration** - Manage users and settings

## 🔧 Advanced Configuration

### Interactive Deployment (Custom Settings)
```bash
./deploy.sh
# Configure IP address, ports, passwords, CORS settings
```

### Manual Docker Commands
```bash
# View live logs
docker compose logs -f

# Restart specific service
docker compose restart frontend

# Stop all services
docker compose down

# Rebuild and restart
docker compose up --build -d
```

### Environment Variables
Key configuration options in `.env`:
```env
# Network Configuration
SERVER_IP=auto-detect
FRONTEND_PORT=3000
BACKEND_PORT=5000

# Database
MONGO_INITDB_ROOT_PASSWORD=mongo123
DB_NAME=nms_db

# Security
JWT_SECRET=auto-generated
ADMIN_PASSWORD=admin123
```

## 🔒 Security Features

- **🔐 JWT Authentication** - Secure token-based auth
- **🔒 Password Hashing** - bcrypt encryption
- **🛡️ CORS Protection** - Cross-origin request security
- **⚡ Rate Limiting** - API abuse prevention  
- **🐳 Container Isolation** - Sandboxed execution
- **🚫 Input Validation** - SQL injection prevention

## 📊 Network Protocols

- **SNMP v1/v2c/v3** - Device monitoring
- **ICMP Ping** - Connectivity testing
- **HTTP/HTTPS** - Web device management
- **WebSocket** - Real-time updates
- **REST API** - Service integration

## 🌍 Port Configuration

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| Frontend | 3000 | HTTP | Web Interface |
| Backend API | 5000 | HTTP | REST API |
| MongoDB | 27017 | TCP | Database |
| SNMP | 161 | UDP | Device Queries |

## 🚀 Performance Optimization

- **⚡ React 18** - Concurrent rendering
- **🔄 Real-time Updates** - Socket.io optimization  
- **📦 Container Caching** - Fast deployments
- **🗜️ Asset Compression** - Nginx gzip
- **🎯 Lazy Loading** - Component optimization

## � Documentation

- **📖 [DEPLOYMENT.md](mern-nms/DEPLOYMENT.md)** - Comprehensive deployment guide
- **🌐 [NETWORK_ACCESS_GUIDE.md](mern-nms/NETWORK_ACCESS_GUIDE.md)** - Network troubleshooting
- **🔧 [CROSS_PLATFORM_SETUP.md](mern-nms/CROSS_PLATFORM_SETUP.md)** - Platform-specific setup

## � Troubleshooting

### Common Issues

**🔴 Container won't start**
```bash
docker compose down && docker compose up -d
```

**🔴 Frontend not accessible**
- Check firewall settings
- Verify IP address detection
- Review nginx logs: `docker compose logs frontend`

**🔴 Database connection failed**  
- Ensure MongoDB container is healthy
- Check logs: `docker compose logs mongodb`

**🔴 SNMP discovery not working**
- Verify network connectivity
- Check SNMP community strings
- Review device SNMP configuration

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **🍴 Fork** the repository
2. **🌿 Create** a feature branch
3. **✨ Commit** your changes
4. **📤 Push** to the branch  
5. **🔄 Open** a Pull Request

### Development Setup
```bash
git clone https://github.com/dilip-rajpurohit/NMS.git
cd NMS/mern-nms
# Set up development environment
```

## 📈 Roadmap

- [ ] **🔔 Advanced Alerting** - SMS, Email, Webhook notifications
- [ ] **📊 Custom Dashboards** - Drag-and-drop interface
- [ ] **🗺️ Network Topology** - Interactive network maps
- [ ] **📱 Mobile App** - Native iOS/Android apps
- [ ] **🔌 Plugin System** - Custom monitoring modules
- [ ] **☁️ Cloud Integration** - AWS, Azure, GCP support

## � License

This project is licensed under the **MIT License** - see the [LICENSE](mern-nms/LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** - Amazing frontend framework
- **Express.js** - Robust backend framework  
- **MongoDB** - Flexible database solution
- **Docker** - Simplified deployment platform
- **Community Contributors** - Bug reports and feature requests

---

<div align="center">

**⭐ Star this repo if it helped you!**

[🐛 Report Bug](https://github.com/dilip-rajpurohit/NMS/issues) · [✨ Request Feature](https://github.com/dilip-rajpurohit/NMS/issues) · [� Discussions](https://github.com/dilip-rajpurohit/NMS/discussions)

Made with ❤️ by [Dilip Rajpurohit](https://github.com/dilip-rajpurohit)

</div>