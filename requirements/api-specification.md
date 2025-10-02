# API Specification

**Version:** 1.1
**Document:** API Specification for Stack App

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Stack Management Endpoints](#stack-management-endpoints)
4. [Stack Lifecycle Endpoints](#stack-lifecycle-endpoints)
5. [Service Management Endpoints](#service-management-endpoints)
6. [Proxy Management Endpoints](#proxy-management-endpoints)
7. [Health & Monitoring Endpoints](#health--monitoring-endpoints)
8. [Error Responses](#error-responses)
9. [Response Examples](#response-examples)

---

## Overview

All API endpoints are served under the `/api/v1` base path.

**Base URL:** `http://your-server:3001/api/v1`

**Content Type:** `application/json`

**Authentication:** API key via `X-API-Key` header (except `/health` endpoint)

---

## Authentication

All endpoints (except `/health`) require authentication via API key header.

**Header:**
```
X-API-Key: your-api-key-here
```

**Unauthenticated Response (401):**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Valid API key required"
}
```

---

## Stack Management Endpoints

### GET /api/v1/stacks

List all stacks.

**Request:**
```
GET /api/v1/stacks
X-API-Key: your-api-key
```

**Response (200):**
```json
{
  "stacks": [
    {
      "id": "web-app",
      "name": "web-app",
      "serviceCount": 3,
      "routeCount": 2,
      "status": "running",
      "createdAt": "2025-10-02T10:00:00.000Z",
      "updatedAt": "2025-10-02T10:00:00.000Z",
      "details": "/api/v1/stacks/web-app"
    }
  ]
}
```

---

### GET /api/v1/stacks/{stackId}

Get detailed information about a specific stack.

**Request:**
```
GET /api/v1/stacks/web-app
X-API-Key: your-api-key
```

**Response (200):**
```json
{
  "id": "web-app",
  "name": "web-app",
  "services": [
    {
      "id": "frontend",
      "name": "frontend",
      "image": "nginx:latest",
      "status": "running",
      "details": "/api/v1/stacks/web-app/services/frontend",
      "logs": "/api/v1/stacks/web-app/services/frontend/logs",
      "containerConfig": {
        "ports": [
          {
            "name": "http",
            "containerPort": 80
          }
        ],
        "environment": {
          "NODE_ENV": "production"
        },
        "volumes": []
      }
    }
  ],
  "routes": [
    {
      "name": "main",
      "serviceId": "frontend",
      "domains": ["example.com"],
      "port": 80,
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt",
        "email": "admin@example.com",
        "challengeType": "http"
      },
      "redirectToHttps": true,
      "priority": 100
    }
  ],
  "createdAt": "2025-10-02T10:00:00.000Z",
  "updatedAt": "2025-10-02T10:00:00.000Z"
}
```

**Error Response (404):**
```json
{
  "error": "STACK_NOT_FOUND",
  "message": "Stack 'web-app' not found"
}
```

---

### POST /api/v1/stacks

Create a new stack with services and routes.

**Request:**
```json
{
  "id": "web-app",
  "services": [
    {
      "id": "frontend",
      "image": "nginx:latest",
      "containerConfig": {
        "ports": [
          {
            "name": "http",
            "containerPort": 80
          }
        ],
        "environment": {
          "NODE_ENV": "production"
        },
        "volumes": []
      }
    }
  ],
  "routes": [
    {
      "name": "main",
      "serviceId": "frontend",
      "domains": ["example.com", "www.example.com"],
      "port": 80,
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt",
        "email": "admin@example.com",
        "challengeType": "http"
      },
      "redirectToHttps": true,
      "priority": 100
    }
  ]
}
```

**Response (201):**
```json
{
  "id": "web-app",
  "name": "web-app",
  "services": [...],
  "routes": [...],
  "createdAt": "2025-10-02T10:00:00.000Z",
  "updatedAt": "2025-10-02T10:00:00.000Z"
}
```

**Error Response (409):**
```json
{
  "error": "STACK_ALREADY_EXISTS",
  "message": "Stack with ID 'web-app' already exists"
}
```

---

### PUT /api/v1/stacks/{stackId}

Update an existing stack.

**Behavior:**
- Services not in request are removed
- Services with new IDs are added
- Existing services are updated
- Routes are replaced completely

**Request:**
```json
{
  "id": "web-app",
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
          "NODE_ENV": "production",
          "API_URL": "https://api.example.com"
        }
      }
    }
  ],
  "routes": [
    {
      "name": "main",
      "serviceId": "frontend",
      "domains": ["example.com"],
      "port": 80,
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt"
      }
    }
  ]
}
```

**Response (200):**
```json
{
  "id": "web-app",
  "name": "web-app",
  "services": [...],
  "routes": [...],
  "updatedAt": "2025-10-02T11:00:00.000Z"
}
```

---

### DELETE /api/v1/stacks/{stackId}

Delete a stack and all its services.

**Request:**
```
DELETE /api/v1/stacks/web-app
X-API-Key: your-api-key
```

**Response (204):**
No content

**Error Response (404):**
```json
{
  "error": "STACK_NOT_FOUND",
  "message": "Stack 'web-app' not found"
}
```

---

## Stack Lifecycle Endpoints

### POST /api/v1/stacks/{stackId}/start

Start all services in a stack.

**Request:**
```
POST /api/v1/stacks/web-app/start
X-API-Key: your-api-key
```

**Response (200):**
```json
{
  "stackId": "web-app",
  "status": "starting",
  "services": [
    {
      "id": "frontend",
      "status": "starting"
    }
  ]
}
```

---

### POST /api/v1/stacks/{stackId}/stop

Stop all services in a stack.

**Request:**
```
POST /api/v1/stacks/web-app/stop
X-API-Key: your-api-key
```

**Response (200):**
```json
{
  "stackId": "web-app",
  "status": "stopped",
  "services": [
    {
      "id": "frontend",
      "status": "stopped"
    }
  ]
}
```

---

### POST /api/v1/stacks/{stackId}/restart

Restart all services in a stack.

**Request:**
```
POST /api/v1/stacks/web-app/restart
X-API-Key: your-api-key
```

**Response (200):**
```json
{
  "stackId": "web-app",
  "status": "restarting",
  "services": [
    {
      "id": "frontend",
      "status": "restarting"
    }
  ]
}
```

---

### GET /api/v1/stacks/{stackId}/status

Get runtime status of all services in a stack.

**Request:**
```
GET /api/v1/stacks/web-app/status
X-API-Key: your-api-key
```

**Response (200):**
```json
{
  "stackId": "web-app",
  "overallStatus": "running",
  "services": [
    {
      "id": "frontend",
      "status": "running",
      "containerId": "abc123...",
      "uptime": "2h 15m",
      "restartCount": 0
    }
  ]
}
```

---

## Service Management Endpoints

### GET /api/v1/stacks/{stackId}/services/{serviceId}

Get detailed information about a specific service.

**Request:**
```
GET /api/v1/stacks/web-app/services/frontend
X-API-Key: your-api-key
```

**Response (200):**
```json
{
  "id": "frontend",
  "name": "frontend",
  "stackId": "web-app",
  "image": "nginx:latest",
  "status": "running",
  "containerId": "abc123...",
  "containerConfig": {
    "ports": [
      {
        "name": "http",
        "containerPort": 80
      }
    ],
    "environment": {
      "NODE_ENV": "production"
    },
    "volumes": []
  },
  "createdAt": "2025-10-02T10:00:00.000Z"
}
```

---

### GET /api/v1/stacks/{stackId}/logs

Get aggregated logs for all services in a stack.

**Query Parameters:**
- `tail` (optional): Number of lines to return (default: 100)
- `since` (optional): ISO 8601 timestamp

**Request:**
```
GET /api/v1/stacks/web-app/logs?tail=50
X-API-Key: your-api-key
```

**Response (200):**
```json
{
  "stackId": "web-app",
  "logs": [
    {
      "serviceId": "frontend",
      "timestamp": "2025-10-02T10:30:00.000Z",
      "message": "Server started on port 80"
    }
  ]
}
```

---

### GET /api/v1/stacks/{stackId}/services/{serviceId}/logs

Get logs for a specific service.

**Query Parameters:**
- `tail` (optional): Number of lines to return (default: 100)
- `since` (optional): ISO 8601 timestamp

**Request:**
```
GET /api/v1/stacks/web-app/services/frontend/logs?tail=100
X-API-Key: your-api-key
```

**Response (200):**
```json
{
  "serviceId": "frontend",
  "stackId": "web-app",
  "logs": [
    {
      "timestamp": "2025-10-02T10:30:00.000Z",
      "stream": "stdout",
      "message": "Server started on port 80"
    }
  ]
}
```

---

## Proxy Management Endpoints

### GET /api/v1/proxy/routes

List all active proxy routes (from all stacks).

**Request:**
```
GET /api/v1/proxy/routes
X-API-Key: your-api-key
```

**Response (200):**
```json
{
  "routes": [
    {
      "stackId": "web-app",
      "routeName": "main",
      "serviceId": "frontend",
      "domains": ["example.com"],
      "pathPrefix": null,
      "port": 80,
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt"
      },
      "priority": 100,
      "status": "active"
    },
    {
      "stackId": "external-proxies",
      "routeName": "legacy-api",
      "externalTarget": "http://localhost:8080",
      "domains": ["legacy.example.com"],
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt"
      },
      "priority": 50,
      "status": "active"
    }
  ]
}
```

---

### GET /api/v1/proxy/certificates

List all SSL/TLS certificates managed by Traefik.

**Request:**
```
GET /api/v1/proxy/certificates
X-API-Key: your-api-key
```

**Response (200):**
```json
{
  "certificates": [
    {
      "domain": "example.com",
      "alternativeNames": ["www.example.com"],
      "issuer": "Let's Encrypt",
      "validFrom": "2025-10-02T00:00:00.000Z",
      "validUntil": "2026-01-02T00:00:00.000Z",
      "status": "valid",
      "autoRenewal": true
    }
  ]
}
```

---

### POST /api/v1/proxy/reload

Manually trigger Traefik configuration reload.

**Request:**
```
POST /api/v1/proxy/reload
X-API-Key: your-api-key
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Traefik configuration reloaded",
  "timestamp": "2025-10-02T10:30:00.000Z"
}
```

---

## Health & Monitoring Endpoints

### GET /health

Health check endpoint (no authentication required).

**Request:**
```
GET /health
```

**Response (200):**
```json
{
  "status": "healthy",
  "version": "1.1.0",
  "uptime": "2h 15m 30s",
  "database": "connected",
  "docker": "connected",
  "traefik": "running"
}
```

---

## Error Responses

### Standard Error Format

All error responses follow this format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error description",
  "details": {
    "field": "Additional context (optional)"
  }
}
```

### Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| INVALID_STACK_NAME | 400 | Stack name format validation failed |
| INVALID_SERVICE_NAME | 400 | Service name format validation failed |
| CONTAINER_NAME_TOO_LONG | 400 | Combined container name exceeds 63 characters |
| INVALID_DOMAIN | 400 | Domain name format validation failed |
| INVALID_PATH_PREFIX | 400 | Path prefix format validation failed |
| INVALID_TARGET_URL | 400 | External route target URL format validation failed |
| INVALID_ROUTE_NAME | 400 | Route name format validation failed |
| MISSING_PROXY_PORT | 400 | Proxy configuration missing required port |
| STACK_NOT_FOUND | 404 | Specified stack ID does not exist |
| SERVICE_NOT_FOUND | 404 | Specified service ID not found in stack |
| ROUTE_NOT_FOUND | 404 | Proxy route not found |
| CERTIFICATE_NOT_FOUND | 404 | SSL certificate not found for domain |
| STACK_ALREADY_EXISTS | 409 | Stack name already exists in system |
| ROUTE_CONFLICT | 409 | Domain/path combination already in use |
| UNAUTHORIZED | 401 | Valid API key required |
| DOCKER_API_ERROR | 500 | Docker Engine API communication failure |
| TRAEFIK_ERROR | 500 | Traefik proxy configuration or communication failure |
| SSL_PROVISIONING_ERROR | 500 | SSL certificate provisioning failed |
| DATABASE_ERROR | 500 | SQLite database operation failure |

---

## Response Examples

### External Proxy Stack (Routes Only, No Services)

**Request:**
```json
{
  "id": "external-proxies",
  "services": [],
  "routes": [
    {
      "name": "legacy-app",
      "externalTarget": "http://localhost:8080",
      "domains": ["legacy.example.com"],
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt",
        "email": "admin@example.com"
      },
      "redirectToHttps": true
    }
  ]
}
```

**Response (201):**
```json
{
  "id": "external-proxies",
  "name": "external-proxies",
  "services": [],
  "routes": [
    {
      "name": "legacy-app",
      "externalTarget": "http://localhost:8080",
      "domains": ["legacy.example.com"],
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt",
        "email": "admin@example.com",
        "challengeType": "http"
      },
      "redirectToHttps": true,
      "stripPrefix": false,
      "priority": 0
    }
  ],
  "createdAt": "2025-10-02T10:00:00.000Z",
  "updatedAt": "2025-10-02T10:00:00.000Z"
}
```

### Stack with Multiple Routes and SSL Providers

```json
{
  "id": "web-stack",
  "name": "web-stack",
  "services": [
    {
      "id": "app",
      "image": "nginx:latest",
      "containerConfig": {
        "ports": [{"name": "http", "containerPort": 80}]
      }
    }
  ],
  "routes": [
    {
      "name": "production",
      "serviceId": "app",
      "domains": ["example.com", "www.example.com"],
      "port": 80,
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt",
        "challengeType": "http"
      },
      "redirectToHttps": true,
      "priority": 100
    },
    {
      "name": "staging",
      "serviceId": "app",
      "domains": ["staging.example.com"],
      "port": 80,
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt-staging",
        "challengeType": "http"
      },
      "redirectToHttps": true,
      "priority": 90
    }
  ]
}
```
