# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Docker Stack Management API (Stack App) - A RESTful API service for managing Docker container stacks with persistent storage and direct Docker API integration.

**Status:** Initial planning phase - implementation not yet started.

## Architecture

### Core Components (To Be Implemented)

1. **API Layer** - RESTful endpoints for stack/service management
2. **Docker Integration** - Direct Docker Engine API communication via Unix socket
3. **Database Layer** - SQLite for persistent stack/service metadata
4. **Configuration** - YAML/JSON config file support

### Technology Stack

- **Runtime:** Node.js v18+
- **Database:** SQLite (embedded)
- **Docker API:** Via `/var/run/docker.sock`
- **Deployment:** NPM global package + Docker containerized option

### Key Design Patterns

- **Naming Convention:** Container names follow `{stack-id}-{service-id}` pattern (max 63 chars total)
- **Validation:** Stack/service IDs use pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$` (1-31 chars)
- **Authentication:** API key via `X-API-Key` header (all endpoints except `/health`)
- **Data Model:** Stacks contain Services; Services map 1:1 to Docker containers

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

**Monitoring:**
- `GET /stacks/{stackId}/logs` - Get all service logs
- `GET /stacks/{stackId}/services/{serviceId}` - Get service details
- `GET /stacks/{stackId}/services/{serviceId}/logs` - Get service logs

**Health:**
- `GET /health` - No authentication required

### Database Schema

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

api:
  port: 3001
  keys:
    - "1062e8cfd6e93f435eff03879299e08cbe0010ed3e24f6a66e2a4623cffa7261"

docker:
  socketPath: /var/run/docker.sock

logging:
  level: info
  path: /var/log/stack-app
```

### Error Handling

Standard error codes to implement:
- `INVALID_STACK_NAME` (400) - Stack name validation failed
- `INVALID_SERVICE_NAME` (400) - Service name validation failed
- `CONTAINER_NAME_TOO_LONG` (400) - Combined name exceeds 63 chars
- `STACK_NOT_FOUND` (404) - Stack doesn't exist
- `SERVICE_NOT_FOUND` (404) - Service doesn't exist in stack
- `STACK_ALREADY_EXISTS` (409) - Duplicate stack name
- `DOCKER_API_ERROR` (500) - Docker communication failure
- `DATABASE_ERROR` (500) - SQLite operation failure

### Update Behavior

When updating stacks (PUT /stacks/{stackId}):
- Services not in request → removed
- Services with unknown IDs → added as new
- Existing services → updated with new config

## NPM Package Structure

When implementing, follow this structure:

```
package.json
bin/
  stack-app              # CLI executable
lib/
  index.js               # Main application entry
  api/                   # API route handlers
  db/                    # Database management
  docker/                # Docker API integration
  config/                # Configuration management
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

Health check endpoint: `http://localhost:3001/health`

## Reference Documentation

Complete requirements specification in `REQUIREMENTS.md` including:
- Full API specifications with request/response examples
- Database schema details
- Validation rules and patterns
- Non-functional requirements (performance, security, reliability)
- Deployment requirements for both NPM and Docker
