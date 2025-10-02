# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Stack App** - Production-Ready Docker Infrastructure Manager

A single-container solution that transforms a Docker host into a production-ready platform with automatic reverse proxy, SSL certificates, and intelligent routing.

**Status:** Initial planning phase - implementation not yet started.

**Version:** 1.1

## What Stack App Does

Deploy one container and get:
- Automatic Traefik reverse proxy deployment
- SSL/TLS certificate automation via Let's Encrypt
- Full Docker stack lifecycle management via REST API
- Dynamic routing for containerized services
- External proxy routing to non-Docker targets (APIs, S3, etc.)
- Priority-based path and domain routing
- Multiple SSL providers per stack

**Real-World Example:**
```
example.com           → Docker container (your website)
example.com/api       → Internal API server (https://api.internal:8080)
example.com/auth      → External SaaS (https://auth.saas.com)
example.com/media     → S3 bucket (https://bucket.s3.amazonaws.com)
```
All configured via single JSON API call with automatic SSL certificates.

## Architecture

### High-Level System Design

```
External Traffic (80/443)
         ↓
    Traefik Container (auto-deployed)
         ↓
    ┌────┴────┐
    │         │
Stack App  Managed Containers + External Targets
```

### Core Components (To Be Implemented)

1. **API Layer** - RESTful endpoints for stack/service/route management
2. **Docker Integration** - Direct Docker Engine API communication via Unix socket
3. **Traefik Manager** - Automatic Traefik deployment and dynamic configuration generation
4. **Database Layer** - SQLite for persistent stack/service/route metadata
5. **SSL Manager** - Let's Encrypt ACME automation via Traefik
6. **Configuration** - YAML/JSON config file support

### Technology Stack

- **Runtime:** Node.js v18+
- **Database:** SQLite (embedded)
- **Docker API:** Via `/var/run/docker.sock`
- **Reverse Proxy:** Traefik v3.0 (auto-deployed)
- **SSL/TLS:** Let's Encrypt ACME (HTTP-01, TLS-ALPN-01, DNS-01)
- **Deployment:** NPM global package + Docker containerized option

### Key Design Patterns

- **Naming Convention:** Container names follow `{stack-id}-{service-id}` pattern (max 63 chars total)
- **Validation:** Stack/service IDs use pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$` (1-31 chars)
- **Authentication:** API key via `X-API-Key` header (all endpoints except `/health`)
- **Data Model:** Stacks contain Services and Routes; Services map 1:1 to Docker containers
- **Routing Model:** Routes can point to either services (containers) OR external targets (URLs)
- **Priority-Based Routing:** Higher priority routes evaluated first (100 > 90 > 1)

## Requirements Documentation

All requirements are organized in the `requirements/` folder for easy navigation.

### Main Documentation

**requirements/index.md** - Main Software Requirements Specification (SRS)
- System architecture and design
- Functional requirements overview
- Non-functional requirements
- Deployment requirements
- Links to all detailed specifications

### Detailed Specifications (requirements/ folder)

**requirements/api-specification.md**
- All HTTP endpoints (GET, POST, PUT, DELETE)
- Request/response formats with examples
- Authentication details
- Error codes and handling
- Complete API usage examples

**requirements/data-models.md**
- Stack Object schema
- Service Object schema
- Container Configuration schema
- Stack Route Object schema (service routes + external routes)
- SSL Configuration schema
- Status and error response models
- JSON examples for all models

**requirements/database-schema.md**
- SQLite table definitions
  - stacks table
  - services table
  - stack_routes table (unified for service and external routes)
  - ssl_certificates table
- Column descriptions and constraints
- Indexes and relationships
- Entity relationship diagram
- Data storage patterns (JSON columns)
- Migration strategy

**requirements/validation-rules.md**
- Stack validation (VR-001)
- Service validation (VR-002 to VR-003)
- Route validation (VR-004 to VR-009)
- SSL configuration validation (VR-010 to VR-013)
- Container configuration validation (VR-014 to VR-016)
- Cross-entity validation (VR-017 to VR-019)
- Validation error response formats

### Examples

**requirements/examples/full-stack.md**
- Complete real-world configuration
- Mixed container and external routing
- Multiple SSL providers in single stack
- Path-based routing with priorities
- Generated Traefik configuration output

## Implementation Guidelines

### API Endpoints Structure

All endpoints under `/api/v1`:

**Stack Management:**
- `GET /stacks` - List all stacks
- `GET /stacks/{stackId}` - Get stack details
- `POST /stacks` - Create stack
- `PUT /stacks/{stackId}` - Update stack
- `DELETE /stacks/{stackId}` - Delete stack

**Stack Lifecycle:**
- `POST /stacks/{stackId}/start` - Start all services
- `POST /stacks/{stackId}/stop` - Stop all services
- `POST /stacks/{stackId}/restart` - Restart all services
- `GET /stacks/{stackId}/status` - Get runtime status

**Service Management:**
- `GET /stacks/{stackId}/services/{serviceId}` - Get service details
- `GET /stacks/{stackId}/services/{serviceId}/logs` - Get service logs

**Monitoring:**
- `GET /stacks/{stackId}/logs` - Get all service logs (aggregated)
- `GET /health` - Health check (no authentication)

**Proxy Management:**
- `GET /proxy/routes` - List all routes (service + external)
- `GET /proxy/certificates` - List SSL certificates
- `POST /proxy/reload` - Reload Traefik configuration

### Database Schema (SQLite)

**stacks table:**
```sql
CREATE TABLE stacks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**services table:**
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

**stack_routes table (unified for service and external routes):**
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
```

**ssl_certificates table:**
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

### Important Data Model Concepts

**Routes (Unified Model):**
Routes are part of stack configuration and can be either:
1. **Service Routes** - Point to containerized services
   - `serviceId` is set, `externalTarget` is NULL
   - `port` is required
   - Example: Route example.com to frontend container on port 80

2. **External Routes** - Point to non-Docker targets
   - `externalTarget` is set, `serviceId` is NULL
   - `port` is ignored
   - Example: Route example.com/api to http://localhost:8080

**XOR Constraint:** Either `serviceId` OR `externalTarget` must be specified, never both, never neither.

**External Proxy Stacks:**
To create external proxy routes, create a stack with:
- `services: []` (empty array or omitted)
- `routes: [...]` (routes with externalTarget)

**Priority-Based Routing:**
- Higher priority values are evaluated first by Traefik
- Recommended ranges:
  - 1-9: Catch-all routes (root domain)
  - 10-99: Domain-specific routes
  - 100-999: Path-specific routes (/api, /auth, etc.)
- Example: `/api` route with priority 100 matches before `/` with priority 1

### Configuration Format

Default config locations (in priority order):
1. CLI parameter: `--config /path/to/config.yaml`
2. Environment: `STACK_APP_CONFIG=/path/to/config.yaml`
3. `/etc/stack-app/config.yaml`
4. `/etc/stack-app/config.json`

```yaml
database:
  type: sqlite
  path: /var/lib/stack-app/stacks.db
  backup:
    enabled: true
    path: /var/lib/stack-app/backups
    retention: 7

api:
  port: 3001
  keys:
    - "1062e8cfd6e93f435eff03879299e08cbe0010ed3e24f6a66e2a4623cffa7261"

docker:
  socketPath: /var/run/docker.sock
  network: traefik-proxy

proxy:
  image: traefik:v3.0
  systemRoutes:
    stackApi:
      enabled: true
      path: /stack
      stripPrefix: true
    traefik:
      enabled: true
      path: /traefik
      stripPrefix: true
      requireAuth: true
  defaultSSL:
    provider: letsencrypt
    email: admin@example.com
    challengeType: http

logging:
  level: info
  path: /var/log/stack-app
  format: json
```

### Traefik Integration

**Automatic Traefik Deployment:**
On Stack App startup:
1. Check if Traefik container exists
2. If not, create Traefik container with:
   - Ports 80 and 443 bound to host
   - Certificate resolvers configured (letsencrypt, letsencrypt-staging, etc.)
   - Docker provider enabled (for service routes)
   - File provider enabled (for external routes)
   - Dashboard enabled (accessible via system route)

**Service Route Configuration (Docker Labels):**
For service routes, generate Docker labels on containers:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.{stack-id}-{route-name}.rule=Host(`example.com`)"
  - "traefik.http.routers.{stack-id}-{route-name}.entrypoints=websecure"
  - "traefik.http.routers.{stack-id}-{route-name}.tls=true"
  - "traefik.http.routers.{stack-id}-{route-name}.tls.certresolver=letsencrypt"
  - "traefik.http.routers.{stack-id}-{route-name}.priority=100"
  - "traefik.http.services.{stack-id}-{service-id}.loadbalancer.server.port=80"
```

**External Route Configuration (File Provider):**
For external routes, generate YAML file in Traefik's dynamic configuration:
```yaml
http:
  routers:
    {stack-id}-{route-name}:
      rule: "Host(`example.com`) && PathPrefix(`/api`)"
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      middlewares:
        - {stack-id}-{route-name}-stripprefix
      service: {stack-id}-{route-name}
      priority: 90

  services:
    {stack-id}-{route-name}:
      loadBalancer:
        servers:
          - url: "http://localhost:8080"

  middlewares:
    {stack-id}-{route-name}-stripprefix:
      stripPrefix:
        prefixes:
          - "/api"
```

### Error Handling

Standard error codes to implement:
- `INVALID_STACK_NAME` (400) - Stack name validation failed
- `INVALID_SERVICE_NAME` (400) - Service name validation failed
- `CONTAINER_NAME_TOO_LONG` (400) - Combined name exceeds 63 chars
- `INVALID_DOMAIN` (400) - Domain name validation failed
- `INVALID_PATH_PREFIX` (400) - Path prefix validation failed
- `INVALID_TARGET_URL` (400) - External route target URL validation failed
- `INVALID_ROUTE_NAME` (400) - Route name validation failed
- `MISSING_PROXY_PORT` (400) - Proxy configuration missing required port
- `STACK_NOT_FOUND` (404) - Stack doesn't exist
- `SERVICE_NOT_FOUND` (404) - Service doesn't exist in stack
- `ROUTE_NOT_FOUND` (404) - Proxy route not found
- `ROUTE_CONFLICT` (409) - Domain/path combination already in use
- `STACK_ALREADY_EXISTS` (409) - Duplicate stack name
- `DOCKER_API_ERROR` (500) - Docker communication failure
- `TRAEFIK_ERROR` (500) - Traefik configuration/communication failure
- `SSL_PROVISIONING_ERROR` (500) - SSL certificate provisioning failed
- `DATABASE_ERROR` (500) - SQLite operation failure

### Update Behavior

When updating stacks (PUT /stacks/{stackId}):
- Services not in request → removed (containers stopped and deleted)
- Services with new IDs → added as new
- Existing services → updated with new config (container recreated if config changed)
- Routes → completely replaced (old routes removed, new routes added)

### System Routes

Built-in routes automatically configured:
1. **Stack App API:** `{any-host}/stack/*` → Stack App API (path prefix stripped)
2. **Traefik Dashboard:** `{any-host}/traefik/*` → Traefik dashboard (requires API key)

These are configurable in config.yaml and can be disabled or changed to different paths.

## NPM Package Structure

When implementing, follow this structure:

```
package.json
bin/
  stack-app              # CLI executable
lib/
  index.js               # Main application entry
  api/                   # API route handlers
    stacks.js
    services.js
    proxy.js
    health.js
  db/                    # Database management
    init.js
    stacks.js
    services.js
    routes.js
  docker/                # Docker API integration
    containers.js
    networks.js
    volumes.js
  traefik/               # Traefik management
    deploy.js
    config-generator.js
    labels.js
    file-provider.js
  ssl/                   # SSL/certificate management
    acme.js
    certs.js
  config/                # Configuration management
    loader.js
    validator.js
  middleware/            # Express middleware
    auth.js
    validation.js
    error-handler.js
  utils/                 # Utility functions
    validation.js
    naming.js
```

CLI usage:
```bash
npm install -g @stack-app/docker-stack-api
stack-app --config /path/to/config.yaml
stack-app --port 3001
```

## Docker Deployment

Base image: `node:18-alpine`

Required volume mounts:
- `/var/run/docker.sock:/var/run/docker.sock:ro` - Docker socket access
- `./config:/etc/stack-app:ro` - Configuration
- `./data:/var/lib/stack-app:rw` - Database storage
- `stack-app-certs:/etc/traefik/certs:rw` - SSL certificates (shared with Traefik)

Required network:
- `traefik-proxy` - Shared network between Stack App and Traefik

Health check endpoint: `http://localhost:3001/health`

Example docker-compose.yaml for Stack App itself:
```yaml
version: '3.8'

services:
  stack-app:
    image: stack-app:latest
    container_name: stack-app
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./config:/etc/stack-app:ro
      - ./data:/var/lib/stack-app:rw
      - stack-app-certs:/etc/traefik/certs:rw
    networks:
      - traefik-proxy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  traefik-proxy:
    external: true

volumes:
  stack-app-certs:
```

## Reference Documentation

Complete requirements specification organized as:

1. **requirements/index.md** - Main SRS document with high-level requirements
2. **requirements/api-specification.md** - API endpoint details
3. **requirements/data-models.md** - JSON schemas
4. **requirements/database-schema.md** - SQLite schema
5. **requirements/validation-rules.md** - Validation patterns
6. **requirements/examples/full-stack.md** - Complete working example

## Key Implementation Notes

1. **Routes are part of Stack config**, not separate entities
2. **External routes are stacks with empty services array**
3. **Priority field controls Traefik evaluation order** (100 before 90 before 1)
4. **XOR constraint on routes**: Either serviceId OR externalTarget, never both
5. **Container naming**: `{stack-id}-{service-id}` must be ≤ 63 chars
6. **System routes** `/stack` and `/traefik` are configurable
7. **Traefik auto-deploys** on Stack App startup
8. **Service routes** use Docker labels, **external routes** use file provider
9. **Multiple SSL providers** can be used in single stack (different routes)
10. **stripPrefix** removes path before forwarding (useful for external routes)

## Development Workflow

When implementing features:
1. Read relevant sections from requirements/index.md and sub-documents
2. Check validation rules before implementing input handling
3. Reference data models for exact schema
4. Use examples as implementation guides
5. Follow database schema exactly (including indexes and constraints)
6. Implement error codes as specified
7. Test with examples from requirements/examples/

## Future Considerations

- Horizontal scaling (multiple Stack App instances with shared database)
- Advanced health checking and auto-recovery
- Webhook notifications for events
- Metrics and monitoring integration (Prometheus)
- Backup/restore functionality
- Stack templates and presets
- Web UI for management (optional)
