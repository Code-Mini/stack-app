# Data Models

**Version:** 1.1
**Document:** Data Models for Stack App API

---

## Table of Contents

1. [Overview](#overview)
2. [Stack Object](#stack-object)
3. [Service Object](#service-object)
4. [Container Configuration](#container-configuration)
5. [Stack Route Object](#stack-route-object)
6. [SSL Configuration](#ssl-configuration)
7. [Status Objects](#status-objects)
8. [Error Response Model](#error-response-model)

---

## Overview

All data models are represented in JSON format for API requests and responses. This document describes the structure, types, and constraints for each model.

**Notation:**
- `required` - Field must be present in request
- `optional` - Field may be omitted
- `read-only` - Field is returned in responses but not accepted in requests
- `default: value` - Default value if field is omitted

---

## Stack Object

Represents a collection of services and routes managed as a single unit.

### Schema

```yaml
Stack:
  properties:
    id:
      type: string
      required: true
      maxLength: 31
      pattern: '^[a-z0-9]+(-[a-z0-9]+)*$'
      description: "Unique stack identifier"
      example: "web-app"

    name:
      type: string
      read-only: true
      description: "Display name (same as id)"
      example: "web-app"

    services:
      type: array
      items: { $ref: '#/Service' }
      optional: true
      default: []
      description: "Array of service configurations"

    routes:
      type: array
      items: { $ref: '#/StackRoute' }
      optional: true
      default: []
      description: "Array of routing configurations"

    createdAt:
      type: string
      format: date-time
      read-only: true
      description: "ISO 8601 timestamp of creation"
      example: "2025-10-02T10:00:00.000Z"

    updatedAt:
      type: string
      format: date-time
      read-only: true
      description: "ISO 8601 timestamp of last update"
      example: "2025-10-02T11:30:00.000Z"
```

### JSON Example

```json
{
  "id": "web-app",
  "name": "web-app",
  "services": [
    {
      "id": "frontend",
      "image": "nginx:alpine",
      "containerConfig": {
        "ports": [
          {
            "name": "http",
            "containerPort": 80
          }
        ],
        "environment": {
          "NODE_ENV": "production"
        }
      }
    }
  ],
  "routes": [
    {
      "name": "production",
      "serviceId": "frontend",
      "domains": ["example.com"],
      "port": 80,
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt"
      },
      "priority": 100
    }
  ],
  "createdAt": "2025-10-02T10:00:00.000Z",
  "updatedAt": "2025-10-02T10:00:00.000Z"
}
```

### Notes

- **Empty Services Array:** Valid for external proxy-only stacks (routes without containers)
- **Empty Routes Array:** Valid for stacks that don't need reverse proxy routing
- **Update Behavior:** PUT requests replace services and routes arrays completely

---

## Service Object

Represents a Docker container within a stack.

### Schema

```yaml
Service:
  properties:
    id:
      type: string
      required: true
      maxLength: 31
      pattern: '^[a-z0-9]+(-[a-z0-9]+)*$'
      description: "Service identifier (unique within stack)"
      example: "frontend"

    name:
      type: string
      read-only: true
      description: "Display name (same as id)"
      example: "frontend"

    image:
      type: string
      required: true
      description: "Docker image reference"
      example: "nginx:alpine"

    status:
      type: string
      read-only: true
      enum: [running, stopped, starting, stopping, restarting, error, created, exited]
      description: "Current container status"
      example: "running"

    containerId:
      type: string
      read-only: true
      description: "Docker container ID (when running)"
      example: "abc123def456..."

    containerConfig:
      $ref: '#/ContainerConfiguration'
      required: true
      description: "Container runtime configuration"

    logs:
      type: string
      format: uri
      read-only: true
      description: "URL to service logs endpoint"
      example: "/api/v1/stacks/web-app/services/frontend/logs"

    details:
      type: string
      format: uri
      read-only: true
      description: "URL to service details endpoint"
      example: "/api/v1/stacks/web-app/services/frontend"
```

### JSON Example

```json
{
  "id": "frontend",
  "name": "frontend",
  "image": "nginx:alpine",
  "status": "running",
  "containerId": "abc123def456789",
  "containerConfig": {
    "ports": [
      {
        "name": "http",
        "containerPort": 80,
        "protocol": "tcp"
      }
    ],
    "environment": {
      "NODE_ENV": "production",
      "API_URL": "https://api.example.com"
    },
    "volumes": [],
    "networks": ["traefik-proxy"],
    "restartPolicy": "unless-stopped"
  },
  "logs": "/api/v1/stacks/web-app/services/frontend/logs",
  "details": "/api/v1/stacks/web-app/services/frontend"
}
```

### Container Naming

Docker containers are named: `{stack-id}-{service-id}`

**Example:**
- Stack ID: `web-app`
- Service ID: `frontend`
- Container Name: `web-app-frontend`

**Constraint:** Combined name must be ≤ 63 characters

---

## Container Configuration

Detailed configuration for Docker container runtime.

### Schema

```yaml
ContainerConfiguration:
  properties:
    ports:
      type: array
      items:
        type: object
        properties:
          name:
            type: string
            optional: true
            description: "Port identifier"
            example: "http"

          containerPort:
            type: integer
            required: true
            minimum: 1
            maximum: 65535
            description: "Port inside container"
            example: 80

          hostPort:
            type: integer
            optional: true
            minimum: 1
            maximum: 65535
            description: "Port on host (omit for internal-only)"
            example: 8080

          protocol:
            type: string
            optional: true
            enum: [tcp, udp, sctp]
            default: tcp
            description: "Port protocol"

      description: "Port bindings for container"
      default: []

    environment:
      type: object
      additionalProperties: { type: string }
      optional: true
      description: "Environment variables as key-value pairs"
      default: {}
      example:
        NODE_ENV: "production"
        API_URL: "https://api.example.com"

    volumes:
      type: array
      items:
        type: object
        properties:
          name:
            type: string
            optional: true
            description: "Volume identifier"

          type:
            type: string
            required: true
            enum: [volume, bind, tmpfs]
            description: "Volume mount type"

          source:
            type: string
            required: true
            description: "Volume name or host path"
            example: "my-app-data"

          target:
            type: string
            required: true
            description: "Container mount path"
            example: "/data"

          readOnly:
            type: boolean
            optional: true
            default: false
            description: "Mount as read-only"

      description: "Volume mounts for container"
      default: []

    command:
      type: array
      items: { type: string }
      optional: true
      description: "Override container CMD"
      example: ["npm", "start"]

    entrypoint:
      type: array
      items: { type: string }
      optional: true
      description: "Override container ENTRYPOINT"
      example: ["/bin/sh", "-c"]

    workingDir:
      type: string
      optional: true
      description: "Working directory in container"
      example: "/app"

    user:
      type: string
      optional: true
      description: "User to run container as"
      example: "node"

    networks:
      type: array
      items: { type: string }
      optional: true
      description: "Docker networks to connect to"
      default: ["traefik-proxy"]
      example: ["traefik-proxy", "backend"]

    restartPolicy:
      type: string
      optional: true
      enum: [no, always, on-failure, unless-stopped]
      default: unless-stopped
      description: "Container restart policy"

    healthCheck:
      type: object
      optional: true
      properties:
        test:
          type: array
          items: { type: string }
          description: "Health check command"
          example: ["CMD", "curl", "-f", "http://localhost/health"]

        interval:
          type: string
          description: "Time between checks"
          example: "30s"

        timeout:
          type: string
          description: "Check timeout"
          example: "10s"

        retries:
          type: integer
          description: "Consecutive failures before unhealthy"
          example: 3

        startPeriod:
          type: string
          description: "Initialization time before checks start"
          example: "40s"

    labels:
      type: object
      additionalProperties: { type: string }
      optional: true
      description: "Custom container labels"
      example:
        com.example.app: "web-app"

    resources:
      type: object
      optional: true
      properties:
        limits:
          type: object
          properties:
            cpus:
              type: string
              description: "CPU limit (e.g., '1.0', '0.5')"
              example: "1.0"

            memory:
              type: string
              description: "Memory limit (e.g., '512M', '2G')"
              example: "512M"

        reservations:
          type: object
          properties:
            cpus:
              type: string
              description: "CPU reservation"

            memory:
              type: string
              description: "Memory reservation"
```

### JSON Example

```json
{
  "ports": [
    {
      "name": "http",
      "containerPort": 80,
      "hostPort": null,
      "protocol": "tcp"
    }
  ],
  "environment": {
    "NODE_ENV": "production",
    "API_URL": "https://api.example.com",
    "PORT": "80"
  },
  "volumes": [
    {
      "name": "app-data",
      "type": "volume",
      "source": "web-app-data",
      "target": "/data",
      "readOnly": false
    },
    {
      "type": "bind",
      "source": "/host/config",
      "target": "/etc/app/config",
      "readOnly": true
    }
  ],
  "command": ["npm", "start"],
  "workingDir": "/app",
  "user": "node",
  "networks": ["traefik-proxy"],
  "restartPolicy": "unless-stopped",
  "healthCheck": {
    "test": ["CMD", "curl", "-f", "http://localhost/health"],
    "interval": "30s",
    "timeout": "10s",
    "retries": 3,
    "startPeriod": "40s"
  },
  "labels": {
    "com.example.version": "1.0.0",
    "com.example.environment": "production"
  },
  "resources": {
    "limits": {
      "cpus": "1.0",
      "memory": "512M"
    }
  }
}
```

---

## Stack Route Object

Routing configuration for services or external targets.

### Schema

```yaml
StackRoute:
  properties:
    name:
      type: string
      required: true
      pattern: '^[a-z0-9]+(-[a-z0-9]+)*$'
      description: "Route identifier (unique within stack)"
      example: "production"

    serviceId:
      type: string
      optional: true
      description: "Service ID for container routes (XOR with externalTarget)"
      example: "frontend"

    externalTarget:
      type: string
      optional: true
      description: "External URL for proxy routes (XOR with serviceId)"
      example: "http://localhost:8080"

    domains:
      type: array
      items: { type: string }
      required: true
      minItems: 1
      description: "Domain names for routing"
      example: ["example.com", "www.example.com"]

    pathPrefix:
      type: string
      optional: true
      pattern: '^/[a-z0-9\-/]*$'
      description: "URL path prefix"
      example: "/api"

    port:
      type: integer
      optional: true
      minimum: 1
      maximum: 65535
      description: "Container port (required for serviceId routes)"
      example: 80

    ssl:
      $ref: '#/SSLConfiguration'
      optional: true
      description: "SSL/TLS configuration"

    redirectToHttps:
      type: boolean
      optional: true
      default: true
      description: "Redirect HTTP to HTTPS when SSL enabled"

    stripPrefix:
      type: boolean
      optional: true
      default: false
      description: "Remove pathPrefix before forwarding"

    headers:
      type: object
      additionalProperties: { type: string }
      optional: true
      description: "Custom HTTP headers to add"
      example:
        X-Frame-Options: "DENY"
        X-Custom-Header: "value"

    middleware:
      type: array
      items: { type: string }
      optional: true
      description: "Traefik middleware names"
      example: ["auth", "compress"]

    healthCheck:
      type: object
      optional: true
      properties:
        enabled:
          type: boolean
          default: false

        path:
          type: string
          description: "Health check endpoint path"
          example: "/health"

        interval:
          type: string
          description: "Check interval"
          example: "30s"

        timeout:
          type: string
          description: "Check timeout"
          example: "5s"

    priority:
      type: integer
      optional: true
      default: 0
      description: "Router priority (higher = evaluated first)"
      example: 100

Note: Either serviceId OR externalTarget must be specified, but not both.
```

### JSON Examples

#### Service Route (Container)

```json
{
  "name": "production",
  "serviceId": "frontend",
  "externalTarget": null,
  "domains": ["example.com", "www.example.com"],
  "pathPrefix": null,
  "port": 80,
  "ssl": {
    "enabled": true,
    "provider": "letsencrypt",
    "email": "admin@example.com",
    "challengeType": "http"
  },
  "redirectToHttps": true,
  "stripPrefix": false,
  "headers": {
    "X-Frame-Options": "DENY"
  },
  "priority": 100
}
```

#### External Route (Proxy)

```json
{
  "name": "legacy-api",
  "serviceId": null,
  "externalTarget": "http://localhost:8080",
  "domains": ["legacy.example.com"],
  "pathPrefix": "/api",
  "ssl": {
    "enabled": true,
    "provider": "letsencrypt"
  },
  "redirectToHttps": true,
  "stripPrefix": true,
  "priority": 50
}
```

---

## SSL Configuration

SSL/TLS certificate configuration for routes.

### Schema

```yaml
SSLConfiguration:
  properties:
    enabled:
      type: boolean
      optional: true
      default: false
      description: "Enable SSL/TLS for this route"

    provider:
      type: string
      optional: true
      enum: [letsencrypt, letsencrypt-staging, custom]
      default: letsencrypt
      description: "Certificate provider/resolver"

    certResolver:
      type: string
      optional: true
      description: "Custom Traefik cert resolver name (overrides provider)"
      example: "cloudflare-dns"

    domains:
      type: array
      items: { type: string }
      optional: true
      description: "Domains for certificate (defaults to route domains)"

    email:
      type: string
      format: email
      optional: true
      description: "Email for Let's Encrypt notifications"
      example: "admin@example.com"

    challengeType:
      type: string
      optional: true
      enum: [http, tlsalpn, dns]
      default: http
      description: "ACME challenge type"

    dnsProvider:
      type: string
      optional: true
      description: "DNS provider for DNS-01 challenge"
      example: "cloudflare"

    customCert:
      type: object
      optional: true
      description: "Custom certificate (when provider is 'custom')"
      properties:
        certFile:
          type: string
          description: "Path to certificate file"
          example: "/certs/example.com.crt"

        keyFile:
          type: string
          description: "Path to private key file"
          example: "/certs/example.com.key"
```

### JSON Examples

#### Let's Encrypt (HTTP-01)

```json
{
  "enabled": true,
  "provider": "letsencrypt",
  "email": "admin@example.com",
  "challengeType": "http"
}
```

#### Let's Encrypt (DNS-01 for Wildcard)

```json
{
  "enabled": true,
  "provider": "letsencrypt",
  "email": "admin@example.com",
  "challengeType": "dns",
  "dnsProvider": "cloudflare"
}
```

#### Custom Certificate

```json
{
  "enabled": true,
  "provider": "custom",
  "customCert": {
    "certFile": "/etc/ssl/certs/example.com.crt",
    "keyFile": "/etc/ssl/private/example.com.key"
  }
}
```

---

## Status Objects

### Stack Status Response

```yaml
StackStatus:
  properties:
    stackId:
      type: string
      example: "web-app"

    overallStatus:
      type: string
      enum: [running, stopped, partial, error]
      description: "Aggregated status of all services"

    services:
      type: array
      items:
        type: object
        properties:
          id: { type: string }
          status: { type: string }
          containerId: { type: string }
          uptime: { type: string }
          restartCount: { type: integer }
```

**Example:**

```json
{
  "stackId": "web-app",
  "overallStatus": "running",
  "services": [
    {
      "id": "frontend",
      "status": "running",
      "containerId": "abc123def456",
      "uptime": "2h 15m",
      "restartCount": 0
    }
  ]
}
```

---

## Error Response Model

### Schema

```yaml
ErrorResponse:
  properties:
    error:
      type: string
      description: "Machine-readable error code"
      example: "STACK_NOT_FOUND"

    message:
      type: string
      description: "Human-readable error message"
      example: "Stack 'web-app' not found"

    details:
      type: object
      optional: true
      description: "Additional context about the error"
```

### Examples

```json
{
  "error": "INVALID_STACK_NAME",
  "message": "Stack ID must be 1-31 lowercase alphanumeric characters",
  "details": {
    "field": "id",
    "value": "Web-App",
    "reason": "Contains uppercase characters"
  }
}
```

```json
{
  "error": "ROUTE_CONFLICT",
  "message": "Domain and path prefix combination already in use",
  "details": {
    "domain": "example.com",
    "pathPrefix": "/api",
    "existingRoute": "api-route",
    "existingStack": "web-app"
  }
}
```

---

## Notes

### XOR Constraints

**StackRoute:**
- Either `serviceId` OR `externalTarget` must be specified
- Both cannot be present simultaneously
- Neither can be null/omitted simultaneously

### Default Values

Fields with default values can be omitted in requests. The API will apply defaults automatically.

### Read-Only Fields

Fields marked as read-only are:
- Ignored in POST/PUT requests
- Automatically generated by the system
- Included in GET responses

### Timestamps

All timestamps use ISO 8601 format with UTC timezone:
- Format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Example: `2025-10-02T10:30:00.000Z`
