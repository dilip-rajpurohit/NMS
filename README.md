# Network Management System (NMS)

A modern Network Management System built with the MERN stack for network monitoring, device management, and alerting.

## Features

- **Device Discovery** - SNMP-based network scanning and device identification
- **Real-time Monitoring** - Performance metrics and network topology visualization
- **Alerting System** - Configurable alerts with multiple notification channels
- **User Management** - Role-based access control with JWT authentication
- **Dashboard** - Real-time and historical data visualization
- **REST API** - Complete API for integration and automation
- **Easy Deployment** - One-command deployment with interactive setup
- **Security** - Secure password handling and JWT token generation
- **Docker Support** - Containerized deployment with health checks
- **Responsive UI** - Modern React interface with Bootstrap styling

## Technology Stack

- **Frontend**: React 18, Bootstrap 5, Chart.js, Socket.io
- **Backend**: Node.js, Express.js, MongoDB, Socket.io
- **Infrastructure**: Docker, Docker Compose, Nginx
- **Security**: JWT Authentication, Bcrypt, Helmet
- **Monitoring**: SNMP, Real-time metrics, Health checks
- **Development**: ESLint, Prettier, Nodemon

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
   docker compose up -d --build
   ```

4. **Help**
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

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `IP` | Server IP or domain | *auto-detected* |
| `BACKEND_PORT` | API server port | `5000` |
| `FRONTEND_PORT` | Web interface port | `3000` |
| `JWT_SECRET` | Authentication secret | *auto-generated* |
| `MONGO_ROOT_USER` | Database username | `admin` |
| `MONGO_ROOT_PASSWORD` | Database password | *user-provided* |
| `ADMIN_USERNAME` | Default admin username | `admin` |
| `ADMIN_EMAIL` | Default admin email | *user-provided* |
| `ADMIN_PASSWORD` | Default admin password | *user-provided* |

## Development

### Local Setup

1. **Install Dependencies**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd ../frontend && npm install
   ```

2. **Start Services**
   ```bash
   # Backend
   cd backend && npm run dev
   
   # Frontend (new terminal)
   cd frontend && npm start
   ```

3. **Access**
   - Frontend: `http://localhost:3000`
   - API: `http://localhost:5000/api`

## Project Structure

```
mern-nms/
├── backend/              # Node.js API Server
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   ├── scripts/         # Database scripts
│   ├── logs/            # Application logs
│   └── server.js        # Main server file
├── frontend/            # React Application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/     # State management
│   │   ├── services/    # API integration
│   │   ├── styles/      # CSS styling
│   │   └── utils/       # Utility functions
│   └── public/          # Static assets
├── docker-compose.yml   # Container orchestration
├── deploy.sh           # Easy deployment script
├── .env.template       # Environment template
└── mongo-init.js       # Database initialization
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