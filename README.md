# MCP PostgreSQL Server

A Model-Controller-Provider (MCP) server that:
- Connects to a PostgreSQL database
- Exposes table schemas as resources
- Provides tools for running read-only SQL queries
- Includes prompts for common data analysis tasks

## Features

- **Schema Exploration**: Browse database schemas, tables, and columns
- **Read-only Query Execution**: Safely run SQL queries against your database
- **Data Analysis Prompts**: Pre-built SQL templates for common analysis tasks
- **Data Visualization**: Generate data for visualization
- **Relationship Exploration**: Visualize table relationships and foreign keys
- **API Documentation**: Auto-generated OpenAPI specification

## Architecture

This application follows the Model-Controller-Provider (MCP) pattern:

- **Model Layer**: Direct interaction with the database
- **Provider Layer**: Business logic and data processing
- **Controller Layer**: API endpoints and request handling

## Security Features

- Read-only query validation
- SQL injection protection
- Rate limiting
- Parameterized queries
- Authentication support
- CORS configuration

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd mcp-postgres-server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.template`:
   ```
   cp .env.template .env
   ```

4. Update the `.env` file with your PostgreSQL database credentials.

5. Start the server:
   ```
   npm start
   ```

## Configuration

All configuration is managed through environment variables:

- **Server**: Port, environment, CORS settings
- **Database**: Connection details, pool settings
- **Security**: JWT settings, rate limiting
- **Query**: Execution limits, result size limits

## API Endpoints

### Schema Endpoints

- `GET /api/schemas` - List all schemas
- `GET /api/schemas/:schema/tables` - List tables in a schema
- `GET /api/schemas/:schema/tables/:table` - Get table schema details
- `GET /api/schemas/:schema/relationships` - Get table relationships
- `GET /api/structure` - Get complete database structure
- `GET /api/search?q=term` - Search tables and columns

### Query Endpoints

- `POST /api/query` - Execute a SQL query
- `POST /api/query/explain` - Get query execution plan
- `GET /api/schemas/:schema/tables/:table/sample` - Get sample data
- `GET /api/schemas/:schema/tables/:table/stats` - Get table statistics

### Analysis Prompt Endpoints

- `GET /api/prompts` - List analysis prompt templates
- `GET /api/prompts/:templateId` - Get prompt template details
- `POST /api/prompts/:templateId/generate` - Generate SQL from template
- `GET /api/schemas/:schema/tables/:table/analysis/suggest` - Get analysis suggestions

## Example Queries

### Basic Table Query

```javascript
// API request
fetch('/api/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: 'SELECT * FROM users LIMIT 10'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

### Using Analysis Prompts

```javascript
// Get suggested analysis for a table
fetch('/api/schemas/public/tables/orders/analysis/suggest')
.then(response => response.json())
.then(suggestions => {
  // Use a suggestion
  const suggestionId = suggestions.data[0].templateId;
  const params = suggestions.data[0].params;
  
  // Generate SQL from the template
  return fetch(`/api/prompts/${suggestionId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ params })
  });
})
.then(response => response.json())
.then(data => {
  // Execute the generated SQL
  return fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: data.data.sql })
  });
})
.then(response => response.json())
.then(results => console.log(results));
```

## Development

- Run in development mode: `npm run dev`
- Run tests: `npm test`
- Lint code: `npm run lint`

## License

MIT