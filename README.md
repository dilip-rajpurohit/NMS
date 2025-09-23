# Network Management System (NMS)

🚀 **One-Command Network Monitoring** - A modern MERN stack Network Management System with automated deployment, multi-device access, and real-time monitoring.

## ✨ Key Features

- **� Real-time Monitoring** - Live network metrics and device status
- **� SNMP Discovery** - Automated network scanning and device identification  
- **🚨 Smart Alerts** - Configurable notifications for network events
- **👥 User Management** - Secure role-based access control
- **🌐 Multi-Device Access** - Works on any device on your network
- **� Docker Ready** - One-command deployment with full containerization

## � Quick Deploy

### Prerequisites
- Docker & Docker Compose
- 4GB RAM minimum

### Deploy (Any Laptop/Network)
```bash
git clone <repository-url>
cd NMS/mern-nms
./deploy.sh --non-interactive
```

**That's it!** Access from any device: `http://[YOUR-IP]:3000`

### Login Credentials
- **Email**: admin@example.com
- **Password**: admin123

## 🛠️ Tech Stack
- **Frontend**: React 18, Bootstrap 5, Chart.js
- **Backend**: Node.js, Express.js, MongoDB
- **Infrastructure**: Docker, Nginx, SNMP

## 📁 Project Structure
```
NMS/
├── .gitignore
├── package.json                    # Root package for workspace commands
├── README.md                       # This file
└── mern-nms/                      # Main application directory
    ├── .env                       # Environment configuration (created by deploy)
    ├── .env.template              # Environment template
    ├── deploy.sh                  # ⭐ One-command deployment script
    ├── docker-compose.yml         # Container orchestration
    ├── LICENSE                    # MIT License
    ├── DEPLOYMENT.md              # Detailed deployment guide
    ├── NETWORK_ACCESS_GUIDE.md    # Network troubleshooting
    ├── mongo-init.js              # Database initialization
    ├── backend/                   # 🚀 Express.js API Server
    │   ├── Dockerfile
    │   ├── .dockerignore
    │   ├── package.json
    │   ├── server.js              # Main server entry point
    │   ├── middleware/
    │   │   └── auth.js            # JWT authentication
    │   ├── models/
    │   │   ├── Device.js          # Network device model
    │   │   ├── Topology.js        # Network topology model
    │   │   └── User.js            # User authentication model
    │   ├── routes/
    │   │   ├── admin.js           # Admin management
    │   │   ├── alerts.js          # Alert system
    │   │   ├── auth.js            # Authentication routes
    │   │   ├── dashboard.js       # Dashboard data
    │   │   ├── devices.js         # Device management
    │   │   ├── discovery.js       # Network discovery
    │   │   └── metrics.js         # Performance metrics
    │   ├── scripts/
    │   │   └── reset-admin-password.js
    │   └── utils/
    │       ├── logger.js          # Logging utility
    │       └── snmpManager.js     # SNMP operations
    └── frontend/                  # ⚛️ React Application
        ├── Dockerfile
        ├── .dockerignore
        ├── package.json
        ├── default.conf.template   # Nginx configuration
        ├── docker-entrypoint.sh   # Container startup script
        ├── public/
        │   ├── index.html
        │   └── health              # Health check endpoint
        └── src/
            ├── App.js              # Main React component
            ├── index.js            # React entry point
            ├── index.css           # Global styles
            ├── components/
            │   ├── Admin/          # Admin management UI
            │   ├── Auth/           # Login/authentication
            │   ├── Dashboard/      # Main dashboard components
            │   ├── Layout/         # Header, sidebar, layout
            │   ├── Profile/        # User profile settings
            │   ├── Reports/        # Reporting interface
            │   └── shared/         # Reusable components
            ├── context/
            │   ├── AuthContext.js  # Authentication state
            │   └── SocketContext.js # Real-time connections
            ├── services/
            │   └── api.js          # API service layer
            ├── styles/
            │   ├── dark-theme.css  # Dark mode styles
            │   ├── enhanced.css    # Enhanced UI styles
            │   └── sidebar.css     # Sidebar styles
            └── utils/
                ├── common.js       # Common utilities
                ├── ErrorHandler.js # Error handling
                └── validation.js   # Input validation
               
```

## 📱 Network Access

Deploy once, access everywhere:
- **Laptops**: http://[IP]:3000
- **Phones/Tablets**: Same URL works
- **Other Devices**: Full responsive design

## 🔧 Advanced Options

### Interactive Deploy (Custom Configuration)
```bash
./deploy.sh
```
Configure IP, ports, passwords, and CORS settings.

### Manual Commands
```bash
# View logs
docker compose logs -f

# Restart services  
docker compose restart

# Stop everything
docker compose down
```

## 📋 Ports
- **Frontend**: 3000 (Web UI)
- **Backend**: 5000 (API)  
- **MongoDB**: 27017 (Database)

## 🔒 Security Features
- JWT Authentication
- Secure password hashing
- CORS protection
- Rate limiting
- Container isolation

## 📚 Documentation
- `DEPLOYMENT.md` - Detailed deployment guide
- `NETWORK_ACCESS_GUIDE.md` - Network troubleshooting

## 🤝 Contributing
Pull requests welcome! See issues for planned features.

## 📄 License
This project is licensed under the MIT License.