// Validation utilities for Stack App

class ValidationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
  }
}

const validators = {
  // Stack name validation
  validateStackName(name) {
    if (!name || typeof name !== 'string') {
      throw new ValidationError('Stack name is required and must be a string', 'INVALID_STACK_NAME');
    }
    
    if (name.length < 1 || name.length > 31) {
      throw new ValidationError('Stack name must be between 1 and 31 characters', 'INVALID_STACK_NAME');
    }
    
    const pattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!pattern.test(name)) {
      throw new ValidationError(
        `Stack name '${name}' contains invalid characters. Use only lowercase letters, numbers, and hyphens.`,
        'INVALID_STACK_NAME'
      );
    }
  },

  // Service name validation
  validateServiceName(name, stackId) {
    if (!name || typeof name !== 'string') {
      throw new ValidationError('Service name is required and must be a string', 'INVALID_SERVICE_NAME');
    }
    
    if (name.length < 1 || name.length > 31) {
      throw new ValidationError('Service name must be between 1 and 31 characters', 'INVALID_SERVICE_NAME');
    }
    
    const pattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!pattern.test(name)) {
      throw new ValidationError(
        `Service name '${name}' contains invalid characters. Use only lowercase letters, numbers, and hyphens.`,
        'INVALID_SERVICE_NAME'
      );
    }

    // Check container name length limit
    const containerName = `${stackId}-${name}`;
    if (containerName.length > 63) {
      throw new ValidationError(
        `Combined container name '${containerName}' exceeds 63 characters`,
        'CONTAINER_NAME_TOO_LONG'
      );
    }
  },

  // Docker image validation
  validateDockerImage(image) {
    if (!image || typeof image !== 'string') {
      throw new ValidationError('Docker image is required and must be a string', 'INVALID_DOCKER_IMAGE');
    }
    
    // Basic Docker image format validation
    const imagePattern = /^[a-z0-9]+([\.\-_][a-z0-9]+)*([\/][a-z0-9]+([\.\-_][a-z0-9]+)*)*(:[\w][\w\.\-]{0,127})?$/i;
    if (!imagePattern.test(image)) {
      throw new ValidationError(
        `Invalid Docker image format: '${image}'`,
        'INVALID_DOCKER_IMAGE'
      );
    }
  },

  // Stack data validation
  validateStackData(data) {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Stack data must be an object', 'INVALID_STACK_DATA');
    }

    const { id, name, services } = data;

    // Validate stack ID and name
    this.validateStackName(id);
    this.validateStackName(name);

    // Validate services
    if (!Array.isArray(services) || services.length === 0) {
      throw new ValidationError('Stack must contain at least one service', 'INVALID_STACK_DATA');
    }

    const serviceIds = new Set();
    const serviceNames = new Set();

    for (const service of services) {
      if (!service || typeof service !== 'object') {
        throw new ValidationError('Each service must be an object', 'INVALID_SERVICE_DATA');
      }

      const { id: serviceId, name: serviceName, image } = service;

      // Validate service ID and name
      this.validateServiceName(serviceId, data.id);
      this.validateServiceName(serviceName, data.id);

      // Check for duplicate service IDs and names within stack
      if (serviceIds.has(serviceId)) {
        throw new ValidationError(`Duplicate service ID: '${serviceId}'`, 'DUPLICATE_SERVICE_ID');
      }
      if (serviceNames.has(serviceName)) {
        throw new ValidationError(`Duplicate service name: '${serviceName}'`, 'DUPLICATE_SERVICE_NAME');
      }

      serviceIds.add(serviceId);
      serviceNames.add(serviceName);

      // Validate Docker image
      this.validateDockerImage(image);

      // Validate container configuration if present
      if (service.containerConfig) {
        this.validateContainerConfig(service.containerConfig);
      }
    }
  },

  // Container configuration validation
  validateContainerConfig(config) {
    if (!config || typeof config !== 'object') {
      return; // Container config is optional
    }

    // Validate ports
    if (config.ports) {
      if (!Array.isArray(config.ports)) {
        throw new ValidationError('Ports configuration must be an array', 'INVALID_CONTAINER_CONFIG');
      }

      for (const port of config.ports) {
        if (!port || typeof port !== 'object') {
          throw new ValidationError('Each port configuration must be an object', 'INVALID_CONTAINER_CONFIG');
        }

        if (!port.containerPort || typeof port.containerPort !== 'number') {
          throw new ValidationError('containerPort is required and must be a number', 'INVALID_CONTAINER_CONFIG');
        }

        if (port.containerPort < 1 || port.containerPort > 65535) {
          throw new ValidationError('containerPort must be between 1 and 65535', 'INVALID_CONTAINER_CONFIG');
        }

        if (port.hostPort && (typeof port.hostPort !== 'number' || port.hostPort < 1 || port.hostPort > 65535)) {
          throw new ValidationError('hostPort must be a number between 1 and 65535', 'INVALID_CONTAINER_CONFIG');
        }
      }
    }

    // Validate environment variables
    if (config.environment) {
      if (typeof config.environment !== 'object' || Array.isArray(config.environment)) {
        throw new ValidationError('Environment configuration must be an object', 'INVALID_CONTAINER_CONFIG');
      }
    }

    // Validate volumes
    if (config.volumes) {
      if (!Array.isArray(config.volumes)) {
        throw new ValidationError('Volumes configuration must be an array', 'INVALID_CONTAINER_CONFIG');
      }

      for (const volume of config.volumes) {
        if (!volume || typeof volume !== 'object') {
          throw new ValidationError('Each volume configuration must be an object', 'INVALID_CONTAINER_CONFIG');
        }

        if (!volume.hostPath || typeof volume.hostPath !== 'string') {
          throw new ValidationError('hostPath is required and must be a string', 'INVALID_CONTAINER_CONFIG');
        }

        if (!volume.containerPath || typeof volume.containerPath !== 'string') {
          throw new ValidationError('containerPath is required and must be a string', 'INVALID_CONTAINER_CONFIG');
        }
      }
    }
  }
};

module.exports = { ValidationError, validators };