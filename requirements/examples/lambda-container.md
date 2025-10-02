# AWS Lambda Container Images Example

This example demonstrates running AWS Lambda container images from ECR as containerized services within Stack App.

**Important**: This runs Lambda containers as **long-running Docker containers**, not serverless functions. The containers run continuously and are exposed via HTTP through Traefik.

## 🚀 Key Benefit: Multi-Environment Portability

Using **AWS Lambda Web Adapter**, the **same container image** can run in:
- ✅ **AWS Lambda** (serverless, auto-scaling, pay-per-invocation)
- ✅ **Stack App** (persistent containers, custom domains, SSL)
- ✅ **ECS/Fargate** (AWS container orchestration)
- ✅ **EC2** (virtual machines)
- ✅ **Local Docker** (development)

**Zero code changes needed!** Write standard web framework code (Express, Flask, Spring Boot) and deploy anywhere.

---

## Use Case

You have Lambda functions packaged as container images in ECR that you want to run as persistent HTTP services with automatic SSL and routing.

**Example Lambda Functions:**
- `api-handler` - REST API Lambda function
- `webhook-processor` - Webhook processing Lambda
- `image-resizer` - Image processing Lambda

---

## Prerequisites

1. **Lambda Container Images in ECR**
   - Images built following AWS Lambda container image specifications
   - Images expose Runtime API on port 8080 (Lambda default)
   - ECR authentication configured on Docker host

2. **ECR Authentication**
   ```bash
   # Authenticate Docker to ECR
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS --password-stdin \
     123456789012.dkr.ecr.us-east-1.amazonaws.com
   ```

3. **Lambda Runtime Interface Emulator (Optional)**
   - For local testing, Lambda images include the Runtime Interface Emulator
   - Exposes HTTP endpoint on port 8080
   - Allows invoking Lambda via HTTP POST

---

## Stack Configuration

### Example: Lambda Functions as HTTP Services

```json
{
  "id": "lambda-services",
  "services": [
    {
      "id": "api-handler",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-api-lambda:latest",
      "containerConfig": {
        "ports": [
          {
            "name": "lambda-api",
            "containerPort": 8080
          }
        ],
        "environment": {
          "AWS_REGION": "us-east-1",
          "AWS_ACCESS_KEY_ID": "${AWS_ACCESS_KEY_ID}",
          "AWS_SECRET_ACCESS_KEY": "${AWS_SECRET_ACCESS_KEY}",
          "TABLE_NAME": "users-table",
          "LOG_LEVEL": "info"
        },
        "volumes": [],
        "restartPolicy": "unless-stopped"
      }
    },
    {
      "id": "webhook-processor",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/webhook-lambda:v2.1",
      "containerConfig": {
        "ports": [
          {
            "name": "lambda-api",
            "containerPort": 8080
          }
        ],
        "environment": {
          "AWS_REGION": "us-east-1",
          "QUEUE_URL": "https://sqs.us-east-1.amazonaws.com/123456789012/webhooks",
          "WEBHOOK_SECRET": "${WEBHOOK_SECRET}"
        },
        "restartPolicy": "unless-stopped"
      }
    },
    {
      "id": "image-resizer",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/image-processor:latest",
      "containerConfig": {
        "ports": [
          {
            "name": "lambda-api",
            "containerPort": 8080
          }
        ],
        "environment": {
          "AWS_REGION": "us-east-1",
          "S3_BUCKET": "my-images-bucket",
          "MAX_IMAGE_SIZE": "10485760"
        },
        "resources": {
          "limits": {
            "cpus": "2.0",
            "memory": "2G"
          }
        },
        "restartPolicy": "unless-stopped"
      }
    }
  ],
  "routes": [
    {
      "name": "api-route",
      "serviceId": "api-handler",
      "domains": ["api.example.com"],
      "port": 8080,
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt",
        "email": "admin@example.com",
        "challengeType": "http"
      },
      "redirectToHttps": true,
      "priority": 100
    },
    {
      "name": "webhook-route",
      "serviceId": "webhook-processor",
      "domains": ["webhooks.example.com"],
      "pathPrefix": "/process",
      "port": 8080,
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt",
        "email": "admin@example.com"
      },
      "redirectToHttps": true,
      "stripPrefix": false,
      "priority": 100
    },
    {
      "name": "image-api",
      "serviceId": "image-resizer",
      "domains": ["example.com"],
      "pathPrefix": "/images/resize",
      "port": 8080,
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt",
        "email": "admin@example.com"
      },
      "redirectToHttps": true,
      "stripPrefix": true,
      "priority": 90
    }
  ]
}
```

---

## Lambda Container Invocation

Lambda containers expose an HTTP endpoint on port 8080 for invocation.

### Invocation Format

**POST to Lambda Runtime API:**
```bash
# Direct invocation (example.com/images/resize routes to image-resizer:8080)
curl -X POST https://example.com/images/resize \
  -H "Content-Type: application/json" \
  -d '{
    "s3Key": "uploads/photo.jpg",
    "width": 800,
    "height": 600
  }'
```

**Lambda Event Format:**
Lambda containers expect events in this format:
```json
{
  "body": "{\"s3Key\":\"uploads/photo.jpg\",\"width\":800,\"height\":600}",
  "headers": {
    "Content-Type": "application/json",
    "Host": "example.com"
  },
  "httpMethod": "POST",
  "path": "/2015-03-31/functions/function/invocations",
  "queryStringParameters": null
}
```

---

## API Gateway-Style Invocation (Recommended)

To make Lambda containers accept standard HTTP requests (not Lambda event format), you can:

### Option 1: Use AWS Lambda Web Adapter (Recommended)

**AWS Lambda Web Adapter** is an official AWS Labs project that allows running web applications on AWS Lambda.

**Key Benefit:** The **same container image works in both AWS Lambda AND Stack App** with no code changes!

Add the Lambda Web Adapter to your Lambda container image:

```dockerfile
# In your Lambda Dockerfile
FROM public.ecr.aws/lambda/nodejs:18

# Add Lambda Web Adapter (official AWS Labs project)
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter

# Your web application (Express.js example)
COPY app.js package*.json ./
RUN npm install

# Set the port your web app listens on
ENV PORT=8080

# Start your web server (NOT Lambda handler)
CMD ["node", "app.js"]
```

**Your application code (standard Express.js):**
```javascript
// app.js - Regular Express application, no Lambda-specific code!
const express = require('express');
const app = express();

app.use(express.json());

app.post('/resize', async (req, res) => {
  const { s3Key, width, height } = req.body;
  // Your image processing logic
  const result = await processImage(s3Key, width, height);
  res.json(result);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**This image now works EVERYWHERE:**

✅ **AWS Lambda** (with API Gateway/Function URLs) - Serverless, auto-scaling
✅ **Stack App** - Persistent container deployment
✅ **ECS/Fargate** - Container orchestration
✅ **EC2** - Direct VM deployment
✅ **Local Docker** - Development environment

**Invocation (same in both environments):**
```bash
# Works identically on AWS Lambda and Stack App
curl -X POST https://example.com/images/resize \
  -H "Content-Type: application/json" \
  -d '{"s3Key": "uploads/photo.jpg", "width": 800, "height": 600}'
```

**How Lambda Web Adapter Works:**

- **In AWS Lambda:** Runs as Lambda Extension, converts API Gateway events → HTTP requests
- **In Stack App:** Web app runs normally, adapter becomes a passthrough
- **Zero code changes** needed between environments

### Option 2: Add HTTP Wrapper in Lambda Code

Modify your Lambda handler to parse HTTP body:

```javascript
// Lambda handler that accepts HTTP-style invocation
exports.handler = async (event) => {
  // Parse body if it's a string
  const body = typeof event.body === 'string'
    ? JSON.parse(event.body)
    : event;

  // Your Lambda logic
  const result = await processImage(body);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result)
  };
};
```

---

## Environment Variables and AWS Credentials

### AWS Credentials

Lambda containers need AWS credentials to access AWS services (S3, DynamoDB, etc.):

**Option 1: Environment Variables (Simple)**
```json
{
  "environment": {
    "AWS_ACCESS_KEY_ID": "AKIAIOSFODNN7EXAMPLE",
    "AWS_SECRET_ACCESS_KEY": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "AWS_REGION": "us-east-1"
  }
}
```

**Option 2: IAM Instance Profile (Recommended for EC2)**
```json
{
  "environment": {
    "AWS_REGION": "us-east-1"
  }
}
```
Credentials automatically available via EC2 instance metadata.

**Option 3: Secrets Management**
Use Docker secrets or external secrets manager:
```json
{
  "environment": {
    "AWS_REGION": "us-east-1",
    "AWS_ACCESS_KEY_ID": "${AWS_ACCESS_KEY_ID}",
    "AWS_SECRET_ACCESS_KEY": "${AWS_SECRET_ACCESS_KEY}"
  }
}
```

---

## URL Routing Examples

| User Request | Resolved Target | Lambda Container |
|--------------|-----------------|------------------|
| `https://api.example.com/users` | `api-handler:8080/2015-03-31/functions/function/invocations` | api-handler |
| `https://api.example.com/products` | `api-handler:8080/2015-03-31/functions/function/invocations` | api-handler |
| `https://webhooks.example.com/process` | `webhook-processor:8080/2015-03-31/functions/function/invocations` | webhook-processor |
| `https://example.com/images/resize` | `image-resizer:8080/2015-03-31/functions/function/invocations` | image-resizer (prefix stripped) |

---

## Creating the Stack

```bash
# Create the stack
curl -X POST http://your-server/stack/api/v1/stacks \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d @lambda-services.json

# Start all Lambda containers
curl -X POST http://your-server/stack/api/v1/stacks/lambda-services/start \
  -H "X-API-Key: your-api-key-here"

# Check status
curl http://your-server/stack/api/v1/stacks/lambda-services/status \
  -H "X-API-Key: your-api-key-here"
```

---

## Differences from AWS Lambda (Serverless)

### What You Get (Container-Based)
✅ Same Lambda code and container images
✅ Access to AWS services (S3, DynamoDB, etc.)
✅ Custom domain with SSL
✅ HTTP routing via Traefik
✅ Full control over container resources
✅ No Lambda pricing (just container hosting costs)

### What You Don't Get (vs. True Lambda)
❌ Auto-scaling to zero (containers run continuously)
❌ Pay-per-invocation pricing
❌ AWS Lambda event sources (SQS, SNS, EventBridge triggers)
❌ Lambda concurrency limits and throttling
❌ Built-in Lambda observability (CloudWatch Logs integration)
❌ Lambda layers (must include in container image)
❌ Sub-second cold start guarantees

---

## Monitoring Lambda Containers

### View Logs
```bash
# Get logs for specific Lambda container
curl http://your-server/stack/api/v1/stacks/lambda-services/services/api-handler/logs?tail=100 \
  -H "X-API-Key: your-api-key-here"

# Get all Lambda service logs
curl http://your-server/stack/api/v1/stacks/lambda-services/logs \
  -H "X-API-Key: your-api-key-here"
```

### Check Container Status
```bash
curl http://your-server/stack/api/v1/stacks/lambda-services/status \
  -H "X-API-Key: your-api-key-here"
```

---

## Resource Configuration for Lambda Containers

Lambda containers can be resource-intensive. Configure appropriately:

```json
{
  "containerConfig": {
    "resources": {
      "limits": {
        "cpus": "2.0",
        "memory": "2G"
      },
      "reservations": {
        "cpus": "0.5",
        "memory": "512M"
      }
    },
    "restartPolicy": "unless-stopped"
  }
}
```

**Recommended Resources by Lambda Memory:**
- **512MB Lambda** → 0.5 CPU, 512M memory
- **1GB Lambda** → 1.0 CPU, 1G memory
- **2GB Lambda** → 2.0 CPU, 2G memory
- **3GB+ Lambda** → 3.0+ CPU, 3G+ memory

---

## Common Issues and Solutions

### Issue: Lambda container exits immediately

**Cause:** Lambda containers expect to be invoked, not run as daemons.

**Solution:** Use Lambda Runtime Interface Emulator or Lambda Web Adapter (see above).

### Issue: Cannot pull from ECR

**Cause:** Docker not authenticated to ECR.

**Solution:**
```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Verify authentication
docker pull 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-lambda:latest
```

### Issue: Lambda can't access AWS services

**Cause:** Missing or incorrect AWS credentials.

**Solution:**
- Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables
- Or use EC2 instance profile if running on EC2
- Check IAM permissions for the credentials

### Issue: High memory usage

**Cause:** Lambda containers may have different resource behavior than serverless.

**Solution:**
- Set appropriate memory limits in containerConfig.resources
- Monitor with `docker stats` to understand actual usage
- Adjust based on Lambda's original memory configuration

---

## Best Practices

### 1. Use Specific Image Tags
```json
{
  "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-lambda:v2.1"
}
```
Avoid `:latest` to ensure reproducible deployments.

### 2. Configure Health Checks
```json
{
  "healthCheck": {
    "test": ["CMD", "curl", "-f", "http://localhost:8080/health"],
    "interval": "30s",
    "timeout": "10s",
    "retries": 3,
    "startPeriod": "40s"
  }
}
```

### 3. Set Appropriate Resource Limits
Match container resources to original Lambda memory configuration.

### 4. Use Environment-Specific Images
```json
{
  "services": [
    {
      "id": "api-prod",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/api:prod"
    }
  ]
}
```

### 5. Secure AWS Credentials
- Use environment variable substitution
- Consider AWS Secrets Manager or Parameter Store
- Rotate credentials regularly

### 6. Enable HTTPS
Always use SSL for Lambda containers handling sensitive data:
```json
{
  "ssl": {
    "enabled": true,
    "provider": "letsencrypt"
  },
  "redirectToHttps": true
}
```

---

## Alternative: True Serverless with External Routes

If you need true serverless Lambda execution, use external routes to AWS Lambda Function URLs:

```json
{
  "id": "serverless-lambdas",
  "services": [],
  "routes": [
    {
      "name": "lambda-api",
      "externalTarget": "https://abc123.lambda-url.us-east-1.on.aws",
      "domains": ["api.example.com"],
      "ssl": {
        "enabled": true,
        "provider": "letsencrypt"
      },
      "headers": {
        "X-Custom-Header": "value"
      },
      "priority": 100
    }
  ]
}
```

This gives you:
✅ True serverless execution
✅ Auto-scaling to zero
✅ Pay-per-invocation
✅ Custom domain via Stack App
✅ SSL termination
✅ Custom headers and routing

---

## Summary

**Running Lambda Containers in Stack App:**
- ✅ Works without any changes to Stack App
- ✅ Use ECR image references directly
- ✅ Configure environment variables for AWS access
- ✅ Expose port 8080 for Lambda Runtime API
- ✅ Route traffic via Traefik with SSL
- ⚠️ Runs as persistent containers (not serverless)
- ⚠️ No auto-scaling or pay-per-invocation

**When to Use:**
- Migrating from Lambda to container-based deployment
- Running Lambda code continuously as HTTP service
- Local development/testing of Lambda functions
- Cost optimization for high-traffic Lambda functions

**When NOT to Use:**
- Need true serverless auto-scaling
- Require event-driven invocation (SQS, SNS, etc.)
- Want pay-per-invocation pricing
- Need Lambda-specific features (layers, extensions, etc.)
