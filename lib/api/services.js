const express = require('express');

function createServiceRoutes(dbManager, dockerManager) {
  const router = express.Router({ mergeParams: true });

  // GET /api/v1/stacks/:stackId/services/:serviceId - Get service details
  router.get('/:serviceId', async (req, res, next) => {
    try {
      const { stackId, serviceId } = req.params;

      // Check if stack exists
      const stack = await dbManager.getStack(stackId);
      if (!stack) {
        return res.status(404).json({
          error: {
            code: 'STACK_NOT_FOUND',
            message: `Stack '${stackId}' not found`
          }
        });
      }

      // Get service from database
      const service = await dbManager.getService(stackId, serviceId);
      if (!service) {
        return res.status(404).json({
          error: {
            code: 'SERVICE_NOT_FOUND',
            message: `Service '${serviceId}' not found in stack '${stackId}'`
          }
        });
      }

      // Get current status from Docker
      try {
        const status = await dockerManager.getContainerStatus(stackId, serviceId);
        service.status = status.running ? 'running' : status.status;
        service.containerDetails = status;
      } catch (error) {
        service.status = 'error';
        service.error = error.message;
      }

      res.json(service);
    } catch (error) {
      next(error);
    }
  });

  // GET /api/v1/stacks/:stackId/services/:serviceId/logs - Get service logs
  router.get('/:serviceId/logs', async (req, res, next) => {
    try {
      const { stackId, serviceId } = req.params;
      const { tail, follow } = req.query;

      // Check if stack and service exist
      const stack = await dbManager.getStack(stackId);
      if (!stack) {
        return res.status(404).json({
          error: {
            code: 'STACK_NOT_FOUND',
            message: `Stack '${stackId}' not found`
          }
        });
      }

      const service = await dbManager.getService(stackId, serviceId);
      if (!service) {
        return res.status(404).json({
          error: {
            code: 'SERVICE_NOT_FOUND',
            message: `Service '${serviceId}' not found in stack '${stackId}'`
          }
        });
      }

      // Get logs from Docker
      const options = {
        tail: tail ? parseInt(tail) : 100
      };

      try {
        if (follow === 'true') {
          // For follow logs, we would need to implement streaming
          // For now, just return recent logs
          const logs = await dockerManager.getContainerLogs(stackId, serviceId, options);
          
          res.json({
            stackId,
            serviceId,
            logs: logs.split('\n').map(line => line.trim()).filter(line => line)
          });
        } else {
          const logs = await dockerManager.getContainerLogs(stackId, serviceId, options);
          
          res.json({
            stackId,
            serviceId,
            logs: logs.split('\n').map(line => line.trim()).filter(line => line)
          });
        }
      } catch (error) {
        res.json({
          stackId,
          serviceId,
          logs: [`Error retrieving logs: ${error.message}`]
        });
      }
    } catch (error) {
      next(error);
    }
  });

  // POST /api/v1/stacks/:stackId/services/:serviceId/start - Start specific service
  router.post('/:serviceId/start', async (req, res, next) => {
    try {
      const { stackId, serviceId } = req.params;

      // Check if stack and service exist
      const stack = await dbManager.getStack(stackId);
      if (!stack) {
        return res.status(404).json({
          error: {
            code: 'STACK_NOT_FOUND',
            message: `Stack '${stackId}' not found`
          }
        });
      }

      const service = stack.services.find(s => s.id === serviceId);
      if (!service) {
        return res.status(404).json({
          error: {
            code: 'SERVICE_NOT_FOUND',
            message: `Service '${serviceId}' not found in stack '${stackId}'`
          }
        });
      }

      // Start the service
      try {
        // Create container if it doesn't exist
        await dockerManager.createContainer(stackId, service);
        
        // Start the container
        await dockerManager.startContainer(stackId, serviceId);

        res.json({
          stackId,
          serviceId,
          action: 'start',
          success: true,
          message: 'Service started successfully'
        });
      } catch (error) {
        res.status(500).json({
          error: {
            code: 'DOCKER_API_ERROR',
            message: `Failed to start service: ${error.message}`
          }
        });
      }
    } catch (error) {
      next(error);
    }
  });

  // POST /api/v1/stacks/:stackId/services/:serviceId/stop - Stop specific service
  router.post('/:serviceId/stop', async (req, res, next) => {
    try {
      const { stackId, serviceId } = req.params;

      // Check if stack and service exist
      const stack = await dbManager.getStack(stackId);
      if (!stack) {
        return res.status(404).json({
          error: {
            code: 'STACK_NOT_FOUND',
            message: `Stack '${stackId}' not found`
          }
        });
      }

      const service = stack.services.find(s => s.id === serviceId);
      if (!service) {
        return res.status(404).json({
          error: {
            code: 'SERVICE_NOT_FOUND',
            message: `Service '${serviceId}' not found in stack '${stackId}'`
          }
        });
      }

      // Stop the service
      try {
        await dockerManager.stopContainer(stackId, serviceId);

        res.json({
          stackId,
          serviceId,
          action: 'stop',
          success: true,
          message: 'Service stopped successfully'
        });
      } catch (error) {
        res.status(500).json({
          error: {
            code: 'DOCKER_API_ERROR',
            message: `Failed to stop service: ${error.message}`
          }
        });
      }
    } catch (error) {
      next(error);
    }
  });

  // POST /api/v1/stacks/:stackId/services/:serviceId/restart - Restart specific service
  router.post('/:serviceId/restart', async (req, res, next) => {
    try {
      const { stackId, serviceId } = req.params;

      // Check if stack and service exist
      const stack = await dbManager.getStack(stackId);
      if (!stack) {
        return res.status(404).json({
          error: {
            code: 'STACK_NOT_FOUND',
            message: `Stack '${stackId}' not found`
          }
        });
      }

      const service = stack.services.find(s => s.id === serviceId);
      if (!service) {
        return res.status(404).json({
          error: {
            code: 'SERVICE_NOT_FOUND',
            message: `Service '${serviceId}' not found in stack '${stackId}'`
          }
        });
      }

      // Restart the service (stop then start)
      try {
        await dockerManager.stopContainer(stackId, serviceId);
        await dockerManager.createContainer(stackId, service);
        await dockerManager.startContainer(stackId, serviceId);

        res.json({
          stackId,
          serviceId,
          action: 'restart',
          success: true,
          message: 'Service restarted successfully'
        });
      } catch (error) {
        res.status(500).json({
          error: {
            code: 'DOCKER_API_ERROR',
            message: `Failed to restart service: ${error.message}`
          }
        });
      }
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createServiceRoutes;