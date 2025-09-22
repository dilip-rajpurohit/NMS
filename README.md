# 🌐 Network Management System (NMS)# Network Management System (NMS)



A comprehensive MERN stack application for monitoring and managing network infrastructure with real-time device discovery, performance metrics, and alerting capabilities.A comprehensive Network Management System built with the MERN stack for enterprise network monitoring, device management, and real-time alerting. Features easy deployment, multi-device access, and production-ready containerization.



[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)## ✨ Features

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)- **🔍 Device Discovery** - SNMP-based network scanning and automated device identification

[![MongoDB](https://img.shields.io/badge/MongoDB-7+-green.svg)](https://www.mongodb.com/)- **📊 Real-time Monitoring** - Live performance metrics and network topology visualization

[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)- **🚨 Alerting System** - Configurable alerts with multiple notification channels

- **👥 User Management** - Role-based access control with JWT authentication

## 🚀 Quick Start- **📈 Dashboard** - Interactive real-time and historical data visualization

- **🔌 REST API** - Complete RESTful API for integration and automation

### One-Command Deployment- **🚀 Easy Deployment** - One-command deployment with interactive configuration

```bash- **🔒 Security** - Secure password handling, JWT tokens, and CORS protection

git clone https://github.com/dilip-rajpurohit/NMS.git- **🐳 Docker Support** - Full containerization with health checks and auto-restart

cd NMS/mern-nms- **📱 Responsive UI** - Modern React interface with Bootstrap styling

./deploy.sh --non-interactive- **🌐 Multi-Device Access** - Network-wide access with flexible CORS configuration

```- **🔄 Auto-Recovery** - Container health monitoring and automatic restarts



### Access Your Application## 🛠️ Technology Stack

- **Frontend**: `http://[YOUR-IP]:3000`

- **Backend API**: `http://[YOUR-IP]:5000/api`- **Frontend**: React 18, Bootstrap 5, Chart.js, Socket.io Client

- **Admin Login**: `admin` / `admin123`- **Backend**: Node.js, Express.js, MongoDB, Socket.io Server

- **Infrastructure**: Docker, Docker Compose, Nginx

## 📋 Table of Contents- **Security**: JWT Authentication, Bcrypt, Helmet, CORS

- **Monitoring**: SNMP v1/v2c/v3, Real-time metrics, Health checks

- [Features](#-features)- **Development**: ESLint, Prettier, Nodemon, Hot Reload

- [Architecture](#-architecture)- **Database**: MongoDB 7.x with Authentication

- [Project Structure](#-project-structure)- **Networking**: Multi-device access, Flexible CORS, Network auto-detection

- [Installation](#-installation)

- [Configuration](#-configuration)## Quick Start

- [Usage](#-usage)

- [API Documentation](#-api-documentation)### Prerequisites

- [Docker Deployment](#-docker-deployment)- Docker & Docker Compose (v20.10+)

- [Network Access](#-network-access)- 4GB RAM minimum (8GB recommended)

- [Development](#-development)- 10GB disk space

- [Troubleshooting](#-troubleshooting)

- [Contributing](#-contributing)### Deployment

- [License](#-license)

1. **Easy Deploy (Recommended)**

## ✨ Features   ```bash

   git clone <repository-url>

### 🔍 Network Discovery   cd NMS/mern-nms

- Automatic device discovery via SNMP   ./deploy.sh

- Network topology visualization   ```

- Real-time device status monitoring   

- Support for multiple network protocols   The deploy script will:

   - Check system dependencies

### 📊 Performance Monitoring   - Prompt for configuration (IP, ports, passwords, email)

- Real-time metrics collection   - Generate secure JWT tokens

- Historical data analysis   - Create and configure containers

- Custom dashboards and reports   - Provide access information

- Performance alerting and notifications

2. **Non-Interactive Deploy**

### 🛡️ Security & Management   ```bash

- Role-based access control (RBAC)   ./deploy.sh --non-interactive

- JWT-based authentication   ```

- Secure SNMP communication   Uses default values and auto-generated passwords

- Comprehensive audit logging

3. **Manual Setup**

### 🌐 Multi-Device Access   ```bash

- Responsive web interface   cd mern-nms

- Cross-platform compatibility   cp .env.template .env

- Network-wide accessibility   nano .env  # Configure your settings

- Mobile-friendly design## 🚀 Quick Start



## 🏗️ Architecture### Prerequisites



```- Docker and Docker Compose

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐- Linux/macOS environment (tested)

│   React.js      │    │   Node.js       │    │   MongoDB       │- Network interface access for device discovery

│   Frontend      │◄──►│   Backend       │◄──►│   Database      │

│   (Port 3000)   │    │   (Port 5000)   │    │   (Port 27017) │### Deployment Options

└─────────────────┘    └─────────────────┘    └─────────────────┘

         │                       │                       │#### 1. Interactive Deployment (Recommended)

         │              ┌─────────────────┐               │```bash

         └──────────────►│   Nginx Proxy   │◄──────────────┘cd mern-nms

                        │   Load Balancer │chmod +x deploy.sh

                        └─────────────────┘./deploy.sh

                                 │```

                        ┌─────────────────┐

                        │   Docker        │The script will:

                        │   Containers    │- Detect your network interfaces

                        └─────────────────┘- Configure CORS for multi-device access

```- Clean up previous volumes if needed

- Set up environment variables

### Technology Stack- Deploy the application



**Frontend:**#### 2. Non-Interactive Deployment

- **React 18** - Modern UI framework```bash

- **Bootstrap 5** - Responsive styling# Enable all origins (for testing)

- **Socket.io Client** - Real-time communication./deploy.sh --allow-all

- **Chart.js/D3.js** - Data visualization

- **Axios** - HTTP client# Specify server IP

./deploy.sh --server-ip 192.168.1.100

**Backend:**

- **Node.js 18+** - Server runtime# Force volume cleanup

- **Express.js** - Web framework./deploy.sh --clean-volumes

- **Socket.io** - WebSocket communication

- **JWT** - Authentication# Combined options

- **Winston** - Logging./deploy.sh --server-ip 192.168.1.100 --allow-all --clean-volumes

```

**Database:**

- **MongoDB 7** - Primary database#### 3. Manual Setup

- **Mongoose** - ODM for MongoDB```bash

# 1. Copy environment template

**Infrastructure:**cp .env.template .env

- **Docker & Docker Compose** - Containerization

- **Nginx** - Reverse proxy and static files# 2. Edit environment variables

- **PM2** - Process management (optional)nano .env



## 📁 Project Structure# 3. Deploy with Docker Compose

docker compose up -d --build

```

NMS/# 4. Check logs

├── mern-nms/                           # Main application directorydocker compose logs -f

│   ├── backend/                        # Node.js backend application```

│   │   ├── logs/                       # Application logs (generated)

│   │   ├── middleware/                 # Express middleware#### 4. Help

│   │   │   └── auth.js                 # Authentication middleware```bash

│   │   ├── models/                     # MongoDB data models./deploy.sh --help

│   │   │   ├── Device.js               # Network device model```

│   │   │   ├── Topology.js             # Network topology model

│   │   │   └── User.js                 # User account model### Access

│   │   ├── routes/                     # API route handlers- **Web Interface**: `http://your-server-ip:3000`

│   │   │   ├── admin.js                # Admin management routes- **API**: `http://your-server-ip:5000/api`

│   │   │   ├── alerts.js               # Alert system routes

│   │   │   ├── auth.js                 # Authentication routes**Default Credentials**:

│   │   │   ├── dashboard.js            # Dashboard data routes- Username: `admin`

│   │   │   ├── devices.js              # Device management routes- Password: *as set during deployment*

│   │   │   ├── discovery.js            # Network discovery routes

│   │   │   └── metrics.js              # Performance metrics routes> ⚠️ **Security Note**: Deployment script will prompt you to set secure passwords. Change default credentials immediately after first login.

│   │   ├── scripts/                    # Utility scripts

│   │   │   └── reset-admin-password.js # Admin password reset### Multi-Device Access

│   │   ├── utils/                      # Utility modules

│   │   │   ├── logger.js               # Winston logging configurationThe deployment script automatically configures CORS to allow access from:

│   │   │   └── snmpManager.js          # SNMP communication handler- The host machine (`localhost`, `127.0.0.1`)

│   │   ├── Dockerfile                  # Backend container definition- Same network devices (private IP ranges)

│   │   ├── .dockerignore               # Docker ignore rules- Custom IP addresses you specify

│   │   ├── package.json                # Backend dependencies

│   │   ├── package-lock.json           # Locked dependency versionsAccess from mobile devices or other computers on your network:

│   │   └── server.js                   # Main backend entry point1. Find your server IP: `ip addr show` or `ifconfig`

│   ├── frontend/                       # React frontend application2. Open browser on device: `http://[server-ip]:3000`

│   │   ├── public/                     # Static public assets

│   │   │   ├── health                  # Health check endpoint## ⚙️ Configuration

│   │   │   └── index.html              # Main HTML template

│   │   ├── src/                        # React source code### Environment Variables

│   │   │   ├── components/             # React components

│   │   │   │   ├── Admin/              # Admin panel components| Variable | Description | Default |

│   │   │   │   │   ├── NetworkConfiguration.js|----------|-------------|---------|

│   │   │   │   │   ├── SystemSettings.js| `IP` | Server IP or domain | *auto-detected* |

│   │   │   │   │   └── UsersManagement.js| `BACKEND_PORT` | API server port | `5000` |

│   │   │   │   ├── Auth/               # Authentication components| `FRONTEND_PORT` | Web interface port | `3000` |

│   │   │   │   │   └── Login.js| `MONGODB_USER` | Database username | `admin` |

│   │   │   │   ├── Dashboard/          # Dashboard components| `MONGODB_PASSWORD` | Database password | *user-defined* |

│   │   │   │   │   ├── Dashboard.js| `MONGODB_DATABASE` | Database name | `nms` |

│   │   │   │   │   ├── Devices.js| `JWT_SECRET` | JWT signing key | *auto-generated* |

│   │   │   │   │   ├── Discovery.js| `ALLOW_ALL_ORIGINS` | Enable CORS for all origins | `false` |

│   │   │   │   │   ├── Metrics.js| `NODE_ENV` | Environment mode | `production` |

│   │   │   │   │   └── Topology.js

│   │   │   │   ├── Layout/             # Layout components### Network Configuration

│   │   │   │   │   ├── Header.js

│   │   │   │   │   ├── Layout.jsThe system supports flexible network access through:

│   │   │   │   │   └── Sidebar.js

│   │   │   │   ├── Profile/            # User profile components1. **Automatic Network Detection**: The deploy script detects available network interfaces

│   │   │   │   │   └── ProfileSettings.js2. **Private Network Support**: Automatically allows access from private IP ranges:

│   │   │   │   ├── Reports/            # Reporting components   - `192.168.x.x` (Class C)

│   │   │   │   │   └── Reports.js   - `10.x.x.x` (Class A)

│   │   │   │   ├── shared/             # Shared/common components   - `172.16.x.x - 172.31.x.x` (Class B)

│   │   │   │   │   ├── CommonComponents.js3. **Custom CORS Configuration**: Manual IP specification for specific network setups

│   │   │   │   │   └── ErrorBoundary.js4. **Development Mode**: `ALLOW_ALL_ORIGINS=true` for testing (not recommended for production)

│   │   │   │   └── Alerts.js           # Alert management component

│   │   │   ├── context/                # React context providers### Security Settings

│   │   │   │   ├── AuthContext.js      # Authentication context

│   │   │   │   └── SocketContext.js    # WebSocket context- **JWT Authentication**: Stateless authentication with configurable expiration

│   │   │   ├── services/               # API service modules- **Password Hashing**: Bcrypt with salt rounds for secure password storage

│   │   │   │   └── api.js              # HTTP API client- **CORS Protection**: Configurable origin restrictions

│   │   │   ├── styles/                 # CSS stylesheets- **Helmet Integration**: Security headers for web protection

│   │   │   │   ├── dark-theme.css      # Dark theme styles- **Input Validation**: Server-side validation for all API endpoints

│   │   │   │   ├── enhanced.css        # Enhanced UI styles

│   │   │   │   └── sidebar.css         # Sidebar specific styles### Database Configuration

│   │   │   ├── utils/                  # Frontend utilities

│   │   │   │   ├── common.js           # Common helper functionsMongoDB is configured with:

│   │   │   │   ├── ErrorHandler.js     # Error handling utilities- Authentication enabled by default

│   │   │   │   └── validation.js       # Form validation helpers- Persistent volumes for data retention

│   │   │   ├── App.js                  # Main React application- Health checks for container monitoring

│   │   │   ├── index.css               # Global styles- Automatic initialization with admin user

│   │   │   └── index.js                # React application entry point

│   │   ├── default.conf.template       # Nginx configuration template## 🔧 Development

│   │   ├── docker-entrypoint.sh        # Frontend container startup script

│   │   ├── Dockerfile                  # Frontend container definition### Local Development Setup

│   │   ├── .dockerignore               # Docker ignore rules

│   │   ├── package.json                # Frontend dependencies1. **Clone and setup**

│   │   └── package-lock.json           # Locked dependency versions   ```bash

│   ├── DEPLOYMENT.md                   # Detailed deployment guide   git clone <repository-url>

│   ├── deploy.sh                       # Automated deployment script   cd mern-nms

│   ├── docker-compose.yml              # Multi-container configuration   cp .env.template .env

│   ├── .env                            # Environment variables (generated)   ```

│   ├── .env.template                   # Environment template

│   ├── LICENSE                         # MIT license file2. **Backend development**

│   ├── mongo-init.js                   # MongoDB initialization script   ```bash

│   └── NETWORK_ACCESS_GUIDE.md         # Network configuration guide   cd backend

├── .gitignore                          # Git ignore rules   npm install

├── package.json                        # Root project configuration   npm run dev  # Starts with nodemon

└── README.md                           # This documentation file   ```

```

3. **Frontend development**

### Key Directories Explained   ```bash

   cd frontend

| Directory | Purpose | Key Files |   npm install

|-----------|---------|-----------|   npm start    # Starts React dev server

| `backend/models/` | MongoDB schemas and data models | Device.js, User.js, Topology.js |   ```

| `backend/routes/` | RESTful API endpoint definitions | auth.js, devices.js, metrics.js |

| `backend/middleware/` | Express middleware functions | auth.js (JWT validation) |4. **Database setup**

| `frontend/src/components/` | React UI components | Dashboard/, Admin/, Auth/ |   ```bash

| `frontend/src/context/` | Global state management | AuthContext.js, SocketContext.js |   # Start MongoDB container only

| `frontend/src/services/` | API communication layer | api.js (Axios configuration) |   docker-compose up mongodb -d

   ```

## 🛠️ Installation

### API Endpoints

### Prerequisites

| Endpoint | Method | Description |

- **Node.js** 18+ ([Download](https://nodejs.org/))|----------|--------|-------------|

- **Docker & Docker Compose** ([Download](https://www.docker.com/))| `/api/auth/login` | POST | User authentication |

- **Git** ([Download](https://git-scm.com/))| `/api/auth/register` | POST | User registration |

| `/api/devices` | GET/POST | Device management |

### Method 1: Automated Docker Deployment (Recommended)| `/api/devices/:id` | GET/PUT/DELETE | Individual device operations |

| `/api/discovery` | POST | Network discovery |

```bash| `/api/metrics` | GET | Performance metrics |

# Clone the repository| `/api/topology` | GET | Network topology |

git clone https://github.com/dilip-rajpurohit/NMS.git| `/api/alerts` | GET/POST | Alert management |

cd NMS/mern-nms| `/api/admin` | GET/PUT | Admin operations |



# Run automated deployment### Testing

./deploy.sh --non-interactive

```bash

# Or interactive mode for custom configuration# Backend tests

./deploy.shcd backend

```npm test



### Method 2: Manual Development Setup# Frontend tests  

cd frontend

```bashnpm test

# Clone and navigate

git clone https://github.com/dilip-rajpurohit/NMS.git# Integration tests

cd NMS/mern-nmsdocker-compose -f docker-compose.test.yml up

```

# Install backend dependencies

cd backend## 🚨 Troubleshooting

npm install

### Common Issues

# Install frontend dependencies

cd ../frontend#### 1. Container Connection Issues

npm install```bash

# Check container status

# Return to project rootdocker-compose ps

cd ..

```# View container logs

docker-compose logs -f [service_name]

## ⚙️ Configuration

# Restart services

### Environment Variablesdocker-compose restart

```

The application uses environment variables for configuration. Copy `.env.template` to `.env` and customize:

#### 2. Database Authentication Errors

```bash```bash

cp .env.template .env# Clean volumes and redeploy

```./deploy.sh --clean-volumes



#### Key Configuration Options# Or manually remove volumes

docker-compose down -v

| Variable | Description | Default | Required |docker volume prune -f

|----------|-------------|---------|----------|```

| `IP` | Server IP address | `localhost` | ✅ |

| `FRONTEND_PORT` | Frontend port | `3000` | ✅ |#### 3. CORS Access Issues

| `BACKEND_PORT` | Backend API port | `5000` | ✅ |```bash

| `MONGO_ROOT_PASSWORD` | MongoDB password | `mongo123` | ✅ |# Check current CORS configuration

| `ADMIN_PASSWORD` | Admin user password | `admin123` | ✅ |docker-compose logs backend | grep -i cors

| `ADMIN_EMAIL` | Admin user email | `admin@example.com` | ✅ |

| `JWT_SECRET` | JWT signing secret | (auto-generated) | ✅ |# Test with all origins enabled

| `ALLOW_ALL_ORIGINS` | CORS configuration | `false` | ❌ |./deploy.sh --allow-all

| `NODE_ENV` | Environment mode | `production` | ❌ |

# Verify network connectivity

### Security Configurationping [server-ip]

curl http://[server-ip]:5000/api/health

For production deployments:```



```bash#### 4. Port Conflicts

# Generate secure JWT secret```bash

openssl rand -hex 32# Check port usage

netstat -tulpn | grep :3000

# Use strong passwordsnetstat -tulpn | grep :5000

MONGO_ROOT_PASSWORD=your-secure-mongodb-password

ADMIN_PASSWORD=your-secure-admin-password# Stop conflicting services

sudo systemctl stop [service_name]

# Restrict CORS for security

ALLOW_ALL_ORIGINS=false# Use different ports in .env file

``````



## 🚀 Usage#### 5. Network Discovery Issues

- Ensure SNMP is enabled on target devices

### Starting the Application- Check firewall rules for UDP port 161

- Verify community strings match device configuration

#### Docker (Recommended)- Test connectivity: `snmpwalk -v2c -c public [device-ip] 1.3.6.1.2.1.1.1.0`

```bash

# Start all services### Performance Optimization

docker compose up -d

1. **Database Optimization**

# View logs   - Monitor MongoDB metrics in admin panel

docker compose logs -f   - Consider database indexing for large device counts

   - Adjust connection pool settings

# Stop services

docker compose down2. **Network Monitoring**

```   - Tune SNMP polling intervals

   - Implement device grouping for large networks

#### Development Mode   - Use background jobs for intensive operations

```bash

# Start MongoDB (via Docker)3. **Frontend Performance**

docker run -d --name mongodb -p 27017:27017 mongo:7   - Enable gzip compression in Nginx

   - Implement lazy loading for large device lists

# Start backend (in backend/ directory)   - Use React.memo for expensive components

npm run dev

### Logs and Monitoring

# Start frontend (in frontend/ directory)

npm start```bash

```# Application logs

docker-compose logs -f backend

### Accessing the Applicationdocker-compose logs -f frontend



1. **Open your browser** to `http://[YOUR-IP]:3000`# System logs

2. **Login** with default credentials:journalctl -u docker

   - Username: `admin`tail -f /var/log/nginx/access.log

   - Password: `admin123`

3. **Change default password** after first login# Health checks

curl http://localhost:5000/api/health

### Basic Operationscurl http://localhost:3000/health

```

#### Device Discovery

1. Navigate to **Dashboard > Discovery**## 📖 Usage Guide

2. Enter IP ranges (e.g., `192.168.1.1-100`)

3. Configure SNMP settings### First Time Setup

4. Click **Start Discovery**

1. **Deploy the application**

#### Monitoring Setup   ```bash

1. Go to **Dashboard > Devices**   ./deploy.sh

2. Select discovered devices   ```

3. Configure monitoring intervals

4. Set up alert thresholds2. **Login with default credentials**

   - Navigate to `http://[server-ip]:3000`

#### View Metrics   - Username: `admin`

1. Access **Dashboard > Metrics**   - Password: (as set during deployment)

2. Select time ranges

3. Choose specific devices/metrics3. **Change default passwords**

4. Export data as needed   - Go to Profile Settings

   - Update admin password

## 📚 API Documentation   - Create additional user accounts as needed



### Authentication Endpoints### Device Management



| Method | Endpoint | Description | Payload |1. **Add Devices Manually**

|--------|----------|-------------|---------|   - Navigate to Dashboard → Devices

| `POST` | `/api/auth/login` | User login | `{username, password}` |   - Click "Add Device"

| `POST` | `/api/auth/logout` | User logout | `{}` |   - Enter device details (IP, SNMP community, description)

| `GET` | `/api/auth/me` | Get current user | - |

| `PUT` | `/api/auth/change-password` | Change password | `{oldPassword, newPassword}` |2. **Network Discovery**

   - Go to Dashboard → Discovery

### Device Management   - Enter network range (e.g., 192.168.1.0/24)

   - Configure SNMP settings

| Method | Endpoint | Description |   - Start discovery process

|--------|----------|-------------|

| `GET` | `/api/devices` | List all devices |3. **Monitor Devices**

| `POST` | `/api/devices` | Add new device |   - View real-time metrics in Dashboard

| `PUT` | `/api/devices/:id` | Update device |   - Set up alerts for critical thresholds

| `DELETE` | `/api/devices/:id` | Remove device |   - Generate performance reports

| `GET` | `/api/devices/:id/metrics` | Get device metrics |

### Admin Panel Features

### Network Discovery

- **User Management**: Create, edit, delete user accounts

| Method | Endpoint | Description |- **System Settings**: Configure global application settings

|--------|----------|-------------|- **Network Configuration**: Set SNMP defaults and polling intervals

| `POST` | `/api/discovery/start` | Start network discovery |- **Security Settings**: Manage authentication and access controls

| `GET` | `/api/discovery/status` | Get discovery status |

| `POST` | `/api/discovery/stop` | Stop discovery |## 🤝 Contributing



### Example API Usage### Development Workflow



```javascript1. **Fork and Clone**

// Login   ```bash

const response = await fetch('/api/auth/login', {   git clone https://github.com/your-username/mern-nms.git

  method: 'POST',   cd mern-nms

  headers: { 'Content-Type': 'application/json' },   ```

  body: JSON.stringify({ username: 'admin', password: 'admin123' })

});2. **Create Feature Branch**

   ```bash

// Get devices   git checkout -b feature/your-feature-name

const devices = await fetch('/api/devices', {   ```

  headers: { 'Authorization': `Bearer ${token}` }

});3. **Development Setup**

```   ```bash

   cp .env.template .env

## 🐳 Docker Deployment   # Edit .env with your development settings

   docker-compose up mongodb -d  # Start only database

### Container Architecture   ```



The application runs in three main containers:4. **Make Changes and Test**

   ```bash

```yaml   # Backend

services:   cd backend && npm run dev

  mongodb:     # Database container   

    image: mongo:7-jammy   # Frontend (new terminal)

    ports: ["27017:27017"]   cd frontend && npm start

       

  backend:     # API server container   # Run tests

    build: ./backend   npm test

    ports: ["5000:5000"]   ```

    

  frontend:    # Web server container (Nginx)5. **Submit Pull Request**

    build: ./frontend   - Ensure all tests pass

    ports: ["3000:80"]   - Update documentation as needed

```   - Follow existing code style



### Docker Commands### Code Style



```bash- **Backend**: ESLint + Prettier configuration

# Build and start- **Frontend**: React best practices, functional components

docker compose up -d --build- **Commits**: Conventional commit messages

- **Documentation**: Update README for new features

# View container status

docker compose ps## 📄 License



# View logsThis project is licensed under the MIT License - see the [LICENSE](mern-nms/LICENSE) file for details.

docker compose logs [service-name]

## 🆘 Support

# Restart a service

docker compose restart [service-name]### Getting Help



# Scale services1. **Documentation**: Check this README and `DEPLOYMENT.md`

docker compose up -d --scale backend=22. **Issues**: Search existing GitHub issues

3. **Logs**: Check application logs for error details

# Clean up4. **Community**: Create GitHub issue for bugs or feature requests

docker compose down -v

```### Reporting Issues



### Health ChecksWhen reporting issues, please include:

- Operating system and version

All containers include health checks:- Docker and Docker Compose versions

- Complete error logs

- **MongoDB**: Database connectivity test- Steps to reproduce

- **Backend**: API health endpoint (`/api/health`)- Expected vs actual behavior

- **Frontend**: Nginx status check

### Feature Requests

## 🌐 Network Access

We welcome feature requests! Please create a GitHub issue with:

### Multi-Device Configuration- Clear description of the feature

- Use case and benefits

For network-wide access from multiple devices:- Proposed implementation approach

- Any relevant examples or references

```bash

# Enable CORS for all origins---

echo "ALLOW_ALL_ORIGINS=true" >> .env

**Made with ❤️ for network administrators and IT professionals**

# Restart backend to apply changes├── package.json

docker compose restart backend└── mern-nms/

```    ├── deploy.sh                    # Enhanced deployment automation

    ├── DEPLOYMENT.md               # Deployment documentation

### Network Troubleshooting    ├── docker-compose.yml         # Container orchestration

    ├── LICENSE                    # MIT License

Common network issues and solutions:    ├── mongo-init.js             # MongoDB initialization

    ├── backend/                  # Express.js API server

#### CORS Errors    │   ├── Dockerfile

```bash    │   ├── package.json

# Check current CORS setting    │   ├── server.js            # Main server with enhanced CORS

grep ALLOW_ALL_ORIGINS .env    │   ├── logs/               # Application logs

    │   ├── middleware/

# Enable all origins for development    │   │   └── auth.js         # JWT authentication

sed -i 's/ALLOW_ALL_ORIGINS=false/ALLOW_ALL_ORIGINS=true/' .env    │   ├── models/

docker compose restart backend    │   │   ├── Device.js       # Device data model

```    │   │   ├── Topology.js     # Network topology model

    │   │   └── User.js         # User authentication model

#### Content Security Policy (CSP) Issues    │   ├── routes/

```bash    │   │   ├── activity.js     # Activity tracking

# Rebuild frontend with correct IP    │   │   ├── admin.js        # Admin management

docker compose build frontend    │   │   ├── alerts.js       # Alert system

docker compose up -d frontend    │   │   ├── auth.js         # Authentication routes

```    │   │   ├── devices.js      # Device management

    │   │   ├── discovery.js    # Network discovery

#### Firewall Configuration    │   │   ├── metrics.js      # Performance metrics

```bash    │   │   └── topology.js     # Network topology

# Ubuntu/Debian    │   ├── scripts/

sudo ufw allow 3000  # Frontend    │   │   └── reset-admin-password.js

sudo ufw allow 5000  # Backend    │   └── utils/

    │       ├── logger.js       # Logging utility

# CentOS/RHEL    │       └── snmpManager.js  # SNMP operations

sudo firewall-cmd --add-port=3000/tcp --permanent    └── frontend/               # React application

sudo firewall-cmd --add-port=5000/tcp --permanent        ├── default.conf.template

sudo firewall-cmd --reload        ├── docker-entrypoint.sh

```        ├── Dockerfile

        ├── package.json

### Network Access Guide        ├── public/

        │   ├── health

See [NETWORK_ACCESS_GUIDE.md](./mern-nms/NETWORK_ACCESS_GUIDE.md) for detailed network configuration instructions.        │   └── index.html

        └── src/

## 🔧 Development            ├── App.js

            ├── index.css

### Development Environment Setup            ├── index.js

            ├── styles.css

```bash            ├── components/

# Install dependencies            │   ├── Alerts.js

cd backend && npm install            │   ├── Admin/

cd ../frontend && npm install            │   │   ├── NetworkConfiguration.js

            │   │   ├── SystemSettings.js

# Start development servers            │   │   └── UsersManagement.js

npm run dev:backend   # Backend with nodemon            │   ├── Auth/

npm run dev:frontend  # Frontend with hot reload            │   │   └── Login.js

```            │   ├── Dashboard/

            │   │   ├── Dashboard.js

### Code Structure Guidelines            │   │   ├── Devices.js

            │   │   ├── Discovery.js

#### Backend Development            │   │   ├── Metrics.js

```javascript            │   │   └── Topology.js

// models/Device.js - Mongoose schema            │   ├── Layout/

const deviceSchema = new mongoose.Schema({            │   │   ├── Header.js

  name: { type: String, required: true },            │   │   ├── Layout.js

  ip: { type: String, required: true, unique: true },            │   │   └── Sidebar.js

  status: { type: String, enum: ['online', 'offline'], default: 'offline' }            │   ├── Profile/

});            │   │   └── ProfileSettings.js

            │   ├── Reports/

// routes/devices.js - Express route            │   │   └── Reports.js

router.get('/devices', authenticateToken, async (req, res) => {            │   └── shared/

  const devices = await Device.find();            │       ├── CommonComponents.js

  res.json(devices);            │       └── ErrorBoundary.js

});            ├── context/

```            │   ├── AuthContext.js

            │   └── SocketContext.js

#### Frontend Development            ├── services/

```jsx            │   └── api.js

// components/Dashboard/Devices.js - React component            ├── styles/

import { useContext, useEffect, useState } from 'react';            │   ├── dark-theme.css

import { AuthContext } from '../../context/AuthContext';            │   └── enhanced.css

            └── utils/

const Devices = () => {                ├── common.js

  const [devices, setDevices] = useState([]);                ├── ErrorHandler.js

  const { token } = useContext(AuthContext);                └── validation.js

  ```

  useEffect(() => {

    fetchDevices();## Contributing

  }, []);

  1. **Fork the repository**

  return (2. **Create a feature branch**

    <div className="devices-container">   ```bash

      {/* Device list rendering */}   git checkout -b feature/your-feature-name

    </div>   ```

  );3. **Commit your changes**

};   ```bash

```   git commit -m "Add your feature"

   ```

### Testing4. **Push to the branch**

   ```bash

```bash   git push origin feature/your-feature-name

# Backend tests   ```

cd backend5. **Open a Pull Request**

npm test

### Development Guidelines

# Frontend tests

cd frontend- Follow ESLint and Prettier configurations

npm test- Write unit tests for new features

- Update documentation for API changes

# E2E tests- Use conventional commit messages

npm run test:e2e- Test deployment script changes

```

## API Documentation

### Building for Production

### Authentication

```bash```http

# Build frontendPOST /api/auth/login          # User login

cd frontendPOST /api/auth/register       # User registration

npm run buildGET  /api/auth/verify         # Token verification

```

# The build files will be copied to the Docker container

# during the Docker build process### Device Management

``````http

GET    /api/devices           # List devices

## 🐛 TroubleshootingPOST   /api/devices           # Add device

PUT    /api/devices/:id       # Update device

### Common IssuesDELETE /api/devices/:id       # Remove device

```

#### 1. Port Already in Use

```bash### Monitoring

# Find process using port```http

sudo lsof -i :3000GET  /api/metrics             # Performance metrics

sudo lsof -i :5000GET  /api/alerts              # System alerts

GET  /api/topology            # Network topology

# Kill processPOST /api/discovery/scan      # Network scan

sudo kill -9 [PID]```

```

## Docker Commands

#### 2. Database Connection Issues

```bash```bash

# Check MongoDB container# Build and start services

docker compose logs mongodbdocker compose up -d --build



# Restart MongoDB# View service status

docker compose restart mongodbdocker compose ps



# Check connectivity# View logs

mongosh mongodb://admin:mongo123@localhost:27017/nms_dbdocker compose logs -f [service-name]

```

# Stop services

#### 3. Network Login Issuesdocker compose down

```bash

# Check CORS configuration# Restart services

curl -v http://[IP]:5000/api/healthdocker compose restart



# Verify CSP headers# Health check

curl -v http://[IP]:3000 | grep "Content-Security-Policy"curl http://localhost:5000/api/health

```

# Clean up (remove containers and data)

#### 4. Container Build Failuresdocker compose down -v

```bash```

# Clean Docker cache

docker system prune -a## Deployment Script Features



# Rebuild from scratchThe `deploy.sh` script provides:

docker compose build --no-cache

```- **🔍 Dependency Check**: Validates Docker installation

- **🛠️ Interactive Setup**: Prompts for configuration

### Log Analysis- **🔒 Security**: Secure password input and JWT generation

- **📊 Health Checks**: Verifies container startup

```bash- **📝 Documentation**: Saves deployment information

# Application logs- **🔄 Restart Logic**: Handles container startup issues

docker compose logs -f backend

docker compose logs -f frontend### Script Options



# System logs```bash

journalctl -u docker./deploy.sh                    # Interactive mode

tail -f /var/log/nginx/error.log./deploy.sh --non-interactive  # Auto-generated passwords

```./deploy.sh --help            # Show usage information

```

### Performance Monitoring

## Troubleshooting

```bash

# Container resource usage### Common Issues

docker stats

| Issue | Solution |

# MongoDB performance|-------|----------|

mongosh --eval "db.serverStatus()"| Login fails | Check API connectivity and credentials |

| Containers won't start | Check port conflicts, review logs |

# API response times| Database connection fails | Verify MongoDB service and credentials |

curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/health| Network discovery issues | Check SNMP configuration and permissions |

```| Deploy script hangs | Use `--non-interactive` flag or check input |

| Permission denied | Ensure Docker permissions and script is executable |

## 🤝 Contributing

### Debug Commands

We welcome contributions! Please see our contributing guidelines:```bash

# Check container status

### Development Workflowdocker compose ps



1. **Fork** the repository# View logs

2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)docker compose logs backend

3. **Commit** your changes (`git commit -m 'Add amazing feature'`)docker compose logs frontend

4. **Push** to the branch (`git push origin feature/amazing-feature`)docker compose logs mongodb

5. **Open** a Pull Request

# Health check

### Code Standardscurl http://localhost:5000/api/health



- **ESLint** for JavaScript linting# Check deploy script permissions

- **Prettier** for code formattingchmod +x deploy.sh

- **Jest** for testing

- **JSDoc** for documentation# Test connectivity

curl http://your-server-ip:5000/api/health

### Commit Conventioncurl http://your-server-ip:3000/health

```

```bash

feat: add new device discovery feature### File Structure Security

fix: resolve CORS issue in production

docs: update API documentationThe following files are automatically ignored by git:

style: format code according to prettier- `.env` - Environment variables with credentials

refactor: restructure authentication middleware- `deployment_info.txt` - Deployment credentials

test: add unit tests for device model- `*.backup.*` - Backup files

chore: update dependencies- Database volumes and logs

```

### Performance Tips

## 📄 License

- **Memory**: Allocate at least 4GB RAM for optimal performance

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.- **Storage**: Use SSD for better database performance

- **Network**: Ensure proper SNMP access for device discovery

## 🙏 Acknowledgments- **Monitoring**: Use `docker stats` to monitor resource usage



- **SNMP.js** for SNMP protocol implementation## License

- **Socket.io** for real-time communication

- **Chart.js** for data visualizationThis project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
- **Bootstrap** for responsive UI components
- **MongoDB** for flexible data storage

## 📞 Support

- **Documentation**: [GitHub Wiki](https://github.com/dilip-rajpurohit/NMS/wiki)
- **Issues**: [GitHub Issues](https://github.com/dilip-rajpurohit/NMS/issues)
- **Discussions**: [GitHub Discussions](https://github.com/dilip-rajpurohit/NMS/discussions)

---

<div align="center">

**[⬆ Back to Top](#-network-management-system-nms)**

Made with ❤️ by the NMS Team

</div>