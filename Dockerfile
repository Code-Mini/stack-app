# Dockerfile for Stack App
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S stackapp && \
    adduser -S stackapp -u 1001 -G stackapp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY bin/ ./bin/
COPY lib/ ./lib/

# Create directories and set permissions
RUN mkdir -p /var/lib/stack-app /etc/stack-app && \
    chown -R stackapp:stackapp /app /var/lib/stack-app /etc/stack-app

# Install curl for health checks (wget replacement)
RUN apk add --no-cache curl

# Switch to non-root user
USER stackapp

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV STACK_APP_CONFIG=/etc/stack-app/config.yaml

# Start application
CMD ["node", "./bin/stack-app"]