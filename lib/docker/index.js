const Docker = require('dockerode');

class DockerManager {
  constructor(socketPath = '/var/run/docker.sock') {
    this.docker = new Docker({ socketPath });
    this.containerPrefix = '';
  }

  // Generate container name from stack and service IDs
  generateContainerName(stackId, serviceId) {
    const name = `${stackId}-${serviceId}`;
    if (name.length > 63) {
      throw new Error(`Container name '${name}' exceeds 63 character limit`);
    }
    return name;
  }

  // Create container from service configuration
  async createContainer(stackId, service) {
    const containerName = this.generateContainerName(stackId, service.id);
    const { containerConfig } = service;
    
    // Build Docker container options
    const containerOptions = {
      name: containerName,
      Image: service.image,
      AttachStdout: true,
      AttachStderr: true,
    };

    // Add environment variables
    if (containerConfig.environment) {
      containerOptions.Env = Object.entries(containerConfig.environment)
        .map(([key, value]) => `${key}=${value}`);
    }

    // Add port bindings
    if (containerConfig.ports && containerConfig.ports.length > 0) {
      containerOptions.ExposedPorts = {};
      containerOptions.HostConfig = containerOptions.HostConfig || {};
      containerOptions.HostConfig.PortBindings = {};

      for (const port of containerConfig.ports) {
        const containerPort = `${port.containerPort}/tcp`;
        containerOptions.ExposedPorts[containerPort] = {};
        
        if (port.hostPort) {
          containerOptions.HostConfig.PortBindings[containerPort] = [
            { HostPort: port.hostPort.toString() }
          ];
        }
      }
    }

    // Add volume bindings
    if (containerConfig.volumes && containerConfig.volumes.length > 0) {
      containerOptions.HostConfig = containerOptions.HostConfig || {};
      containerOptions.HostConfig.Binds = containerConfig.volumes.map(
        volume => `${volume.hostPath}:${volume.containerPath}`
      );
    }

    try {
      const container = await this.docker.createContainer(containerOptions);
      return container;
    } catch (error) {
      if (error.statusCode === 409) {
        // Container already exists, return existing container
        return this.docker.getContainer(containerName);
      }
      throw error;
    }
  }

  // Start a container
  async startContainer(stackId, serviceId) {
    const containerName = this.generateContainerName(stackId, serviceId);
    
    try {
      const container = this.docker.getContainer(containerName);
      await container.start();
      return true;
    } catch (error) {
      if (error.statusCode === 304) {
        // Container already started
        return true;
      }
      throw error;
    }
  }

  // Stop a container
  async stopContainer(stackId, serviceId) {
    const containerName = this.generateContainerName(stackId, serviceId);
    
    try {
      const container = this.docker.getContainer(containerName);
      await container.stop();
      return true;
    } catch (error) {
      if (error.statusCode === 304 || error.statusCode === 404) {
        // Container already stopped or doesn't exist
        return true;
      }
      throw error;
    }
  }

  // Remove a container
  async removeContainer(stackId, serviceId) {
    const containerName = this.generateContainerName(stackId, serviceId);
    
    try {
      const container = this.docker.getContainer(containerName);
      await container.remove({ force: true });
      return true;
    } catch (error) {
      if (error.statusCode === 404) {
        // Container doesn't exist
        return true;
      }
      throw error;
    }
  }

  // Get container status
  async getContainerStatus(stackId, serviceId) {
    const containerName = this.generateContainerName(stackId, serviceId);
    
    try {
      const container = this.docker.getContainer(containerName);
      const data = await container.inspect();
      
      return {
        status: data.State.Status,
        running: data.State.Running,
        startedAt: data.State.StartedAt,
        finishedAt: data.State.FinishedAt,
        exitCode: data.State.ExitCode
      };
    } catch (error) {
      if (error.statusCode === 404) {
        return {
          status: 'not-created',
          running: false,
          startedAt: null,
          finishedAt: null,
          exitCode: null
        };
      }
      throw error;
    }
  }

  // Get container logs
  async getContainerLogs(stackId, serviceId, options = {}) {
    const containerName = this.generateContainerName(stackId, serviceId);
    
    try {
      const container = this.docker.getContainer(containerName);
      const logStream = await container.logs({
        stdout: true,
        stderr: true,
        tail: options.tail || 100,
        timestamps: true,
        follow: false
      });
      
      return logStream.toString();
    } catch (error) {
      if (error.statusCode === 404) {
        return 'Container not found';
      }
      throw error;
    }
  }

  // Start all containers in a stack
  async startStack(stackId, services) {
    const results = [];
    
    for (const service of services) {
      try {
        // Create container if it doesn't exist
        await this.createContainer(stackId, service);
        
        // Start the container
        await this.startContainer(stackId, service.id);
        
        results.push({
          serviceId: service.id,
          success: true,
          status: 'started'
        });
      } catch (error) {
        results.push({
          serviceId: service.id,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Stop all containers in a stack
  async stopStack(stackId, services) {
    const results = [];
    
    for (const service of services) {
      try {
        await this.stopContainer(stackId, service.id);
        
        results.push({
          serviceId: service.id,
          success: true,
          status: 'stopped'
        });
      } catch (error) {
        results.push({
          serviceId: service.id,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Remove all containers in a stack
  async removeStack(stackId, services) {
    const results = [];
    
    for (const service of services) {
      try {
        await this.removeContainer(stackId, service.id);
        
        results.push({
          serviceId: service.id,
          success: true,
          status: 'removed'
        });
      } catch (error) {
        results.push({
          serviceId: service.id,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Get status for all services in a stack
  async getStackStatus(stackId, services) {
    const results = [];
    
    for (const service of services) {
      try {
        const status = await this.getContainerStatus(stackId, service.id);
        results.push({
          serviceId: service.id,
          serviceName: service.name,
          ...status
        });
      } catch (error) {
        results.push({
          serviceId: service.id,
          serviceName: service.name,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = DockerManager;