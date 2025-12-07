# NMS Deployment Automation Guide

**Updated**: December 7, 2025  
**Version**: 2.0.0  

This guide explains how to use the NMS deployment script for automated, non-interactive deployments suitable for production environments.

## Quick Start

### Option 1: Configuration File (Recommended for Production)

1. **Create your configuration file:**
   ```bash
   cp deploy-config.sh.template my-deployment-config.sh
   ```

2. **Edit the configuration file with your values:**
   ```bash
   # Edit my-deployment-config.sh with your specific settings
   nano my-deployment-config.sh
   ```

3. **Deploy with configuration file:**
   ```bash
   ./deploy.sh --config my-deployment-config.sh --non-interactive
   ```

### Option 2: Environment Variables

Set environment variables and run in non-interactive mode:

```bash
export FRONTEND_PORT=3000
export BACKEND_PORT=5000
export MONGO_ROOT_PASSWORD="your-secure-mongo-password"
export ADMIN_PASSWORD="your-secure-admin-password"
export ADMIN_EMAIL="admin@yourcompany.com"
export SMTP_USER="your-email@gmail.com"
export SMTP_PASSWORD="your-gmail-app-password"
export ENABLE_PERSISTENCE="y"
export MONGO_DATA_DIR="./mongodb-data"

./deploy.sh --non-interactive
```

## Deployment Script Options

```bash
./deploy.sh [OPTIONS]
```

### Available Options:

- `-n, --non-interactive`: Run without prompts using defaults or config values
- `-c, --config FILE`: Load configuration from specified file
- `-p, --preserve-data`: Keep existing MongoDB data (use with caution)
- `-h, --help`: Show help information

### Common Usage Patterns:

```bash
# Interactive mode (default)
./deploy.sh

# Non-interactive with defaults (NOT recommended for production)
./deploy.sh --non-interactive

# Production deployment with config file
./deploy.sh --config production-config.sh --non-interactive

# Update deployment preserving data
./deploy.sh --config production-config.sh --non-interactive --preserve-data

# Development deployment with all origins allowed
./deploy.sh --config dev-config.sh --non-interactive
```

## Configuration File Setup

### 1. Copy the template:
```bash
cp deploy-config.sh.template production-config.sh
```

### 2. Edit configuration values:

```bash
# Network Configuration
FRONTEND_PORT=3000
BACKEND_PORT=5000

# Security Configuration (CHANGE THESE!)
MONGO_ROOT_PASSWORD="your-super-secure-mongo-password-here"
ADMIN_PASSWORD="your-super-secure-admin-password-here"
ADMIN_EMAIL="admin@yourcompany.com"

# Email Service (Gmail recommended)
SMTP_USER="your-deployment-email@gmail.com"
SMTP_PASSWORD="your-gmail-app-password"

# Data Persistence
ENABLE_PERSISTENCE="y"
MONGO_DATA_DIR="./mongodb-data"
```

### 3. Secure your configuration file:
```bash
chmod 600 production-config.sh  # Make readable only by owner
```

## Gmail SMTP Setup

For email verification to work, you need to set up Gmail SMTP:

### 1. Enable 2-Factor Authentication
- Go to Google Account settings
- Enable 2-Factor Authentication

### 2. Generate App Password
- Go to Google Account → Security → 2-Step Verification → App passwords
- Generate an app password for "NMS Application"
- Use this password in `SMTP_PASSWORD`

### 3. Configure Email Settings
```bash
SMTP_USER="your-gmail@gmail.com"
SMTP_PASSWORD="your-16-character-app-password"
```

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `FRONTEND_PORT` | `3000` | Port for web interface |
| `BACKEND_PORT` | `5000` | Port for API server |
| `MONGO_ROOT_PASSWORD` | `mongo123` | MongoDB admin password |
| `ADMIN_PASSWORD` | `admin123` | NMS admin user password |
| `ADMIN_EMAIL` | `admin@example.com` | NMS admin email address |
| `SMTP_USER` | `your-email@gmail.com` | Email service username |
| `SMTP_PASSWORD` | `your-app-password` | Email service password |
| `ENABLE_PERSISTENCE` | `y` | Enable MongoDB data persistence |
| `MONGO_DATA_DIR` | `./mongodb-data` | MongoDB data directory |

## Production Deployment Checklist

### Before Deployment:
- [ ] Server meets requirements (Docker, Docker Compose)
- [ ] Firewall configured for required ports
- [ ] Gmail SMTP credentials ready
- [ ] Strong passwords generated
- [ ] Configuration file created and secured

### During Deployment:
- [ ] Configuration file has correct permissions
- [ ] All passwords are strong and unique
- [ ] SMTP credentials are valid
- [ ] Network ports are available

### After Deployment:
- [ ] Verify all containers are running
- [ ] Test frontend access
- [ ] Test admin login
- [ ] Test email verification
- [ ] Backup deployment_info.txt securely
- [ ] Delete or secure configuration files

## Security Best Practices

1. **Use Strong Passwords:**
   ```bash
   # Generate secure passwords
   openssl rand -base64 32
   ```

2. **Secure Configuration Files:**
   ```bash
   chmod 600 production-config.sh
   ```

3. **Backup Credentials:**
   ```bash
   cp deployment_info.txt secure-location/
   ```

4. **Monitor Logs:**
   ```bash
   docker compose logs -f
   ```

## Troubleshooting

### Common Issues:

1. **Container startup failures:**
   ```bash
   docker compose logs
   docker compose restart
   ```

2. **Port conflicts:**
   ```bash
   netstat -tlnp | grep :3000
   # Change port in configuration if needed
   ```

3. **Email service issues:**
   - Verify Gmail 2FA is enabled
   - Check app password is correct
   - Ensure SMTP_USER is full email address

4. **Database authentication errors:**
   ```bash
   # Clean start (removes existing data)
   ./deploy.sh --config production-config.sh --non-interactive
   
   # Or preserve data but may have auth issues
   ./deploy.sh --config production-config.sh --non-interactive --preserve-data
   ```

## CI/CD Integration

For automated deployments in CI/CD pipelines:

```bash
#!/bin/bash
# ci-deploy.sh

# Set environment variables from CI/CD secrets
export MONGO_ROOT_PASSWORD="$CI_MONGO_PASSWORD"
export ADMIN_PASSWORD="$CI_ADMIN_PASSWORD"
export ADMIN_EMAIL="$CI_ADMIN_EMAIL"
export SMTP_USER="$CI_SMTP_USER"
export SMTP_PASSWORD="$CI_SMTP_PASSWORD"

# Deploy non-interactively
./deploy.sh --non-interactive
```

## Support

If you encounter issues:

1. Check the deployment logs: `docker compose logs`
2. Verify configuration file syntax
3. Ensure all required environment variables are set
4. Check network connectivity and port availability
5. Verify SMTP credentials with Gmail

For development or testing environments, interactive mode provides helpful prompts:
```bash
./deploy.sh  # Interactive mode with guided setup
```