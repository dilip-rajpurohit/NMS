#!/bin/bash

# NMS Easy Deployment Script
# This script helps you deploy the NMS application easily

# Windows/Git Bash compatibility
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    WINPTY_PREFIX="winpty "
else
    WINPTY_PREFIX=""
fi

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Non-interactive mode flag
NON_INTERACTIVE=false
PRESERVE_DATA=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --non-interactive|-n)
            NON_INTERACTIVE=true
            shift
            ;;
        --preserve-data|-p)
            PRESERVE_DATA=true
            shift
            ;;
        --help|-h)
            # Help will be handled later in main function
            break
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Initialize print functions after parsing
if [[ "$NON_INTERACTIVE" == "true" ]]; then
    print_info() {
        echo -e "${BLUE}ℹ️  $1${NC}"
    }
    print_info "Running in non-interactive mode with default values"
fi

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${BLUE}"
    echo "======================================"
    echo "    NMS Easy Deployment Script"
    echo "======================================"
    echo -e "${NC}"
}

# Show usage information
show_usage() {
    echo "NMS Easy Deployment Script"
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -n, --non-interactive    Run in non-interactive mode with default values"
    echo "  -p, --preserve-data      Preserve existing MongoDB data (may cause auth issues)"
    echo "  -h, --help              Show this help message"
    echo
    echo "Examples:"
    echo "  $0                      Run in interactive mode (prompts for passwords and email)"
    echo "  $0 --non-interactive    Run with auto-generated passwords and default email"
    echo "  $0 --preserve-data      Keep existing database data (use with caution)"
    echo "  $0 -n -p               Non-interactive mode with data preservation"
    echo
    echo "Note: By default, MongoDB volumes are cleaned to prevent authentication conflicts."
    echo "      Use --preserve-data only if you want to keep existing database content."
    echo
}

# Check for help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    show_usage
    exit 0
fi

# Check if docker and docker-compose are installed
check_dependencies() {
    print_info "Checking dependencies..."
    
    # Check Docker installation and accessibility
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
            print_info "For Windows: Download Docker Desktop from https://www.docker.com/products/docker-desktop"
        fi
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! ${WINPTY_PREFIX}docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker first."
        if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
            print_info "For Windows: Start Docker Desktop application"
        fi
        exit 1
    fi
    
    # Check Docker Compose
    if ! ${WINPTY_PREFIX}docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

# Get server IP automatically with better network detection
get_server_ip() {
    # Try to get the primary network interface IP
    local primary_ip=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || echo "")
    
    if [[ -z "$primary_ip" ]]; then
        # Fallback: try hostname -I
        primary_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")
    fi
    
    if [[ -z "$primary_ip" ]]; then
        # Final fallback - force user to provide IP
        primary_ip=""
    fi
    
    echo "$primary_ip"
}

# Show available network interfaces
show_network_interfaces() {
    print_info "Available network interfaces:"
    echo
    
    # Get all network interfaces with IPs
    local interfaces=$(ip addr show | grep -E "inet [0-9]" | grep -v "127.0.0.1" | awk '{print $2}' | cut -d'/' -f1)
    local count=1
    
    echo "0) localhost (local access only)"
    
    for interface_ip in $interfaces; do
        local interface_name=$(ip addr show | grep -B2 "inet $interface_ip" | grep "^[0-9]" | awk '{print $2}' | cut -d':' -f1)
        echo "$count) $interface_ip ($interface_name - for network access)"
        ((count++))
    done
    
    echo
}

# Create .env file from template
create_env_file() {
    print_info "Setting up environment configuration..."
    
    if [[ -f ".env" ]]; then
        print_warning ".env file already exists. Creating backup..."
        cp .env save_env_backups/.env.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    if [[ ! -f ".env.template" ]]; then
        print_error ".env.template file not found. Please make sure you're in the correct directory."
        exit 1
    fi
    
    # Get server IP
    local detected_ip=$(get_server_ip)
    
    echo
    print_info "Setting up deployment configuration..."
    echo
    
    # Ask for IP address
    if [[ "$NON_INTERACTIVE" == "true" ]]; then
        local server_ip=$detected_ip
        allow_all_origins="true"
        print_info "Using detected IP address: $server_ip"
        print_info "CORS set to allow all origins for network access"
    else
        print_info "Network Configuration for Multi-Device Access:"
        echo
        show_network_interfaces
        
        echo "For access from other devices on the network, choose a network IP (not localhost)."
        echo "Localhost (127.0.0.1) will only allow access from this machine."
        echo
        echo -n "Enter server IP address or domain name (detected: $detected_ip) [press Enter to use detected]: "
        read user_ip
        local server_ip=${user_ip:-$detected_ip}
        
        # Ask if user wants to allow all CORS origins for easier development
        echo
        echo "CORS Configuration:"
        echo "For easier development/testing, you can allow connections from any IP address."
        echo "This is less secure but convenient for development environments."
        echo -n "Allow connections from any IP address? (y/N): "
        read allow_all_cors
        
        if [[ "$allow_all_cors" =~ ^[Yy]$ ]]; then
            allow_all_origins="true"
            print_warning "CORS set to allow all origins - suitable for development only!"
        else
            allow_all_origins="false"
            print_info "CORS restricted to specific origins for security"
        fi
    fi
    
    # Ask for ports
    if [[ "$NON_INTERACTIVE" == "true" ]]; then
        frontend_port=3000
        backend_port=5000
        print_info "Using default ports - Frontend: $frontend_port, Backend: $backend_port"
    else
        echo -n "Enter frontend port (default: 3000): "
        read frontend_port
        frontend_port=${frontend_port:-3000}
        
        echo -n "Enter backend port (default: 5000): "
        read backend_port
        backend_port=${backend_port:-5000}
    fi
    
    # Generate secure JWT secret
    local jwt_secret=$(openssl rand -hex 32 2>/dev/null || echo "$(date +%s | sha256sum | head -c 64)")
    
    # Ask for passwords and email instead of generating them
    if [[ "$NON_INTERACTIVE" == "true" ]]; then
        local mongo_password="mongo123"
        local admin_password="admin123"
        local admin_email="admin@example.com"
        print_warning "Using default credentials in non-interactive mode:"
        print_warning "  MongoDB Password: mongo123"
        print_warning "  Admin Password: admin123"
        print_warning "  Admin Email: admin@example.com"
        print_warning "  Please change these after deployment!"
    else
        echo
        print_info "Setting up credentials..."
        echo -n "Enter MongoDB root password: "
        read -s mongo_password
        echo
        while [[ -z "$mongo_password" ]]; do
            echo -n "MongoDB password cannot be empty. Please enter MongoDB root password: "
            read -s mongo_password
            echo
        done
        
        echo -n "Enter admin user password: "
        read -s admin_password
        echo
        while [[ -z "$admin_password" ]]; do
            echo -n "Admin password cannot be empty. Please enter admin user password: "
            read -s admin_password
            echo
        done
        
        echo -n "Enter admin email address: "
        read admin_email
        while [[ -z "$admin_email" ]]; do
            echo -n "Email cannot be empty. Please enter admin email address: "
            read admin_email
        done
    fi
    
    # Create .env file
    cp .env.template .env
    
    # Replace values in .env file
    sed -i "s/IP=localhost/IP=$server_ip/g" .env
    sed -i "s/IP=AUTO_DETECT/IP=$server_ip/g" .env
    sed -i "s/FRONTEND_PORT=3000/FRONTEND_PORT=$frontend_port/g" .env
    sed -i "s/BACKEND_PORT=5000/BACKEND_PORT=$backend_port/g" .env
    sed -i "s/MONGO_PORT=27017/MONGO_PORT=${mongo_port:-27017}/g" .env
    sed -i "s/JWT_SECRET=your-secure-jwt-secret-here-change-this-for-production/JWT_SECRET=$jwt_secret/g" .env
    sed -i "s/MONGO_ROOT_PASSWORD=mongo123/MONGO_ROOT_PASSWORD=$mongo_password/g" .env
    sed -i "s/ADMIN_PASSWORD=admin123/ADMIN_PASSWORD=$admin_password/g" .env
    sed -i "s/ADMIN_EMAIL=admin@example.com/ADMIN_EMAIL=$admin_email/g" .env
    sed -i "s/ALLOW_ALL_ORIGINS=false/ALLOW_ALL_ORIGINS=${allow_all_origins:-false}/g" .env
    
    print_success "Environment file created successfully"
    
    echo
    print_info "=== DEPLOYMENT CONFIGURATION ==="
    echo "Server IP/Domain: $server_ip"
    echo "Frontend URL: http://$server_ip:$frontend_port"
    echo "Backend API: http://$server_ip:$backend_port"
    echo "Admin Username: admin"
    echo "Admin Password: $admin_password"
    echo "=================================="
    echo
    
    # Save credentials to a file
    cat > deployment_info.txt << EOF
NMS Deployment Information
=========================
Deployment Date: $(date)
Server IP/Domain: $server_ip
Frontend URL: http://$server_ip:$frontend_port
Backend API: http://$server_ip:$backend_port

Admin Credentials:
- Username: admin
- Password: $admin_password
- Email: $admin_email

MongoDB Credentials:
- Username: admin
- Password: $mongo_password

Security:
- JWT Secret: $jwt_secret

IMPORTANT: Keep this file secure and delete it after noting the credentials!
EOF
    
    print_success "Deployment info saved to 'deployment_info.txt'"
}

# Deploy the application
deploy_application() {
    print_info "Deploying NMS application..."
    
    # Stop any existing containers
    print_info "Stopping existing containers..."
    ${WINPTY_PREFIX}docker compose down 2>/dev/null || ${WINPTY_PREFIX}docker-compose down 2>/dev/null || true
    
    # Remove existing MongoDB volume to prevent authentication conflicts
    if [[ "$PRESERVE_DATA" == "true" ]]; then
        print_warning "Preserving existing MongoDB data as requested"
        print_warning "Note: This may cause authentication issues if credentials have changed"
    else
        print_info "Cleaning up existing MongoDB data to prevent credential conflicts..."
        if ${WINPTY_PREFIX}docker volume ls | grep -q "mern-nms_mongodb_data"; then
            print_warning "Removing existing MongoDB volume to ensure clean database initialization..."
            ${WINPTY_PREFIX}docker volume rm mern-nms_mongodb_data 2>/dev/null || true
            print_success "MongoDB volume cleaned up successfully"
        else
            print_info "No existing MongoDB volume found"
        fi
    fi
    
    # Build and start services
    print_info "Building and starting services..."
    if ${WINPTY_PREFIX}docker compose version &> /dev/null; then
        ${WINPTY_PREFIX}docker compose up -d --build --force-recreate
        # Wait and check if containers are running
        sleep 5
        print_info "Checking container status..."
        if ! ${WINPTY_PREFIX}docker compose ps | grep -q "Up"; then
            print_warning "Some containers may not have started properly. Attempting restart..."
            ${WINPTY_PREFIX}docker compose restart
            sleep 10
        fi
    elif command -v docker-compose &> /dev/null; then
        ${WINPTY_PREFIX}docker-compose up -d --build --force-recreate
        # Wait and check if containers are running
        sleep 5
        print_info "Checking container status..."
        if ! ${WINPTY_PREFIX}docker-compose ps | grep -q "Up"; then
            print_warning "Some containers may not have started properly. Attempting restart..."
            ${WINPTY_PREFIX}docker-compose restart
            sleep 10
        fi
    else
        print_error "Neither docker-compose nor docker compose found!"
        exit 1
    fi
    
    # Final check for container health
    local retry_count=0
    local max_retries=3
    while [[ $retry_count -lt $max_retries ]]; do
        if ${WINPTY_PREFIX}docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(nms-backend|nms-frontend|nms-mongodb)" | grep -q "Up"; then
            print_success "Application deployed successfully!"
            return 0
        else
            print_warning "Containers not fully started yet. Retry $((retry_count + 1))/$max_retries..."
            sleep 10
            ((retry_count++))
        fi
    done
    
    print_error "Some containers failed to start properly. Check logs with: ${WINPTY_PREFIX}docker compose logs"
}

# Check application health
check_health() {
    print_info "Checking application health..."
    
    local server_ip=$(grep "IP=" .env | cut -d'=' -f2)
    local frontend_port=$(grep "FRONTEND_PORT=" .env | cut -d'=' -f2)
    local backend_port=$(grep "BACKEND_PORT=" .env | cut -d'=' -f2)
    
    # Wait a bit for services to start
    sleep 10
    
    # Check backend health
    if curl -f "http://$server_ip:$backend_port/api/health" >/dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_warning "Backend health check failed (this is normal if still starting up)"
    fi
    
    # Check frontend
    if curl -f "http://$server_ip:$frontend_port/health" >/dev/null 2>&1; then
        print_success "Frontend is healthy"
    else
        print_warning "Frontend health check failed (this is normal if still starting up)"
    fi
    
    echo
    echo
    echo
    print_success "=== DEPLOYMENT COMPLETE ==="
    echo
    print_info "Access your NMS application at:"
    echo "  🌐 Frontend: http://$server_ip:$frontend_port"
    echo "  🔧 Backend API: http://$server_ip:$backend_port/api"
    echo
    print_info "Admin login credentials:"
    echo "  👤 Username: admin"
    echo "  🔑 Password: $(grep "ADMIN_PASSWORD=" .env | cut -d'=' -f2)"
    echo
    print_info "Useful commands:"
    echo "  📊 View logs: ${WINPTY_PREFIX}docker compose logs -f"
    echo "  🔄 Restart: ${WINPTY_PREFIX}docker compose restart"
    echo "  🛑 Stop: ${WINPTY_PREFIX}docker compose down"
    echo
}

# Main execution
main() {
    # Check for help flag
    if [[ "$1" == "--help" || "$1" == "-h" ]]; then
        echo "NMS Easy Deployment Script"
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  -n, --non-interactive    Run in non-interactive mode with default values"
        echo "  -h, --help              Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                      # Interactive mode"
        echo "  $0 -n                   # Non-interactive mode"
        exit 0
    fi
    
    print_header
    
    check_dependencies
    create_env_file
    deploy_application
    check_health
    
    echo
    print_success "NMS deployment completed successfully! 🎉"
    print_warning "Please secure the 'deployment_info.txt' file and consider deleting it after noting the credentials."
}

# Run the script
main "$@"