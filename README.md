# Network Management System (NMS)

A comprehensive Network Management System built with the MERN stack for enterprise network monitoring, device management, and real-time alerting. Features easy deployment, multi-device access, and production-ready containerization.

## ✨ Features

- **🔍 Device Discovery** - SNMP-based network scanning and automated device identification
- **📊 Real-time Monitoring** - Live performance metrics and network topology visualization
- **🚨 Alerting System** - Configurable alerts with multiple notification channels
- **👥 User Management** - Role-based access control with JWT authentication
- **📈 Dashboard** - Interactive real-time and historical data visualization
- **🔌 REST API** - Complete RESTful API for integration and automation
- **🚀 Easy Deployment** - One-command deployment with interactive configuration
- **🔒 Security** - Secure password handling, JWT tokens, and CORS protection
- **🐳 Docker Support** - Full containerization with health checks and auto-restart
- **📱 Responsive UI** - Modern React interface with Bootstrap styling
- **🌐 Multi-Device Access** - Network-wide access with flexible CORS configuration
- **🔄 Auto-Recovery** - Container health monitoring and automatic restarts

## 🛠️ Technology Stack

- **Frontend**: React 18, Bootstrap 5, Chart.js, Socket.io Client
- **Backend**: Node.js, Express.js, MongoDB, Socket.io Server
- **Infrastructure**: Docker, Docker Compose, Nginx
- **Security**: JWT Authentication, Bcrypt, Helmet, CORS
- **Monitoring**: SNMP v1/v2c/v3, Real-time metrics, Health checks
- **Development**: ESLint, Prettier, Nodemon, Hot Reload
- **Database**: MongoDB 7.x with Authentication
- **Networking**: Multi-device access, Flexible CORS, Network auto-detection

## Quick Start

### Prerequisites
- Docker & Docker Compose (v20.10+)
- 4GB RAM minimum (8GB recommended)
- 10GB disk space

### Deployment

1. **Easy Deploy (Recommended)**
   ```bash
   git clone <repository-url>
   cd NMS/mern-nms
   ./deploy.sh
   ```
   
   The deploy script will:
   - Check system dependencies
   - Prompt for configuration (IP, ports, passwords, email)
   - Generate secure JWT tokens
   - Create and configure containers
   - Provide access information

2. **Non-Interactive Deploy**
   ```bash
   ./deploy.sh --non-interactive
   ```
   Uses default values and auto-generated passwords

3. **Manual Setup**
   ```bash
   cd mern-nms
   cp .env.template .env
   nano .env  # Configure your settings
## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Linux/macOS environment (tested)
- Network interface access for device discovery

### Deployment Options

#### 1. Interactive Deployment (Recommended)
```bash
cd mern-nms
chmod +x deploy.sh
./deploy.sh
```

The script will:
- Detect your network interfaces
- Configure CORS for multi-device access
- Clean up previous volumes if needed
- Set up environment variables
- Deploy the application

#### 2. Non-Interactive Deployment
```bash
# Enable all origins (for testing)
./deploy.sh --allow-all

# Specify server IP
./deploy.sh --server-ip 192.168.1.100

# Force volume cleanup
./deploy.sh --clean-volumes

# Combined options
./deploy.sh --server-ip 192.168.1.100 --allow-all --clean-volumes
```

#### 3. Manual Setup
```bash
# 1. Copy environment template
cp .env.template .env

# 2. Edit environment variables
nano .env

# 3. Deploy with Docker Compose
docker compose up -d --build

# 4. Check logs
docker compose logs -f
```

#### 4. Help
```bash
./deploy.sh --help
```

### Access
- **Web Interface**: `http://your-server-ip:3000`
- **API**: `http://your-server-ip:5000/api`

**Default Credentials**:
- Username: `admin`
- Password: *as set during deployment*

> ⚠️ **Security Note**: Deployment script will prompt you to set secure passwords. Change default credentials immediately after first login.

### Multi-Device Access

The deployment script automatically configures CORS to allow access from:
- The host machine (`localhost`, `127.0.0.1`)
- Same network devices (private IP ranges)
- Custom IP addresses you specify

Access from mobile devices or other computers on your network:
1. Find your server IP: `ip addr show` or `ifconfig`
2. Open browser on device: `http://[server-ip]:3000`

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `IP` | Server IP or domain | *auto-detected* |
| `BACKEND_PORT` | API server port | `5000` |
| `FRONTEND_PORT` | Web interface port | `3000` |
| `MONGODB_USER` | Database username | `admin` |
| `MONGODB_PASSWORD` | Database password | *user-defined* |
| `MONGODB_DATABASE` | Database name | `nms` |
| `JWT_SECRET` | JWT signing key | *auto-generated* |
| `ALLOW_ALL_ORIGINS` | Enable CORS for all origins | `false` |
| `NODE_ENV` | Environment mode | `production` |

### Network Configuration

The system supports flexible network access through:

1. **Automatic Network Detection**: The deploy script detects available network interfaces
2. **Private Network Support**: Automatically allows access from private IP ranges:
   - `192.168.x.x` (Class C)
   - `10.x.x.x` (Class A)
   - `172.16.x.x - 172.31.x.x` (Class B)
3. **Custom CORS Configuration**: Manual IP specification for specific network setups
4. **Development Mode**: `ALLOW_ALL_ORIGINS=true` for testing (not recommended for production)

### Security Settings

- **JWT Authentication**: Stateless authentication with configurable expiration
- **Password Hashing**: Bcrypt with salt rounds for secure password storage
- **CORS Protection**: Configurable origin restrictions
- **Helmet Integration**: Security headers for web protection
- **Input Validation**: Server-side validation for all API endpoints

### Database Configuration

MongoDB is configured with:
- Authentication enabled by default
- Persistent volumes for data retention
- Health checks for container monitoring
- Automatic initialization with admin user

## 🔧 Development

### Local Development Setup

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd mern-nms
   cp .env.template .env
   ```

2. **Backend development**
   ```bash
   cd backend
   npm install
   npm run dev  # Starts with nodemon
   ```

3. **Frontend development**
   ```bash
   cd frontend
   npm install
   npm start    # Starts React dev server
   ```

4. **Database setup**
   ```bash
   # Start MongoDB container only
   docker-compose up mongodb -d
   ```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User authentication |
| `/api/auth/register` | POST | User registration |
| `/api/devices` | GET/POST | Device management |
| `/api/devices/:id` | GET/PUT/DELETE | Individual device operations |
| `/api/discovery` | POST | Network discovery |
| `/api/metrics` | GET | Performance metrics |
| `/api/topology` | GET | Network topology |
| `/api/alerts` | GET/POST | Alert management |
| `/api/admin` | GET/PUT | Admin operations |

### Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests  
cd frontend
npm test

# Integration tests
docker-compose -f docker-compose.test.yml up
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Container Connection Issues
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs -f [service_name]

# Restart services
docker-compose restart
```

#### 2. Database Authentication Errors
```bash
# Clean volumes and redeploy
./deploy.sh --clean-volumes

# Or manually remove volumes
docker-compose down -v
docker volume prune -f
```

#### 3. CORS Access Issues
```bash
# Check current CORS configuration
docker-compose logs backend | grep -i cors

# Test with all origins enabled
./deploy.sh --allow-all

# Verify network connectivity
ping [server-ip]
curl http://[server-ip]:5000/api/health
```

#### 4. Port Conflicts
```bash
# Check port usage
netstat -tulpn | grep :3000
netstat -tulpn | grep :5000

# Stop conflicting services
sudo systemctl stop [service_name]

# Use different ports in .env file
```

#### 5. Network Discovery Issues
- Ensure SNMP is enabled on target devices
- Check firewall rules for UDP port 161
- Verify community strings match device configuration
- Test connectivity: `snmpwalk -v2c -c public [device-ip] 1.3.6.1.2.1.1.1.0`

### Performance Optimization

1. **Database Optimization**
   - Monitor MongoDB metrics in admin panel
   - Consider database indexing for large device counts
   - Adjust connection pool settings

2. **Network Monitoring**
   - Tune SNMP polling intervals
   - Implement device grouping for large networks
   - Use background jobs for intensive operations

3. **Frontend Performance**
   - Enable gzip compression in Nginx
   - Implement lazy loading for large device lists
   - Use React.memo for expensive components

### Logs and Monitoring

```bash
# Application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# System logs
journalctl -u docker
tail -f /var/log/nginx/access.log

# Health checks
curl http://localhost:5000/api/health
curl http://localhost:3000/health
```

## 📖 Usage Guide

### First Time Setup

1. **Deploy the application**
   ```bash
   ./deploy.sh
   ```

2. **Login with default credentials**
   - Navigate to `http://[server-ip]:3000`
   - Username: `admin`
   - Password: (as set during deployment)

3. **Change default passwords**
   - Go to Profile Settings
   - Update admin password
   - Create additional user accounts as needed

### Device Management

1. **Add Devices Manually**
   - Navigate to Dashboard → Devices
   - Click "Add Device"
   - Enter device details (IP, SNMP community, description)

2. **Network Discovery**
   - Go to Dashboard → Discovery
   - Enter network range (e.g., 192.168.1.0/24)
   - Configure SNMP settings
   - Start discovery process

3. **Monitor Devices**
   - View real-time metrics in Dashboard
   - Set up alerts for critical thresholds
   - Generate performance reports

### Admin Panel Features

- **User Management**: Create, edit, delete user accounts
- **System Settings**: Configure global application settings
- **Network Configuration**: Set SNMP defaults and polling intervals
- **Security Settings**: Manage authentication and access controls

## 🤝 Contributing

### Development Workflow

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/mern-nms.git
   cd mern-nms
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Development Setup**
   ```bash
   cp .env.template .env
   # Edit .env with your development settings
   docker-compose up mongodb -d  # Start only database
   ```

4. **Make Changes and Test**
   ```bash
   # Backend
   cd backend && npm run dev
   
   # Frontend (new terminal)
   cd frontend && npm start
   
   # Run tests
   npm test
   ```

5. **Submit Pull Request**
   - Ensure all tests pass
   - Update documentation as needed
   - Follow existing code style

### Code Style

- **Backend**: ESLint + Prettier configuration
- **Frontend**: React best practices, functional components
- **Commits**: Conventional commit messages
- **Documentation**: Update README for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](mern-nms/LICENSE) file for details.

## 🆘 Support

### Getting Help

1. **Documentation**: Check this README and `DEPLOYMENT.md`
2. **Issues**: Search existing GitHub issues
3. **Logs**: Check application logs for error details
4. **Community**: Create GitHub issue for bugs or feature requests

### Reporting Issues

When reporting issues, please include:
- Operating system and version
- Docker and Docker Compose versions
- Complete error logs
- Steps to reproduce
- Expected vs actual behavior

### Feature Requests

We welcome feature requests! Please create a GitHub issue with:
- Clear description of the feature
- Use case and benefits
- Proposed implementation approach
- Any relevant examples or references

---

**Made with ❤️ for network administrators and IT professionals**
├── package.json
└── mern-nms/
    ├── deploy.sh                    # Enhanced deployment automation
    ├── DEPLOYMENT.md               # Deployment documentation
    ├── docker-compose.yml         # Container orchestration
    ├── LICENSE                    # MIT License
    ├── mongo-init.js             # MongoDB initialization
    ├── backend/                  # Express.js API server
    │   ├── Dockerfile
    │   ├── package.json
    │   ├── server.js            # Main server with enhanced CORS
    │   ├── logs/               # Application logs
    │   ├── middleware/
    │   │   └── auth.js         # JWT authentication
    │   ├── models/
    │   │   ├── Device.js       # Device data model
    │   │   ├── Topology.js     # Network topology model
    │   │   └── User.js         # User authentication model
    │   ├── routes/
    │   │   ├── activity.js     # Activity tracking
    │   │   ├── admin.js        # Admin management
    │   │   ├── alerts.js       # Alert system
    │   │   ├── auth.js         # Authentication routes
    │   │   ├── devices.js      # Device management
    │   │   ├── discovery.js    # Network discovery
    │   │   ├── metrics.js      # Performance metrics
    │   │   └── topology.js     # Network topology
    │   ├── scripts/
    │   │   └── reset-admin-password.js
    │   └── utils/
    │       ├── logger.js       # Logging utility
    │       └── snmpManager.js  # SNMP operations
    └── frontend/               # React application
        ├── default.conf.template
        ├── docker-entrypoint.sh
        ├── Dockerfile
        ├── package.json
        ├── public/
        │   ├── health
        │   └── index.html
        └── src/
            ├── App.js
            ├── index.css
            ├── index.js
            ├── styles.css
            ├── components/
            │   ├── Alerts.js
            │   ├── Admin/
            │   │   ├── NetworkConfiguration.js
            │   │   ├── SystemSettings.js
            │   │   └── UsersManagement.js
            │   ├── Auth/
            │   │   └── Login.js
            │   ├── Dashboard/
            │   │   ├── Dashboard.js
            │   │   ├── Devices.js
            │   │   ├── Discovery.js
            │   │   ├── Metrics.js
            │   │   └── Topology.js
            │   ├── Layout/
            │   │   ├── Header.js
            │   │   ├── Layout.js
            │   │   └── Sidebar.js
            │   ├── Profile/
            │   │   └── ProfileSettings.js
            │   ├── Reports/
            │   │   └── Reports.js
            │   └── shared/
            │       ├── CommonComponents.js
            │       └── ErrorBoundary.js
            ├── context/
            │   ├── AuthContext.js
            │   └── SocketContext.js
            ├── services/
            │   └── api.js
            ├── styles/
            │   ├── dark-theme.css
            │   └── enhanced.css
            └── utils/
                ├── common.js
                ├── ErrorHandler.js
                └── validation.js
```

## Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit your changes**
   ```bash
   git commit -m "Add your feature"
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow ESLint and Prettier configurations
- Write unit tests for new features
- Update documentation for API changes
- Use conventional commit messages
- Test deployment script changes

## API Documentation

### Authentication
```http
POST /api/auth/login          # User login
POST /api/auth/register       # User registration
GET  /api/auth/verify         # Token verification
```

### Device Management
```http
GET    /api/devices           # List devices
POST   /api/devices           # Add device
PUT    /api/devices/:id       # Update device
DELETE /api/devices/:id       # Remove device
```

### Monitoring
```http
GET  /api/metrics             # Performance metrics
GET  /api/alerts              # System alerts
GET  /api/topology            # Network topology
POST /api/discovery/scan      # Network scan
```

## Docker Commands

```bash
# Build and start services
docker compose up -d --build

# View service status
docker compose ps

# View logs
docker compose logs -f [service-name]

# Stop services
docker compose down

# Restart services
docker compose restart

# Health check
curl http://localhost:5000/api/health

# Clean up (remove containers and data)
docker compose down -v
```

## Deployment Script Features

The `deploy.sh` script provides:

- **🔍 Dependency Check**: Validates Docker installation
- **🛠️ Interactive Setup**: Prompts for configuration
- **🔒 Security**: Secure password input and JWT generation
- **📊 Health Checks**: Verifies container startup
- **📝 Documentation**: Saves deployment information
- **🔄 Restart Logic**: Handles container startup issues

### Script Options

```bash
./deploy.sh                    # Interactive mode
./deploy.sh --non-interactive  # Auto-generated passwords
./deploy.sh --help            # Show usage information
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Login fails | Check API connectivity and credentials |
| Containers won't start | Check port conflicts, review logs |
| Database connection fails | Verify MongoDB service and credentials |
| Network discovery issues | Check SNMP configuration and permissions |
| Deploy script hangs | Use `--non-interactive` flag or check input |
| Permission denied | Ensure Docker permissions and script is executable |

### Debug Commands
```bash
# Check container status
docker compose ps

# View logs
docker compose logs backend
docker compose logs frontend
docker compose logs mongodb

# Health check
curl http://localhost:5000/api/health

# Check deploy script permissions
chmod +x deploy.sh

# Test connectivity
curl http://your-server-ip:5000/api/health
curl http://your-server-ip:3000/health
```

### File Structure Security

The following files are automatically ignored by git:
- `.env` - Environment variables with credentials
- `deployment_info.txt` - Deployment credentials
- `*.backup.*` - Backup files
- Database volumes and logs

### Performance Tips

- **Memory**: Allocate at least 4GB RAM for optimal performance
- **Storage**: Use SSD for better database performance
- **Network**: Ensure proper SNMP access for device discovery
- **Monitoring**: Use `docker stats` to monitor resource usage

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.