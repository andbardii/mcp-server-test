import { chromium } from 'playwright';
import { SECURITY_CONFIG } from '../config/security.js';

export class BrowserController {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.screenshots = new Map(); // Store screenshots in memory
    this.lastActivityTime = Date.now();
    this.sessionStartTime = null;
  }

  async launch(options = {}) {
    if (this.browser) {
      throw new Error('Browser is already running');
    }

    // Apply security settings
    const securityOptions = {
      headless: false,
      channel: 'chrome',
      args: [
        '--start-maximized',
        '--disable-plugins',
        '--disable-extensions',
        '--disable-popup-blocking',
        '--disable-notifications',
        '--disable-geolocation',
        '--disable-web-security=false',
        '--ignore-certificate-errors=false'
      ],
      ...options
    };

    // Apply browser security settings
    if (SECURITY_CONFIG.browserSecurity.disableJavaScript) {
      securityOptions.args.push('--disable-javascript');
    }
    if (SECURITY_CONFIG.browserSecurity.disableImages) {
      securityOptions.args.push('--disable-images');
    }

    this.browser = await chromium.launch(securityOptions);

    this.context = await this.browser.newContext({
      viewport: null,
      userAgent: SECURITY_CONFIG.browserSecurity.userAgent,
      recordVideo: {
        dir: './videos/',
        size: { width: 1280, height: 720 }
      },
      ignoreHTTPSErrors: SECURITY_CONFIG.browserSecurity.ignoreHTTPSErrors
    });

    this.page = await this.context.newPage();
    this.sessionStartTime = Date.now();
    
    // Set up security event listeners
    this.setupSecurityListeners();
    
    // Start session timeout check
    this.startSessionTimeoutCheck();
  }

  setupSecurityListeners() {
    // Block dangerous actions
    this.page.route('**/*', async (route) => {
      const url = route.request().url();
      try {
        const urlObj = new URL(url);
        if (!SECURITY_CONFIG.allowedDomains.includes(urlObj.hostname)) {
          await route.abort();
          return;
        }
      } catch (error) {
        await route.abort();
        return;
      }
      await route.continue();
    });

    // Monitor console for security issues
    this.page.on('console', msg => {
      const text = msg.text();
      if (text.includes('SecurityError') || text.includes('TypeError')) {
        console.log(`Security Warning: ${text}`);
      }
    });

    // Monitor page errors
    this.page.on('pageerror', error => {
      console.log(`Page Error: ${error.message}`);
    });

    // Monitor navigation
    this.page.on('framenavigated', frame => {
      this.lastActivityTime = Date.now();
    });
  }

  startSessionTimeoutCheck() {
    setInterval(() => {
      if (!this.browser) return;

      const now = Date.now();
      const sessionDuration = now - this.sessionStartTime;
      const inactivityDuration = now - this.lastActivityTime;

      // Check session duration
      if (sessionDuration > SECURITY_CONFIG.sessionSecurity.maxSessionDuration) {
        console.log('Session expired due to maximum duration');
        this.close();
        return;
      }

      // Check inactivity
      if (inactivityDuration > SECURITY_CONFIG.sessionSecurity.autoCloseOnInactivity) {
        console.log('Session closed due to inactivity');
        this.close();
        return;
      }
    }, 60000); // Check every minute
  }

  async navigate(url, options = {}) {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    try {
      const urlObj = new URL(url);
      if (!SECURITY_CONFIG.allowedDomains.includes(urlObj.hostname)) {
        throw new Error('Access to this domain is not allowed');
      }
    } catch (error) {
      throw new Error('Invalid URL format');
    }

    await this.page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000,
      ...options 
    });
    this.lastActivityTime = Date.now();
  }

  async click(selector, options = {}) {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.validateSelector(selector);
    await this.page.waitForSelector(selector, { timeout: 5000 });
    await this.page.click(selector, options);
    this.lastActivityTime = Date.now();
  }

  async type(selector, text, options = {}) {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.validateSelector(selector);
    await this.page.waitForSelector(selector);
    await this.page.fill(selector, text, options);
    this.lastActivityTime = Date.now();
  }

  async select(selector, value) {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.validateSelector(selector);
    await this.page.waitForSelector(selector);
    await this.page.selectOption(selector, value);
    this.lastActivityTime = Date.now();
  }

  async validateSelector(selector) {
    if (selector.includes('script') || 
        selector.includes('javascript:') || 
        selector.includes('data:')) {
      throw new Error('Invalid selector format');
    }
  }

  async screenshot(options = {}) {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    const screenshotId = Date.now().toString();
    const screenshot = await this.page.screenshot({
      fullPage: true,
      ...options
    });
    
    this.screenshots.set(screenshotId, screenshot);
    this.lastActivityTime = Date.now();
    return screenshotId;
  }

  async getScreenshot(screenshotId) {
    return this.screenshots.get(screenshotId);
  }

  async evaluate(script, ...args) {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    // Validate script for blocked functions
    for (const blockedFunc of SECURITY_CONFIG.blockedJavaScriptFunctions) {
      if (script.includes(blockedFunc)) {
        throw new Error(`Use of ${blockedFunc} is not allowed`);
      }
    }

    const result = await Promise.race([
      this.page.evaluate(script, ...args),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Script execution timeout')), 
        SECURITY_CONFIG.maxScriptExecutionTime)
      )
    ]);

    this.lastActivityTime = Date.now();
    return result;
  }

  async waitForNavigation(options = {}) {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.page.waitForNavigation(options);
  }

  async waitForSelector(selector, options = {}) {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.page.waitForSelector(selector, options);
  }

  async getCookies() {
    if (!this.context) {
      throw new Error('Browser not launched');
    }

    return await this.context.cookies();
  }

  async setCookies(cookies) {
    if (!this.context) {
      throw new Error('Browser not launched');
    }

    await this.context.addCookies(cookies);
  }

  async clearCookies() {
    if (!this.context) {
      throw new Error('Browser not launched');
    }

    await this.context.clearCookies();
  }

  async inspect(selector) {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.validateSelector(selector);
    await this.page.waitForSelector(selector);
    const element = await this.page.$(selector);
    
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    const elementInfo = await this.page.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(el);
      
      return {
        tagName: el.tagName,
        id: el.id,
        className: el.className,
        text: el.textContent,
        value: el.value,
        isVisible: el.offsetParent !== null,
        isEnabled: !el.disabled,
        position: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        styles: {
          color: computedStyle.color,
          backgroundColor: computedStyle.backgroundColor,
          fontSize: computedStyle.fontSize,
          fontWeight: computedStyle.fontWeight,
          display: computedStyle.display,
          visibility: computedStyle.visibility
        },
        attributes: Array.from(el.attributes).reduce((acc, attr) => {
          if (SECURITY_CONFIG.safeHtmlTags.includes(attr.name.toLowerCase())) {
            acc[attr.name] = attr.value;
          }
          return acc;
        }, {})
      };
    }, element);

    this.lastActivityTime = Date.now();
    return elementInfo;
  }

  async getPageContent() {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    return {
      url: this.page.url(),
      title: await this.page.title(),
      content: await this.page.content()
    };
  }

  async executeScript(script) {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    return await this.page.evaluate(script);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.screenshots.clear();
      this.sessionStartTime = null;
      this.lastActivityTime = null;
    }
  }
} 