# Dockerfile for Stack App
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S stackapp && \
    adduser -S stackapp -u 1001 -G stackapp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies to avoid conflicts)
RUN npm ci && npm cache clean --force

# Copy application code
COPY bin/ ./bin/
COPY lib/ ./lib/

# Create directories and set permissions
RUN mkdir -p /var/lib/stack-app /etc/stack-app && \
    chown -R stackapp:stackapp /app /var/lib/stack-app /etc/stack-app

# Switch to non-root user
USER stackapp

# Expose port
EXPOSE 3001

# Health check using Node.js instead of curl
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "const http=require('http'); http.get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Set environment variables
ENV NODE_ENV=production
ENV STACK_APP_CONFIG=/etc/stack-app/config.yaml

# Start application
CMD ["./bin/stack-app"]