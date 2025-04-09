/**
 * error-handler.js
 * Centralized error handling
 */

/**
 * Standardized API error response
 */
class ApiError extends Error {
  constructor(message, statusCode, code, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database-related errors
 */
class DatabaseError extends ApiError {
  constructor(message, details = null) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

/**
 * Invalid request errors
 */
class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Not found errors
 */
class NotFoundError extends ApiError {
  constructor(message, details = null) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

/**
 * Authorization errors
 */
class AuthorizationError extends ApiError {
  constructor(message, details = null) {
    super(message, 403, 'AUTHORIZATION_ERROR', details);
  }
}

/**
 * Authentication errors
 */
class AuthenticationError extends ApiError {
  constructor(message, details = null) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
  }
}

/**
 * Rate limit errors
 */
class RateLimitError extends ApiError {
  constructor(message, details = null) {
    super(message, 429, 'RATE_LIMIT_ERROR', details);
  }
}

/**
 * AI-related errors
 */
class AIError extends ApiError {
  constructor(message, details = null) {
    super(message, 500, 'AI_ERROR', details);
  }
}

/**
 * Convert database errors to ApiError instances
 * @param {Error} err - Original database error
 * @returns {ApiError} Standardized API error
 */
function handleDatabaseError(err) {
  // PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
  const pgErrorMap = {
    '42P01': new NotFoundError('Relation not found', { originalError: err.message }),
    '42P04': new ValidationError('Duplicate database', { originalError: err.message }),
    '42501': new AuthorizationError('Insufficient privileges', { originalError: err.message }),
    '42601': new ValidationError('Syntax error in SQL', { originalError: err.message }),
    '42703': new ValidationError('Column not found', { originalError: err.message }),
    '42P20': new ValidationError('Window function error', { originalError: err.message }),
    '22P02': new ValidationError('Invalid text representation', { originalError: err.message }),
    '23505': new ValidationError('Unique violation', { originalError: err.message }),
    '57014': new ValidationError('Query execution was canceled (timeout)', { originalError: err.message })
  };

  // Check if it's a known PostgreSQL error
  if (err.code && pgErrorMap[err.code]) {
    return pgErrorMap[err.code];
  }

  // Generic database error
  return new DatabaseError(
    'Database operation failed', 
    { originalError: err.message }
  );
}

const errorTypes = {
  DATABASE_ERROR: 'DATABASE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  QUERY_EXECUTION_ERROR: 'QUERY_EXECUTION_ERROR',
  SCHEMA_ERROR: 'SCHEMA_ERROR',
  PROMPT_ERROR: 'PROMPT_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};

class CustomError extends Error {
  constructor(message, type, statusCode = 500, details = {}) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

const errorHandlerMiddleware = (err, req, res, next) => {
  const logger = require('./logger');
  
  // Log the error with additional context
  logger.error('Error occurred', {
    error: {
      message: err.message,
      type: err.type || errorTypes.INTERNAL_SERVER_ERROR,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      details: err.details || {},
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent'),
      ip: req.ip
    }
  });

  // Handle specific error types
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.type,
        message: err.message,
        details: err.details,
        timestamp: err.timestamp
      }
    });
  }

  // Handle database errors
  if (err.code && err.code.startsWith('28')) {
    return res.status(503).json({
      success: false,
      error: {
        code: errorTypes.DATABASE_ERROR,
        message: 'Database service unavailable',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: {
      code: errorTypes.INTERNAL_SERVER_ERROR,
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      timestamp: new Date().toISOString()
    }
  });
};

// Helper functions for error suggestions
function getValidationErrorSuggestions(err) {
  return {
    possibleCauses: [
      'Invalid SQL syntax',
      'Missing required parameters',
      'Type mismatch in parameters'
    ],
    recommendedActions: [
      'Check SQL syntax',
      'Verify parameter types',
      'Review required parameters'
    ]
  };
}

function getDatabaseErrorSuggestions(err) {
  return {
    possibleCauses: [
      'Database connection issue',
      'Query timeout',
      'Resource constraints'
    ],
    recommendedActions: [
      'Check database connection',
      'Optimize query performance',
      'Review resource limits'
    ]
  };
}

function getAIErrorSuggestions(err) {
  return {
    possibleCauses: [
      'AI model error',
      'Context misunderstanding',
      'Resource limitations'
    ],
    recommendedActions: [
      'Simplify the request',
      'Provide more context',
      'Check AI service status'
    ]
  };
}

function getNotFoundErrorSuggestions(err) {
  return {
    possibleCauses: [
      'Resource does not exist',
      'Incorrect path or identifier',
      'Access restrictions'
    ],
    recommendedActions: [
      'Verify resource identifier',
      'Check access permissions',
      'Review API documentation'
    ]
  };
}

module.exports = {
  ApiError,
  DatabaseError,
  ValidationError,
  NotFoundError,
  AuthorizationError,
  AuthenticationError,
  RateLimitError,
  handleDatabaseError,
  errorHandlerMiddleware,
  CustomError,
  errorTypes,
  AIError
};