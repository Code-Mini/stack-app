# Internal Services Stack Example

This example demonstrates running Stack App in a **private network environment** where services are only accessible internally (no internet access). This is common for:
- Internal corporate applications
- Development/staging environments
- Air-gapped networks
- Private data center deployments
- Intranet services

**Key Difference:** No Let's Encrypt SSL (requires internet). Uses HTTP or self-signed certificates instead.

---

## Use Case

You have internal services that should only be accessible within your organization's network:
- Internal API gateway
- Employee portal
- Database admin tools
- Development tools (Jenkins, GitLab, etc.)
- Internal dashboards and monitoring
- Private documentation sites

**Network Setup:**
```
Corporate Network: 192.168.1.0/24
Stack App Host: 192.168.1.100
Internal DNS: company.internal
No Internet Access or Internet via proxy only
```

---

## Stack Configuration (HTTP Only)

### Example: Internal Developer Tools

```json
{
  "id": "internal-tools",
  "services": [
    {
      "id": "gitlab",
      "image": "gitlab/gitlab-ce:latest",
      "containerConfig": {
        "ports": [
          {
            "name": "http",
            "containerPort": 80
          },
          {
            "name": "ssh",
            "containerPort": 22,
            "hostPort": 2222
          }
        ],
        "environment": {
          "GITLAB_OMNIBUS_CONFIG": "external_url 'http://gitlab.company.internal'"
        },
        "volumes": [
          {
            "name": "config",
            "type": "volume",
            "source": "gitlab-config",
            "target": "/etc/gitlab"
          },
          {
            "name": "logs",
            "type": "volume",
            "source": "gitlab-logs",
            "target": "/var/log/gitlab"
          },
          {
            "name": "data",
            "type": "volume",
            "source": "gitlab-data",
            "target": "/var/opt/gitlab"
          }
        ],
        "resources": {
          "limits": {
            "cpus": "4.0",
            "memory": "8G"
          }
        },
        "restartPolicy": "unless-stopped"
      }
    },
    {
      "id": "jenkins",
      "image": "jenkins/jenkins:lts",
      "containerConfig": {
        "ports": [
          {
            "name": "http",
            "containerPort": 8080
          },
          {
            "name": "agent",
            "containerPort": 50000
          }
        ],
        "environment": {
          "JENKINS_OPTS": "--prefix=/jenkins"
        },
        "volumes": [
          {
            "name": "jenkins-data",
            "type": "volume",
            "source": "jenkins-home",
            "target": "/var/jenkins_home"
          }
        ],
        "resources": {
          "limits": {
            "cpus": "2.0",
            "memory": "4G"
          }
        },
        "restartPolicy": "unless-stopped"
      }
    },
    {
      "id": "docs",
      "image": "nginx:alpine",
      "containerConfig": {
        "ports": [
          {
            "name": "http",
            "containerPort": 80
          }
        ],
        "volumes": [
          {
            "name": "docs-content",
            "type": "bind",
            "source": "/opt/company-docs",
            "target": "/usr/share/nginx/html",
            "readOnly": true
          }
        ],
        "restartPolicy": "unless-stopped"
      }
    },
    {
      "id": "portainer",
      "image": "portainer/portainer-ce:latest",
      "containerConfig": {
        "ports": [
          {
            "name": "http",
            "containerPort": 9000
          }
        ],
        "volumes": [
          {
            "name": "docker-socket",
            "type": "bind",
            "source": "/var/run/docker.sock",
            "target": "/var/run/docker.sock"
          },
          {
            "name": "portainer-data",
            "type": "volume",
            "source": "portainer-data",
            "target": "/data"
          }
        ],
        "restartPolicy": "unless-stopped"
      }
    }
  ],
  "routes": [
    {
      "name": "gitlab-route",
      "serviceId": "gitlab",
      "domains": ["gitlab.company.internal", "git.company.internal"],
      "port": 80,
      "ssl": {
        "enabled": false
      },
      "priority": 100
    },
    {
      "name": "jenkins-route",
      "serviceId": "jenkins",
      "domains": ["jenkins.company.internal"],
      "port": 8080,
      "ssl": {
        "enabled": false
      },
      "priority": 100
    },
    {
      "name": "docs-route",
      "serviceId": "docs",
      "domains": ["docs.company.internal", "wiki.company.internal"],
      "port": 80,
      "ssl": {
        "enabled": false
      },
      "priority": 100
    },
    {
      "name": "portainer-route",
      "serviceId": "portainer",
      "domains": ["docker.company.internal"],
      "port": 9000,
      "ssl": {
        "enabled": false
      },
      "priority": 100
    }
  ]
}
```

---

## Internal DNS Configuration

Since there's no public DNS, configure internal DNS server (or `/etc/hosts` on client machines):

### Option 1: Internal DNS Server (Recommended)

**BIND/dnsmasq configuration:**
```
gitlab.company.internal.     A    192.168.1.100
git.company.internal.        A    192.168.1.100
jenkins.company.internal.    A    192.168.1.100
docs.company.internal.       A    192.168.1.100
wiki.company.internal.       A    192.168.1.100
docker.company.internal.     A    192.168.1.100
```

### Option 2: Client /etc/hosts (Simple)

On each employee machine, add to `/etc/hosts`:
```
192.168.1.100  gitlab.company.internal git.company.internal
192.168.1.100  jenkins.company.internal
192.168.1.100  docs.company.internal wiki.company.internal
192.168.1.100  docker.company.internal
```

### Option 3: IP-Based Access (No DNS)

Configure routes with IP address:
```json
{
  "routes": [
    {
      "name": "gitlab-route",
      "serviceId": "gitlab",
      "domains": ["192.168.1.100"],
      "pathPrefix": "/gitlab",
      "port": 80
    }
  ]
}
```

Access: `http://192.168.1.100/gitlab`

---

## SSL Options for Internal Networks

### Option 0: Let's Encrypt with DNS-01 Challenge (Best for Internal Domains)

**Yes! You CAN get real Let's Encrypt certificates for internal domains!**

Let's Encrypt supports **DNS-01 challenge**, which doesn't require the domain to be publicly accessible. You only need:
1. A public domain you control (e.g., `company.com`)
2. DNS provider API access (Cloudflare, Route53, etc.)
3. Create internal subdomain in public DNS

**How it works:**
```
Public DNS (company.com):
  gitlab.internal.company.com  →  192.168.1.100  (internal IP, not routable from internet)

Let's Encrypt:
  1. Requests certificate for gitlab.internal.company.com
  2. Asks for DNS TXT record: _acme-challenge.gitlab.internal.company.com
  3. Stack App creates TXT record via DNS provider API
  4. Let's Encrypt verifies TXT record exists
  5. Issues certificate ✅

Result: Valid SSL certificate for internal-only service!
```

**Configuration Example (Cloudflare DNS):**

```json
{
  "id": "internal-tools",
  "services": [
    {
      "id": "gitlab",
      "image": "gitlab/gitlab-ce:latest",
      "containerConfig": {
        "ports": [{"name": "http", "containerPort": 80}],
        "environment": {
          "GITLAB_OMNIBUS_CONFIG": "external_url 'https://gitlab.internal.company.com'"
        }
      }
    }
  ],
  "routes": [
    {
      "name": "gitlab-route",
      "serviceId": "gitlab",
      "domains": ["gitlab.internal.company.com"],
      "port": 80,
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt",
        "email": "admin@company.com",
        "challengeType": "dns",
        "dnsProvider": "cloudflare"
      },
      "redirectToHttps": true,
      "priority": 100
    }
  ]
}
```

**Traefik Configuration (Stack App auto-generates):**

```yaml
# config.yaml
proxy:
  certificateResolvers:
    - name: letsencrypt-dns
      acme:
        email: admin@company.com
        storage: /etc/traefik/certs/acme-dns.json
        dnsChallenge:
          provider: cloudflare
          delayBeforeCheck: 30s

# Environment variables (passed to Traefik container)
environment:
  CF_API_EMAIL: your-email@company.com
  CF_API_KEY: your-cloudflare-api-key
  # Or for API token:
  CF_DNS_API_TOKEN: your-cloudflare-api-token
```

**Supported DNS Providers:**
- **Cloudflare** - `CF_API_EMAIL` + `CF_API_KEY` or `CF_DNS_API_TOKEN`
- **AWS Route53** - `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_REGION`
- **Google Cloud DNS** - `GCE_PROJECT` + `GCE_SERVICE_ACCOUNT_FILE`
- **Azure DNS** - `AZURE_CLIENT_ID` + `AZURE_CLIENT_SECRET` + `AZURE_TENANT_ID`
- **DigitalOcean** - `DO_AUTH_TOKEN`
- **And 100+ more providers** - See Traefik documentation

**Setup Steps:**

1. **Create subdomain in public DNS:**
   ```
   gitlab.internal.company.com  A  192.168.1.100
   ```
   (This IP is internal and won't be routable from internet)

2. **Configure DNS provider credentials** in Stack App:
   ```yaml
   # config.yaml
   proxy:
     dnsProviders:
       cloudflare:
         email: your-email@company.com
         apiKey: your-cloudflare-api-key
   ```

3. **Create stack with DNS-01 challenge:**
   ```json
   {
     "ssl": {
       "enabled": true,
       "challengeType": "dns",
       "dnsProvider": "cloudflare"
     }
   }
   ```

4. **Stack App automatically:**
   - Creates DNS TXT record via Cloudflare API
   - Let's Encrypt verifies the record
   - Issues valid SSL certificate
   - Auto-renews every 60 days

**Access:**
```
https://gitlab.internal.company.com  ✅ Valid SSL certificate!
```

**Pros:**
- ✅ Real, trusted SSL certificates (no browser warnings)
- ✅ Works for internal-only services
- ✅ Automatic renewal
- ✅ No manual certificate management
- ✅ Supports wildcard certificates (`*.internal.company.com`)

**Cons:**
- ❌ Requires public domain ownership
- ❌ DNS provider API access needed
- ❌ Internal hostnames visible in public DNS (but IPs are private)
- ❌ Slightly slower certificate issuance (DNS propagation delay)

**Security Note:** Even though the DNS record is public, the IP (192.168.1.100) is private/internal and not routable from the internet. No security risk.

---

### Option 1: No SSL (HTTP Only)

**Simplest approach for truly internal networks:**

```json
{
  "routes": [
    {
      "name": "service-route",
      "serviceId": "service",
      "domains": ["service.company.internal"],
      "port": 80,
      "ssl": {
        "enabled": false
      }
    }
  ]
}
```

**Access:** `http://service.company.internal`

**Pros:**
- ✅ No certificate management
- ✅ Simple configuration
- ✅ Works without internet

**Cons:**
- ❌ Unencrypted traffic (OK for isolated networks)
- ❌ Browser warnings for some apps
- ❌ Some modern apps require HTTPS

---

### Option 2: Self-Signed Certificates

For internal services that require HTTPS:

**1. Generate self-signed certificate:**
```bash
# Create certificate authority
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
  -out ca.crt -subj "/CN=Company Internal CA"

# Create certificate for *.company.internal
openssl genrsa -out company.key 2048
openssl req -new -key company.key -out company.csr \
  -subj "/CN=*.company.internal"

# Sign with CA
openssl x509 -req -in company.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out company.crt -days 825 -sha256
```

**2. Configure Stack App with custom certificates:**
```json
{
  "routes": [
    {
      "name": "gitlab-route",
      "serviceId": "gitlab",
      "domains": ["gitlab.company.internal"],
      "port": 80,
      "ssl": {
        "enabled": true,
        "provider": "custom",
        "customCert": {
          "certFile": "/etc/ssl/certs/company.crt",
          "keyFile": "/etc/ssl/private/company.key"
        }
      },
      "redirectToHttps": true,
      "priority": 100
    }
  ]
}
```

**3. Distribute CA certificate to all employee machines:**

**Linux:**
```bash
sudo cp ca.crt /usr/local/share/ca-certificates/company-internal.crt
sudo update-ca-certificates
```

**macOS:**
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ca.crt
```

**Windows:**
```powershell
Import-Certificate -FilePath ca.crt -CertStoreLocation Cert:\LocalMachine\Root
```

**Pros:**
- ✅ Encrypted traffic
- ✅ No internet required
- ✅ Works with HTTPS-only apps
- ✅ One wildcard cert for all services

**Cons:**
- ❌ Initial certificate distribution required
- ❌ Manual renewal (every 2 years)
- ❌ Not trusted by default (requires CA distribution)

---

### Option 3: Private Certificate Authority (Enterprise)

For larger organizations, use a private CA:

**Tools:**
- **HashiCorp Vault** - PKI secrets engine
- **EJBCA** - Enterprise Java Beans Certificate Authority
- **Step-CA** - smallstep Certificate Authority
- **OpenSSL** - Manual CA management

**Example with Step-CA:**

```bash
# Install step-ca on a dedicated server
step ca init --deployment-type standalone

# Issue certificate for Stack App
step ca certificate "*.company.internal" company.crt company.key

# Configure Stack App
{
  "ssl": {
    "enabled": true,
    "provider": "custom",
    "customCert": {
      "certFile": "/etc/ssl/certs/company.crt",
      "keyFile": "/etc/ssl/private/company.key"
    }
  }
}
```

**Pros:**
- ✅ Automated certificate issuance
- ✅ Centralized management
- ✅ Short-lived certificates
- ✅ Audit logging

**Cons:**
- ❌ Infrastructure overhead
- ❌ CA server maintenance

---

## Stack App Configuration for Internal Network

**config.yaml for internal deployment:**

```yaml
database:
  type: sqlite
  path: /var/lib/stack-app/stacks.db
  backup:
    enabled: true
    path: /var/lib/stack-app/backups
    retention: 30

api:
  port: 3001
  # Access Stack App API at http://192.168.1.100:3001 or via Traefik
  keys:
    - "your-internal-api-key-here"

docker:
  socketPath: /var/run/docker.sock
  network: traefik-proxy

proxy:
  image: traefik:v3.0
  # System routes for internal access
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
  # No Let's Encrypt for internal deployment
  defaultSSL:
    provider: custom  # or set enabled: false in routes

logging:
  level: info
  path: /var/log/stack-app
  format: json
```

---

## Deployment

### 1. Deploy Stack App Container

```bash
# Create required directories
mkdir -p /opt/stack-app/{config,data,certs}

# Copy configuration
cp config.yaml /opt/stack-app/config/

# (Optional) Copy SSL certificates
cp company.crt /opt/stack-app/certs/
cp company.key /opt/stack-app/certs/

# Create Docker network
docker network create traefik-proxy

# Start Stack App
docker run -d \
  --name stack-app \
  --network traefik-proxy \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /opt/stack-app/config:/etc/stack-app:ro \
  -v /opt/stack-app/data:/var/lib/stack-app:rw \
  -v /opt/stack-app/certs:/etc/ssl/custom:ro \
  -p 3001:3001 \
  --restart unless-stopped \
  stack-app:latest
```

### 2. Create Internal Tools Stack

```bash
# Create the stack
curl -X POST http://192.168.1.100:3001/api/v1/stacks \
  -H "X-API-Key: your-internal-api-key-here" \
  -H "Content-Type: application/json" \
  -d @internal-tools.json

# Start all services
curl -X POST http://192.168.1.100:3001/api/v1/stacks/internal-tools/start \
  -H "X-API-Key: your-internal-api-key-here"
```

### 3. Verify Services

```bash
# Check stack status
curl http://192.168.1.100:3001/api/v1/stacks/internal-tools/status \
  -H "X-API-Key: your-internal-api-key-here"

# Test services (from any machine on network)
curl -I http://gitlab.company.internal
curl -I http://jenkins.company.internal
curl -I http://docs.company.internal
curl -I http://docker.company.internal
```

---

## Access Patterns

### Internal Users Access Services

```
Employee Machine (192.168.1.50)
    ↓ DNS resolves gitlab.company.internal → 192.168.1.100
    ↓ HTTP request to http://gitlab.company.internal
Stack App Host (192.168.1.100)
    ↓ Traefik receives request
    ↓ Routes to gitlab container based on domain
GitLab Container
    ↓ Returns response
Employee sees GitLab interface
```

### Administrators Access Stack App API

```bash
# Direct API access
curl http://192.168.1.100:3001/api/v1/stacks \
  -H "X-API-Key: your-internal-api-key-here"

# Via Traefik system route (any configured domain)
curl http://gitlab.company.internal/stack/api/v1/stacks \
  -H "X-API-Key: your-internal-api-key-here"
```

---

## Use Cases and Examples

### Use Case 1: Development Environment

**Scenario:** Internal staging environment for testing before production.

```json
{
  "id": "staging-env",
  "services": [
    {"id": "web", "image": "myapp/frontend:staging"},
    {"id": "api", "image": "myapp/backend:staging"},
    {"id": "db", "image": "postgres:15"}
  ],
  "routes": [
    {
      "name": "web-route",
      "serviceId": "web",
      "domains": ["staging.company.internal"],
      "port": 80,
      "ssl": {"enabled": false}
    },
    {
      "name": "api-route",
      "serviceId": "api",
      "domains": ["staging.company.internal"],
      "pathPrefix": "/api",
      "port": 3000,
      "ssl": {"enabled": false}
    }
  ]
}
```

---

### Use Case 2: Internal APIs and Microservices

**Scenario:** Internal microservices architecture with service mesh.

```json
{
  "id": "internal-apis",
  "services": [
    {"id": "user-service", "image": "company/user-api:latest"},
    {"id": "order-service", "image": "company/order-api:latest"},
    {"id": "inventory-service", "image": "company/inventory-api:latest"}
  ],
  "routes": [
    {
      "name": "user-api",
      "serviceId": "user-service",
      "domains": ["api.company.internal"],
      "pathPrefix": "/users",
      "port": 8080,
      "ssl": {"enabled": false},
      "priority": 100
    },
    {
      "name": "order-api",
      "serviceId": "order-service",
      "domains": ["api.company.internal"],
      "pathPrefix": "/orders",
      "port": 8080,
      "ssl": {"enabled": false},
      "priority": 100
    },
    {
      "name": "inventory-api",
      "serviceId": "inventory-service",
      "domains": ["api.company.internal"],
      "pathPrefix": "/inventory",
      "port": 8080,
      "ssl": {"enabled": false},
      "priority": 100
    }
  ]
}
```

**Access:**
- `http://api.company.internal/users` → user-service
- `http://api.company.internal/orders` → order-service
- `http://api.company.internal/inventory` → inventory-service

---

### Use Case 3: Database Admin Tools

**Scenario:** Internal database management interfaces.

```json
{
  "id": "db-tools",
  "services": [
    {"id": "pgadmin", "image": "dpage/pgadmin4"},
    {"id": "mongo-express", "image": "mongo-express"},
    {"id": "redis-commander", "image": "rediscommander/redis-commander"}
  ],
  "routes": [
    {
      "name": "pgadmin-route",
      "serviceId": "pgadmin",
      "domains": ["db.company.internal"],
      "pathPrefix": "/postgres",
      "port": 80,
      "ssl": {"enabled": false},
      "stripPrefix": true
    },
    {
      "name": "mongo-route",
      "serviceId": "mongo-express",
      "domains": ["db.company.internal"],
      "pathPrefix": "/mongo",
      "port": 8081,
      "ssl": {"enabled": false},
      "stripPrefix": true
    },
    {
      "name": "redis-route",
      "serviceId": "redis-commander",
      "domains": ["db.company.internal"],
      "pathPrefix": "/redis",
      "port": 8081,
      "ssl": {"enabled": false},
      "stripPrefix": true
    }
  ]
}
```

---

### Use Case 4: Mixed Internal and External Routes

**Scenario:** Internal services + routes to corporate external services.

```json
{
  "id": "corporate-portal",
  "services": [
    {"id": "intranet", "image": "company/intranet:latest"}
  ],
  "routes": [
    {
      "name": "intranet-route",
      "serviceId": "intranet",
      "domains": ["portal.company.internal"],
      "port": 80,
      "ssl": {"enabled": false},
      "priority": 1
    },
    {
      "name": "hr-system",
      "externalTarget": "http://hr-server.company.internal:8080",
      "domains": ["portal.company.internal"],
      "pathPrefix": "/hr",
      "ssl": {"enabled": false},
      "stripPrefix": true,
      "priority": 100
    },
    {
      "name": "payroll-system",
      "externalTarget": "http://payroll-server.company.internal:9000",
      "domains": ["portal.company.internal"],
      "pathPrefix": "/payroll",
      "ssl": {"enabled": false},
      "stripPrefix": true,
      "priority": 100
    }
  ]
}
```

---

## Network Isolation Options

### Option 1: Fully Isolated (Air-Gapped)

**No internet access at all:**
- Pre-pull Docker images
- Use local registry
- No Let's Encrypt
- HTTP or self-signed certificates

```bash
# Set up local registry
docker run -d -p 5000:5000 --restart=always --name registry registry:2

# Pull and push images
docker pull gitlab/gitlab-ce:latest
docker tag gitlab/gitlab-ce:latest localhost:5000/gitlab-ce:latest
docker push localhost:5000/gitlab-ce:latest

# Update stack configuration
{
  "services": [
    {
      "id": "gitlab",
      "image": "localhost:5000/gitlab-ce:latest"
    }
  ]
}
```

---

### Option 2: Internet via Proxy

**Network has proxy for outbound access:**

```yaml
# Stack App config.yaml
docker:
  socketPath: /var/run/docker.sock
  httpProxy: http://proxy.company.internal:8080
  httpsProxy: http://proxy.company.internal:8080
  noProxy: localhost,127.0.0.1,company.internal

# Docker daemon config (/etc/docker/daemon.json)
{
  "proxies": {
    "http-proxy": "http://proxy.company.internal:8080",
    "https-proxy": "http://proxy.company.internal:8080",
    "no-proxy": "localhost,127.0.0.1,company.internal"
  }
}
```

---

### Option 3: VPN Access for Remote Workers

**Internal services accessible via VPN:**

```
Remote Employee
    ↓ Connect to corporate VPN
    ↓ Gets IP: 10.8.0.50 (VPN subnet)
    ↓ DNS resolves *.company.internal via VPN
    ↓ Access http://gitlab.company.internal
Corporate Network
    ↓ VPN routes to 192.168.1.100
Stack App serves GitLab
```

No Stack App configuration changes needed - works transparently.

---

## Monitoring Internal Stacks

### Health Checks

```bash
# Check all stacks
curl http://192.168.1.100:3001/api/v1/stacks \
  -H "X-API-Key: your-internal-api-key-here"

# Check specific stack status
curl http://192.168.1.100:3001/api/v1/stacks/internal-tools/status \
  -H "X-API-Key: your-internal-api-key-here"
```

### Logs

```bash
# View GitLab logs
curl http://192.168.1.100:3001/api/v1/stacks/internal-tools/services/gitlab/logs?tail=100 \
  -H "X-API-Key: your-internal-api-key-here"

# View all internal-tools logs
curl http://192.168.1.100:3001/api/v1/stacks/internal-tools/logs \
  -H "X-API-Key: your-internal-api-key-here"
```

### Traefik Dashboard

Access Traefik dashboard for routing visualization:
```
http://gitlab.company.internal/traefik/dashboard/
```

---

## Best Practices for Internal Deployments

### 1. Use Internal DNS
Configure proper internal DNS instead of /etc/hosts for easier management.

### 2. Document Access Procedures
Create internal wiki page with:
- Service URLs
- Access requirements
- VPN instructions (if applicable)
- Support contacts

### 3. Backup Strategy
```yaml
database:
  backup:
    enabled: true
    path: /mnt/nfs/stack-app-backups
    retention: 90
```

### 4. Resource Limits
Set appropriate limits for shared infrastructure:
```json
{
  "resources": {
    "limits": {
      "cpus": "2.0",
      "memory": "4G"
    }
  }
}
```

### 5. Authentication
Use corporate SSO/LDAP for services:
- GitLab: LDAP integration
- Jenkins: AD/LDAP plugin
- Portainer: LDAP authentication

### 6. Network Security
- Firewall rules restricting access to corporate network
- VPN requirement for remote access
- Network segmentation for sensitive services

---

## Troubleshooting

### Issue: DNS not resolving

**Check:**
```bash
# From employee machine
nslookup gitlab.company.internal

# Should return: 192.168.1.100
```

**Fix:**
- Configure internal DNS server
- Add entries to /etc/hosts as temporary workaround

---

### Issue: Cannot access services

**Check:**
```bash
# Verify Traefik is running
docker ps | grep traefik

# Check routes
curl http://192.168.1.100:3001/api/v1/proxy/routes \
  -H "X-API-Key: your-api-key"

# Test direct container access
curl http://192.168.1.100:8080  # If GitLab exposes port directly
```

---

### Issue: Slow performance

**Check:**
- Resource limits on containers
- Host machine resources (CPU, memory, disk I/O)
- Network bandwidth

**Fix:**
```bash
# Monitor container resources
docker stats

# Adjust limits in stack configuration
{
  "resources": {
    "limits": {
      "cpus": "4.0",
      "memory": "8G"
    }
  }
}
```

---

## Summary

**Internal Stack App Deployment:**
- ✅ Works without internet access
- ✅ No Let's Encrypt (use HTTP or self-signed certs)
- ✅ Internal DNS or /etc/hosts for name resolution
- ✅ Perfect for corporate intranets, dev environments, air-gapped networks
- ✅ Same Stack App features (routing, management, monitoring)
- ✅ VPN compatible for remote access
- ✅ Can route to other internal services via externalTarget

**When to Use:**
- Internal corporate applications
- Development/staging environments
- Secure/isolated networks
- No public internet exposure needed
- Cost savings (no cloud hosting)

**SSL Options:**
1. **HTTP only** - Simplest, OK for isolated networks
2. **Self-signed certificates** - HTTPS without internet
3. **Private CA** - Enterprise certificate management
