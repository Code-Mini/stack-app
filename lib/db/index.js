const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.initDatabase();
  }

  initDatabase() {
    // Ensure database directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        throw err;
      }
      console.log('Connected to SQLite database at:', this.dbPath);
    });

    this.createTables();
  }

  createTables() {
    const createStacksTable = `
      CREATE TABLE IF NOT EXISTS stacks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createServicesTable = `
      CREATE TABLE IF NOT EXISTS services (
        id TEXT NOT NULL,
        stack_id TEXT NOT NULL,
        name TEXT NOT NULL,
        image TEXT NOT NULL,
        container_config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (stack_id, id),
        FOREIGN KEY (stack_id) REFERENCES stacks(id) ON DELETE CASCADE
      )
    `;

    this.db.run(createStacksTable);
    this.db.run(createServicesTable);
  }

  // Stack operations
  async createStack(stackData) {
    return new Promise((resolve, reject) => {
      const { id, name, services } = stackData;
      
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        // Insert stack
        this.db.run(
          'INSERT INTO stacks (id, name) VALUES (?, ?)',
          [id, name],
          function(err) {
            if (err) {
              this.db.run('ROLLBACK');
              return reject(err);
            }
          }
        );

        // Insert services
        const serviceStmt = this.db.prepare(
          'INSERT INTO services (id, stack_id, name, image, container_config) VALUES (?, ?, ?, ?, ?)'
        );

        for (const service of services) {
          serviceStmt.run([
            service.id,
            id,
            service.name,
            service.image,
            JSON.stringify(service.containerConfig || {})
          ]);
        }
        serviceStmt.finalize();

        this.db.run('COMMIT', (err) => {
          if (err) {
            reject(err);
          } else {
            resolve({ id, name, services });
          }
        });
      });
    });
  }

  async getStack(stackId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM stacks WHERE id = ?',
        [stackId],
        (err, stackRow) => {
          if (err) return reject(err);
          if (!stackRow) return resolve(null);

          // Get services for this stack
          this.db.all(
            'SELECT * FROM services WHERE stack_id = ?',
            [stackId],
            (err, serviceRows) => {
              if (err) return reject(err);

              const services = serviceRows.map(service => ({
                id: service.id,
                name: service.name,
                image: service.image,
                containerConfig: JSON.parse(service.container_config),
                status: 'stopped', // Will be updated by docker integration
                details: `/api/v1/stacks/${stackId}/services/${service.id}`,
                logs: `/api/v1/stacks/${stackId}/services/${service.id}/logs`
              }));

              resolve({
                id: stackRow.id,
                name: stackRow.name,
                services,
                createdAt: stackRow.created_at,
                updatedAt: stackRow.updated_at
              });
            }
          );
        }
      );
    });
  }

  async getAllStacks() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM stacks ORDER BY created_at DESC', (err, rows) => {
        if (err) return reject(err);
        
        const stacks = rows.map(row => ({
          id: row.id,
          name: row.name,
          details: `/api/v1/stacks/${row.id}`,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));
        
        resolve(stacks);
      });
    });
  }

  async updateStack(stackId, stackData) {
    return new Promise((resolve, reject) => {
      const { name, services } = stackData;
      
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        // Update stack
        this.db.run(
          'UPDATE stacks SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [name, stackId],
          function(err) {
            if (err) {
              this.db.run('ROLLBACK');
              return reject(err);
            }
          }
        );

        // Delete existing services
        this.db.run('DELETE FROM services WHERE stack_id = ?', [stackId]);

        // Insert new services
        const serviceStmt = this.db.prepare(
          'INSERT INTO services (id, stack_id, name, image, container_config) VALUES (?, ?, ?, ?, ?)'
        );

        for (const service of services) {
          serviceStmt.run([
            service.id,
            stackId,
            service.name,
            service.image,
            JSON.stringify(service.containerConfig || {})
          ]);
        }
        serviceStmt.finalize();

        this.db.run('COMMIT', (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        });
      });
    });
  }

  async deleteStack(stackId) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM stacks WHERE id = ?', [stackId], function(err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  async getService(stackId, serviceId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM services WHERE stack_id = ? AND id = ?',
        [stackId, serviceId],
        (err, row) => {
          if (err) return reject(err);
          if (!row) return resolve(null);

          resolve({
            id: row.id,
            name: row.name,
            image: row.image,
            containerConfig: JSON.parse(row.container_config),
            status: 'stopped', // Will be updated by docker integration
            logs: `/api/v1/stacks/${stackId}/services/${serviceId}/logs`
          });
        }
      );
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

module.exports = DatabaseManager;