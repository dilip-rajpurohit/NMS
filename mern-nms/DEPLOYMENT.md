# Cross-Platform NMS Deployment Guide

## Overview

This Network Management System (NMS) can be deployed on **Linux, macOS, and Windows**. The system supports automated deployment for production-ready environments with cross-platform compatibility.

## Prerequisites

- **Docker Desktop** (Windows/macOS) or **Docker Engine** (Linux)
- **Git** (to clone the repository)
- **4GB RAM minimum** (8GB recommended)
- **5GB free disk space**

## Quick Start

### Linux/macOS
```bash
# Navigate to project directory
cd mern-nms

# Make deploy script executable
chmod +x deploy.sh

# Run deployment (interactive mode)
./deploy.sh

# Or run in non-interactive mode with defaults
./deploy.sh --non-interactive
```

### Windows

#### Option 1: Using Windows Batch File (Recommended)
```cmd
# Navigate to project directory  
cd mern-nms

# Run the Windows deployment script
deploy.bat
```

#### Option 2: Using Git Bash/WSL
```bash
# In Git Bash or WSL
cd mern-nms

# Run the deployment script
bash deploy.sh
```

## Platform-Specific Notes

### Windows
- **Docker Desktop**: Must be installed and running
- **WSL2**: Recommended for better performance
- **Line Endings**: Scripts automatically handle CRLF/LF conversion
- **Firewall**: May need to allow Docker through Windows Firewall

### macOS
- **Docker Desktop**: Must be installed and running
- **ARM64 (M1/M2)**: Fully supported with native ARM images
- **Intel**: Fully supported

### Linux
- **Docker Engine**: Install via package manager
- **Docker Compose**: Usually included with Docker Engine
- **Permissions**: User must be in `docker` group

### Manual Deployment

1. Copy the environment template:
   ```bash
   cp .env.template .env
   ```

2. Edit `.env` with your server details:
   ```bash
   # Required: Set your server IP or domain
   IP=192.168.1.100
   
   # Optional: Customize ports (defaults shown)
   FRONTEND_PORT=3000
   BACKEND_PORT=5000
   
   # Security: Generate secure values
   JWT_SECRET=your-32-character-hex-secret
   MONGO_ROOT_PASSWORD=your-secure-password
   ADMIN_PASSWORD=your-admin-password
   ```

3. Deploy the application:
   ```bash
   docker-compose up -d --build
   ```

## Configuration Variables

### Core Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `IP` | Server IP address or domain | `localhost` | `192.168.1.100` |
| `BACKEND_PORT` | Backend API port | `5000` | `5000` |
| `FRONTEND_PORT` | Frontend web port | `3000` | `80` |

### Security Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | JWT signing secret | ✅ |
| `MONGO_ROOT_PASSWORD` | MongoDB password | ✅ |
| `ADMIN_PASSWORD` | Default admin password | ✅ |

### Admin User Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_USERNAME` | Admin username | `admin` |
| `ADMIN_EMAIL` | Admin email | `admin@example.com` |

## Deployment Scenarios

### Local Development

```bash
IP=localhost
BACKEND_PORT=5000
FRONTEND_PORT=3000
```

Access at: http://localhost:3000

### Local Network Server

```bash
IP=192.168.1.100
BACKEND_PORT=5000
FRONTEND_PORT=80
```

Access at: http://192.168.1.100

### Production Server

```bash
IP=your-domain.com
BACKEND_PORT=5000
FRONTEND_PORT=443
```

Access at: https://your-domain.com

## Network Architecture

```
[Client Browser] → [Frontend:FRONTEND_PORT] → [Backend:BACKEND_PORT] → [MongoDB:27017]
```

### Port Mapping

- **Frontend**: External `FRONTEND_PORT` → Internal `80`
- **Backend**: External `BACKEND_PORT` → Internal `BACKEND_PORT`
- **MongoDB**: External `27017` → Internal `27017`

## Troubleshooting

### Login Network Error

The most common issue is API connectivity between frontend and backend. This has been fixed by:

1. **Parameterized nginx configuration**: Uses `BACKEND_HOST` and `BACKEND_PORT` variables
2. **Dynamic proxy configuration**: API calls are properly routed to backend
3. **Environment variable substitution**: Runtime configuration based on deployment environment

### Common Solutions

1. **Check container status**:
   ```bash
   docker-compose ps
   ```

2. **View logs**:
   ```bash
   docker-compose logs frontend
   docker-compose logs backend
   ```

3. **Test API connectivity**:
   ```bash
   curl http://YOUR_IP:BACKEND_PORT/api/health
   ```

4. **Restart services**:
   ```bash
   docker-compose restart
   ```

### Configuration Issues

1. **Environment variables not applied**:
   - Stop containers: `docker-compose down`
   - Rebuild images: `docker-compose build --no-cache`
   - Start again: `docker-compose up -d`

2. **Network connectivity issues**:
   - Check firewall settings
   - Verify IP address is correct
   - Ensure ports are not in use by other services

## Security Considerations

### Production Deployment

1. **Change default passwords**:
   - MongoDB root password
   - Admin user password
   - JWT secret

2. **Use HTTPS**:
   - Configure SSL certificates
   - Set `FRONTEND_PORT=443`
   - Update nginx configuration for SSL

3. **Network security**:
   - Use firewall rules
   - Limit database access
   - Enable authentication

### Example Production .env

```bash
# Production Configuration
IP=your-production-domain.com
BACKEND_PORT=5000
FRONTEND_PORT=443

# Secure credentials (use strong passwords!)
JWT_SECRET=your-64-character-hex-string-here
MONGO_ROOT_PASSWORD=your-strong-password-here
ADMIN_PASSWORD=your-admin-password-here

# Admin details
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@yourcompany.com
```

## Migration from Old Setup

If you have an existing deployment with hardcoded IPs:

1. **Backup existing data**:
   ```bash
   docker-compose exec mongodb mongodump --out /data/backup
   ```

2. **Stop old deployment**:
   ```bash
   docker-compose down
   ```

3. **Update configuration**:
   - Use new `.env` file
   - Update any hardcoded references

4. **Deploy new version**:
   ```bash
   ./deploy-nms.sh deploy
   ```

## Support

For issues or questions:

1. Check the logs: `docker-compose logs`
2. Verify configuration: `./deploy-nms.sh status`
3. Test endpoints manually with curl
4. Review this documentation

## Command Reference

### Deployment Script Commands

```bash
./deploy-nms.sh setup    # Setup environment only
./deploy-nms.sh deploy   # Full deployment
./deploy-nms.sh start    # Start services
./deploy-nms.sh stop     # Stop services
./deploy-nms.sh restart  # Restart services
./deploy-nms.sh logs     # Show logs
./deploy-nms.sh status   # Check status
```

### Docker Commands

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs [service-name]

# Stop services
docker-compose down

# Start services
docker-compose up -d

# Rebuild and start
docker-compose up -d --build

# Remove everything (including volumes)
docker-compose down -v --remove-orphans
```