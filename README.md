# MCP Server (Model-Connection-PostgreSQL)

MCP Server is a secure and efficient tool for connecting to your company's PostgreSQL database, exploring table schemas, running read-only SQL queries, and performing common data analysis tasks.

## Features

- **PostgreSQL Database Connection**: Securely connect to your company's PostgreSQL database
- **Schema Explorer**: Browse database schemas and tables with detailed metadata
- **Table Schema Exposure**: View detailed information about tables, columns, relationships, and sample data
- **Read-Only SQL Queries**: Execute safe, read-only SQL queries against your database
- **Analysis Prompts**: Pre-built query templates for common data analysis tasks
- **Query History**: Keep track of your previously executed queries
- **Export Results**: Export query results to CSV files

## Installation and Setup

### Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- PostgreSQL database

### Installation

1. Clone the repository or extract the files to your local machine

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file based on the provided `.env.example`:
   ```
   # PostgreSQL Database Configuration
   DB_USER=your_database_username
   DB_PASSWORD=your_database_password
   DB_HOST=your_database_host
   DB_NAME=your_database_name
   DB_PORT=5432
   DB_SSL=false

   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Security
   SESSION_SECRET=your_secure_random_string
   ```

4. Start the server:
   ```bash
   npm start
   # or
   yarn start
   ```

5. For development with auto-restart:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. Open your browser and navigate to `http://localhost:3000`

## Usage

### Database Explorer

The Database Explorer provides a tree view of all available schemas and tables in your database. You can:

1. Click on a schema to expand/collapse it and view its tables
2. Click on a table to view its details, including:
   - Overview information (schema, table name, estimated row count)
   - Column definitions (names, data types, constraints)
   - Relationships (foreign keys)
   - Indexes
   - Sample data (first 5 rows)

### SQL Query Tool

The SQL Query tool allows you to write and execute SQL queries against your database:

1. Write your SQL query in the editor
2. Click "Execute Query" to run it
3. View the results in the table below
4. Export results to CSV if needed
5. Save frequently used queries for later use

Note: Only read-only queries (SELECT statements) are allowed for security reasons.

### Analysis Prompts

The Analysis Prompts section provides pre-built query templates for common data analysis tasks:

1. Select a prompt template from the available options
2. Fill in the required parameters (schema, table, columns, etc.)
3. Preview the generated SQL query
4. Use the query in the SQL Query Tool
5. Execute the query to see the results

Available analysis types include:
- Basic data overview (counts, min/max, averages)
- Missing values analysis
- Categorical data distribution
- Time series analysis
- Correlation analysis
- Group by analysis
- Outlier detection
- Recent changes analysis
- Pivot table analysis
- Retention analysis

## Security Features

- **Read-Only Queries**: Only SELECT statements are allowed to prevent data modification
- **Query Validation**: SQL queries are validated on the server side before execution
- **Query Timeout**: Long-running queries are automatically terminated after 30 seconds
- **Helmet Security**: HTTP headers are configured for improved security
- **Environment Variables**: Sensitive configuration is stored in environment variables
- **SSL Support**: Optional SSL connection to the database

## API Endpoints

The MCP Server provides the following API endpoints:

- `GET /api/schemas`: Get a list of all database schemas
- `GET /api/schemas/:schema/tables`: Get a list of tables in a specific schema
- `GET /api/schemas/:schema/tables/:table`: Get detailed information about a specific table
- `POST /api/query`: Execute a read-only SQL query
- `GET /api/prompts`: Get a list of available analysis prompt templates

## Extending the Analysis Prompts

You can add your own analysis prompts by editing the `prompts.json` file. Each prompt should include:

- `id`: Unique identifier for the prompt
- `name`: Display name
- `description`: Brief description of what the analysis does
- `template`: SQL query template with parameter placeholders

Parameter placeholders use the format `{parameter_name}` or `{parameter_name:option1,option2}` for parameters with predefined options.

## Troubleshooting

### Database Connection Issues

- Verify your database credentials in the `.env` file
- Ensure your database server is running and accessible from the server
- Check if the database user has sufficient privileges

### Query Execution Problems

- Only read-only queries (SELECT statements) are allowed
- Check for syntax errors in your SQL query
- Consider simplifying complex queries or adding appropriate filters
- Long-running queries may time out after 30 seconds

## License

This project is licensed under the MIT License - see the LICENSE file for details.