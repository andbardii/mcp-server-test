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
app.use(morgan(config.server.env === 'development' ? 'dev' : 'combined'));
app.use(compression());

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

// Start the server
const PORT = config.server.port;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.server.env}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    console.log('HTTP server closed');
    await dbConnector.end();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(async () => {
    console.log('HTTP server closed');
    await dbConnector.end();
    process.exit(0);
  });
});

module.exports = app;