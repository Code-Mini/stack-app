# Docker Stack Management API - Requirements Specification

**Document Version:** 1.1

**Date:** 2025-10-02

**Project:** Stack App - Docker Stack 
Management API

**Document Type:** Software Requirements Specification (SRS)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Features](#3-system-features)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Data Requirements](#6-data-requirements)
7. [Deployment Requirements](#7-deployment-requirements)
8. [Appendices](#8-appendices)

---

## 1. Introduction

### 1.1 Purpose
This document specifies the requirements for the Docker Stack Management API (Stack App), a RESTful API service for managing Docker container stacks through a unified interface. The system provides CRUD operations for stacks and services, with direct Docker API integration and persistent storage.

### 1.2 Scope
The Stack App provides:
- RESTful API for Docker stack management
- Direct Docker container lifecycle management
- Integrated reverse proxy management (Nginx/Traefik)
- Automatic SSL/TLS certificate provisioning via Let's Encrypt
- Dynamic proxy configuration for containerized services
- Persistent storage using SQLite database
- Configuration management via YAML/JSON files
- NPM package distribution with global CLI installation
- Docker containerized deployment option

### 1.3 Definitions and Acronyms

| Term | Definition |
|------|------------|
| Stack | A logical grouping of related Docker services |
| Service | An individual containerized application within a stack |
| Stack ID | Simple name identifier for a stack (max 31 characters) |
| Service ID | Simple name identifier for a service within a stack (max 31 characters) |
| Container Name | Docker container name following pattern `{stack-name}-{service-name}` |
| Reverse Proxy | HTTP/HTTPS traffic router that forwards requests to backend services |
| Proxy Route | HTTP routing rule mapping domain/path to a service endpoint or external target |
| External Route | Proxy route pointing to non-Docker target (host port or external URL) |
| SSL/TLS Certificate | Digital certificate for HTTPS encryption |
| Let's Encrypt | Free automated certificate authority for SSL/TLS certificates |
| SRS | Software Requirements Specification |
| API | Application Programming Interface |
| CRUD | Create, Read, Update, Delete operations |

### 1.4 References
- Docker Engine API Documentation
- Traefik Proxy Documentation
- Let's Encrypt ACME Protocol
- RESTful API Design Standards
- SQLite Documentation
- NPM Package Management Guidelines

---

## 2. Overall Description

### 2.1 Product Perspective
The Stack App is a standalone API service that interfaces with:
- Docker Engine via Docker API
- Traefik reverse proxy for HTTP/HTTPS routing
- Let's Encrypt for automatic SSL certificate management
- SQLite database for persistent storage
- External clients via HTTP REST API
- Configuration files (YAML/JSON)

### 2.2 Product Functions
Primary functions include:
- Stack lifecycle management (create, read, update, delete)
- Service management within stacks
- Container status monitoring and control
- Reverse proxy configuration and management via Traefik
- Domain routing and SSL/TLS certificate automation
- HTTP/HTTPS traffic routing to containerized services
- External route management for non-Docker targets (host ports, external URLs)
- Centralized logging access
- Configuration management
- Authentication via API keys

### 2.3 User Classes and Characteristics
**Primary Users:**
- DevOps Engineers: Automated stack management via CI/CD pipelines
- System Administrators: Manual stack operations and monitoring
- Application Developers: Integration with deployment tooling

**Technical Expertise:** Users are expected to have Docker and API integration experience.

### 2.4 Operating Environment
**Supported Platforms:**
- Linux distributions with Docker Engine
- Node.js runtime environment (v18+)
- NPM package manager

**Dependencies:**
- Docker Engine API access
- File system access for configuration and database storage
- Network access for API endpoints

---

## 3. System Features

### 3.1 Stack Management

#### 3.1.1 Description
Complete CRUD operations for Docker stack management with persistent storage and validation.

#### 3.1.2 Functional Requirements

**FR-3.1.1:** List All Stacks
- **ID:** REQ-001
- **Description:** Retrieve all existing stacks
- **Input:** GET /api/v1/stacks
- **Output:** JSON array of stack objects
- **Priority:** High

**FR-3.1.2:** Get Stack Details
- **ID:** REQ-002
- **Description:** Retrieve specific stack by ID
- **Input:** GET /api/v1/stacks/{stackId}
- **Output:** Complete stack object with services
- **Validation:** stackId must exist
- **Priority:** High

**FR-3.1.3:** Create New Stack
- **ID:** REQ-003
- **Description:** Create new stack with services
- **Input:** POST /api/v1/stacks with JSON payload
- **Output:** Created stack object
- **Validation:**
  - Stack name: 1-31 characters, lowercase letters/numbers/hyphens
  - Cannot start/end with hyphen
  - No consecutive hyphens
  - Must be unique across system
- **Priority:** High

**FR-3.1.4:** Update Existing Stack
- **ID:** REQ-004
- **Description:** Modify stack configuration and services
- **Input:** PUT /api/v1/stacks/{stackId} with JSON payload
- **Output:** Updated stack object
- **Behavior:**
  - Services not in request are removed
  - Services with unknown IDs are added
  - Existing services are updated
- **Priority:** High

**FR-3.1.5:** Delete Stack
- **ID:** REQ-005
- **Description:** Remove stack and all associated services
- **Input:** DELETE /api/v1/stacks/{stackId}
- **Output:** Success confirmation with stack ID
- **Behavior:** Stops and removes all containers, deletes stack record
- **Priority:** High

### 3.2 Stack Lifecycle Operations

#### 3.2.1 Description
Runtime control operations for stack execution state management.

#### 3.2.2 Functional Requirements

**FR-3.2.1:** Start Stack
- **ID:** REQ-006
- **Description:** Start all services in a stack
- **Input:** POST /api/v1/stacks/{stackId}/start
- **Output:** Success confirmation with stack ID
- **Behavior:** Creates and starts Docker containers for all services
- **Priority:** High

**FR-3.2.2:** Stop Stack
- **ID:** REQ-007
- **Description:** Stop all services in a stack
- **Input:** POST /api/v1/stacks/{stackId}/stop
- **Output:** Success confirmation with stack ID
- **Behavior:** Stops all containers, preserves container definitions
- **Priority:** High

**FR-3.2.3:** Restart Stack
- **ID:** REQ-008
- **Description:** Restart all services in a stack
- **Input:** POST /api/v1/stacks/{stackId}/restart
- **Output:** Success confirmation with stack ID
- **Behavior:** Stops then starts all containers
- **Priority:** High

**FR-3.2.4:** Get Stack Status
- **ID:** REQ-009
- **Description:** Retrieve runtime status of all services
- **Input:** GET /api/v1/stacks/{stackId}/status
- **Output:** Status object with service states
- **Data:** Container ID, name, status for each service
- **Priority:** High

### 3.3 Logging and Monitoring

#### 3.3.1 Description
Access to container logs and operational monitoring.

#### 3.3.2 Functional Requirements

**FR-3.3.1:** Get Stack Logs
- **ID:** REQ-010
- **Description:** Retrieve logs from all services in a stack
- **Input:** GET /api/v1/stacks/{stackId}/logs
- **Output:** Structured log entries with service identification
- **Format:** Flat array with service, timestamp, and message fields
- **Priority:** Medium

### 3.4 Service Management

#### 3.4.1 Description
Individual service inspection within stacks.

#### 3.4.2 Functional Requirements

**FR-3.4.1:** Get Service Details
- **ID:** REQ-011
- **Description:** Retrieve detailed service configuration
- **Input:** GET /api/v1/stacks/{stackId}/services/{serviceId}
- **Output:** Complete service object with container configuration
- **Priority:** Medium

**FR-3.4.2:** Get Service Logs
- **ID:** REQ-012
- **Description:** Retrieve logs from specific service
- **Input:** GET /api/v1/stacks/{stackId}/services/{serviceId}/logs
- **Output:** Log entries for specified service
- **Priority:** Medium

### 3.5 Authentication and Security

#### 3.5.1 Description
API key-based authentication with configurable keys.

#### 3.5.2 Functional Requirements

**FR-3.5.1:** API Key Authentication
- **ID:** REQ-013
- **Description:** Validate API key on all protected endpoints
- **Input:** X-API-Key header
- **Behavior:** All endpoints except /health require valid API key
- **Priority:** High

**FR-3.5.2:** Forward Auth Verification Endpoint
- **ID:** REQ-032
- **Description:** Provide endpoint for Traefik ForwardAuth middleware
- **Input:** GET /api/v1/auth/verify with X-API-Key header
- **Output:** HTTP 200 if valid, HTTP 401 if invalid
- **Behavior:**
  - Used by Traefik to validate API keys for system routes
  - Returns 200 OK with X-Auth-User header if key is valid
  - Returns 401 Unauthorized if key is invalid or missing
- **Priority:** High

### 3.6 Reverse Proxy Management

#### 3.6.1 Description
Integrated Traefik reverse proxy management for HTTP/HTTPS routing with automatic SSL/TLS certificate provisioning and dynamic configuration.

#### 3.6.2 Functional Requirements

**FR-3.6.1:** Configure Service Proxy Routes
- **ID:** REQ-014
- **Description:** Define HTTP routing rules for services within service configuration
- **Input:** Proxy configuration in service containerConfig
- **Output:** Traefik labels applied to Docker containers
- **Behavior:** Routes can specify domain, path prefix, port, and SSL settings
- **Priority:** High

**FR-3.6.2:** Automatic SSL Certificate Provisioning
- **ID:** REQ-015
- **Description:** Automatically obtain and renew SSL certificates via Let's Encrypt
- **Input:** Domain name in proxy configuration with `ssl: true`
- **Output:** Valid SSL certificate configured in Traefik
- **Behavior:**
  - Certificates obtained via ACME HTTP-01 or TLS-ALPN-01 challenge
  - Automatic renewal before expiration
  - Certificate storage in persistent volume
- **Priority:** High

**FR-3.6.3:** HTTP to HTTPS Redirect
- **ID:** REQ-016
- **Description:** Automatically redirect HTTP traffic to HTTPS when SSL enabled
- **Input:** Proxy configuration with `ssl: true` and `redirectToHttps: true`
- **Output:** HTTP 301/308 redirects to HTTPS URLs
- **Priority:** Medium

**FR-3.6.4:** Custom Domain Routing
- **ID:** REQ-017
- **Description:** Route traffic based on domain names to specific services
- **Input:** Domain list in proxy configuration
- **Output:** Traefik router rules for domain-based routing
- **Validation:** Domain names must be valid FQDN format
- **Priority:** High

**FR-3.6.5:** Path-Based Routing
- **ID:** REQ-018
- **Description:** Route traffic based on URL path prefixes
- **Input:** Path prefix in proxy configuration
- **Output:** Traefik router rules with path prefix matching
- **Examples:** `/api` → api-service, `/admin` → admin-service
- **Priority:** Medium

**FR-3.6.6:** Get Proxy Configuration
- **ID:** REQ-019
- **Description:** Retrieve current proxy routes for all services
- **Input:** GET /api/v1/proxy/routes
- **Output:** Array of active proxy routes with service mappings
- **Priority:** Medium

**FR-3.6.7:** Get SSL Certificate Status
- **ID:** REQ-020
- **Description:** Retrieve SSL certificate information and status
- **Input:** GET /api/v1/proxy/certificates
- **Output:** List of certificates with domain, expiration, and renewal status
- **Priority:** Medium

**FR-3.6.8:** Manual Certificate Renewal
- **ID:** REQ-021
- **Description:** Trigger manual certificate renewal for a domain
- **Input:** POST /api/v1/proxy/certificates/{domain}/renew
- **Output:** Renewal status and new expiration date
- **Priority:** Low

**FR-3.6.9:** Traefik Dashboard Access
- **ID:** REQ-022
- **Description:** Provide access to Traefik's built-in dashboard
- **Input:** GET /api/v1/proxy/dashboard
- **Output:** Redirect to Traefik dashboard or dashboard URL
- **Security:** Protected by API key authentication
- **Priority:** Low

**FR-3.6.10:** Health Check Integration
- **ID:** REQ-023
- **Description:** Configure health check endpoints for Traefik monitoring
- **Input:** Health check configuration in service proxy settings
- **Output:** Traefik health check labels on containers
- **Behavior:** Unhealthy services automatically removed from routing
- **Priority:** Medium

**FR-3.6.11:** External Proxy Routes via Stacks
- **ID:** REQ-024
- **Description:** Create proxy routes to external URLs or host ports using stacks with routes but no services
- **Input:** POST /api/v1/stacks with routes array and empty services array
- **Output:** Created stack object with routes
- **Behavior:**
  - Stacks with routes.externalTarget create Traefik file provider configuration
  - No Docker containers created (services array is empty or omitted)
  - Routes traffic to external targets (localhost ports, LAN servers, external APIs)
- **Validation:**
  - Stack must have at least one route with externalTarget specified
  - External target must be valid HTTP/HTTPS URL or host:port format
  - Domain/path combination must be unique across all stacks
- **Examples:**
  - Route to localhost service: `externalTarget: "http://localhost:8080"`
  - Route to LAN server: `externalTarget: "http://192.168.1.50:3000"`
  - Route to external API: `externalTarget: "https://api.external.com/v1"`
- **Priority:** High

### 3.7 Built-in System Routes

#### 3.7.1 Description
Pre-configured default routes for accessing Stack App API and Traefik dashboard through the reverse proxy.

#### 3.7.2 Functional Requirements

**FR-3.7.1:** Stack App API Route
- **ID:** REQ-029
- **Description:** Expose Stack App API via reverse proxy at `/stack/*` path
- **Input:** Any request to `{any-host}/stack/*`
- **Output:** Proxied to Stack App API container
- **Behavior:**
  - Path prefix `/stack` is stripped before forwarding
  - Request to `/stack/api/v1/stacks` → Stack App receives `/api/v1/stacks`
  - Works on any domain pointing to Traefik
- **Configuration:** Configurable via `proxy.systemRoutes.stackApi` in config
- **Default:** Enabled with path `/stack`
- **Priority:** High

**FR-3.7.2:** Traefik Dashboard Route
- **ID:** REQ-030
- **Description:** Expose Traefik dashboard via reverse proxy at `/traefik/*` path
- **Input:** Any request to `{any-host}/traefik/*`
- **Output:** Proxied to Traefik dashboard
- **Behavior:**
  - Path prefix `/traefik` is stripped before forwarding
  - Request to `/traefik/dashboard/` → Traefik dashboard UI
  - Works on any domain pointing to Traefik
  - Requires API key authentication (same as Stack App API)
- **Configuration:** Configurable via `proxy.systemRoutes.traefik` in config
- **Default:** Enabled with path `/traefik`
- **Priority:** Medium

**FR-3.7.3:** System Routes Configuration
- **ID:** REQ-031
- **Description:** Allow customization of system route paths and enable/disable state
- **Input:** Configuration in config.yaml
- **Output:** Routes created according to configuration
- **Behavior:**
  - Path prefixes can be changed (e.g., `/stack` → `/api`, `/traefik` → `/proxy-admin`)
  - Routes can be disabled entirely
  - Changes require Stack App restart
- **Priority:** Medium

---

## 4. External Interface Requirements

### 4.1 User Interface Requirements
**UI-001:** No graphical user interface required
**UI-002:** RESTful API endpoints provide programmatic interface
**UI-003:** Standard HTTP status codes and JSON responses

### 4.2 Hardware Interface Requirements
**HW-001:** File system access for configuration and database storage
**HW-002:** Network interface for HTTP API endpoints
**HW-003:** Docker socket access for container management

### 4.3 Software Interface Requirements

**SW-001: Docker Engine API**
- Interface: Docker Engine REST API
- Purpose: Container lifecycle management
- Data: Container definitions, status, logs
- Protocols: HTTP over Unix socket

**SW-002: Traefik Reverse Proxy**
- Interface: Docker labels and Traefik API
- Purpose: HTTP/HTTPS routing and SSL certificate management
- Data: Routing rules, domain configurations, SSL certificates
- Configuration: Docker container labels for dynamic configuration
- Protocols: HTTP/HTTPS, ACME protocol for Let's Encrypt

**SW-003: SQLite Database**
- Interface: SQLite embedded database
- Purpose: Persistent storage of stack/service metadata and proxy configurations
- Data: Stack definitions, service configurations, proxy routes, timestamps
- Location: Configurable file path

**SW-004: Configuration Files**
- Interface: YAML/JSON file parsing
- Purpose: Application configuration
- Data: Database paths, API keys, logging settings, Traefik settings
- Format: YAML preferred, JSON fallback

**SW-005: Let's Encrypt ACME**
- Interface: ACME protocol via Traefik
- Purpose: Automatic SSL/TLS certificate provisioning and renewal
- Data: Domain verification challenges, certificates
- Protocols: ACME HTTP-01, TLS-ALPN-01

### 4.4 Communication Interface Requirements

**COM-001: HTTP REST API**
- Protocol: HTTP/1.1
- Port: Configurable (default 3001)
- Format: JSON request/response bodies
- Authentication: API key via X-API-Key header

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements
**PERF-001:** API response time < 2 seconds for stack operations
**PERF-002:** Support concurrent requests from multiple clients
**PERF-003:** Database operations optimized for stack/service queries

### 5.2 Reliability Requirements
**REL-001:** 99.9% uptime during normal operations
**REL-002:** Graceful handling of Docker daemon disconnections
**REL-003:** Database transaction integrity for stack operations

### 5.3 Security Requirements
**SEC-001:** API key authentication required for all protected endpoints
**SEC-002:** Input validation and sanitization for all user data
**SEC-003:** No sensitive data logging (API keys, credentials)
**SEC-004:** Docker socket access controls

### 5.4 Usability Requirements
**USE-001:** RESTful API design following industry standards
**USE-002:** Comprehensive error messages with specific error codes
**USE-003:** Self-documenting API with OpenAPI specification

### 5.5 Scalability Requirements
**SCALE-001:** Support for 100+ concurrent stacks
**SCALE-002:** Efficient resource usage for container operations
**SCALE-003:** Database design supports future expansion

---

## 6. Data Requirements

### 6.1 Data Models

#### 6.1.1 Stack Object
```yaml
Stack:
  properties:
    id:
      type: string
      maxLength: 31
      pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      description: "Simple name identifier"
    name:
      type: string
      description: "Display name (same as id)"
    services:
      type: array
      items: { $ref: '#/Service' }
    routes:
      type: array
      items: { $ref: '#/StackRoute' }
      description: "Optional - array of reverse proxy routes for stack services"
    createdAt:
      type: string
      format: date-time
    updatedAt:
      type: string
      format: date-time
```

#### 6.1.2 Service Object
```yaml
Service:
  properties:
    id:
      type: string
      maxLength: 31
      pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      description: "Simple name identifier within stack"
    name:
      type: string
      description: "Display name (same as id)"
    image:
      type: string
      description: "Docker image specification"
    status:
      type: string
      enum: [running, stopped, starting, error]
    logs:
      type: string
      format: uri
      description: "URL to service logs endpoint"
    details:
      type: string
      format: uri
      description: "URL to service details endpoint"
    containerConfig:
      $ref: '#/ContainerConfiguration'
```

#### 6.1.3 Container Configuration
```yaml
ContainerConfiguration:
  properties:
    ports:
      type: array
      items:
        type: object
        properties:
          name: { type: string }
          hostPort:
            type: integer
            description: "Optional - omit for internal-only access"
          containerPort: { type: integer }
    environment:
      type: object
      additionalProperties: { type: string }
    volumes:
      type: array
      items:
        type: object
        properties:
          hostPath: { type: string }
          containerPath: { type: string }
```

#### 6.1.4 Stack Route Object
```yaml
StackRoute:
  properties:
    name:
      type: string
      description: "Route identifier (unique within stack)"
      pattern: '^[a-z0-9]+(-[a-z0-9]+)*$'
    serviceId:
      type: string
      description: "ID of the service this route points to (for container routes)"
    externalTarget:
      type: string
      description: "External target URL for non-container routes (e.g., 'http://localhost:8080', 'https://api.external.com')"
    domains:
      type: array
      items: { type: string }
      description: "Domain names for routing (e.g., ['example.com', 'www.example.com'])"
      minItems: 1
    pathPrefix:
      type: string
      description: "Optional URL path prefix (e.g., '/api', '/admin')"
    port:
      type: integer
      description: "Container port to route traffic to (required for serviceId routes, ignored for externalTarget routes)"
    ssl:
      $ref: '#/SSLConfiguration'
      description: "SSL/TLS configuration for this route"
    redirectToHttps:
      type: boolean
      default: true
      description: "Redirect HTTP to HTTPS when SSL enabled"
    stripPrefix:
      type: boolean
      default: false
      description: "Remove path prefix before forwarding to service"
    headers:
      type: object
      additionalProperties: { type: string }
      description: "Custom HTTP headers to add to requests"
    middleware:
      type: array
      items: { type: string }
      description: "Traefik middleware names to apply"
    healthCheck:
      type: object
      properties:
        enabled: { type: boolean }
        path: { type: string, description: "Health check endpoint path" }
        interval: { type: string, description: "Check interval (e.g., '30s')" }
        timeout: { type: string, description: "Check timeout (e.g., '5s')" }
    priority:
      type: integer
      description: "Router priority (higher = evaluated first)"
      default: 0

Note: Either serviceId OR externalTarget must be specified, but not both.
- serviceId: Route to a container service within the stack
- externalTarget: Route to external URL (for proxy-only stacks with no services)
```

#### 6.1.5 SSL Configuration
```yaml
SSLConfiguration:
  properties:
    enabled:
      type: boolean
      default: false
      description: "Enable SSL/TLS for this route"
    provider:
      type: string
      enum: [letsencrypt, letsencrypt-staging, custom]
      default: letsencrypt
      description: "Certificate provider/resolver to use"
    certResolver:
      type: string
      description: "Custom Traefik certificate resolver name (overrides provider)"
    domains:
      type: array
      items: { type: string }
      description: "Domains for certificate (defaults to route domains if not specified)"
    email:
      type: string
      format: email
      description: "Email for Let's Encrypt notifications (uses global config if not specified)"
    challengeType:
      type: string
      enum: [http, tlsalpn, dns]
      default: http
      description: "ACME challenge type for certificate verification"
    dnsProvider:
      type: string
      description: "DNS provider for DNS-01 challenge (e.g., 'cloudflare', 'route53')"
    customCert:
      type: object
      description: "Custom certificate configuration (when provider is 'custom')"
      properties:
        certFile: { type: string, description: "Path to certificate file" }
        keyFile: { type: string, description: "Path to private key file" }
```


### 6.2 Database Schema

#### 6.2.1 Stacks Table
```sql
CREATE TABLE stacks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 6.2.2 Services Table
```sql
CREATE TABLE services (
    id TEXT,
    stack_id TEXT,
    name TEXT NOT NULL,
    image TEXT NOT NULL,
    config_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, stack_id),
    FOREIGN KEY (stack_id) REFERENCES stacks(id) ON DELETE CASCADE
);
```

#### 6.2.3 Stack Routes Table
```sql
CREATE TABLE stack_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_name TEXT NOT NULL,
    stack_id TEXT NOT NULL,
    service_id TEXT,
    external_target TEXT,
    domains_json TEXT NOT NULL,
    path_prefix TEXT,
    port INTEGER,
    ssl_enabled BOOLEAN DEFAULT 0,
    ssl_provider TEXT DEFAULT 'letsencrypt',
    ssl_cert_resolver TEXT,
    ssl_challenge_type TEXT DEFAULT 'http',
    ssl_dns_provider TEXT,
    ssl_email TEXT,
    ssl_custom_cert_path TEXT,
    ssl_custom_key_path TEXT,
    redirect_to_https BOOLEAN DEFAULT 1,
    strip_prefix BOOLEAN DEFAULT 0,
    headers_json TEXT,
    middleware_json TEXT,
    healthcheck_json TEXT,
    priority INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stack_id) REFERENCES stacks(id) ON DELETE CASCADE,
    UNIQUE (stack_id, route_name),
    CHECK ((service_id IS NOT NULL AND external_target IS NULL) OR (service_id IS NULL AND external_target IS NOT NULL))
);

CREATE INDEX idx_stack_routes_domain ON stack_routes(domains_json);
CREATE INDEX idx_stack_routes_stack ON stack_routes(stack_id);
CREATE INDEX idx_stack_routes_service ON stack_routes(service_id);

COMMENT ON COLUMN stack_routes.service_id IS 'ID of service within stack (for container routes)';
COMMENT ON COLUMN stack_routes.external_target IS 'External URL target (for proxy-only routes)';
COMMENT ON COLUMN stack_routes.port IS 'Container port (required for service_id routes)';
```

#### 6.2.4 SSL Certificates Table
```sql
CREATE TABLE ssl_certificates (
    domain TEXT PRIMARY KEY,
    cert_path TEXT NOT NULL,
    key_path TEXT NOT NULL,
    expiry_date DATETIME NOT NULL,
    last_renewed DATETIME,
    auto_renew BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 6.3 Validation Rules

**VR-001: Stack Name Validation**
- Length: 1-31 characters
- Pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- Case: Lowercase only
- Uniqueness: Must be unique across all stacks

**VR-002: Service Name Validation**
- Length: 1-31 characters
- Pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- Case: Lowercase only
- Uniqueness: Must be unique within stack
- Container Name: `{stack-id}-{service-id}` must be ≤ 63 characters

**VR-003: Docker Image Validation**
- Format: Valid Docker image reference
- Examples: `nginx:latest`, `mysql:8.0`, `registry.com/org/app:v1.0`

**VR-004: Domain Name Validation**
- Format: Valid FQDN (Fully Qualified Domain Name)
- Pattern: `^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$`
- Examples: `example.com`, `app.example.com`, `api-v2.example.com`
- Must not include protocol (http://, https://)

**VR-005: Path Prefix Validation**
- Must start with `/`
- Pattern: `^/[a-z0-9\-/]*$`
- Examples: `/api`, `/admin`, `/api/v1`
- Cannot end with `/` unless root path

**VR-006: Domain Uniqueness**
- Domain + path prefix combination must be unique across all routes (service routes + external routes)
- Multiple services/external routes cannot share same domain/path routing

**VR-007: External Route Target Validation**
- Must be valid URL format or host:port format
- URL pattern: `^https?://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$`
- Host:port pattern: `^[a-zA-Z0-9.-]+:[0-9]+$`
- Examples: `http://localhost:8080`, `192.168.1.100:3000`, `https://api.external.com/path`
- Target must not be empty

**VR-008: External Route Name Validation**
- Length: 1-63 characters
- Pattern: `^[a-z0-9]+(-[a-z0-9]+)*$`
- Must be unique across all external routes

---

## 7. Deployment Requirements

### 7.1 NPM Package Requirements

**NPM-001: Global Package Installation**
```bash
npm install -g @stack-app/docker-stack-api
```

**NPM-002: CLI Interface**
```bash
stack-app --config /path/to/config.yaml
stack-app --port 3001
stack-app --help
```

**NPM-003: Package Structure**
```
package.json
bin/
  stack-app                 # CLI executable
lib/
  index.js                  # Main application
  api/                      # API route handlers
  db/                       # Database management
  docker/                   # Docker API integration
  proxy/                    # Traefik proxy management
  ssl/                      # SSL certificate management
  config/                   # Configuration management
```

### 7.2 Docker Image Requirements

**DOCK-001: Base Image**
- Base: `node:18-alpine`
- Size: Optimized for minimal footprint
- Security: Non-root user execution

**DOCK-002: Required Containers**
- Stack App API container (main application)
- Traefik reverse proxy container (managed by Stack App)

**DOCK-003: Volume Mounts**
```yaml
# Stack App Container
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro  # Docker socket access
  - ./config:/etc/stack-app:ro                    # Configuration files
  - ./data:/var/lib/stack-app:rw                  # Database storage
  - traefik-certs:/etc/traefik/certs:rw           # Shared SSL certificates
  - traefik-dynamic:/etc/traefik/dynamic:rw       # External routes configuration

# Traefik Container
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro  # Docker socket for dynamic config
  - traefik-certs:/etc/traefik/certs:rw           # SSL certificate storage
  - traefik-dynamic:/etc/traefik/dynamic:ro       # External routes configuration (read-only)
```

**DOCK-004: Stack App Network Configuration**
```yaml
# Stack App Container must be on traefik-proxy network
# to be accessible from Traefik for system routes
networks:
  - traefik-proxy

# Stack App will have Docker labels for system routes
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.stack-app-api.rule=PathPrefix(`/stack`)"
  - "traefik.http.routers.stack-app-api.entrypoints=web"
  - "traefik.http.routers.stack-app-api.middlewares=stack-app-stripprefix"
  - "traefik.http.middlewares.stack-app-stripprefix.stripprefix.prefixes=/stack"
  - "traefik.http.services.stack-app-api.loadbalancer.server.port=3001"
  - "traefik.docker.network=traefik-proxy"
```

**DOCK-005: Environment Variables**
```yaml
# Stack App Container
environment:
  - STACK_APP_CONFIG=/etc/stack-app/config.yaml
  - NODE_ENV=production
  - TRAEFIK_NETWORK=traefik-proxy

# Traefik Container
environment:
  - TRAEFIK_API_DASHBOARD=true
  - TRAEFIK_PROVIDERS_DOCKER=true
  - TRAEFIK_PROVIDERS_DOCKER_EXPOSEDBYDEFAULT=false
```

**DOCK-006: Network Configuration**
```yaml
networks:
  traefik-proxy:
    name: traefik-proxy
    driver: bridge
    external: false
```

**DOCK-007: Traefik Container Configuration**
```yaml
# Traefik must be deployed as a separate container by Stack App
image: traefik:v3.0
container_name: stack-app-traefik
ports:
  - "80:80"      # HTTP entrypoint - binds to host port 80
  - "443:443"    # HTTPS entrypoint - binds to host port 443
  - "8080:8080"  # Dashboard (optional, can be disabled)
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
  - traefik-certs:/etc/traefik/certs:rw
  - traefik-dynamic:/etc/traefik/dynamic:ro  # External routes configuration
command:
  - "--api.dashboard=true"
  - "--providers.docker=true"
  - "--providers.docker.exposedbydefault=false"
  - "--providers.docker.network=traefik-proxy"
  - "--providers.file.directory=/etc/traefik/dynamic"
  - "--providers.file.watch=true"
  - "--entrypoints.web.address=:80"
  - "--entrypoints.websecure.address=:443"
  # Certificate resolvers (configured based on Stack App config)
  - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
  - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
  - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
  - "--certificatesresolvers.letsencrypt.acme.storage=/etc/traefik/certs/acme-letsencrypt.json"
  # Staging resolver
  - "--certificatesresolvers.letsencrypt-staging.acme.httpchallenge=true"
  - "--certificatesresolvers.letsencrypt-staging.acme.httpchallenge.entrypoint=web"
  - "--certificatesresolvers.letsencrypt-staging.acme.email=admin@example.com"
  - "--certificatesresolvers.letsencrypt-staging.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory"
  - "--certificatesresolvers.letsencrypt-staging.acme.storage=/etc/traefik/certs/acme-staging.json"
  # DNS resolver example (Cloudflare)
  - "--certificatesresolvers.cloudflare-dns.acme.dnschallenge=true"
  - "--certificatesresolvers.cloudflare-dns.acme.dnschallenge.provider=cloudflare"
  - "--certificatesresolvers.cloudflare-dns.acme.email=admin@example.com"
  - "--certificatesresolvers.cloudflare-dns.acme.storage=/etc/traefik/certs/acme-cloudflare.json"
restart: unless-stopped

# Environment variables for DNS providers
environment:
  - CF_API_EMAIL=admin@example.com  # Cloudflare email
  - CF_DNS_API_TOKEN=your-token-here  # Cloudflare API token
```

**DOCK-008: Traefik Dashboard Configuration**
```yaml
# Traefik dashboard configuration in file provider for authentication
# File: /etc/traefik/dynamic/system-routes.yaml
http:
  routers:
    traefik-dashboard:
      rule: "PathPrefix(`/traefik`)"
      entryPoints:
        - web
      middlewares:
        - traefik-stripprefix
        - traefik-auth  # Forward auth to Stack App for API key validation
      service: api@internal

  middlewares:
    traefik-stripprefix:
      stripPrefix:
        prefixes:
          - "/traefik"
    traefik-auth:
      forwardAuth:
        address: "http://stack-app:3001/api/v1/auth/verify"
        authResponseHeaders:
          - "X-Auth-User"
```

**DOCK-009: Port Requirements**
- **Port 80 (HTTP):** Must be available on host for Traefik HTTP entrypoint
- **Port 443 (HTTPS):** Must be available on host for Traefik HTTPS entrypoint
- **Port 8080 (Dashboard):** Not exposed to host (accessed via `/traefik` path through proxy)
- **Port 3001 (API):** Stack App API server (not exposed to host, accessed via `/stack` path)
- Stack App must check port availability before starting Traefik
- If ports 80/443 are occupied, Stack App should fail with clear error message

**DOCK-010: Health Check**
```yaml
# Stack App Container
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/health"]
  interval: 30s
  timeout: 10s
  retries: 3

# Traefik Container
healthcheck:
  test: ["CMD", "traefik", "healthcheck", "--ping"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### 7.3 Configuration Management

**CONFIG-001: Configuration File Hierarchy**
1. CLI parameter: `--config /path/to/config.yaml`
2. Environment variable: `STACK_APP_CONFIG=/path/to/config.yaml`
3. Default locations (in order):
   - `/etc/stack-app/config.yaml`
   - `/etc/stack-app/config.json`

**CONFIG-002: Configuration Schema**
```yaml
# config.yaml
database:
  type: sqlite
  path: /var/lib/stack-app/stacks.db

api:
  port: 3001
  keys:
    - "1062e8cfd6e93f435eff03879299e08cbe0010ed3e24f6a66e2a4623cffa7261"
    - "a72caf2b0c18509948d7c55b5d0de1e9462c021fa5f4a008183ff8bf819549eb"

docker:
  socketPath: /var/run/docker.sock
  network: traefik-proxy  # Network for Traefik-enabled containers

proxy:
  enabled: true
  provider: traefik
  traefikImage: traefik:v3.0
  network: traefik-proxy
  httpPort: 80
  httpsPort: 443
  dashboardPort: 8080
  dashboardEnabled: true
  ssl:
    enabled: true
    provider: letsencrypt
    email: admin@example.com  # Required for Let's Encrypt
    staging: false  # Use Let's Encrypt staging for testing
    challengeType: http  # http or tlsalpn
    storage: /etc/traefik/certs/acme.json
  defaultMiddleware:
    - security-headers
    - rate-limit
  systemRoutes:
    stackApi:
      enabled: true
      pathPrefix: /stack  # Customizable path prefix
      stripPrefix: true
    traefik:
      enabled: true
      pathPrefix: /traefik  # Customizable path prefix
      stripPrefix: true
      requireAuth: true  # Use Stack App API key authentication

logging:
  level: info
  path: /var/log/stack-app
```

---

## 8. Appendices

### 8.1 Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| INVALID_STACK_NAME | 400 | Stack name format validation failed |
| INVALID_SERVICE_NAME | 400 | Service name format validation failed |
| CONTAINER_NAME_TOO_LONG | 400 | Combined container name exceeds 63 characters |
| INVALID_DOMAIN | 400 | Domain name format validation failed |
| INVALID_PATH_PREFIX | 400 | Path prefix format validation failed |
| INVALID_TARGET_URL | 400 | External route target URL format validation failed |
| INVALID_ROUTE_NAME | 400 | External route name format validation failed |
| MISSING_PROXY_PORT | 400 | Proxy configuration missing required port |
| STACK_NOT_FOUND | 404 | Specified stack ID does not exist |
| SERVICE_NOT_FOUND | 404 | Specified service ID not found in stack |
| ROUTE_NOT_FOUND | 404 | Proxy route not found |
| CERTIFICATE_NOT_FOUND | 404 | SSL certificate not found for domain |
| STACK_ALREADY_EXISTS | 409 | Stack name already exists in system |
| ROUTE_CONFLICT | 409 | Domain/path combination already in use |
| DOCKER_API_ERROR | 500 | Docker Engine API communication failure |
| TRAEFIK_ERROR | 500 | Traefik proxy configuration or communication failure |
| SSL_PROVISIONING_ERROR | 500 | SSL certificate provisioning failed |
| DATABASE_ERROR | 500 | SQLite database operation failure |

### 8.2 API Response Examples

#### 8.2.1 Success Response (Stack with Multiple Routes)
```json
{
  "id": "web-stack",
  "name": "web-stack",
  "services": [
    {
      "id": "app",
      "name": "app",
      "image": "nginx:latest",
      "status": "stopped",
      "details": "/api/v1/stacks/web-stack/services/app",
      "logs": "/api/v1/stacks/web-stack/services/app/logs",
      "containerConfig": {
        "ports": [
          {
            "name": "web-port",
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
      "headers": {
        "X-Frame-Options": "DENY"
      }
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
      "redirectToHttps": true
    }
  ],
  "createdAt": "2025-10-02T10:30:00.000Z",
  "updatedAt": "2025-10-02T10:30:00.000Z"
}
```

#### 8.2.1b External Proxy Stack (Routes Only, No Services)
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
        "provider": "letsencrypt"
      },
      "redirectToHttps": true
    },
    {
      "name": "lan-service",
      "externalTarget": "http://192.168.1.50:3000",
      "domains": ["internal.example.com"],
      "pathPrefix": "/api",
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt",
        "challengeType": "dns",
        "dnsProvider": "cloudflare"
      },
      "stripPrefix": true
    }
  ],
  "createdAt": "2025-10-02T11:00:00.000Z",
  "updatedAt": "2025-10-02T11:00:00.000Z"
}
```

#### 8.2.2 Proxy Routes Response
```json
{
  "routes": [
    {
      "id": 1,
      "stackId": "web-stack",
      "serviceId": "app",
      "domain": "example.com",
      "pathPrefix": null,
      "port": 80,
      "ssl": true,
      "sslCertExpiry": "2025-12-31T23:59:59.000Z",
      "url": "https://example.com"
    },
    {
      "id": 2,
      "stackId": "api-stack",
      "serviceId": "backend",
      "domain": "api.example.com",
      "pathPrefix": "/v1",
      "port": 3000,
      "ssl": true,
      "sslCertExpiry": "2025-12-31T23:59:59.000Z",
      "url": "https://api.example.com/v1"
    }
  ]
}
```

#### 8.2.3 SSL Certificates Response
```json
{
  "certificates": [
    {
      "domain": "example.com",
      "expiryDate": "2025-12-31T23:59:59.000Z",
      "lastRenewed": "2025-10-01T00:00:00.000Z",
      "autoRenew": true,
      "daysUntilExpiry": 90,
      "status": "valid"
    },
    {
      "domain": "api.example.com",
      "expiryDate": "2025-11-15T23:59:59.000Z",
      "lastRenewed": "2025-08-17T00:00:00.000Z",
      "autoRenew": true,
      "daysUntilExpiry": 44,
      "status": "valid"
    }
  ]
}
```

#### 8.2.4 External Route Creation Request
```json
{
  "name": "legacy-api",
  "domains": ["old.example.com"],
  "pathPrefix": "/api",
  "target": "http://192.168.1.50:8080",
  "ssl": true,
  "redirectToHttps": true,
  "stripPrefix": true,
  "headers": {
    "X-Forwarded-For": "$remote_addr",
    "X-Legacy-Route": "true"
  },
  "priority": 10
}
```

#### 8.2.5 External Route Response
```json
{
  "id": "legacy-api",
  "name": "legacy-api",
  "domains": ["old.example.com"],
  "pathPrefix": "/api",
  "target": "http://192.168.1.50:8080",
  "ssl": true,
  "redirectToHttps": true,
  "stripPrefix": true,
  "headers": {
    "X-Forwarded-For": "$remote_addr",
    "X-Legacy-Route": "true"
  },
  "middleware": [],
  "priority": 10,
  "createdAt": "2025-10-02T11:00:00.000Z",
  "updatedAt": "2025-10-02T11:00:00.000Z"
}
```

#### 8.2.6 List External Routes Response
```json
{
  "routes": [
    {
      "id": "legacy-api",
      "name": "legacy-api",
      "domains": ["old.example.com"],
      "pathPrefix": "/api",
      "target": "http://192.168.1.50:8080",
      "ssl": true,
      "url": "https://old.example.com/api"
    },
    {
      "id": "local-service",
      "name": "local-service",
      "domains": ["tools.example.com"],
      "pathPrefix": null,
      "target": "http://localhost:9000",
      "ssl": false,
      "url": "http://tools.example.com"
    },
    {
      "id": "external-api",
      "name": "external-api",
      "domains": ["proxy.example.com"],
      "pathPrefix": "/external",
      "target": "https://external-service.com/api",
      "ssl": true,
      "url": "https://proxy.example.com/external"
    }
  ]
}
```

#### 8.2.7 Error Response
```json
{
  "error": {
    "code": "INVALID_STACK_NAME",
    "message": "Stack name 'my_invalid@name' contains invalid characters. Use only lowercase letters, numbers, and hyphens."
  }
}
```

### 8.3 Container Naming Convention

**Pattern:** `{stack-name}-{service-name}`

**Examples:**
- Stack: `web-app`, Service: `frontend` → Container: `web-app-frontend`
- Stack: `data-pipeline`, Service: `redis` → Container: `data-pipeline-redis`

**Validation:** Total length must not exceed 63 characters (Docker limit)

### 8.4 Traefik Label Generation

When a service has proxy configuration enabled, Stack App must generate appropriate Docker labels for Traefik dynamic configuration.

#### 8.4.1 Basic HTTP Routing Example
For a service with:
```yaml
proxy:
  enabled: true
  domains: ["example.com"]
  port: 80
```

Generated Docker labels:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.web-stack-app.rule=Host(`example.com`)"
  - "traefik.http.routers.web-stack-app.entrypoints=web"
  - "traefik.http.services.web-stack-app.loadbalancer.server.port=80"
  - "traefik.docker.network=traefik-proxy"
```

#### 8.4.2 HTTPS with SSL Example
For a service with:
```yaml
proxy:
  enabled: true
  domains: ["example.com", "www.example.com"]
  port: 80
  ssl: true
  redirectToHttps: true
```

Generated Docker labels:
```yaml
labels:
  - "traefik.enable=true"
  # HTTPS router
  - "traefik.http.routers.web-stack-app-secure.rule=Host(`example.com`) || Host(`www.example.com`)"
  - "traefik.http.routers.web-stack-app-secure.entrypoints=websecure"
  - "traefik.http.routers.web-stack-app-secure.tls=true"
  - "traefik.http.routers.web-stack-app-secure.tls.certresolver=letsencrypt"
  # HTTP router (redirect to HTTPS)
  - "traefik.http.routers.web-stack-app.rule=Host(`example.com`) || Host(`www.example.com`)"
  - "traefik.http.routers.web-stack-app.entrypoints=web"
  - "traefik.http.routers.web-stack-app.middlewares=redirect-to-https"
  # Redirect middleware
  - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
  - "traefik.http.middlewares.redirect-to-https.redirectscheme.permanent=true"
  # Service
  - "traefik.http.services.web-stack-app.loadbalancer.server.port=80"
  - "traefik.docker.network=traefik-proxy"
```

#### 8.4.3 Path-Based Routing Example
For a service with:
```yaml
proxy:
  enabled: true
  domains: ["api.example.com"]
  pathPrefix: "/v1"
  port: 3000
  ssl: true
  stripPrefix: true
```

Generated Docker labels:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.api-stack-backend-secure.rule=Host(`api.example.com`) && PathPrefix(`/v1`)"
  - "traefik.http.routers.api-stack-backend-secure.entrypoints=websecure"
  - "traefik.http.routers.api-stack-backend-secure.tls=true"
  - "traefik.http.routers.api-stack-backend-secure.tls.certresolver=letsencrypt"
  - "traefik.http.routers.api-stack-backend-secure.middlewares=api-stack-backend-stripprefix"
  - "traefik.http.middlewares.api-stack-backend-stripprefix.stripprefix.prefixes=/v1"
  - "traefik.http.services.api-stack-backend.loadbalancer.server.port=3000"
  - "traefik.docker.network=traefik-proxy"
```

#### 8.4.4 Health Check Example
For a service with:
```yaml
proxy:
  enabled: true
  domains: ["example.com"]
  port: 80
  healthCheck:
    enabled: true
    path: "/health"
    interval: "30s"
    timeout: "5s"
```

Generated Docker labels:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.web-stack-app.rule=Host(`example.com`)"
  - "traefik.http.routers.web-stack-app.entrypoints=web"
  - "traefik.http.services.web-stack-app.loadbalancer.server.port=80"
  - "traefik.http.services.web-stack-app.loadbalancer.healthcheck.path=/health"
  - "traefik.http.services.web-stack-app.loadbalancer.healthcheck.interval=30s"
  - "traefik.http.services.web-stack-app.loadbalancer.healthcheck.timeout=5s"
  - "traefik.docker.network=traefik-proxy"
```

#### 8.4.5 External Route Configuration Example

For external routes, Stack App must create Traefik configuration via file provider (not Docker labels).

External route:
```yaml
name: legacy-api
domains: ["old.example.com"]
pathPrefix: "/api"
target: "http://192.168.1.50:8080"
ssl: true
stripPrefix: true
```

Generated Traefik file configuration (`/etc/traefik/dynamic/external-routes.yaml`):
```yaml
http:
  routers:
    external-legacy-api-secure:
      rule: "Host(`old.example.com`) && PathPrefix(`/api`)"
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      middlewares:
        - external-legacy-api-stripprefix
      service: external-legacy-api

    external-legacy-api:
      rule: "Host(`old.example.com`) && PathPrefix(`/api`)"
      entryPoints:
        - web
      middlewares:
        - redirect-to-https

  services:
    external-legacy-api:
      loadBalancer:
        servers:
          - url: "http://192.168.1.50:8080"

  middlewares:
    external-legacy-api-stripprefix:
      stripPrefix:
        prefixes:
          - "/api"
```

**Implementation Notes:**
- External routes use Traefik file provider for configuration
- Configuration file path: `/etc/traefik/dynamic/external-routes.yaml`
- Stack App must mount this directory to Traefik container
- File changes are automatically detected by Traefik
- External route names prefixed with `external-` to avoid conflicts

#### 8.4.6 Label Naming Convention
- **Docker service routes:**
  - Router name pattern: `{stack-id}-{service-id}[-secure]`
  - Service name pattern: `{stack-id}-{service-id}`
  - Middleware name pattern: `{stack-id}-{service-id}-{middleware-type}`
- **External routes:**
  - Router name pattern: `external-{route-name}[-secure]`
  - Service name pattern: `external-{route-name}`
  - Middleware name pattern: `external-{route-name}-{middleware-type}`
- Secure routers (HTTPS) use `-secure` suffix
- All names must be DNS-compatible (lowercase, alphanumeric, hyphens)

### 8.5 System Routes Configuration

#### 8.5.1 Stack App API System Route
Stack App container automatically gets Traefik labels based on configuration:

Configuration:
```yaml
proxy:
  systemRoutes:
    stackApi:
      enabled: true
      pathPrefix: /stack
      stripPrefix: true
```

Generated Docker labels on Stack App container:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.stack-app-api.rule=PathPrefix(`/stack`)"
  - "traefik.http.routers.stack-app-api.entrypoints=web"
  - "traefik.http.routers.stack-app-api.middlewares=stack-app-stripprefix"
  - "traefik.http.middlewares.stack-app-stripprefix.stripprefix.prefixes=/stack"
  - "traefik.http.services.stack-app-api.loadbalancer.server.port=3001"
  - "traefik.docker.network=traefik-proxy"
```

**Access Examples:**
- `http://your-server.com/stack/api/v1/stacks` → Stack App receives `/api/v1/stacks`
- `http://localhost/stack/api/v1/stacks/web-stack/status` → Stack App receives `/api/v1/stacks/web-stack/status`
- `http://192.168.1.100/stack/health` → Stack App receives `/health`

#### 8.5.2 Traefik Dashboard System Route
Traefik dashboard route configured in `/etc/traefik/dynamic/system-routes.yaml`:

Configuration:
```yaml
proxy:
  systemRoutes:
    traefik:
      enabled: true
      pathPrefix: /traefik
      stripPrefix: true
      requireAuth: true
```

Generated file configuration:
```yaml
http:
  routers:
    traefik-dashboard:
      rule: "PathPrefix(`/traefik`)"
      entryPoints:
        - web
      middlewares:
        - traefik-stripprefix
        - traefik-auth
      service: api@internal

  middlewares:
    traefik-stripprefix:
      stripPrefix:
        prefixes:
          - "/traefik"
    traefik-auth:
      forwardAuth:
        address: "http://stack-app:3001/api/v1/auth/verify"
        authResponseHeaders:
          - "X-Auth-User"
```

**Access Examples:**
- `http://your-server.com/traefik/dashboard/` → Traefik dashboard UI (with API key)
- `http://localhost/traefik/api/rawdata` → Traefik API (with API key)

**Authentication Flow:**
1. User accesses `http://server/traefik/dashboard/`
2. Traefik forwards auth check to Stack App: `http://stack-app:3001/api/v1/auth/verify`
3. Stack App validates X-API-Key header
4. If valid: 200 OK, Traefik allows access
5. If invalid: 401 Unauthorized, Traefik denies access

#### 8.5.3 Custom System Route Paths
System route paths can be customized:

```yaml
proxy:
  systemRoutes:
    stackApi:
      enabled: true
      pathPrefix: /api  # Changed from /stack
      stripPrefix: true
    traefik:
      enabled: true
      pathPrefix: /admin/proxy  # Changed from /traefik
      stripPrefix: true
      requireAuth: true
```

Access becomes:
- Stack App API: `http://server/api/api/v1/stacks`
- Traefik Dashboard: `http://server/admin/proxy/dashboard/`

#### 8.5.4 Disabling System Routes
System routes can be disabled:

```yaml
proxy:
  systemRoutes:
    stackApi:
      enabled: false  # No proxy route for Stack App
    traefik:
      enabled: false  # No proxy route for Traefik dashboard
```

**Note:** Stack App API remains accessible on port 3001 directly if not exposed through proxy.

### 8.6 Traefik Lifecycle Management

**TLM-001: Automatic Traefik Deployment**
- Stack App must automatically deploy Traefik container on first startup if `proxy.enabled: true`
- Traefik container name: `stack-app-traefik`
- Must be on `traefik-proxy` network
- Persistent volume for certificate storage

**TLM-002: Traefik Restart Behavior**
- Traefik should restart automatically (`restart: unless-stopped`)
- Stack App should detect if Traefik is running before starting services with proxy config
- If Traefik is not running and proxy services exist, Stack App should start Traefik first

**TLM-003: Traefik Configuration Updates**
- Configuration updates via Docker labels (dynamic configuration)
- No Traefik restart needed for service route changes
- Traefik watches Docker socket for label changes

**TLM-004: Traefik Removal**
- If all proxy-enabled services are deleted, Stack App may optionally stop Traefik
- Traefik should not be removed if SSL certificates exist (preserves cert storage)
- Manual Traefik removal should preserve certificate volume

**TLM-005: External Routes File Management**
- Stack App manages external routes via `/etc/traefik/dynamic/external-routes.yaml`
- File must be regenerated whenever external routes are created/updated/deleted
- Traefik automatically reloads configuration when file changes (via `--providers.file.watch=true`)
- File must contain all active external routes in single YAML document
- Empty file (or file with empty `http:` section) is valid when no external routes exist

**TLM-006: System Routes File Management**
- Stack App manages system routes via `/etc/traefik/dynamic/system-routes.yaml`
- File created on Stack App startup based on `proxy.systemRoutes` configuration
- Contains Traefik dashboard route with ForwardAuth middleware
- File regenerated when Stack App restarts with configuration changes
- Separate file from external routes for organizational clarity

**TLM-007: Volume Sharing Strategy**
- `traefik-dynamic` volume is shared between Stack App (read-write) and Traefik (read-only)
- Stack App writes two files to this volume:
  - `system-routes.yaml` - System routes (Stack App API via labels, Traefik dashboard via file)
  - `external-routes.yaml` - User-created external routes
- Traefik reads both configuration files from this volume
- Volume persists between container restarts

**TLM-008: Configuration Priority**
- Docker service routes (Docker labels): Highest priority, managed per container
- System routes: Mixed - Stack App uses labels, Traefik dashboard uses file provider
- External routes: File provider only
- All routes must have unique domain/path combinations

---

**End of Document**

*This requirements specification provides the complete technical foundation for implementing the Docker Stack Management API with integrated Traefik reverse proxy management, automatic SSL/TLS certificate provisioning, and all clarified requirements following industry-standard documentation structure.*