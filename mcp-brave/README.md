# MCP Brave Server

This is an MCP server that enables interaction with the Brave browser through Cursor or Claude applications.

## Features

- Browser automation using Playwright
- REST API endpoints for browser control
- Real-time browser interaction capabilities

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

- `POST /api/browser/launch` - Launch Brave browser
- `POST /api/browser/navigate` - Navigate to a URL
- `POST /api/browser/click` - Click on an element
- `POST /api/browser/inspect` - Get element information
- `POST /api/browser/close` - Close the browser

## Security Note

This server should be run locally and not exposed to the internet as it provides direct browser control capabilities.
