/**
 * server.js
 * Express server setup and middleware
 */
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const config = require('./config');
const logger = require('./logger');
const { errorHandlerMiddleware } = require('./error-handler');
const dbConnector = require('./db-connector');

// Import controllers
const schemaController = require('./schema-controller');
const queryController = require('./query-controller');
const promptController = require('./prompt-controller');

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors(config.server.cors));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: logger.stream }));
app.use(compression());

// Request validation middleware
app.use((req, res, next) => {
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(415).json({
      success: false,
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Content-Type must be application/json'
      }
    });
  }
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  }
});
app.use(limiter);

// API routes
app.use('/api', schemaController);
app.use('/api', queryController);
app.use('/api', promptController);

// Home route with API information
app.get('/', (req, res) => {
  res.json({
    name: 'Database MCP Server',
    description: 'API for PostgreSQL database access and analysis',
    version: '1.0.0',
    endpoints: {
      schemas: '/api/schemas',
      tables: '/api/schemas/:schema/tables',
      views: '/api/schemas/:schema/views',
      tableSchema: '/api/schemas/:schema/tables/:table',
      query: '/api/query',
      prompts: '/api/prompts'
    },
    docs: '/api/openapi'
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const isDbConnected = await dbConnector.testConnection();
  
  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: isDbConnected ? 'connected' : 'disconnected'
      }
    }
  });
});

// Handle 404 errors
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`
    }
  });
});

// Global error handler
app.use(errorHandlerMiddleware);

// Initialize database connection and start server
async function startServer() {
  try {
    await dbConnector.initialize();
    const PORT = config.server.port;
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${config.server.env}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(async () => {
        logger.info('HTTP server closed');
        await dbConnector.end();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();

module.exports = app;