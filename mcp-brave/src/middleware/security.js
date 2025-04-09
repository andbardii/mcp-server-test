import { SECURITY_CONFIG } from '../config/security.js';
import rateLimit from 'express-rate-limit';
import { URL } from 'url';

// Rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: SECURITY_CONFIG.rateLimit.windowMs,
  max: SECURITY_CONFIG.rateLimit.max,
  message: 'Too many requests, please try again later.'
});

// URL validation middleware
export const validateUrl = (req, res, next) => {
  if (req.body.url) {
    try {
      const url = new URL(req.body.url);
      const domain = url.hostname;
      
      if (SECURITY_CONFIG.allowedDomains.length > 0 && 
          !SECURITY_CONFIG.allowedDomains.includes(domain)) {
        return res.status(403).json({ 
          success: false, 
          error: 'Access to this domain is not allowed' 
        });
      }
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid URL format' 
      });
    }
  }
  next();
};

// Script validation middleware
export const validateScript = (req, res, next) => {
  if (req.body.script) {
    const script = req.body.script.toLowerCase();
    
    // Check for blocked functions
    for (const blockedFunc of SECURITY_CONFIG.blockedJavaScriptFunctions) {
      if (script.includes(blockedFunc.toLowerCase())) {
        return res.status(403).json({ 
          success: false, 
          error: `Use of ${blockedFunc} is not allowed` 
        });
      }
    }

    // Check script length
    if (script.length > SECURITY_CONFIG.maxContentSize) {
      return res.status(413).json({ 
        success: false, 
        error: 'Script is too large' 
      });
    }
  }
  next();
};

// Selector validation middleware
export const validateSelector = (req, res, next) => {
  if (req.body.selector) {
    const selector = req.body.selector;
    
    // Check for potentially dangerous selectors
    if (selector.includes('script') || 
        selector.includes('javascript:') || 
        selector.includes('data:')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid selector format' 
      });
    }
  }
  next();
};

// Content size validation middleware
export const validateContentSize = (req, res, next) => {
  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength) > SECURITY_CONFIG.maxContentSize) {
    return res.status(413).json({ 
      success: false, 
      error: 'Request payload too large' 
    });
  }
  next();
};

// Browser instance limit middleware
export const checkBrowserLimit = (browserController) => (req, res, next) => {
  if (browserController.browser && 
      browserController.browser.contexts().length >= SECURITY_CONFIG.maxConcurrentBrowsers) {
    return res.status(429).json({ 
      success: false, 
      error: 'Maximum number of browser instances reached' 
    });
  }
  next();
}; 