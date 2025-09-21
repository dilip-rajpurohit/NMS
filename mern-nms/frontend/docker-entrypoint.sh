#!/bin/sh

# Set default values for environment variables
# For Docker internal communication, use container name instead of external IP
export BACKEND_HOST=${BACKEND_HOST:-backend}
export BACKEND_PORT=${BACKEND_PORT:-5000}
export FRONTEND_PORT=${FRONTEND_PORT:-80}

echo "=== Docker Entrypoint ==="
echo "BACKEND_HOST: $BACKEND_HOST"
echo "BACKEND_PORT: $BACKEND_PORT"
echo "FRONTEND_PORT: $FRONTEND_PORT"
echo "=========================="

envsubst '$BACKEND_HOST,$BACKEND_PORT,$FRONTEND_PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Nginx configuration updated with environment variables"

# Test nginx configuration
nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx configuration is valid"
    # Start nginx
    exec nginx -g 'daemon off;'
else
    echo "Nginx configuration test failed"
    cat /etc/nginx/conf.d/default.conf
    exit 1
fi