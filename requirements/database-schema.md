# Database Schema

**Version:** 1.1
**Document:** Database Schema for Stack App

---

## Table of Contents

1. [Overview](#overview)
2. [Database Configuration](#database-configuration)
3. [Tables](#tables)
   - [Stacks Table](#stacks-table)
   - [Services Table](#services-table)
   - [Stack Routes Table](#stack-routes-table)
   - [SSL Certificates Table](#ssl-certificates-table)
4. [Indexes](#indexes)
5. [Relationships](#relationships)
6. [Data Storage Patterns](#data-storage-patterns)

---

## Overview

Stack App uses SQLite as its embedded database for persistent storage of stack configurations, service metadata, routing rules, and SSL certificate information.

**Database Type:** SQLite 3.x
**Default Location:** `/var/lib/stack-app/stacks.db`
**Encoding:** UTF-8
**Journal Mode:** WAL (Write-Ahead Logging) for better concurrency

---

## Database Configuration

### Initialization

The database is automatically initialized on first run with all required tables, indexes, and constraints.

### Backup Recommendations

- Daily backups of `/var/lib/stack-app/stacks.db`
- WAL file (`stacks.db-wal`) should be backed up together with main database
- Use `PRAGMA wal_checkpoint(TRUNCATE)` before backup for consistency

### Configuration in config.yaml

```yaml
database:
  type: sqlite
  path: /var/lib/stack-app/stacks.db
  # Optional settings
  backup:
    enabled: true
    path: /var/lib/stack-app/backups
    retention: 7  # days
```

---

## Tables

### Stacks Table

Stores high-level stack metadata.

```sql
CREATE TABLE stacks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | TEXT | NO | Stack identifier (1-31 chars, pattern: `^[a-z0-9]+(-[a-z0-9]+)*$`) |
| `name` | TEXT | NO | Display name (same as id) |
| `created_at` | DATETIME | NO | Timestamp when stack was created (ISO 8601) |
| `updated_at` | DATETIME | NO | Timestamp when stack was last updated (ISO 8601) |

**Constraints:**
- Primary Key: `id`
- Unique: `id` must be unique across all stacks

**Example Data:**
```sql
INSERT INTO stacks (id, name) VALUES ('web-app', 'web-app');
INSERT INTO stacks (id, name) VALUES ('external-proxies', 'external-proxies');
```

---

### Services Table

Stores service (container) configurations within stacks.

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

**Columns:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | TEXT | NO | Service identifier within stack (1-31 chars) |
| `stack_id` | TEXT | NO | Reference to parent stack |
| `name` | TEXT | NO | Display name (same as id) |
| `image` | TEXT | NO | Docker image reference (e.g., `nginx:latest`) |
| `config_json` | TEXT | NO | JSON-serialized ContainerConfiguration object |
| `created_at` | DATETIME | NO | Timestamp when service was created |
| `updated_at` | DATETIME | NO | Timestamp when service was last updated |

**Constraints:**
- Primary Key: Composite (`id`, `stack_id`)
- Foreign Key: `stack_id` references `stacks(id)` with CASCADE DELETE
- Unique: `id` must be unique within each stack

**config_json Structure:**
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
    "API_URL": "https://api.example.com"
  },
  "volumes": [
    {
      "name": "data",
      "type": "volume",
      "source": "web-app-data",
      "target": "/data",
      "readOnly": false
    }
  ],
  "command": ["npm", "start"],
  "entrypoint": null,
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
    "com.example.app": "web-app"
  },
  "resources": {
    "limits": {
      "cpus": "1.0",
      "memory": "512M"
    }
  }
}
```

**Example Data:**
```sql
INSERT INTO services (id, stack_id, name, image, config_json)
VALUES (
  'frontend',
  'web-app',
  'frontend',
  'nginx:alpine',
  '{"ports":[{"name":"http","containerPort":80}],"environment":{"NODE_ENV":"production"},"volumes":[]}'
);
```

---

### Stack Routes Table

Stores routing configuration for both service-based and external proxy routes.

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
```

**Columns:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | NO | Auto-increment primary key |
| `route_name` | TEXT | NO | Route identifier within stack |
| `stack_id` | TEXT | NO | Reference to parent stack |
| `service_id` | TEXT | YES | Service ID (for container routes) - mutually exclusive with external_target |
| `external_target` | TEXT | YES | External URL (for proxy routes) - mutually exclusive with service_id |
| `domains_json` | TEXT | NO | JSON array of domain names (e.g., `["example.com", "www.example.com"]`) |
| `path_prefix` | TEXT | YES | URL path prefix (e.g., `/api`, `/admin`) |
| `port` | INTEGER | YES | Container port (required for service routes, ignored for external routes) |
| `ssl_enabled` | BOOLEAN | NO | Whether SSL/TLS is enabled for this route |
| `ssl_provider` | TEXT | NO | Certificate resolver: `letsencrypt`, `letsencrypt-staging`, `custom` |
| `ssl_cert_resolver` | TEXT | YES | Custom Traefik cert resolver name (overrides ssl_provider) |
| `ssl_challenge_type` | TEXT | NO | ACME challenge type: `http`, `tlsalpn`, `dns` |
| `ssl_dns_provider` | TEXT | YES | DNS provider for DNS-01 challenge (e.g., `cloudflare`, `route53`) |
| `ssl_email` | TEXT | YES | Email for Let's Encrypt notifications |
| `ssl_custom_cert_path` | TEXT | YES | Path to custom certificate file |
| `ssl_custom_key_path` | TEXT | YES | Path to custom private key file |
| `redirect_to_https` | BOOLEAN | NO | Whether to redirect HTTP to HTTPS |
| `strip_prefix` | BOOLEAN | NO | Whether to strip path prefix before forwarding |
| `headers_json` | TEXT | YES | JSON object of custom headers to add |
| `middleware_json` | TEXT | YES | JSON array of Traefik middleware names |
| `healthcheck_json` | TEXT | YES | JSON object with health check configuration |
| `priority` | INTEGER | NO | Router priority (higher = evaluated first) |
| `created_at` | DATETIME | NO | Timestamp when route was created |
| `updated_at` | DATETIME | NO | Timestamp when route was last updated |

**Constraints:**
- Primary Key: `id` (auto-increment)
- Foreign Key: `stack_id` references `stacks(id)` with CASCADE DELETE
- Unique: Composite (`stack_id`, `route_name`)
- Check: Either `service_id` OR `external_target` must be set (XOR constraint)

**Important Notes:**
- **Service Routes:** `service_id` is set, `external_target` is NULL, `port` is required
- **External Routes:** `external_target` is set, `service_id` is NULL, `port` is ignored

**Example Data (Service Route):**
```sql
INSERT INTO stack_routes (
  route_name, stack_id, service_id, external_target, domains_json,
  port, ssl_enabled, ssl_provider, ssl_email, priority
) VALUES (
  'production',
  'web-app',
  'frontend',
  NULL,
  '["example.com", "www.example.com"]',
  80,
  1,
  'letsencrypt',
  'admin@example.com',
  100
);
```

**Example Data (External Route):**
```sql
INSERT INTO stack_routes (
  route_name, stack_id, service_id, external_target, domains_json,
  ssl_enabled, ssl_provider, strip_prefix, priority
) VALUES (
  'legacy-api',
  'external-proxies',
  NULL,
  'http://localhost:8080',
  '["legacy.example.com"]',
  1,
  'letsencrypt',
  0,
  50
);
```

---

### SSL Certificates Table

Stores SSL/TLS certificate metadata managed by Traefik.

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

**Columns:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `domain` | TEXT | NO | Primary domain name for certificate |
| `cert_path` | TEXT | NO | File path to certificate file |
| `key_path` | TEXT | NO | File path to private key file |
| `expiry_date` | DATETIME | NO | Certificate expiration date (ISO 8601) |
| `last_renewed` | DATETIME | YES | Timestamp of last renewal attempt |
| `auto_renew` | BOOLEAN | NO | Whether auto-renewal is enabled |
| `created_at` | DATETIME | NO | Timestamp when certificate was created |
| `updated_at` | DATETIME | NO | Timestamp when record was last updated |

**Constraints:**
- Primary Key: `domain`

**Example Data:**
```sql
INSERT INTO ssl_certificates (domain, cert_path, key_path, expiry_date, auto_renew)
VALUES (
  'example.com',
  '/etc/traefik/certs/example.com.crt',
  '/etc/traefik/certs/example.com.key',
  '2026-01-02T00:00:00.000Z',
  1
);
```

---

## Indexes

### Stack Routes Indexes

```sql
CREATE INDEX idx_stack_routes_domain ON stack_routes(domains_json);
CREATE INDEX idx_stack_routes_stack ON stack_routes(stack_id);
CREATE INDEX idx_stack_routes_service ON stack_routes(service_id);
```

**Purpose:**
- `idx_stack_routes_domain`: Fast lookup of routes by domain name
- `idx_stack_routes_stack`: Fast retrieval of all routes for a stack
- `idx_stack_routes_service`: Fast lookup of routes for a specific service

---

## Relationships

### Entity Relationship Diagram

```
┌─────────────┐
│   stacks    │
│             │
│ id (PK)     │◄──────────┐
│ name        │           │
│ created_at  │           │
│ updated_at  │           │
└─────────────┘           │
                          │ CASCADE DELETE
       ┌──────────────────┼──────────────────┐
       │                  │                  │
       │                  │                  │
┌──────▼────────┐  ┌──────▼────────────┐    │
│   services    │  │  stack_routes     │    │
│               │  │                   │    │
│ id (PK)       │  │ id (PK)           │    │
│ stack_id (PK) │──┤ route_name        │    │
│ name          │  │ stack_id (FK)     │────┘
│ image         │  │ service_id (FK)   │◄───┘ (optional)
│ config_json   │  │ external_target   │
│ created_at    │  │ domains_json      │
│ updated_at    │  │ ...               │
└───────────────┘  └───────────────────┘

                   ┌──────────────────┐
                   │ ssl_certificates │
                   │                  │
                   │ domain (PK)      │
                   │ cert_path        │
                   │ key_path         │
                   │ expiry_date      │
                   │ ...              │
                   └──────────────────┘
```

**Relationships:**
1. **stacks → services**: One-to-Many (CASCADE DELETE)
2. **stacks → stack_routes**: One-to-Many (CASCADE DELETE)
3. **services → stack_routes**: One-to-Many (optional reference, no FK constraint)
4. **ssl_certificates**: Independent table (managed by Traefik metadata)

---

## Data Storage Patterns

### JSON Columns

Several columns store JSON-serialized data for flexibility:

**config_json (services table):**
- Full ContainerConfiguration object
- Allows dynamic schema evolution without migrations

**domains_json (stack_routes table):**
- Array of domain names: `["example.com", "www.example.com"]`
- Enables multi-domain routing per route

**headers_json (stack_routes table):**
- Custom HTTP headers: `{"X-Frame-Options": "DENY", "X-Custom": "value"}`

**middleware_json (stack_routes table):**
- Traefik middleware names: `["auth", "compress", "rate-limit"]`

**healthcheck_json (stack_routes table):**
- Health check configuration for Traefik monitoring

### Timestamps

All tables use ISO 8601 format for timestamps:
- Format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Example: `2025-10-02T10:30:00.000Z`
- Timezone: UTC (Z suffix)

### Boolean Values

SQLite stores booleans as integers:
- `0` = false
- `1` = true

---

## Migration Strategy

Future schema changes should be handled through versioned migrations:

1. **Migration Files:** `migrations/001_initial.sql`, `migrations/002_add_priority.sql`, etc.
2. **Version Tracking:** Add `schema_version` table to track applied migrations
3. **Backward Compatibility:** Support reading old schema formats during transition

**Example Migration Table:**
```sql
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);
```
