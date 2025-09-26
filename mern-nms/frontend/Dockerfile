# Frontend Dockerfile
FROM node:18-alpine as build

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build arguments for environment variables
ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL
ARG REACT_APP_ENV=production

# Set environment variables during build
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_WS_URL=${REACT_APP_WS_URL}
ENV REACT_APP_ENV=${REACT_APP_ENV}
ENV GENERATE_SOURCEMAP=false

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built application and nginx config template
COPY --from=build /usr/src/app/build /usr/share/nginx/html
COPY default.conf.template /etc/nginx/conf.d/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh

# Fix line endings and make entrypoint script executable (Windows compatibility)
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://${SERVER_IP}:${FRONTEND_INTERNAL_PORT}/health || exit 1

# Use custom entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]