# Docker Stack Management API

A RESTful API service for managing Docker container stacks through a unified interface. The Stack App provides CRUD operations for stacks and services, with direct Docker API integration and persistent storage.

## Features

- **Stack Management**: Create, read, update, and delete Docker stacks
- **Service Control**: Individual service lifecycle management within stacks
- **Container Operations**: Start, stop, restart containers
- **Real-time Status**: Monitor container status and retrieve logs
- **Persistent Storage**: SQLite database for stack definitions
- **API Authentication**: API key-based security
- **Docker Integration**: Direct Docker Engine API integration
- **CLI Interface**: Command-line interface for easy deployment
- **Containerized**: Docker and Docker Compose deployment options

## Installation

### Global NPM Package

```bash
npm install -g @stack-app/docker-stack-api
```

### From Source

```bash
git clone https://github.com/Code-Mini/stack-app.git
cd stack-app
npm install
```

## Usage

### CLI Commands

```bash
# Start with default configuration
stack-app

# Start with custom config file
stack-app --config /path/to/config.yaml

# Start on custom port
stack-app --port 3002

# Development mode with debug logging
stack-app --dev

# Show help
stack-app --help
```

### Docker Compose

```bash
# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Docker

```bash
# Build image
docker build -t stack-app .

# Run container
docker run -d -p 3001:3001 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v $(pwd)/config:/etc/stack-app:ro \
  -v $(pwd)/data:/var/lib/stack-app:rw \
  stack-app
```

## Configuration

### Configuration File (config.yaml)

```yaml
database:
  type: sqlite
  path: /var/lib/stack-app/stacks.db

api:
  port: 3001
  keys:
    - "your-api-key-1"
    - "your-api-key-2"

docker:
  socketPath: /var/run/docker.sock

logging:
  level: info
  format: json
```

### Environment Variables

- `STACK_APP_CONFIG`: Path to configuration file
- `NODE_ENV`: Environment (development/production)

## API Endpoints

All API endpoints require authentication via `X-API-Key` header (except `/health`).

### Health Check
- `GET /health` - Health check endpoint

### Stack Management
- `GET /api/v1/stacks` - List all stacks
- `GET /api/v1/stacks/{stackId}` - Get stack details
- `POST /api/v1/stacks` - Create new stack
- `PUT /api/v1/stacks/{stackId}` - Update stack
- `DELETE /api/v1/stacks/{stackId}` - Delete stack

### Stack Lifecycle
- `POST /api/v1/stacks/{stackId}/start` - Start all services in stack
- `POST /api/v1/stacks/{stackId}/stop` - Stop all services in stack
- `POST /api/v1/stacks/{stackId}/restart` - Restart all services in stack
- `GET /api/v1/stacks/{stackId}/status` - Get stack status
- `GET /api/v1/stacks/{stackId}/logs` - Get logs for all services

### Service Management
- `GET /api/v1/stacks/{stackId}/services/{serviceId}` - Get service details
- `GET /api/v1/stacks/{stackId}/services/{serviceId}/logs` - Get service logs
- `POST /api/v1/stacks/{stackId}/services/{serviceId}/start` - Start service
- `POST /api/v1/stacks/{stackId}/services/{serviceId}/stop` - Stop service
- `POST /api/v1/stacks/{stackId}/services/{serviceId}/restart` - Restart service

## Example Usage

### Create a Stack

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "id": "web-stack",
    "name": "web-stack",
    "services": [
      {
        "id": "nginx",
        "name": "nginx",
        "image": "nginx:latest",
        "containerConfig": {
          "ports": [
            {
              "name": "web-port",
              "containerPort": 80,
              "hostPort": 8080
            }
          ],
          "environment": {
            "NGINX_HOST": "localhost"
          }
        }
      }
    ]
  }' \
  http://localhost:3001/api/v1/stacks
```

### Start a Stack

```bash
curl -X POST \
  -H "X-API-Key: your-api-key" \
  http://localhost:3001/api/v1/stacks/web-stack/start
```

### Get Stack Status

```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3001/api/v1/stacks/web-stack/status
```

## Stack Definition Format

```json
{
  "id": "stack-name",
  "name": "stack-name",
  "services": [
    {
      "id": "service-id",
      "name": "service-name",
      "image": "docker/image:tag",
      "containerConfig": {
        "ports": [
          {
            "name": "port-name",
            "containerPort": 80,
            "hostPort": 8080
          }
        ],
        "environment": {
          "ENV_VAR": "value"
        },
        "volumes": [
          {
            "hostPath": "/host/path",
            "containerPath": "/container/path"
          }
        ]
      }
    }
  ]
}
```

## Validation Rules

### Stack Names
- 1-31 characters
- Lowercase letters, numbers, and hyphens only
- Pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$`

### Service Names
- 1-31 characters
- Lowercase letters, numbers, and hyphens only
- Must be unique within stack
- Combined container name (`{stack-id}-{service-id}`) must be ≤ 63 characters

### Docker Images
- Valid Docker image reference format
- Examples: `nginx:latest`, `mysql:8.0`, `registry.com/org/app:v1.0`

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_STACK_NAME | 400 | Stack name validation failed |
| INVALID_SERVICE_NAME | 400 | Service name validation failed |
| CONTAINER_NAME_TOO_LONG | 400 | Combined container name exceeds 63 characters |
| STACK_NOT_FOUND | 404 | Stack not found |
| SERVICE_NOT_FOUND | 404 | Service not found |
| STACK_ALREADY_EXISTS | 409 | Stack already exists |
| DOCKER_API_ERROR | 500 | Docker API communication error |
| DATABASE_ERROR | 500 | Database operation error |

## Requirements

- Node.js 18+
- Docker Engine with API access
- Write access to Docker socket (`/var/run/docker.sock`)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Start server
npm start

# Run semantic release (for maintainers)
npm run semantic-release
```

## CI/CD

This project uses GitHub Actions for continuous integration and deployment:

### Workflows
- **CI**: Runs on pull requests - tests, builds, and Docker image validation
- **CD**: Runs on main branch - builds, tests, pushes Docker images, and handles releases
- **Release**: Handles versioned releases with Docker images and NPM publishing
- **Security**: Weekly security scans and dependency audits

### Container Registries
- **Docker Hub**: `stackapp/docker-stack-api`
- **GitHub Container Registry**: `ghcr.io/code-mini/stack-app`

### Semantic Versioning
This project uses semantic-release for automated versioning:
- `fix:` commits trigger patch releases (0.1.0 → 0.1.1)
- `feat:` commits trigger minor releases (0.1.0 → 0.2.0)  
- `BREAKING CHANGE:` triggers major releases (0.1.0 → 1.0.0)

See [.github/WORKFLOWS.md](.github/WORKFLOWS.md) for detailed workflow documentation.

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

For issues and questions, please use the GitHub issue tracker.