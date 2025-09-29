const express = require('express');
const winston = require('winston');
const { version } = require('../package.json');

// Import modules
const ConfigManager = require('./config');
const DatabaseManager = require('./db');
const DockerManager = require('./docker');

// Import API routes and middleware
const createStackRoutes = require('./api/stacks');
const createServiceRoutes = require('./api/services');
const { authenticateApiKey, errorHandler, notFoundHandler } = require('./api/middleware');

class StackApp {
  constructor(options = {}) {
    this.options = options;
    this.configManager = new ConfigManager(options.configPath);
    this.dbManager = null;
    this.dockerManager = null;
    this.app = null;
    this.server = null;
    
    // Set up logging
    this.logger = winston.createLogger({
      level: options.isDev ? 'debug' : this.configManager.getLogLevel(),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  async start() {
    try {
      this.logger.info('Starting Stack App...');

      // Initialize database
      const dbPath = this.configManager.getDatabasePath();
      this.dbManager = new DatabaseManager(dbPath);
      this.logger.info(`Database initialized at: ${dbPath}`);

      // Initialize Docker manager
      const dockerSocketPath = this.configManager.getDockerSocketPath();
      this.dockerManager = new DockerManager(dockerSocketPath);
      this.logger.info(`Docker manager initialized with socket: ${dockerSocketPath}`);

      // Create Express app
      this.app = express();

      // Middleware
      this.app.use(express.json({ limit: '10mb' }));
      this.app.use(express.urlencoded({ extended: true }));

      // Request logging
      this.app.use((req, res, next) => {
        this.logger.debug(`${req.method} ${req.path}`, {
          headers: req.headers,
          query: req.query,
          body: req.body
        });
        next();
      });

      // API Key authentication (except for health endpoint)
      this.app.use(authenticateApiKey(this.configManager));

      // Health check endpoint (no authentication required)
      this.app.get('/health', async (req, res) => {
        const dockerStatus = this.dockerManager && this.dockerManager.isDockerAvailable() ? 'connected' : 'unavailable';
        
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version,
          services: {
            database: 'connected',
            docker: dockerStatus
          }
        });
      });

      // API routes
      this.app.use('/api/v1/stacks', createStackRoutes(this.dbManager, this.dockerManager));
      this.app.use('/api/v1/stacks/:stackId/services', createServiceRoutes(this.dbManager, this.dockerManager));

      // Root endpoint
      this.app.get('/', (req, res) => {
        res.json({
          name: 'Docker Stack Management API',
          version,
          description: 'RESTful API for managing Docker container stacks',
          endpoints: {
            health: '/health',
            stacks: '/api/v1/stacks',
            documentation: '/api/v1/docs'
          }
        });
      });

      // 404 handler
      this.app.use(notFoundHandler);

      // Error handling
      this.app.use(errorHandler);

      // Start server
      const port = this.options.port || this.configManager.getPort();
      this.server = this.app.listen(port, () => {
        this.logger.info(`Stack App listening on port ${port}`);
        this.logger.info(`Health check: http://localhost:${port}/health`);
        this.logger.info(`API endpoints: http://localhost:${port}/api/v1/stacks`);
      });

      // Graceful shutdown handling
      process.on('SIGINT', () => this.shutdown('SIGINT'));
      process.on('SIGTERM', () => this.shutdown('SIGTERM'));
      process.on('uncaughtException', (error) => {
        this.logger.error('Uncaught exception:', error);
        this.shutdown('uncaught exception');
      });
      process.on('unhandledRejection', (reason, promise) => {
        this.logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      });

    } catch (error) {
      this.logger.error('Failed to start Stack App:', error);
      throw error;
    }
  }

  async shutdown(signal) {
    this.logger.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
      // Close server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(() => {
            this.logger.info('HTTP server closed');
            resolve();
          });
        });
      }

      // Close database
      if (this.dbManager) {
        this.dbManager.close();
      }

      this.logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  // For testing purposes
  getApp() {
    return this.app;
  }
}

module.exports = StackApp;