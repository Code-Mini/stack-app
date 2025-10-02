# Validation Rules

**Version:** 1.1
**Document:** Input Validation Rules for Stack App

---

## Table of Contents

1. [Overview](#overview)
2. [Stack Validation](#stack-validation)
3. [Service Validation](#service-validation)
4. [Route Validation](#route-validation)
5. [SSL Configuration Validation](#ssl-configuration-validation)
6. [Container Configuration Validation](#container-configuration-validation)
7. [Cross-Entity Validation](#cross-entity-validation)

---

## Overview

All input data must pass validation before being stored or processed. Validation failures result in HTTP 400 Bad Request responses with specific error codes.

**Validation Principles:**
- Fail fast - validate at API entry point
- Specific error messages - indicate which field failed and why
- No partial updates - all-or-nothing validation
- Consistent patterns - reuse validation logic across entities

---

## Stack Validation

### VR-001: Stack ID/Name Validation

**Rule:**
- Length: 1-31 characters
- Pattern: `^[a-z0-9]+(-[a-z0-9]+)*$`
- Case: Lowercase only
- Uniqueness: Must be unique across all stacks

**Valid Examples:**
```
web-app
my-stack
api-gateway-v2
production-env
```

**Invalid Examples:**
```
Web-App           # Uppercase not allowed
my_stack          # Underscores not allowed
-web-app          # Cannot start with hyphen
web-app-          # Cannot end with hyphen
web--app          # Consecutive hyphens not allowed
veryverylongstacknamethatisfarmorethan31characters  # Too long
```

**Error Response:**
```json
{
  "error": "INVALID_STACK_NAME",
  "message": "Stack ID must be 1-31 lowercase alphanumeric characters with hyphens (pattern: ^[a-z0-9]+(-[a-z0-9]+)*$)",
  "details": {
    "field": "id",
    "value": "Web-App",
    "reason": "Contains uppercase characters"
  }
}
```

---

## Service Validation

### VR-002: Service ID/Name Validation

**Rule:**
- Length: 1-31 characters
- Pattern: `^[a-z0-9]+(-[a-z0-9]+)*$`
- Case: Lowercase only
- Uniqueness: Must be unique within stack
- Container Name Check: `{stack-id}-{service-id}` must be ≤ 63 characters

**Valid Examples:**
```
frontend
backend
api-server
db-postgres
cache-redis
```

**Invalid Examples:**
```
Frontend          # Uppercase not allowed
api_server        # Underscores not allowed
-frontend         # Cannot start with hyphen
frontend-         # Cannot end with hyphen
api--server       # Consecutive hyphens not allowed
```

**Container Name Length Validation:**

Combined container name = `{stack-id}-{service-id}`

**Example:**
- Stack ID: `my-application-stack` (21 chars)
- Service ID: `frontend-web-server` (19 chars)
- Container name: `my-application-stack-frontend-web-server` (40 chars) ✓ Valid

- Stack ID: `very-long-stack-name-for-production` (35 chars)
- Service ID: `very-long-service-name-identifier` (33 chars)
- Container name: `very-long-stack-name-for-production-very-long-service-name-identifier` (69 chars) ✗ Invalid (exceeds 63)

**Error Response:**
```json
{
  "error": "CONTAINER_NAME_TOO_LONG",
  "message": "Combined container name exceeds 63 characters",
  "details": {
    "stackId": "very-long-stack-name-for-production",
    "serviceId": "very-long-service-name-identifier",
    "containerName": "very-long-stack-name-for-production-very-long-service-name-identifier",
    "length": 69,
    "maxLength": 63
  }
}
```

---

### VR-003: Docker Image Validation

**Rule:**
- Format: Valid Docker image reference
- Pattern: `^([a-zA-Z0-9._-]+(/[a-zA-Z0-9._-]+)*)(:[a-zA-Z0-9._-]+)?(@sha256:[a-f0-9]{64})?$`
- Must not be empty

**Valid Examples:**
```
nginx
nginx:latest
nginx:1.21-alpine
mysql:8.0
registry.example.com/myapp/api:v1.2.3
ghcr.io/org/repo:sha-abc123
nginx@sha256:abcd1234...  # Digest reference
```

**Invalid Examples:**
```
                  # Empty string
nginx:            # Tag cannot be empty
nginx::latest     # Invalid format
NGINX:latest      # Uppercase in name (technically valid but discouraged)
```

**Error Response:**
```json
{
  "error": "INVALID_IMAGE",
  "message": "Docker image reference is invalid",
  "details": {
    "field": "image",
    "value": "nginx:",
    "reason": "Tag cannot be empty"
  }
}
```

---

## Route Validation

### VR-004: Route Name Validation

**Rule:**
- Length: 1-63 characters
- Pattern: `^[a-z0-9]+(-[a-z0-9]+)*$`
- Case: Lowercase only
- Uniqueness: Must be unique within stack

**Valid Examples:**
```
production
staging
api-route
main-website
external-auth
```

**Invalid Examples:**
```
Production        # Uppercase not allowed
api_route         # Underscores not allowed
-production       # Cannot start with hyphen
```

---

### VR-005: Domain Name Validation

**Rule:**
- Format: Valid FQDN (Fully Qualified Domain Name)
- Pattern: `^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$`
- Must not include protocol (`http://`, `https://`)
- Must not include port (`:8080`)
- Must not include path (`/api`)

**Valid Examples:**
```
example.com
www.example.com
api.example.com
api-v2.example.com
app.staging.example.com
my-app.co.uk
```

**Invalid Examples:**
```
example           # No TLD
.example.com      # Starts with dot
example.com.      # Ends with dot
http://example.com  # Protocol included
example.com:8080  # Port included
example.com/api   # Path included
Example.com       # Uppercase (should be normalized to lowercase)
-api.example.com  # Subdomain starts with hyphen
```

**Error Response:**
```json
{
  "error": "INVALID_DOMAIN",
  "message": "Domain name is not a valid FQDN",
  "details": {
    "field": "domains",
    "value": "http://example.com",
    "reason": "Domain must not include protocol"
  }
}
```

---

### VR-006: Path Prefix Validation

**Rule:**
- Must start with `/`
- Pattern: `^/[a-z0-9\-/]*$`
- Cannot end with `/` (unless root path `/`)
- Lowercase only

**Valid Examples:**
```
/api
/admin
/api/v1
/auth/signin
/
```

**Invalid Examples:**
```
api               # Must start with /
/api/             # Cannot end with / (unless root)
/API              # Uppercase not allowed
/api_v1           # Underscores not allowed
//api             # Double slashes not allowed
```

**Error Response:**
```json
{
  "error": "INVALID_PATH_PREFIX",
  "message": "Path prefix must start with / and contain only lowercase alphanumeric characters, hyphens, and slashes",
  "details": {
    "field": "pathPrefix",
    "value": "/api/",
    "reason": "Path prefix cannot end with / unless it is the root path"
  }
}
```

---

### VR-007: External Target URL Validation

**Rule:**
- Must be valid URL or host:port format
- URL Pattern: `^https?://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$`
- Host:Port Pattern: `^[a-zA-Z0-9.-]+:[0-9]+$`
- Must not be empty

**Valid Examples:**
```
http://localhost:8080
https://api.example.com
http://192.168.1.100:3000
https://api.external.com/v1/endpoint
localhost:8080
api.internal:9000
```

**Invalid Examples:**
```
                  # Empty string
example.com       # Missing protocol or port
ftp://example.com # Invalid protocol
http://           # Missing host
http://example.com:abc  # Port must be numeric
```

**Error Response:**
```json
{
  "error": "INVALID_TARGET_URL",
  "message": "External target must be a valid URL or host:port format",
  "details": {
    "field": "externalTarget",
    "value": "ftp://example.com",
    "reason": "Protocol must be http or https"
  }
}
```

---

### VR-008: Route Port Validation

**Rule:**
- Required for service routes (`serviceId` is set)
- Not allowed for external routes (`externalTarget` is set)
- Must be integer between 1-65535

**Valid Examples:**
```
80
443
3000
8080
```

**Invalid Examples:**
```
0                 # Port must be >= 1
65536             # Port must be <= 65535
"80"              # Must be integer, not string
80.5              # Must be integer
```

**Error Response:**
```json
{
  "error": "MISSING_PROXY_PORT",
  "message": "Port is required for service routes",
  "details": {
    "field": "port",
    "routeName": "main",
    "serviceId": "frontend"
  }
}
```

---

### VR-009: Priority Validation

**Rule:**
- Must be non-negative integer
- No upper limit enforced
- Default: 0

**Valid Examples:**
```
0
1
100
999
10000
```

**Invalid Examples:**
```
-1                # Cannot be negative
1.5               # Must be integer
"100"             # Must be number, not string
```

---

## SSL Configuration Validation

### VR-010: SSL Provider Validation

**Rule:**
- Must be one of: `letsencrypt`, `letsencrypt-staging`, `custom`
- Default: `letsencrypt`

**Valid Examples:**
```
letsencrypt
letsencrypt-staging
custom
```

**Invalid Examples:**
```
lets-encrypt      # Incorrect spelling
LetsEncrypt       # Case-sensitive
custom-provider   # Not in allowed list
```

---

### VR-011: SSL Challenge Type Validation

**Rule:**
- Must be one of: `http`, `tlsalpn`, `dns`
- Default: `http`
- If `dns`, then `dnsProvider` is required

**Valid Examples:**
```
http
tlsalpn
dns
```

**Invalid Examples:**
```
HTTP              # Case-sensitive
http-01           # Use short form "http"
tls               # Use "tlsalpn"
```

---

### VR-012: DNS Provider Validation

**Rule:**
- Required when `challengeType` is `dns`
- Must be valid Traefik DNS provider name
- Examples: `cloudflare`, `route53`, `digitalocean`, `gandi`, `cloudns`

**Valid Examples:**
```
cloudflare
route53
digitalocean
gandi
```

**Invalid Examples:**
```
CloudFlare        # Case-sensitive
aws               # Use "route53"
```

**Error Response:**
```json
{
  "error": "INVALID_DNS_PROVIDER",
  "message": "DNS provider is required when using DNS-01 challenge",
  "details": {
    "field": "ssl.dnsProvider",
    "challengeType": "dns"
  }
}
```

---

### VR-013: Email Validation

**Rule:**
- Must be valid email format
- Pattern: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`

**Valid Examples:**
```
admin@example.com
user+tag@example.co.uk
```

**Invalid Examples:**
```
admin             # Missing @domain
@example.com      # Missing local part
admin@            # Missing domain
```

---

## Container Configuration Validation

### VR-014: Port Configuration Validation

**Rule:**
- `containerPort`: Required, integer 1-65535
- `hostPort`: Optional, integer 1-65535
- `protocol`: Optional, one of: `tcp`, `udp`, `sctp`
- `name`: Optional, pattern `^[a-z0-9]+(-[a-z0-9]+)*$`

**Valid Example:**
```json
{
  "name": "http",
  "containerPort": 80,
  "hostPort": 8080,
  "protocol": "tcp"
}
```

**Invalid Examples:**
```json
{
  "containerPort": 0         // Must be >= 1
}

{
  "containerPort": 80,
  "protocol": "TCP"          // Must be lowercase
}
```

---

### VR-015: Volume Configuration Validation

**Rule:**
- `type`: Required, one of: `volume`, `bind`, `tmpfs`
- `source`: Required (volume name or host path)
- `target`: Required (container path, must start with `/`)
- `readOnly`: Optional, boolean

**Valid Example:**
```json
{
  "name": "data",
  "type": "volume",
  "source": "my-app-data",
  "target": "/data",
  "readOnly": false
}
```

**Invalid Examples:**
```json
{
  "type": "volume",
  "target": "/data"          // Missing source
}

{
  "type": "volume",
  "source": "data",
  "target": "data"           // Target must start with /
}
```

---

### VR-016: Environment Variables Validation

**Rule:**
- Must be object (key-value pairs)
- Keys must be valid environment variable names: `^[A-Z_][A-Z0-9_]*$`
- Values must be strings

**Valid Example:**
```json
{
  "NODE_ENV": "production",
  "API_URL": "https://api.example.com",
  "PORT": "3000"
}
```

**Invalid Examples:**
```json
{
  "node-env": "production"   // Keys must be uppercase with underscores only
}

{
  "NODE_ENV": 123            // Values must be strings
}
```

---

## Cross-Entity Validation

### VR-017: Domain/Path Uniqueness

**Rule:**
- Domain + path prefix combination must be unique across ALL routes (service routes + external routes)
- Multiple routes cannot share the same domain/path
- Priority is used for routing order, not for allowing duplicates

**Validation Logic:**
```
For each new/updated route:
  For each existing route in ALL stacks:
    For each domain in route.domains:
      For each domain in existing.domains:
        If domains match AND pathPrefix match:
          ERROR: ROUTE_CONFLICT
```

**Example Conflict:**

**Existing Route:**
```json
{
  "name": "api-route",
  "domains": ["example.com"],
  "pathPrefix": "/api"
}
```

**New Route (CONFLICT):**
```json
{
  "name": "new-api",
  "domains": ["example.com"],
  "pathPrefix": "/api"      // Conflict!
}
```

**Error Response:**
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

### VR-018: Service ID Reference Validation

**Rule:**
- If `serviceId` is specified in a route, the service must exist in the same stack
- Service ID must match exactly (case-sensitive)

**Error Response:**
```json
{
  "error": "SERVICE_NOT_FOUND",
  "message": "Service referenced in route does not exist in stack",
  "details": {
    "routeName": "main",
    "serviceId": "frontend",
    "stackId": "web-app"
  }
}
```

---

### VR-019: Route Target Validation (XOR)

**Rule:**
- Either `serviceId` OR `externalTarget` must be specified
- Both cannot be specified at the same time
- Neither can be null/empty at the same time

**Valid Examples:**
```json
{
  "name": "service-route",
  "serviceId": "frontend",
  "externalTarget": null     // ✓ Service route
}

{
  "name": "external-route",
  "serviceId": null,
  "externalTarget": "http://localhost:8080"  // ✓ External route
}
```

**Invalid Examples:**
```json
{
  "name": "invalid",
  "serviceId": "frontend",
  "externalTarget": "http://localhost:8080"  // ✗ Both specified
}

{
  "name": "invalid",
  "serviceId": null,
  "externalTarget": null     // ✗ Neither specified
}
```

**Error Response:**
```json
{
  "error": "INVALID_ROUTE_TARGET",
  "message": "Route must specify either serviceId or externalTarget, but not both",
  "details": {
    "routeName": "invalid",
    "serviceId": "frontend",
    "externalTarget": "http://localhost:8080"
  }
}
```

---

## Validation Order

Validation should be performed in this order to provide the most helpful error messages:

1. **Schema Validation** - Check required fields, data types
2. **Format Validation** - Check patterns, lengths, allowed values
3. **Cross-Field Validation** - Check XOR constraints, conditional requirements
4. **Uniqueness Validation** - Check for duplicates
5. **Reference Validation** - Check foreign key relationships
6. **Business Logic Validation** - Check domain/path conflicts, container name length

This order ensures users get specific validation errors before encountering more complex constraint violations.
