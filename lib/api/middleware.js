const { ValidationError } = require('./validators');

// API Key Authentication Middleware
function authenticateApiKey(configManager) {
  return (req, res, next) => {
    // Skip authentication for health check endpoint
    if (req.path === '/health') {
      return next();
    }

    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key is required. Provide X-API-Key header.'
        }
      });
    }

    const validKeys = configManager.getApiKeys();
    if (!validKeys.includes(apiKey)) {
      return res.status(401).json({
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key provided'
        }
      });
    }

    next();
  };
}

// Error handling middleware
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
  }

  // Docker API errors
  if (err.statusCode) {
    let message = 'Docker API error';
    let code = 'DOCKER_API_ERROR';

    switch (err.statusCode) {
      case 404:
        message = 'Docker container or image not found';
        code = 'DOCKER_RESOURCE_NOT_FOUND';
        break;
      case 409:
        message = 'Docker resource conflict';
        code = 'DOCKER_CONFLICT';
        break;
      case 500:
        message = 'Docker daemon error';
        code = 'DOCKER_DAEMON_ERROR';
        break;
    }

    return res.status(500).json({
      error: {
        code,
        message: `${message}: ${err.message}`
      }
    });
  }

  // Database errors
  if (err.code && err.code.startsWith('SQLITE_')) {
    return res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed'
      }
    });
  }

  // Generic server error
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }
  });
}

// Not found handler
function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`
    }
  });
}

module.exports = {
  authenticateApiKey,
  errorHandler,
  notFoundHandler
};