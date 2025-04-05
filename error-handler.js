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

/**
 * Express error handler middleware
 */
function errorHandlerMiddleware(err, req, res, next) {
  console.error('Error:', err);
  
  // If it's already one of our ApiError instances
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details })
      }
    });
  }
  
  // Handle database-specific errors
  if (err.code && /^[0-9A-Z]{5}$/.test(err.code)) {
    const apiError = handleDatabaseError(err);
    return res.status(apiError.statusCode).json({
      success: false,
      error: {
        code: apiError.code,
        message: apiError.message,
        ...(apiError.details && { details: apiError.details })
      }
    });
  }
  
  // Default to 500 server error for unhandled cases
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    }
  });
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
  errorHandlerMiddleware
};