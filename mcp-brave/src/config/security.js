export const SECURITY_CONFIG = {
  // Allowed domains (empty array means all domains are blocked)
  allowedDomains: [
    'localhost',
    '127.0.0.1',
    // Add more trusted domains here
  ],

  // Maximum number of actions per minute
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
  },

  // Blocked actions
  blockedActions: [
    'download',
    'upload',
    'fileSystem',
    'clipboard',
    'geolocation',
    'camera',
    'microphone',
    'notifications',
    'popups',
    'newWindow', // Prevent opening new windows
    'closeWindow', // Prevent closing windows
    'print', // Prevent printing
    'savePage', // Prevent saving pages
  ],

  // Maximum script execution time in milliseconds
  maxScriptExecutionTime: 5000,

  // Maximum number of concurrent browser instances
  maxConcurrentBrowsers: 1,

  // Blocked JavaScript functions
  blockedJavaScriptFunctions: [
    'eval',
    'Function',
    'setTimeout',
    'setInterval',
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'alert',
    'confirm',
    'prompt',
    'open',
    'close',
    'print',
    'history.pushState',
    'history.replaceState',
  ],

  // Safe HTML tags for content inspection
  safeHtmlTags: [
    'div', 'span', 'p', 'a', 'button', 'input', 'form',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
    'table', 'tr', 'td', 'th', 'img', 'label', 'select',
    'option', 'textarea'
  ],

  // Maximum content size in bytes
  maxContentSize: 10 * 1024 * 1024, // 10MB

  // Browser security settings
  browserSecurity: {
    disableJavaScript: false, // Set to true to completely disable JavaScript
    disableImages: false, // Set to true to disable image loading
    disablePlugins: true, // Always disable plugins
    disableWebSecurity: false, // Never disable web security
    ignoreHTTPSErrors: false, // Never ignore HTTPS errors
    userAgent: 'MCP-Brave-Secure/1.0', // Custom user agent
  },

  // Session security
  sessionSecurity: {
    maxSessionDuration: 30 * 60 * 1000, // 30 minutes
    requireUserConfirmation: true, // Require user confirmation for sensitive actions
    autoCloseOnInactivity: 5 * 60 * 1000, // 5 minutes
  }
}; 