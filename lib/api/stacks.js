const express = require('express');
const { validators } = require('./validators');

function createStackRoutes(dbManager, dockerManager) {
  const router = express.Router();

  // GET /api/v1/stacks - List all stacks
  router.get('/', async (req, res, next) => {
    try {
      const stacks = await dbManager.getAllStacks();
      res.json(stacks);
    } catch (error) {
      next(error);
    }
  });

  // GET /api/v1/stacks/:stackId - Get stack details
  router.get('/:stackId', async (req, res, next) => {
    try {
      const { stackId } = req.params;
      const stack = await dbManager.getStack(stackId);
      
      if (!stack) {
        return res.status(404).json({
          error: {
            code: 'STACK_NOT_FOUND',
            message: `Stack '${stackId}' not found`
          }
        });
      }

      // Update service statuses from Docker
      for (const service of stack.services) {
        try {
          const status = await dockerManager.getContainerStatus(stackId, service.id);
          service.status = status.running ? 'running' : status.status;
        } catch (error) {
          service.status = 'error';
        }
      }

      res.json(stack);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/v1/stacks - Create new stack
  router.post('/', async (req, res, next) => {
    try {
      const stackData = req.body;
      
      // Validate stack data
      validators.validateStackData(stackData);

      // Check if stack already exists
      const existingStack = await dbManager.getStack(stackData.id);
      if (existingStack) {
        return res.status(409).json({
          error: {
            code: 'STACK_ALREADY_EXISTS',
            message: `Stack '${stackData.id}' already exists`
          }
        });
      }

      // Create stack in database
      const createdStack = await dbManager.createStack(stackData);
      
      res.status(201).json(createdStack);
    } catch (error) {
      next(error);
    }
  });

  // PUT /api/v1/stacks/:stackId - Update stack
  router.put('/:stackId', async (req, res, next) => {
    try {
      const { stackId } = req.params;
      const stackData = req.body;

      // Check if stack exists
      const existingStack = await dbManager.getStack(stackId);
      if (!existingStack) {
        return res.status(404).json({
          error: {
            code: 'STACK_NOT_FOUND',
            message: `Stack '${stackId}' not found`
          }
        });
      }

      // Validate stack data (but allow different ID in URL vs body)
      const updatedStackData = { ...stackData, id: stackId };
      validators.validateStackData(updatedStackData);

      // Update stack in database
      await dbManager.updateStack(stackId, stackData);
      
      // Get updated stack
      const updatedStack = await dbManager.getStack(stackId);
      res.json(updatedStack);
    } catch (error) {
      next(error);
    }
  });

  // DELETE /api/v1/stacks/:stackId - Delete stack
  router.delete('/:stackId', async (req, res, next) => {
    try {
      const { stackId } = req.params;

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

      // Stop and remove containers
      await dockerManager.removeStack(stackId, stack.services);

      // Delete from database
      await dbManager.deleteStack(stackId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // POST /api/v1/stacks/:stackId/start - Start stack
  router.post('/:stackId/start', async (req, res, next) => {
    try {
      const { stackId } = req.params;

      const stack = await dbManager.getStack(stackId);
      if (!stack) {
        return res.status(404).json({
          error: {
            code: 'STACK_NOT_FOUND',
            message: `Stack '${stackId}' not found`
          }
        });
      }

      const results = await dockerManager.startStack(stackId, stack.services);
      
      res.json({
        stackId,
        action: 'start',
        results
      });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/v1/stacks/:stackId/stop - Stop stack
  router.post('/:stackId/stop', async (req, res, next) => {
    try {
      const { stackId } = req.params;

      const stack = await dbManager.getStack(stackId);
      if (!stack) {
        return res.status(404).json({
          error: {
            code: 'STACK_NOT_FOUND',
            message: `Stack '${stackId}' not found`
          }
        });
      }

      const results = await dockerManager.stopStack(stackId, stack.services);
      
      res.json({
        stackId,
        action: 'stop',
        results
      });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/v1/stacks/:stackId/restart - Restart stack
  router.post('/:stackId/restart', async (req, res, next) => {
    try {
      const { stackId } = req.params;

      const stack = await dbManager.getStack(stackId);
      if (!stack) {
        return res.status(404).json({
          error: {
            code: 'STACK_NOT_FOUND',
            message: `Stack '${stackId}' not found`
          }
        });
      }

      // Stop then start
      const stopResults = await dockerManager.stopStack(stackId, stack.services);
      const startResults = await dockerManager.startStack(stackId, stack.services);
      
      res.json({
        stackId,
        action: 'restart',
        stopResults,
        startResults
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/v1/stacks/:stackId/status - Get stack status
  router.get('/:stackId/status', async (req, res, next) => {
    try {
      const { stackId } = req.params;

      const stack = await dbManager.getStack(stackId);
      if (!stack) {
        return res.status(404).json({
          error: {
            code: 'STACK_NOT_FOUND',
            message: `Stack '${stackId}' not found`
          }
        });
      }

      const serviceStatuses = await dockerManager.getStackStatus(stackId, stack.services);
      
      res.json({
        stackId,
        stackName: stack.name,
        services: serviceStatuses
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/v1/stacks/:stackId/logs - Get stack logs
  router.get('/:stackId/logs', async (req, res, next) => {
    try {
      const { stackId } = req.params;
      const { tail } = req.query;

      const stack = await dbManager.getStack(stackId);
      if (!stack) {
        return res.status(404).json({
          error: {
            code: 'STACK_NOT_FOUND',
            message: `Stack '${stackId}' not found`
          }
        });
      }

      const logs = {};
      const options = { tail: tail ? parseInt(tail) : 100 };

      for (const service of stack.services) {
        try {
          logs[service.id] = await dockerManager.getContainerLogs(stackId, service.id, options);
        } catch (error) {
          logs[service.id] = `Error retrieving logs: ${error.message}`;
        }
      }

      res.json({
        stackId,
        logs
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createStackRoutes;