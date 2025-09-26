# Backend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --omit=dev || npm install --omit=dev

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the working directory
RUN chown -R nodejs:nodejs /usr/src/app
USER nodejs

# Expose port
EXPOSE ${BACKEND_PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const port = process.env.BACKEND_PORT; \
    const serverIP = process.env.IP; \
    http.get(\`http://\${serverIP}:\${port}/api/health\`, (res) => { \
      if (res.statusCode === 200) process.exit(0); \
      else process.exit(1); \
    }).on('error', () => process.exit(1));"

# Start the application
CMD ["npm", "start"]