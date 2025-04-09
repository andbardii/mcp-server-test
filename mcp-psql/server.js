/**
 * server.js
 * Express server setup and middleware
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/config');
const routes = require('./routes');
const { errorHandler } = require('./middleware/error-handler');
const SecurityMiddleware = require('./middleware/security');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors(config.cors));
app.use(express.json());
app.use(morgan('combined'));

// Apply security middleware
app.use(SecurityMiddleware.validateContentType);
app.use(SecurityMiddleware.sanitizeInput);
app.use(SecurityMiddleware.validateApiKey);
app.use(SecurityMiddleware.checkPermissions);
app.use(SecurityMiddleware.rateLimit);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version,
        environment: process.env.NODE_ENV
    });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
    const metrics = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        connections: SecurityMiddleware.rateLimits ? SecurityMiddleware.rateLimits.size : 0
    };
    res.json(metrics);
});

// API routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

// Start server
const PORT = config.port || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

module.exports = app;