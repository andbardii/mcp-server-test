const { ValidationError } = require('./error-handler');
const config = require('../config/config');

class SecurityMiddleware {
    static validateApiKey(req, res, next) {
        const apiKey = req.headers['x-api-key'];
        
        if (!apiKey) {
            throw new ValidationError('API key is required');
        }

        if (apiKey !== config.apiKey) {
            throw new ValidationError('Invalid API key');
        }

        next();
    }

    static checkPermissions(req, res, next) {
        const userRole = req.headers['x-user-role'];
        
        if (!userRole) {
            throw new ValidationError('User role is required');
        }

        const allowedRoles = ['admin', 'user', 'readonly'];
        if (!allowedRoles.includes(userRole)) {
            throw new ValidationError('Invalid user role');
        }

        // Check if user has permission for the requested operation
        const operation = req.method + ' ' + req.path;
        const permissions = {
            admin: ['*'],
            user: ['GET *', 'POST /api/query', 'POST /api/query/explain'],
            readonly: ['GET *']
        };

        const hasPermission = permissions[userRole].some(pattern => {
            if (pattern === '*') return true;
            if (pattern.endsWith('*')) {
                return operation.startsWith(pattern.slice(0, -1));
            }
            return operation === pattern;
        });

        if (!hasPermission) {
            throw new ValidationError('Permission denied');
        }

        next();
    }

    static sanitizeInput(req, res, next) {
        // Sanitize query parameters
        if (req.query) {
            Object.keys(req.query).forEach(key => {
                if (typeof req.query[key] === 'string') {
                    req.query[key] = this.sanitizeString(req.query[key]);
                }
            });
        }

        // Sanitize body parameters
        if (req.body) {
            Object.keys(req.body).forEach(key => {
                if (typeof req.body[key] === 'string') {
                    req.body[key] = this.sanitizeString(req.body[key]);
                }
            });
        }

        // Sanitize URL parameters
        if (req.params) {
            Object.keys(req.params).forEach(key => {
                if (typeof req.params[key] === 'string') {
                    req.params[key] = this.sanitizeString(req.params[key]);
                }
            });
        }

        next();
    }

    static sanitizeString(str) {
        // Remove potentially dangerous characters
        return str.replace(/[<>'"]/g, '');
    }

    static validateContentType(req, res, next) {
        const contentType = req.headers['content-type'];
        
        if (req.method === 'POST' || req.method === 'PUT') {
            if (!contentType || !contentType.includes('application/json')) {
                throw new ValidationError('Content-Type must be application/json');
            }
        }

        next();
    }

    static rateLimit(req, res, next) {
        const clientIp = req.ip;
        const now = Date.now();
        
        // Initialize rate limit tracking if not exists
        if (!this.rateLimits) {
            this.rateLimits = new Map();
        }

        // Get or create rate limit info for this IP
        let limitInfo = this.rateLimits.get(clientIp);
        if (!limitInfo) {
            limitInfo = {
                count: 0,
                resetTime: now + config.rateLimit.window
            };
            this.rateLimits.set(clientIp, limitInfo);
        }

        // Check if window has expired
        if (now > limitInfo.resetTime) {
            limitInfo.count = 0;
            limitInfo.resetTime = now + config.rateLimit.window;
        }

        // Check if limit exceeded
        if (limitInfo.count >= config.rateLimit.max) {
            throw new ValidationError('Rate limit exceeded');
        }

        // Increment count
        limitInfo.count++;

        next();
    }
}

module.exports = SecurityMiddleware; 