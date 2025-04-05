/**
 * query-provider.js
 * Business logic for query operations
 */
const queryModel = require('./query-model');
const queryValidator = require('./query-validator');
const { ValidationError } = require('./error-handler');
const config = require('./config');

class QueryProvider {
  /**
   * Execute a SQL query safely
   * @param {string} sql - The SQL query to execute
   * @param {Array} params - Query parameters
   * @returns {Object} Query results and metadata
   */
  async executeQuery(sql, params = []) {
    // Validate the query
    const validation = queryValidator.validateQuery(sql);
    if (!validation.isValid) {
      throw new ValidationError('Invalid query', validation.errors);
    }
    
    // Check for complex queries
    const complexityAnalysis = queryValidator.analyzeQueryComplexity(sql);
    
    // Sanitize the query
    const sanitizedSql = queryValidator.sanitizeQuery(sql);
    
    try {
      // Execute the query
      const result = await queryModel.executeQuery(sanitizedSql, params, config.query.maxExecutionTime);
      
      // Add complexity warnings if any
      if (complexityAnalysis.isComplex) {
        result.warnings = complexityAnalysis.warnings;
      }
      
      return result;
    } catch (error) {
      // Handle query timeout separately
      if (error.message.includes('statement timeout')) {
        throw new ValidationError(
          'Query execution timed out',
          {
            timeout: `${config.query.maxExecutionTime}ms`,
            query: sanitizedSql
          }
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Analyze the execution plan for a SQL query
   * @param {string} sql - The SQL query to analyze
   * @param {Array} params - Query parameters
   * @returns {Object} Explain plan results
   */
  async explainQuery(sql, params = []) {
    // Validate the query
    const validation = queryValidator.validateQuery(sql);
    if (!validation.isValid) {
      throw new ValidationError('Invalid query', validation.errors);
    }
    
    // Sanitize the query
    const sanitizedSql = queryValidator.sanitizeQuery(sql);
    
    return await queryModel.explainQuery(sanitizedSql, params);
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
    
    return await queryModel.getTableSample(table, schema, limit);
  }
  
  /**
   * Get statistical information about a table
   * @param {string} table - Table name
   * @param {string} schema - Schema name
   * @returns {Object} Table statistics
   */
  async getTableStats(table, schema = 'public') {
    return await queryModel.getTableStats(table, schema);
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
}

module.exports = new QueryProvider();