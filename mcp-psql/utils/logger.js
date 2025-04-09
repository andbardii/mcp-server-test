const winston = require('winston');
const config = require('../config/config');

// Create logger instance
const logger = winston.createLogger({
    level: config.logLevel || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// AI Interaction Logger
const logAIInteraction = async (data) => {
    if (!config.logAIInteractions) return;

    const logData = {
        timestamp: new Date().toISOString(),
        type: 'ai_interaction',
        ...data
    };

    logger.info('AI Interaction', logData);
};

// GUI Action Logger
const logGUIAction = async (data) => {
    if (!config.logGUIActions) return;

    const logData = {
        timestamp: new Date().toISOString(),
        type: 'gui_action',
        ...data
    };

    logger.info('GUI Action', logData);
};

// Error Logger
const logError = (error, context = {}) => {
    const logData = {
        timestamp: new Date().toISOString(),
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name
        },
        context
    };

    logger.error('Error', logData);
};

// Query Logger
const logQuery = (query, params, context = {}) => {
    const logData = {
        timestamp: new Date().toISOString(),
        type: 'query',
        query,
        params,
        context
    };

    logger.info('Query', logData);
};

// Performance Logger
const logPerformance = (operation, duration, context = {}) => {
    const logData = {
        timestamp: new Date().toISOString(),
        type: 'performance',
        operation,
        duration,
        context
    };

    logger.info('Performance', logData);
};

// Schema Logger
const logSchemaOperation = (operation, details, context = {}) => {
    const logData = {
        timestamp: new Date().toISOString(),
        type: 'schema_operation',
        operation,
        details,
        context
    };

    logger.info('Schema Operation', logData);
};

module.exports = {
    logger,
    logAIInteraction,
    logGUIAction,
    logError,
    logQuery,
    logPerformance,
    logSchemaOperation
}; 