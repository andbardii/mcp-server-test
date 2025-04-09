/**
 * query-validator.js
 * Ensures queries are read-only and safe
 */

class QueryValidator {
  /**
   * Check if a SQL query is read-only
   * @param {string} sql - The SQL query to validate
   * @returns {boolean} True if the query is read-only
   */
  isReadOnly(sql) {
    if (!sql || typeof sql !== 'string') {
      return false;
    }
    
    // Normalize the SQL string
    const normalizedSql = sql.trim().toLowerCase();
    
    // Check for statements that modify data
    const writeOperations = [
      /\binsert\s+into\b/i,
      /\bupdate\b.*\bset\b/i,
      /\bdelete\s+from\b/i,
      /\btruncate\s+table\b/i,
      /\bdrop\s+(table|schema|database|index|view|trigger|function|procedure)/i,
      /\balter\s+(table|schema|database|index|view|trigger|function|procedure)/i,
      /\bcreate\s+(table|schema|database|index|view|trigger|function|procedure)/i,
      /\bgrant\b/i,
      /\brevoke\b/i
    ];
    
    for (const pattern of writeOperations) {
      if (pattern.test(normalizedSql)) {
        return false;
      }
    }
    
    // Check for SQL statements that are generally read-only
    const readOperations = [
      /^\s*select\b/i,
      /^\s*show\b/i,
      /^\s*describe\b/i,
      /^\s*explain\b/i
    ];
    
    for (const pattern of readOperations) {
      if (pattern.test(normalizedSql)) {
        return true;
      }
    }
    
    // If we can't clearly determine, assume it's not read-only for safety
    return false;
  }
  
  /**
   * Validate the query for potential security issues
   * @param {string} sql - The SQL query to validate
   * @returns {Object} Validation result with success and any error messages
   */
  validateQuery(sql) {
    if (!sql || typeof sql !== 'string') {
      return {
        isValid: false,
        errors: ['Query cannot be empty']
      };
    }
    
    const errors = [];
    
    // Check if query is read-only
    if (!this.isReadOnly(sql)) {
      errors.push('Only read-only queries are allowed');
    }
    
    // Check for commenting out parts of the query (potential SQL injection techniques)
    if (/--.*$/m.test(sql)) {
      errors.push('SQL comments are not allowed');
    }
    
    // Check for multiple statements (potential SQL injection)
    if (/;\s*\w+/i.test(sql)) {
      errors.push('Multiple SQL statements are not allowed');
    }
    
    // Check for potentially unsafe functions
    const unsafeFunctions = [
      /\bcopy\s*\(/i,
      /\bpg_read_file\s*\(/i,
      /\bpg_read_binary_file\s*\(/i,
      /\bpg_sleep\s*\(/i,
      /\bpg_terminate_backend\s*\(/i
    ];
    
    for (const pattern of unsafeFunctions) {
      if (pattern.test(sql)) {
        errors.push('Query contains potentially unsafe functions');
        break;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Sanitize a SQL query by removing potentially harmful elements
   * @param {string} sql - The SQL query to sanitize
   * @returns {string} The sanitized SQL query
   */
  sanitizeQuery(sql) {
    if (!sql || typeof sql !== 'string') {
      return '';
    }
    
    // Remove comments
    let sanitized = sql.replace(/--.*$/mg, '');
    
    // Remove multiple statements
    sanitized = sanitized.split(';')[0];
    
    return sanitized.trim();
  }
  
  /**
   * Check if the query might be too expensive or resource-intensive
   * @param {string} sql - The SQL query to analyze
   * @returns {Object} Analysis result with any warnings
   */
  analyzeQueryComplexity(sql) {
    if (!sql || typeof sql !== 'string') {
      return {
        isComplex: false,
        warnings: ['Empty query']
      };
    }
    
    const warnings = [];
    const normalizedSql = sql.toLowerCase();
    
    // Check for queries without WHERE clauses
    if (/\bselect\b(?!.*\bwhere\b)/i.test(normalizedSql) && 
        !/\bselect\b.*\bcount\b.*\bfrom\b/i.test(normalizedSql)) {
      warnings.push('Query does not contain a WHERE clause, which might return a large dataset');
    }
    
    // Check for expensive operations
    if (/\bcross\s+join\b/i.test(normalizedSql)) {
      warnings.push('Query contains a CROSS JOIN which might be computationally expensive');
    }
    
    // Check for multiple joins
    const joinCount = (normalizedSql.match(/\bjoin\b/gi) || []).length;
    if (joinCount > 3) {
      warnings.push(`Query contains ${joinCount} JOINs which might be expensive`);
    }
    
    // Check for ORDER BY without LIMIT
    if (/\border\s+by\b(?!.*\blimit\b)/i.test(normalizedSql)) {
      warnings.push('Query contains ORDER BY without LIMIT which might be expensive for large datasets');
    }
    
    // Check for potentially slow functions
    const slowFunctions = [
      /\bregexp\b/i,
      /\bsimilar\s+to\b/i,
      /\blike\b.*%.*%/i,  // wildcard in the middle
      /\barray_agg\b/i,
      /\bstring_agg\b/i,
      /\bjson_agg\b/i
    ];
    
    for (const pattern of slowFunctions) {
      if (pattern.test(normalizedSql)) {
        warnings.push('Query contains potentially slow operations');
        break;
      }
    }
    
    return {
      isComplex: warnings.length > 0,
      warnings
    };
  }
}

module.exports = new QueryValidator();