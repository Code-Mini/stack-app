# GitHub Actions Workflows

This repository uses GitHub Actions for CI/CD automation. The workflows are located in `.github/workflows/`.

## Workflows

### 1. CI - Pull Request (`ci.yml`)
**Trigger:** Pull requests to `main` or `develop` branches

**Jobs:**
- **test-build**: Tests the application with multiple Node.js versions (18.x, 20.x)
  - Installs dependencies
  - Runs build script
  - Executes tests
  - Performs health check
- **docker-build-test**: Tests Docker image building
  - Builds Docker image without pushing
  - Tests the container startup and health endpoint
- **security-scan**: Runs Trivy vulnerability scanner

### 2. CD - Main Branch (`cd.yml`)
**Trigger:** Pushes to `main` branch

**Jobs:**
- **test**: Runs tests on Node.js 18.x
- **docker-build-push**: Builds and pushes Docker images
  - Pushes to Docker Hub (`stackapp/docker-stack-api`)
  - Pushes to GitHub Container Registry (`ghcr.io/code-mini/stack-app`)
  - Supports multi-architecture (linux/amd64, linux/arm64)
- **semantic-release**: Handles automatic versioning and releases
- **deploy-notification**: Reports deployment status

### 3. Release (`release.yml`)
**Trigger:** Published releases or manual workflow dispatch

**Jobs:**
- **build-and-release**: Complete release process
  - Builds and tests the application
  - Pushes versioned Docker images
  - Publishes to NPM registry
  - Creates release assets

### 4. Security & Dependencies (`security.yml`)
**Trigger:** Weekly schedule (Mondays at 2 AM UTC) or manual

**Jobs:**
- **security-audit**: NPM security audit and Snyk scanning
- **docker-security-scan**: Trivy vulnerability scanning for Docker images
- **dependency-review**: Reviews dependencies in pull requests

## Required Secrets

Configure these secrets in your GitHub repository settings:

### Docker Registry
- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password/token

### NPM Publishing
- `NPM_TOKEN`: NPM registry authentication token

### Security Scanning (Optional)
- `SNYK_TOKEN`: Snyk API token for enhanced security scanning

## Container Registries

### Docker Hub
- Repository: `stackapp/docker-stack-api`
- Tags: `latest`, `main-<sha>`, version tags

### GitHub Container Registry
- Repository: `ghcr.io/code-mini/stack-app`  
- Tags: `latest`, `main-<sha>`, version tags

## Semantic Release

The project uses semantic-release for automated versioning based on conventional commits:

- `fix:` → Patch release (0.1.0 → 0.1.1)
- `feat:` → Minor release (0.1.0 → 0.2.0)
- `BREAKING CHANGE:` → Major release (0.1.0 → 1.0.0)

## Manual Workflows

All workflows can be triggered manually via the GitHub Actions tab using the "Run workflow" button.

## Cache Strategy

- **NPM dependencies**: Cached using `actions/setup-node@v4`
- **Docker layers**: Cached using GitHub Actions cache (`type=gha`)

## Multi-Platform Support

Docker images are built for multiple architectures:
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM64/Apple Silicon)

## Health Checks

All workflows include health checks to ensure the application starts correctly:
- Node.js: Starts server and tests `/health` endpoint
- Docker: Runs container and validates health endpoint response