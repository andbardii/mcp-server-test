import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { BrowserController } from './controllers/browserController.js';
import { 
  rateLimiter, 
  validateUrl, 
  validateScript, 
  validateSelector, 
  validateContentSize,
  checkBrowserLimit 
} from './middleware/security.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const host = '127.0.0.1'; // Only listen on localhost

// Initialize browser controller
const browserController = new BrowserController();

// Security middleware
app.use(rateLimiter);
app.use(validateContentSize);
app.use(cors({
  origin: 'http://localhost:3000', // Only allow requests from localhost
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Routes with security middleware
app.post('/api/browser/launch', checkBrowserLimit(browserController), async (req, res) => {
  try {
    const options = req.body.options || {};
    await browserController.launch(options);
    res.json({ success: true, message: 'Browser launched successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/browser/navigate', validateUrl, async (req, res) => {
  try {
    const { url, options } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    await browserController.navigate(url, options);
    res.json({ success: true, message: `Navigated to ${url}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/browser/click', validateSelector, async (req, res) => {
  try {
    const { selector, options } = req.body;
    if (!selector) {
      return res.status(400).json({ success: false, error: 'Selector is required' });
    }
    await browserController.click(selector, options);
    res.json({ success: true, message: `Clicked element: ${selector}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/browser/type', validateSelector, async (req, res) => {
  try {
    const { selector, text, options } = req.body;
    if (!selector || !text) {
      return res.status(400).json({ success: false, error: 'Selector and text are required' });
    }
    await browserController.type(selector, text, options);
    res.json({ success: true, message: `Typed "${text}" into ${selector}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/browser/select', validateSelector, async (req, res) => {
  try {
    const { selector, value } = req.body;
    if (!selector || !value) {
      return res.status(400).json({ success: false, error: 'Selector and value are required' });
    }
    await browserController.select(selector, value);
    res.json({ success: true, message: `Selected value "${value}" in ${selector}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/browser/screenshot', async (req, res) => {
  try {
    const options = req.body.options || {};
    const screenshotId = await browserController.screenshot(options);
    res.json({ success: true, screenshotId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/browser/screenshot/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const screenshot = await browserController.getScreenshot(id);
    if (!screenshot) {
      return res.status(404).json({ success: false, error: 'Screenshot not found' });
    }
    res.set('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/browser/evaluate', validateScript, async (req, res) => {
  try {
    const { script, args } = req.body;
    if (!script) {
      return res.status(400).json({ success: false, error: 'Script is required' });
    }
    const result = await browserController.evaluate(script, ...(args || []));
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/browser/wait', async (req, res) => {
  try {
    const { type, selector, options } = req.body;
    if (!type) {
      return res.status(400).json({ success: false, error: 'Wait type is required' });
    }

    if (type === 'navigation') {
      await browserController.waitForNavigation(options);
    } else if (type === 'selector') {
      if (!selector) {
        return res.status(400).json({ success: false, error: 'Selector is required for selector wait' });
      }
      await browserController.waitForSelector(selector, options);
    } else {
      return res.status(400).json({ success: false, error: 'Invalid wait type' });
    }

    res.json({ success: true, message: `Waited for ${type}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/browser/cookies', async (req, res) => {
  try {
    const cookies = await browserController.getCookies();
    res.json({ success: true, cookies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/browser/cookies', async (req, res) => {
  try {
    const { cookies } = req.body;
    if (!cookies) {
      return res.status(400).json({ success: false, error: 'Cookies are required' });
    }
    await browserController.setCookies(cookies);
    res.json({ success: true, message: 'Cookies set successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/browser/cookies', async (req, res) => {
  try {
    await browserController.clearCookies();
    res.json({ success: true, message: 'Cookies cleared successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/browser/content', async (req, res) => {
  try {
    const content = await browserController.getPageContent();
    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/browser/execute', validateScript, async (req, res) => {
  try {
    const { script } = req.body;
    if (!script) {
      return res.status(400).json({ success: false, error: 'Script is required' });
    }
    const result = await browserController.executeScript(script);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/browser/inspect', validateSelector, async (req, res) => {
  try {
    const { selector } = req.body;
    if (!selector) {
      return res.status(400).json({ success: false, error: 'Selector is required' });
    }
    const elementInfo = await browserController.inspect(selector);
    res.json({ success: true, data: elementInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/browser/close', async (req, res) => {
  try {
    await browserController.close();
    res.json({ success: true, message: 'Browser closed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(port, host, () => {
  console.log(`MCP Brave server running on http://${host}:${port}`);
  console.log('Server is only accessible from localhost');
  console.log('Security measures are active');
}); 