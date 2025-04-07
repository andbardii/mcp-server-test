/**
 * db-connector.js
 * Manages PostgreSQL connection pool
 */
const { Pool } = require('pg');
const config = require('./config');
const logger = require('./logger');
const { CustomError, errorTypes } = require('./error-handler');

class DatabaseConnector {
  constructor() {
    this.pool = null;
    this.retryAttempts = 0;
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  async initialize() {
    try {
      this.pool = new Pool({
        host: config.db.host,
        port: config.db.port,
        database: config.db.database,
        user: config.db.user,
        password: config.db.password,
        ssl: config.db.ssl,
        max: config.db.poolSize,
        idleTimeoutMillis: config.db.idleTimeout,
        connectionTimeoutMillis: config.db.connectionTimeout
      });

      // Test the connection
      await this.testConnection();
      logger.info('Database connection pool initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database connection pool', { error });
      throw new CustomError(
        'Database connection failed',
        errorTypes.DATABASE_ERROR,
        503,
        { error: error.message }
      );
    }
  }

  async testConnection() {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database connection test failed', { error });
      return false;
    } finally {
      client.release();
    }
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Query executed', {
        text,
        duration,
        rowCount: result.rowCount
      });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Query execution failed', {
        text,
        duration,
        error: error.message
      });

      // Handle connection errors with retry logic
      if (this.isConnectionError(error) && this.retryAttempts < this.maxRetries) {
        this.retryAttempts++;
        logger.warn(`Retrying query (attempt ${this.retryAttempts}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.query(text, params);
      }

      throw new CustomError(
        'Query execution failed',
        errorTypes.QUERY_EXECUTION_ERROR,
        500,
        { error: error.message, query: text }
      );
    }
  }

  isConnectionError(error) {
    return error.code && (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code.startsWith('28')
    );
  }

  async end() {
    if (this.pool) {
      try {
        await this.pool.end();
        logger.info('Database connection pool closed');
      } catch (error) {
        logger.error('Error closing database connection pool', { error });
      }
    }
  }
}

const dbConnector = new DatabaseConnector();
module.exports = dbConnector;