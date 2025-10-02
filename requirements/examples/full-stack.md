# Full Stack Example - Complete Application with Mixed Routing

This example demonstrates a complete Stack App configuration combining:
- Containerized services
- External API proxying
- Path-based routing
- SSL/TLS with Let's Encrypt
- Mixed internal and external targets

## Requirements

Route all traffic through `example.com` with the following configuration:

| Path | Target | Description |
|------|--------|-------------|
| `example.com/` | Docker container `example/website` | Main website |
| `example.com/auth/*` | `https://auth.authsaas.com/api/v1` | External auth service |
| `example.com/api/*` | `https://api.internal.example.com:8080/api` | Internal API server |
| `example.com/media/*` | `https://example-bucket.s3.amazonaws.com` | S3 bucket for media |

## Stack Configuration

### Stack Creation Request

```bash
curl -X POST http://your-server/stack/api/v1/stacks \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d @full-stack-example.json
```

### full-stack-example.json

```json
{
  "id": "example-com",
  "services": [
    {
      "id": "website",
      "image": "example/website:latest",
      "containerConfig": {
        "ports": [
          {
            "name": "http",
            "containerPort": 80
          }
        ],
        "environment": {
          "NODE_ENV": "production",
          "API_URL": "https://example.com/api",
          "AUTH_URL": "https://example.com/auth"
        },
        "volumes": []
      }
    }
  ],
  "routes": [
    {
      "name": "main-website",
      "serviceId": "website",
      "domains": ["example.com", "www.example.com"],
      "port": 80,
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt",
        "email": "admin@example.com",
        "challengeType": "http"
      },
      "redirectToHttps": true,
      "priority": 1
    },
    {
      "name": "auth-service",
      "externalTarget": "https://auth.authsaas.com/api/v1",
      "domains": ["example.com"],
      "pathPrefix": "/auth",
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt",
        "email": "admin@example.com",
        "challengeType": "http"
      },
      "redirectToHttps": true,
      "stripPrefix": true,
      "headers": {
        "X-Forwarded-Host": "example.com",
        "X-Forwarded-Proto": "https"
      },
      "priority": 100
    },
    {
      "name": "internal-api",
      "externalTarget": "https://api.internal.example.com:8080/api",
      "domains": ["example.com"],
      "pathPrefix": "/api",
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt",
        "email": "admin@example.com",
        "challengeType": "http"
      },
      "redirectToHttps": true,
      "stripPrefix": false,
      "headers": {
        "X-Forwarded-Host": "example.com",
        "X-Forwarded-Proto": "https"
      },
      "priority": 90
    },
    {
      "name": "media-bucket",
      "externalTarget": "https://example-bucket.s3.amazonaws.com",
      "domains": ["example.com"],
      "pathPrefix": "/media",
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt",
        "email": "admin@example.com",
        "challengeType": "http"
      },
      "redirectToHttps": true,
      "stripPrefix": true,
      "headers": {
        "Cache-Control": "public, max-age=31536000"
      },
      "priority": 80
    }
  ]
}
```

## Configuration Explanation

### Service Configuration

**website service:**
- Container: `example/website:latest`
- Internal port: 80
- Environment variables configured to point to proxied endpoints

### Route Configuration

#### 1. Main Website Route (`priority: 1`)
```json
{
  "name": "main-website",
  "serviceId": "website",
  "domains": ["example.com", "www.example.com"],
  "port": 80,
  "priority": 1
}
```

**Behavior:**
- Catches all traffic to `example.com` that doesn't match higher priority routes
- Routes to the `website` Docker container on port 80
- Lowest priority ensures it acts as the default/fallback route

#### 2. Auth Service Route (`priority: 100`)
```json
{
  "name": "auth-service",
  "externalTarget": "https://auth.authsaas.com/api/v1",
  "pathPrefix": "/auth",
  "stripPrefix": true,
  "priority": 100
}
```

**Behavior:**
- `https://example.com/auth/signin` → `https://auth.authsaas.com/api/v1/signin`
- `stripPrefix: true` removes `/auth` before forwarding
- Highest priority to ensure it matches before the catch-all website route
- Forwards `X-Forwarded-Host` and `X-Forwarded-Proto` headers for the external service

#### 3. Internal API Route (`priority: 90`)
```json
{
  "name": "internal-api",
  "externalTarget": "https://api.internal.example.com:8080/api",
  "pathPrefix": "/api",
  "stripPrefix": false,
  "priority": 90
}
```

**Behavior:**
- `https://example.com/api/products` → `https://api.internal.example.com:8080/api/products`
- `stripPrefix: false` keeps `/api` in the path
- High priority to match before website route
- Proxies to internal API server

#### 4. Media/S3 Bucket Route (`priority: 80`)
```json
{
  "name": "media-bucket",
  "externalTarget": "https://example-bucket.s3.amazonaws.com",
  "pathPrefix": "/media",
  "stripPrefix": true,
  "priority": 80
}
```

**Behavior:**
- `https://example.com/media/user1234/dp.jpg` → `https://example-bucket.s3.amazonaws.com/user1234/dp.jpg`
- `stripPrefix: true` removes `/media` before forwarding to S3
- Adds cache headers for browser caching
- High priority to match before website route

## Priority Explanation

Routes are evaluated by Traefik in order of priority (highest first):

1. **Priority 100** - `/auth/*` - Most specific path
2. **Priority 90** - `/api/*` - Specific path
3. **Priority 80** - `/media/*` - Specific path
4. **Priority 1** - `/*` - Catch-all for website

This ensures path-based routes match before the default website route.

## URL Resolution Examples

| User Request | Resolved Target | Notes |
|-------------|----------------|-------|
| `http://example.com` | Redirected to `https://example.com` | HTTP→HTTPS redirect |
| `https://example.com` | `http://website:80/` | Container service |
| `https://example.com/about` | `http://website:80/about` | Container service |
| `https://example.com/auth/signin` | `https://auth.authsaas.com/api/v1/signin` | External auth SaaS |
| `https://example.com/auth/logout` | `https://auth.authsaas.com/api/v1/logout` | External auth SaaS |
| `https://example.com/api/products` | `https://api.internal.example.com:8080/api/products` | Internal API (path preserved) |
| `https://example.com/api/users/123` | `https://api.internal.example.com:8080/api/users/123` | Internal API (path preserved) |
| `https://example.com/media/user1234/dp.jpg` | `https://example-bucket.s3.amazonaws.com/user1234/dp.jpg` | S3 bucket |
| `https://www.example.com` | `http://website:80/` | www subdomain works |

## Generated Traefik Configuration

Stack App will generate the following Traefik configuration:

### Docker Labels (for website container)
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.example-com-website.rule=Host(`example.com`,`www.example.com`)"
  - "traefik.http.routers.example-com-website.entrypoints=websecure"
  - "traefik.http.routers.example-com-website.tls=true"
  - "traefik.http.routers.example-com-website.tls.certresolver=letsencrypt"
  - "traefik.http.routers.example-com-website.priority=1"
  - "traefik.http.services.example-com-website.loadbalancer.server.port=80"
  - "traefik.docker.network=traefik-proxy"
```

### File Provider Configuration (for external routes)

**File: `/etc/traefik/dynamic/stack-routes.yaml`**

```yaml
http:
  routers:
    # Auth service route
    example-com-auth-service-secure:
      rule: "Host(`example.com`) && PathPrefix(`/auth`)"
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      middlewares:
        - example-com-auth-service-stripprefix
        - example-com-auth-service-headers
      service: example-com-auth-service
      priority: 100

    # Internal API route
    example-com-internal-api-secure:
      rule: "Host(`example.com`) && PathPrefix(`/api`)"
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      middlewares:
        - example-com-internal-api-headers
      service: example-com-internal-api
      priority: 90

    # Media bucket route
    example-com-media-bucket-secure:
      rule: "Host(`example.com`) && PathPrefix(`/media`)"
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      middlewares:
        - example-com-media-bucket-stripprefix
        - example-com-media-bucket-headers
      service: example-com-media-bucket
      priority: 80

  services:
    example-com-auth-service:
      loadBalancer:
        servers:
          - url: "https://auth.authsaas.com/api/v1"

    example-com-internal-api:
      loadBalancer:
        servers:
          - url: "https://api.internal.example.com:8080/api"

    example-com-media-bucket:
      loadBalancer:
        servers:
          - url: "https://example-bucket.s3.amazonaws.com"

  middlewares:
    example-com-auth-service-stripprefix:
      stripPrefix:
        prefixes:
          - "/auth"

    example-com-auth-service-headers:
      headers:
        customRequestHeaders:
          X-Forwarded-Host: "example.com"
          X-Forwarded-Proto: "https"

    example-com-internal-api-headers:
      headers:
        customRequestHeaders:
          X-Forwarded-Host: "example.com"
          X-Forwarded-Proto: "https"

    example-com-media-bucket-stripprefix:
      stripPrefix:
        prefixes:
          - "/media"

    example-com-media-bucket-headers:
      headers:
        customRequestHeaders:
          Cache-Control: "public, max-age=31536000"
```

## Starting the Stack

```bash
# Create the stack
curl -X POST http://your-server/stack/api/v1/stacks \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d @full-stack-example.json

# Start all services
curl -X POST http://your-server/stack/api/v1/stacks/example-com/start \
  -H "X-API-Key: your-api-key-here"

# Check status
curl http://your-server/stack/api/v1/stacks/example-com/status \
  -H "X-API-Key: your-api-key-here"
```

## Verification

```bash
# Test main website
curl -I https://example.com

# Test auth service
curl -I https://example.com/auth/signin

# Test internal API
curl -I https://example.com/api/products

# Test media bucket
curl -I https://example.com/media/user1234/dp.jpg

# View all routes
curl http://your-server/stack/api/v1/proxy/routes \
  -H "X-API-Key: your-api-key-here"

# View SSL certificates
curl http://your-server/stack/api/v1/proxy/certificates \
  -H "X-API-Key: your-api-key-here"
```

## Updating Routes

To add or modify routes without affecting running containers:

```bash
curl -X PUT http://your-server/stack/api/v1/stacks/example-com \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "example-com",
    "services": [...],
    "routes": [
      ...existing routes...,
      {
        "name": "new-service",
        "externalTarget": "https://new-service.com",
        "domains": ["example.com"],
        "pathPrefix": "/new",
        "ssl": {
          "enabled": true,
          "provider": "letsencrypt"
        },
        "stripPrefix": true,
        "priority": 70
      }
    ]
  }'
```

## Notes

### stripPrefix Behavior

- **stripPrefix: true** - Removes the path prefix before forwarding
  - `example.com/auth/signin` → `auth.authsaas.com/api/v1/signin`
  - Use when external service doesn't expect the prefix

- **stripPrefix: false** - Keeps the path prefix
  - `example.com/api/products` → `api.internal.example.com:8080/api/products`
  - Use when external service expects the full path

### Priority Guidelines

- **100-999**: Specific path-based routes (highest priority)
- **10-99**: Domain-based routes with some specificity
- **1-9**: Catch-all/default routes (lowest priority)

Higher numbers = higher priority = evaluated first by Traefik

### SSL Certificates

All routes use the same `letsencrypt` resolver with HTTP-01 challenge. A single certificate for `example.com` will be provisioned and shared across all routes.

For wildcard certificates, use DNS challenge:
```json
"ssl": {
  "enabled": true,
  "provider": "letsencrypt",
  "challengeType": "dns",
  "dnsProvider": "cloudflare"
}
```

### Headers

Custom headers are useful for:
- **X-Forwarded-Host / X-Forwarded-Proto**: Tell external services the original host/protocol
- **Cache-Control**: Control browser caching for static assets
- **X-Frame-Options**: Security headers
- **Authorization**: Pass through auth tokens

## Troubleshooting

### Route not matching

Check priority values - higher priority routes are evaluated first. Path-specific routes should have higher priority than catch-all routes.

### External target not reachable

Verify the external URL is accessible from the Docker host:
```bash
curl -v https://auth.authsaas.com/api/v1/health
```

### SSL certificate issues

Check certificate status:
```bash
curl http://your-server/stack/api/v1/proxy/certificates \
  -H "X-API-Key: your-api-key-here"
```

View Traefik logs:
```bash
docker logs stack-app-traefik
```

### Path not stripped correctly

Verify `stripPrefix` setting matches your external service expectations. Test with curl:
```bash
# With stripPrefix: true
curl -v https://example.com/auth/signin

# Check what the external service receives
```
