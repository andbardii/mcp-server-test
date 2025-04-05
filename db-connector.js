/**
 * db-connector.js
 * Manages PostgreSQL connection pool
 */
const { Pool } = require('pg');
const config = require('./config');

class DatabaseConnector {
  constructor() {
    this.pool = new Pool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      ssl: config.db.ssl,
      max: config.db.poolSize,
      idleTimeoutMillis: config.db.idleTimeout,
      connectionTimeoutMillis: config.db.connectionTimeout,
    });

    // Test the connection on startup
    this.testConnection();
  }

  async testConnection() {
    try {
      const client = await this.pool.connect();
      console.log('Successfully connected to PostgreSQL database');
      client.release();
      return true;
    } catch (error) {
      console.error('Failed to connect to PostgreSQL database:', error.message);
      return false;
    }
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Error executing query', { text, error: error.message });
      throw error;
    }
  }

  async getClient() {
    const client = await this.pool.connect();
    const query = client.query;
    const release = client.release;
    
    // Override client.query to log queries
    client.query = (...args) => {
      client.lastQuery = args;
      return query.apply(client, args);
    };
    
    // Override client.release to track release time
    client.release = () => {
      client.lastQuery = null;
      return release.apply(client);
    };
    
    return client;
  }

  async end() {
    await this.pool.end();
    console.log('Database connection pool has been closed');
  }
}

// Singleton instance
const dbConnector = new DatabaseConnector();

module.exports = dbConnector;