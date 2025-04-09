/**
 * query-provider.js
 * Business logic for query operations
 */
const QueryModel = require('../models/query-model');
const queryValidator = require('./query-validator');
const { ValidationError } = require('./error-handler');
const config = require('./config');
const { logQuery, logPerformance } = require('../utils/logger');

class QueryProvider {
  constructor() {
    this.queryModel = new QueryModel();
  }

  validateQueryInput(query, params) {
    if (!query || typeof query !== 'string') {
      throw new ValidationError('Query must be a non-empty string');
    }

    if (!Array.isArray(params)) {
      throw new ValidationError('Parameters must be an array');
    }

    // Validate each parameter
    params.forEach((param, index) => {
      if (param === null || param === undefined) {
        throw new ValidationError(`Parameter at index ${index} cannot be null or undefined`);
      }
      
      // Check for complex objects that could be dangerous
      if (typeof param === 'object' && param !== null) {
        throw new ValidationError(`Parameter at index ${index} cannot be an object`);
      }
      
      // Check for potential SQL injection in string parameters
      if (typeof param === 'string') {
        const dangerousPatterns = [
          /--/, // SQL comments
          /;/,  // Statement termination
          /\/\*.*\*\//, // Block comments
          /union\s+select/i,
          /insert\s+into/i,
          /update\s+.*\s+set/i,
          /delete\s+from/i,
          /drop\s+table/i
        ];
        
        if (dangerousPatterns.some(pattern => pattern.test(param))) {
          throw new ValidationError(`Parameter at index ${index} contains potentially dangerous content`);
        }
      }
    });

    // Validate query structure
    const queryLower = query.toLowerCase();
    if (queryLower.includes(';')) {
      throw new ValidationError('Multiple statements are not allowed');
    }

    // Check for dangerous operations if not allowed
    const dangerousOperations = [
      'insert', 'update', 'delete', 'drop', 'create', 'alter', 'truncate'
    ];
    
    if (dangerousOperations.some(op => queryLower.includes(op))) {
      throw new ValidationError('Write operations are not allowed');
    }
  }

  /**
   * Execute a SQL query safely
   * @param {string} query - The SQL query to execute
   * @param {Array} params - Query parameters
   * @returns {Object} Query results and metadata
   */
  async executeQuery(query, params = []) {
    const startTime = Date.now();
    
    try {
      // Validate input
      this.validateQueryInput(query, params);
      
      const results = await this.queryModel.executeQuery(query, params);
      logQuery(query, params);
      logPerformance('query_execution', Date.now() - startTime);
      
      return this.formatResults(results);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }
  
  /**
   * Analyze the execution plan for a SQL query
   * @param {string} sql - The SQL query to analyze
   * @param {Array} params - Query parameters
   * @returns {Object} Explain plan results
   */
  async explainQuery(sql, params = []) {
    const startTime = Date.now();
    // Validate the query
    const validation = queryValidator.validateQuery(sql);
    if (!validation.isValid) {
      throw new ValidationError('Invalid query', validation.errors);
    }
    
    // Sanitize the query
    const sanitizedSql = queryValidator.sanitizeQuery(sql);
    
    try {
      const explanation = await this.queryModel.explainQuery(sanitizedSql, params);
      logQuery(sanitizedSql, params, { type: 'explain' });
      logPerformance('query_explanation', Date.now() - startTime);
      return this.formatExplanation(explanation);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get a sample of data from a table
   * @param {string} table - Table name
   * @param {string} schema - Schema name
   * @param {number} limit - Maximum number of rows to return
   * @returns {Object} Sample data and metadata
   */
  async getTableSample(table, schema = 'public', limit = 100) {
    if (limit > config.query.maxRowsReturned) {
      limit = config.query.maxRowsReturned;
    }
    
    return await this.queryModel.getTableSample(table, schema, limit);
  }
  
  /**
   * Get statistical information about a table
   * @param {string} table - Table name
   * @param {string} schema - Schema name
   * @returns {Object} Table statistics
   */
  async getTableStats(table, schema = 'public') {
    return await this.queryModel.getTableStats(table, schema);
  }
  
  /**
   * Generate a basic SELECT query for a table
   * @param {string} table - Table name
   * @param {string} schema - Schema name
   * @param {Object} options - Query options (limit, orderBy, where)
   * @returns {string} Generated SQL query
   */
  generateSelectQuery(table, schema = 'public', options = {}) {
    const limit = options.limit || 100;
    const columns = options.columns || '*';
    let sql = `SELECT ${columns} FROM "${schema}"."${table}"`;
    
    if (options.where) {
      sql += ` WHERE ${options.where}`;
    }
    
    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }
    
    sql += ` LIMIT ${limit}`;
    
    return sql;
  }
  
  /**
   * Generate a basic aggregation query for a table
   * @param {string} table - Table name
   * @param {string} schema - Schema name
   * @param {Object} options - Aggregation options
   * @returns {string} Generated SQL query
   */
  generateAggregationQuery(table, schema = 'public', options = {}) {
    const aggregates = options.aggregates || ['COUNT(*) as count'];
    const groupBy = options.groupBy || [];
    const having = options.having || null;
    const orderBy = options.orderBy || null;
    const limit = options.limit || 100;
    
    let sql = `SELECT ${aggregates.join(', ')} FROM "${schema}"."${table}"`;
    
    if (options.where) {
      sql += ` WHERE ${options.where}`;
    }
    
    if (groupBy.length > 0) {
      sql += ` GROUP BY ${groupBy.join(', ')}`;
    }
    
    if (having) {
      sql += ` HAVING ${having}`;
    }
    
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    
    sql += ` LIMIT ${limit}`;
    
    return sql;
  }
  
  /**
   * Generate a basic join query for two tables
   * @param {string} table1 - First table name
   * @param {string} table2 - Second table name
   * @param {string} joinCondition - Join condition
   * @param {Object} options - Join options
   * @returns {string} Generated SQL query
   */
  generateJoinQuery(table1, schema1 = 'public', table2, schema2 = 'public', joinCondition, options = {}) {
    const joinType = options.joinType || 'INNER';
    const columns = options.columns || '*';
    const limit = options.limit || 100;
    
    let sql = `SELECT ${columns} FROM "${schema1}"."${table1}" ${joinType} JOIN "${schema2}"."${table2}" ON ${joinCondition}`;
    
    if (options.where) {
      sql += ` WHERE ${options.where}`;
    }
    
    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }
    
    sql += ` LIMIT ${limit}`;
    
    return sql;
  }

  formatResults(results) {
    return {
      columns: results.columns,
      rows: results.rows,
      rowCount: results.rows.length,
      executionTime: results.executionTime,
      metadata: this.generateMetadata(results)
    };
  }

  formatExplanation(explanation) {
    return {
      plan: explanation.plan,
      cost: explanation.cost,
      executionTime: explanation.executionTime,
      suggestions: this.generateOptimizationSuggestions(explanation)
    };
  }

  formatSuggestion(suggestion) {
    return {
      query: suggestion.query,
      description: suggestion.description,
      complexity: suggestion.complexity,
      estimatedRows: suggestion.estimatedRows,
      confidence: suggestion.confidence
    };
  }

  formatOptimization(optimized) {
    return {
      originalQuery: optimized.originalQuery,
      optimizedQuery: optimized.optimizedQuery,
      improvements: optimized.improvements,
      estimatedGain: optimized.estimatedGain
    };
  }

  formatAnalysis(analysis) {
    return {
      complexity: analysis.complexity,
      performance: analysis.performance,
      potentialIssues: analysis.potentialIssues,
      recommendations: analysis.recommendations
    };
  }

  generateMetadata(results) {
    return {
      columnTypes: this.analyzeColumnTypes(results),
      statistics: this.generateStatistics(results),
      patterns: this.identifyPatterns(results)
    };
  }

  generateOptimizationSuggestions(explanation) {
    return {
      indexSuggestions: this.suggestIndexes(explanation),
      queryRestructuring: this.suggestRestructuring(explanation),
      parameterOptimization: this.suggestParameterOptimization(explanation)
    };
  }

  analyzeColumnTypes(results) {
    // Analyze and return column data types
    return results.columns.map(column => ({
      name: column,
      type: this.determineColumnType(results.rows, column)
    }));
  }

  generateStatistics(results) {
    // Generate statistical analysis of the results
    return {
      numericStats: this.calculateNumericStats(results),
      categoricalStats: this.calculateCategoricalStats(results),
      temporalStats: this.calculateTemporalStats(results)
    };
  }

  identifyPatterns(results) {
    // Identify patterns in the data
    return {
      trends: this.identifyTrends(results),
      correlations: this.identifyCorrelations(results),
      anomalies: this.identifyAnomalies(results)
    };
  }

  // ... existing helper methods ...
}

module.exports = QueryProvider;