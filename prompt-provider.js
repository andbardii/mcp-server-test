/**
 * prompt-provider.js
 * Manages analysis prompt templates
 */
const schemaModel = require('./schema-model');
const queryModel = require('./query-model');

class PromptProvider {
  constructor() {
    // Initialize a collection of prompt templates for common data analysis tasks
    this.promptTemplates = {
      basicTableSummary: {
        name: 'Basic Table Summary',
        description: 'Generate a simple summary of the data in a table',
        template: `-- Basic summary statistics for {{schema}}.{{table}}
SELECT 
  COUNT(*) AS total_rows,
  {{numeric_columns_stats}}
FROM "{{schema}}"."{{table}}";`
      },
      
      columnValueDistribution: {
        name: 'Column Value Distribution',
        description: 'Analyze the distribution of values in a specific column',
        template: `-- Value distribution for {{schema}}.{{table}}.{{column}}
SELECT 
  "{{column}}", 
  COUNT(*) AS frequency,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) AS percentage
FROM "{{schema}}"."{{table}}"
GROUP BY "{{column}}"
ORDER BY frequency DESC
LIMIT 20;`
      },
      
      timeSeries: {
        name: 'Time Series Analysis',
        description: 'Analyze data over time using a timestamp column',
        template: `-- Time series analysis for {{schema}}.{{table}} using {{timestamp_column}}
SELECT 
  DATE_TRUNC('{{time_unit}}', "{{timestamp_column}}") AS time_period,
  COUNT(*) AS count,
  {{aggregations}}
FROM "{{schema}}"."{{table}}"
{{where_clause}}
GROUP BY time_period
ORDER BY time_period;`
      },
      
      correlationAnalysis: {
        name: 'Correlation Analysis',
        description: 'Calculate correlation between two numeric columns',
        template: `-- Correlation between {{column1}} and {{column2}} in {{schema}}.{{table}}
SELECT 
  CORR("{{column1}}", "{{column2}}") AS correlation_coefficient,
  REGR_R2("{{column1}}", "{{column2}}") AS r_squared
FROM "{{schema}}"."{{table}}"
WHERE "{{column1}}" IS NOT NULL AND "{{column2}}" IS NOT NULL;`
      },
      
      topValues: {
        name: 'Top Values',
        description: 'Find top values by a measure',
        template: `-- Top values in {{schema}}.{{table}} by {{measure_column}}
SELECT 
  {{dimension_columns}},
  {{measure_column}} AS measure
FROM "{{schema}}"."{{table}}"
WHERE {{measure_column}} IS NOT NULL
ORDER BY {{measure_column}} DESC
LIMIT {{limit}};`
      },
      
      groupByAnalysis: {
        name: 'Group By Analysis',
        description: 'Group data and calculate aggregates',
        template: `-- Group by analysis for {{schema}}.{{table}}
SELECT 
  {{dimension_columns}},
  COUNT(*) AS count,
  {{aggregations}}
FROM "{{schema}}"."{{table}}"
{{where_clause}}
GROUP BY {{dimension_columns}}
ORDER BY count DESC
LIMIT {{limit}};`
      },
      
      yearOverYearComparison: {
        name: 'Year-over-Year Comparison',
        description: 'Compare metrics across years',
        template: `-- Year-over-year comparison for {{schema}}.{{table}}
SELECT 
  EXTRACT(YEAR FROM "{{timestamp_column}}") AS year,
  {{time_unit_extract}},
  {{aggregations}}
FROM "{{schema}}"."{{table}}"
{{where_clause}}
GROUP BY year, {{time_unit_extract}}
ORDER BY {{time_unit_extract}}, year;`
      },
      
      percentiles: {
        name: 'Percentile Analysis',
        description: 'Calculate percentiles for a numeric column',
        template: `-- Percentile analysis for {{schema}}.{{table}}.{{column}}
SELECT
  PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY "{{column}}") AS p10,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY "{{column}}") AS p25,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "{{column}}") AS median,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY "{{column}}") AS p75,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY "{{column}}") AS p90,
  AVG("{{column}}") AS mean
FROM "{{schema}}"."{{table}}"
WHERE "{{column}}" IS NOT NULL;`
      },
      
      rollingAverages: {
        name: 'Rolling Averages',
        description: 'Calculate rolling averages over time',
        template: `-- Rolling average for {{schema}}.{{table}}.{{measure_column}} over {{window_size}} {{time_unit}}s
SELECT 
  "{{timestamp_column}}" AS time_period,
  "{{measure_column}}",
  AVG("{{measure_column}}") OVER (
    ORDER BY "{{timestamp_column}}" 
    ROWS BETWEEN {{window_size}} PRECEDING AND CURRENT ROW
  ) AS rolling_average
FROM "{{schema}}"."{{table}}"
WHERE "{{measure_column}}" IS NOT NULL
ORDER BY time_period;`
      },
      
      recentChanges: {
        name: 'Recent Changes',
        description: 'Analyze most recent changes in data',
        template: `-- Recent changes in {{schema}}.{{table}}
SELECT 
  {{columns}}
FROM "{{schema}}"."{{table}}"
ORDER BY {{timestamp_column}} DESC
LIMIT {{limit}};`
      }
    };
  }
  
  /**
   * Get all available prompt templates
   * @returns {Array} List of prompt templates
   */
  getAllPromptTemplates() {
    return Object.keys(this.promptTemplates).map(key => ({
      id: key,
      name: this.promptTemplates[key].name,
      description: this.promptTemplates[key].description
    }));
  }
  
  /**
   * Get a specific prompt template by ID
   * @param {string} templateId - Prompt template ID
   * @returns {Object} Prompt template
   */
  getPromptTemplate(templateId) {
    if (!this.promptTemplates[templateId]) {
      throw new Error(`Prompt template '${templateId}' not found`);
    }
    
    return this.promptTemplates[templateId];
  }
  
  /**
   * Generate a SQL query from a prompt template
   * @param {string} templateId - Prompt template ID
   * @param {Object} params - Template parameters
   * @returns {string} Generated SQL query
   */
  async generateSqlFromTemplate(templateId, params) {
    const template = this.getPromptTemplate(templateId);
    let sql = template.template;
    
    // Replace template variables with actual values
    for (const [key, value] of Object.entries(params)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      sql = sql.replace(regex, value);
    }
    
    return sql;
  }
  
  /**
   * Generate common numeric column statistics
   * @param {string} table - Table name
   * @param {string} schema - Schema name
   * @returns {string} SQL fragment for numeric column statistics
   */
  async generateNumericColumnStats(table, schema = 'public') {
    const columns = await schemaModel.getTableColumns(table, schema);
    const numericTypes = ['integer', 'bigint', 'decimal', 'numeric', 'real', 'double precision'];
    
    const numericColumns = columns.filter(col => 
      numericTypes.includes(col.data_type.toLowerCase())
    );
    
    if (numericColumns.length === 0) {
      return "/* No numeric columns found */";
    }
    
    const statsFragments = numericColumns.map(col => {
      const colName = col.column_name;
      return `
  MIN("${colName}") AS min_${colName},
  MAX("${colName}") AS max_${colName},
  AVG("${colName}") AS avg_${colName},
  STDDEV("${colName}") AS stddev_${colName}`;
    });
    
    return statsFragments.join(',');
  }
  
  /**
   * Generate template for basic table analysis
   * @param {string} table - Table name
   * @param {string} schema - Schema name
   * @returns {Object} Template parameters and SQL
   */
  async generateBasicAnalysisTemplate(table, schema = 'public') {
    const numericStats = await this.generateNumericColumnStats(table, schema);
    
    const params = {
      schema,
      table,
      numeric_columns_stats: numericStats
    };
    
    const sql = await this.generateSqlFromTemplate('basicTableSummary', params);
    
    return {
      params,
      sql
    };
  }
  
  /**
   * Generate template for column distribution analysis
   * @param {string} table - Table name
   * @param {string} schema - Schema name
   * @param {string} column - Column name
   * @returns {Object} Template parameters and SQL
   */
  async generateColumnDistributionTemplate(table, schema = 'public', column) {
    // Default to first column if not specified
    if (!column) {
      const columns = await schemaModel.getTableColumns(table, schema);
      column = columns[0].column_name;
    }
    
    const params = {
      schema,
      table,
      column
    };
    
    const sql = await this.generateSqlFromTemplate('columnValueDistribution', params);
    
    return {
      params,
      sql
    };
  }
  
  /**
   * Generate template for time series analysis
   * @param {string} table - Table name
   * @param {string} schema - Schema name
   * @param {Object} options - Additional options
   * @returns {Object} Template parameters and SQL
   */
  async generateTimeSeriesTemplate(table, schema = 'public', options = {}) {
    const columns = await schemaModel.getTableColumns(table, schema);
    
    // Find timestamp columns
    const timestampTypes = ['timestamp', 'timestamptz', 'date', 'timestamp with time zone', 'timestamp without time zone'];
    const timestampColumns = columns.filter(col => 
      timestampTypes.includes(col.data_type.toLowerCase())
    );
    
    if (timestampColumns.length === 0) {
      throw new Error(`No timestamp columns found in ${schema}.${table}`);
    }
    
    // Default values
    const timestampColumn = options.timestampColumn || timestampColumns[0].column_name;
    const timeUnit = options.timeUnit || 'day';
    const whereClause = options.whereClause ? `WHERE ${options.whereClause}` : '';
    
    // Find numeric columns for aggregation
    const numericTypes = ['integer', 'bigint', 'decimal', 'numeric', 'real', 'double precision'];
    const numericColumns = columns.filter(col => 
      numericTypes.includes(col.data_type.toLowerCase())
    );
    
    let aggregations = '/* No numeric columns for aggregation */';
    
    if (numericColumns.length > 0) {
      aggregations = numericColumns
        .slice(0, 3) // Limit to first 3 numeric columns
        .map(col => `AVG("${col.column_name}") AS avg_${col.column_name}`)
        .join(',\n  ');
    }
    
    const params = {
      schema,
      table,
      timestamp_column: timestampColumn,
      time_unit: timeUnit,
      aggregations,
      where_clause: whereClause
    };
    
    const sql = await this.generateSqlFromTemplate('timeSeries', params);
    
    return {
      params,
      sql
    };
  }
  
  /**
   * Generate prompt for correlation analysis between two columns
   * @param {string} table - Table name
   * @param {string} schema - Schema name
   * @param {string} column1 - First column name
   * @param {string} column2 - Second column name
   * @returns {Object} Template parameters and SQL
   */
  async generateCorrelationTemplate(table, schema = 'public', column1, column2) {
    // If columns not specified, try to find numeric columns
    if (!column1 || !column2) {
      const columns = await schemaModel.getTableColumns(table, schema);
      const numericTypes = ['integer', 'bigint', 'decimal', 'numeric', 'real', 'double precision'];
      const numericColumns = columns.filter(col => 
        numericTypes.includes(col.data_type.toLowerCase())
      );
      
      if (numericColumns.length < 2) {
        throw new Error(`Need at least 2 numeric columns for correlation in ${schema}.${table}`);
      }
      
      column1 = numericColumns[0].column_name;
      column2 = numericColumns[1].column_name;
    }
    
    const params = {
      schema,
      table,
      column1,
      column2
    };
    
    const sql = await this.generateSqlFromTemplate('correlationAnalysis', params);
    
    return {
      params,
      sql
    };
  }
  
  /**
   * Analyze a specific table and suggest appropriate analysis templates
   * @param {string} table - Table name
   * @param {string} schema - Schema name
   * @returns {Array} Suggested analysis templates
   */
  async suggestAnalysisTemplates(table, schema = 'public') {
    const columns = await schemaModel.getTableColumns(table, schema);
    const suggested = [];
    
    // Always suggest basic table summary
    suggested.push({
      templateId: 'basicTableSummary',
      reason: 'Get a basic overview of table statistics',
      params: { schema, table }
    });
    
    // Check for timestamp columns
    const timestampTypes = ['timestamp', 'timestamptz', 'date', 'timestamp with time zone', 'timestamp without time zone'];
    const timestampColumns = columns.filter(col => 
      timestampTypes.includes(col.data_type.toLowerCase())
    );
    
    if (timestampColumns.length > 0) {
      suggested.push({
        templateId: 'timeSeries',
        reason: `Found timestamp column "${timestampColumns[0].column_name}" for time series analysis`,
        params: { 
          schema, 
          table, 
          timestamp_column: timestampColumns[0].column_name,
          time_unit: 'day',
          aggregations: '/* Specify aggregations here */',
          where_clause: ''
        }
      });
      
      suggested.push({
        templateId: 'recentChanges',
        reason: `Found timestamp column "${timestampColumns[0].column_name}" for recent changes analysis`,
        params: { 
          schema, 
          table, 
          timestamp_column: timestampColumns[0].column_name,
          columns: '*',
          limit: 10
        }
      });
    }
    
    // Check for numeric columns
    const numericTypes = ['integer', 'bigint', 'decimal', 'numeric', 'real', 'double precision'];
    const numericColumns = columns.filter(col => 
      numericTypes.includes(col.data_type.toLowerCase())
    );
    
    if (numericColumns.length > 0) {
      const numericColumn = numericColumns[0].column_name;
      
      suggested.push({
        templateId: 'percentiles',
        reason: `Found numeric column "${numericColumn}" for percentile analysis`,
        params: { 
          schema, 
          table, 
          column: numericColumn
        }
      });
      
      if (numericColumns.length > 1) {
        suggested.push({
          templateId: 'correlationAnalysis',
          reason: `Found multiple numeric columns for correlation analysis`,
          params: { 
            schema, 
            table, 
            column1: numericColumns[0].column_name,
            column2: numericColumns[1].column_name
          }
        });
      }
    }
    
    // Check for categorical columns
    const categoricalTypes = ['character', 'character varying', 'varchar', 'text'];
    const categoricalColumns = columns.filter(col => 
      categoricalTypes.includes(col.data_type.toLowerCase())
    );
    
    if (categoricalColumns.length > 0) {
      suggested.push({
        templateId: 'columnValueDistribution',
        reason: `Found categorical column "${categoricalColumns[0].column_name}" for distribution analysis`,
        params: { 
          schema, 
          table, 
          column: categoricalColumns[0].column_name
        }
      });
      
      suggested.push({
        templateId: 'groupByAnalysis',
        reason: `Found categorical column "${categoricalColumns[0].column_name}" for group by analysis`,
        params: { 
          schema, 
          table, 
          dimension_columns: `"${categoricalColumns[0].column_name}"`,
          aggregations: '/* Specify aggregations here */',
          where_clause: '',
          limit: 10
        }
      });
    }
    
    return suggested;
  }
}

module.exports = new PromptProvider();