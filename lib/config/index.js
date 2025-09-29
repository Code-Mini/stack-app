const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

class ConfigManager {
  constructor(configPath) {
    this.configPath = configPath;
    this.config = this.loadConfig();
  }

  loadConfig() {
    const defaultConfig = {
      database: {
        type: 'sqlite',
        path: process.env.NODE_ENV === 'production' 
          ? '/var/lib/stack-app/stacks.db' 
          : './data/stacks.db'
      },
      api: {
        port: 3001,
        keys: [
          '1062e8cfd6e93f435eff03879299e08cbe0010ed3e24f6a66e2a4623cffa7261',
          'a72caf2b0c18509948d7c55b5d0de1e9462c021fa5f4a008183ff8bf819549eb'
        ]
      },
      docker: {
        socketPath: '/var/run/docker.sock'
      },
      logging: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        format: 'json'
      }
    };

    if (!this.configPath) {
      return defaultConfig;
    }

    try {
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      let userConfig;

      if (this.configPath.endsWith('.yaml') || this.configPath.endsWith('.yml')) {
        userConfig = yaml.parse(configContent);
      } else {
        userConfig = JSON.parse(configContent);
      }

      // Merge with default config
      return this.mergeDeep(defaultConfig, userConfig);
    } catch (error) {
      console.warn(`Warning: Could not load config from ${this.configPath}:`, error.message);
      console.warn('Using default configuration');
      return defaultConfig;
    }
  }

  mergeDeep(target, source) {
    const output = Object.assign({}, target);
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target))
            Object.assign(output, { [key]: source[key] });
          else
            output[key] = this.mergeDeep(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  get(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], this.config);
  }

  getApiKeys() {
    return this.get('api.keys') || [];
  }

  getPort() {
    return this.get('api.port') || 3001;
  }

  getDatabasePath() {
    return this.get('database.path') || './data/stacks.db';
  }

  getDockerSocketPath() {
    return this.get('docker.socketPath') || '/var/run/docker.sock';
  }

  getLogLevel() {
    return this.get('logging.level') || 'info';
  }
}

module.exports = ConfigManager;