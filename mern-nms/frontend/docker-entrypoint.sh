#!/bin/sh

# Set default values for environment variables
# For Docker internal communication, use container name instead of external IP
export BACKEND_HOST=${BACKEND_HOST:-backend}
export BACKEND_PORT=${BACKEND_PORT}
export FRONTEND_PORT=${FRONTEND_PORT:-80}
export SERVER_IP=${SERVER_IP:-${IP:-192.168.137.233}}

echo "=== Docker Entrypoint ==="
echo "BACKEND_HOST: $BACKEND_HOST"
echo "BACKEND_PORT: $BACKEND_PORT"
echo "FRONTEND_PORT: $FRONTEND_PORT"
echo "SERVER_IP: $SERVER_IP"
echo "=========================="

# Perform simple variable substitution without envsubst
TEMPLATE=/etc/nginx/conf.d/default.conf.template
OUTPUT=/etc/nginx/conf.d/default.conf

sed \
  -e "s|\${BACKEND_HOST}|$BACKEND_HOST|g" \
  -e "s|\${BACKEND_PORT}|$BACKEND_PORT|g" \
  -e "s|\${FRONTEND_PORT}|$FRONTEND_PORT|g" \
  -e "s|\${SERVER_IP}|$SERVER_IP|g" \
  "$TEMPLATE" > "$OUTPUT"

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