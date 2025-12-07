# NMS Deployment Guide

**Updated**: December 7, 2025  
**Version**: 2.0.0  
**Status**: Production Ready ✅

## Quick Start Options

### 1. Interactive Deployment (Recommended for First-Time)
```bash
cd mern-nms
./deploy.sh
```
Guided setup with prompts for configuration.

### 2. Automated Deployment (Recommended for Production)
```bash
cd mern-nms
cp deploy-config.sh.template production-config.sh
# Edit production-config.sh with your settings
./deploy.sh --config production-config.sh --non-interactive
```

### 3. Quick Non-Interactive (Development Only)
```bash
cd mern-nms
./deploy.sh --non-interactive
```
⚠️ **Warning**: Uses default passwords - NOT secure for production!

## Access Your Application

After deployment:
- **Frontend**: http://your-ip:3000
- **Backend API**: http://your-ip:5000
- **Default Login**: admin / (password from deployment)

## Advanced Deployment Options

For complete automation and production deployment:
📖 **See [DEPLOYMENT-AUTOMATION.md](DEPLOYMENT-AUTOMATION.md)** for:
- Configuration file setup
- Gmail SMTP configuration
- Security best practices
- CI/CD integration
- Troubleshooting guide

## Multi-Device Access

The deployment script automatically detects your network IP and configures CORS for multi-device access. You can:
1. Access from other devices on your network using the detected IP
2. Configure custom CORS settings in your configuration file

## Docker Services
- **Frontend**: React.js app (Port 3000)
- **Backend**: Node.js API (Port 5000) 
- **Database**: MongoDB (Port 27017)

## Quick Commands

```bash
# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop all services
docker compose down

# Check container status
docker compose ps

# Health checks
curl http://localhost:3000/health
curl http://localhost:5000/api/health
```

## Deployment Files

| File | Purpose |
|------|---------|
| `deploy.sh` | Main deployment script |
| `deploy-config.sh.template` | Configuration template |
| `DEPLOYMENT-AUTOMATION.md` | Complete automation guide |
| `.env.template` | Environment variables template |
| `docker-compose.yml` | Docker services configuration |

For complete documentation, see [README.md](README.md).
