# Network Management System (NMS)

A modern Network Management System built with the MERN stack for network monitoring, device management, and alerting.

## Features

- **Device Discovery** - SNMP-based network scanning and device identification
- **Real-time Monitoring** - Performance metrics and network topology visualization
- **Alerting System** - Configurable alerts with multiple notification channels
- **User Management** - Role-based access control with JWT authentication
- **Dashboard** - Real-time and historical data visualization
- **REST API** - Complete API for integration and automation

## Technology Stack

- **Frontend**: React 18, Bootstrap 5, Chart.js, Socket.io
- **Backend**: Node.js, Express.js, MongoDB, Socket.io
- **Infrastructure**: Docker, Nginx, Redis, SNMP

## Quick Start

### Prerequisites
- Docker & Docker Compose (v20.10+)
- 4GB RAM minimum (8GB recommended)
- 10GB disk space

### Deployment

1. **Clone and Deploy**
   ```bash
   git clone <repository-url>
   cd NMS/mern-nms
   ./deploy.sh
   ```

2. **Manual Setup**
   ```bash
   cd mern-nms
   cp .env.template .env
   nano .env  # Configure your settings
   docker compose up -d --build
   ```

### Access
- **Web Interface**: `http://localhost:3000`
- **API**: `http://localhost:5000/api`

**Default Credentials**:
- Username: `admin`
- Password: `admin123`

> ⚠️ Change default credentials immediately after first login

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `IP` | Server IP or domain | `localhost` |
| `BACKEND_PORT` | API server port | `5000` |
| `FRONTEND_PORT` | Web interface port | `3000` |
| `JWT_SECRET` | Authentication secret | *auto-generated* |
| `MONGO_ROOT_PASSWORD` | Database password | *auto-generated* |
| `ADMIN_USERNAME` | Default admin username | `admin` |
| `ADMIN_EMAIL` | Default admin email | `admin@example.com` |
| `ADMIN_PASSWORD` | Default admin password | *auto-generated* |

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
│   └── server.js        # Main server file
├── frontend/            # React Application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/     # State management
│   │   ├── services/    # API integration
│   │   └── styles/      # CSS styling
│   └── public/          # Static assets
├── docker-compose.yml   # Container orchestration
├── deploy.sh           # Deployment script
└── mongo-init.js       # Database initialization
```

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
docker-compose up -d --build

# View service status
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Stop services
docker-compose down

# Health check
curl http://localhost:5000/api/health
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Login fails | Check API connectivity and credentials |
| Containers won't start | Check port conflicts, review logs |
| Database connection fails | Verify MongoDB service |
| Network discovery issues | Check SNMP configuration |

### Debug Commands
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb

# Health check
curl http://localhost:5000/api/health
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.