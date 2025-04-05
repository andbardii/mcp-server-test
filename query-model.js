/**
 * query-model.js
 * Manages query execution and results
 */
const dbConnector = require('./db-connector');
const config = require('./config');

class QueryModel {
  /**
   * Execute a read-only SQL query
   * @param {string} sql - The SQL query to execute
   * @param {Array} params - Query parameters
   * @param {number} timeout - Query timeout in milliseconds
   * @returns {Object} Query results and metadata
   */
  async executeQuery(sql, params = [], timeout = config.query.maxExecutionTime) {
    const client = await dbConnector.getClient();
    
    try {
      // Set statement timeout
      await client.query(`SET statement_timeout TO ${timeout};`);
      
      const startTime = Date.now();
      const result = await client.query(sql, params);
      const executionTime = Date.now() - startTime;
      
      // Limit the number of rows returned
      const limitedRows = result.rows.slice(0, config.query.maxRowsReturned);
      const rowsLimited = result.rows.length > config.query.maxRowsReturned;
      
      return {
        rows: limitedRows,
        rowCount: result.rowCount,
        fields: result.fields.map(field => ({
          name: field.name,
          dataTypeID: field.dataTypeID,
          dataType: this._getDataTypeName(field.dataTypeID)
        })),
        metadata: {
          executionTime,
          rowsLimited,
          totalRows: result.rowCount,
          returnedRows: limitedRows.length,
          query: sql,
          params
        }
      };
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Execute an EXPLAIN query to analyze the query plan
   * @param {string} sql - The SQL query to analyze
   * @param {Array} params - Query parameters
   * @returns {Object} Explain plan results
   */
  async explainQuery(sql, params = []) {
    const explainSql = `EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS, VERBOSE) ${sql}`;
    const result = await dbConnector.query(explainSql, params);
    return {
      plan: result.rows[0]['QUERY PLAN'],
      query: sql,
      params
    };
  }
  
  /**
   * Map PostgreSQL data type IDs to readable names
   * @param {number} dataTypeID - PostgreSQL data type ID
   * @returns {string} Data type name
   */
  _getDataTypeName(dataTypeID) {
    // Common PostgreSQL data type IDs
    const dataTypes = {
      16: 'boolean',
      17: 'bytea',
      18: 'char',
      19: 'name',
      20: 'int8',
      21: 'int2',
      23: 'int4',
      25: 'text',
      26: 'oid',
      114: 'json',
      142: 'xml',
      650: 'cidr',
      700: 'float4',
      701: 'float8',
      705: 'unknown',
      718: 'circle',
      790: 'money',
      829: 'macaddr',
      869: 'inet',
      1042: 'bpchar',
      1043: 'varchar',
      1082: 'date',
      1083: 'time',
      1114: 'timestamp',
      1184: 'timestamptz',
      1186: 'interval',
      1266: 'timetz',
      1560: 'bit',
      1562: 'varbit',
      1700: 'numeric',
      2278: 'void',
      2950: 'uuid',
      3500: 'jsonb',
      3614: 'tsvector',
      3802: 'jsonpath'
    };
    
    return dataTypes[dataTypeID] || 'unknown';
  }
  
  /**
   * Get a sample of data from a table
   * @param {string} table - Table name
   * @param {string} schema - Schema name
   * @param {number} limit - Maximum number of rows to return
   * @returns {Object} Sample data and metadata
   */
  async getTableSample(table, schema = 'public', limit = 100) {
    const sql = `SELECT * FROM "${schema}"."${table}" LIMIT $1`;
    return await this.executeQuery(sql, [limit]);
  }
  
  /**
   * Get statistical information about a table
   * @param {string} table - Table name
   * @param {string} schema - Schema name
   * @returns {Object} Table statistics
   */
  async getTableStats(table, schema = 'public') {
    const queries = {
      rowCount: `
        SELECT reltuples::bigint AS row_count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = $1 AND n.nspname = $2
      `,
      sizeStats: `
        SELECT
          pg_size_pretty(pg_total_relation_size($3)) AS total_size,
          pg_size_pretty(pg_relation_size($3)) AS table_size,
          pg_size_pretty(pg_total_relation_size($3) - pg_relation_size($3)) AS index_size
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = $1 AND n.nspname = $2
      `,
      columnStats: `
        SELECT
          a.attname AS column_name,
          pg_stats.n_distinct,
          pg_stats.null_frac,
          pg_stats.most_common_vals,
          pg_stats.most_common_freqs
        FROM pg_stats
        JOIN pg_attribute a ON a.attname = pg_stats.attname
        JOIN pg_class c ON c.relname = pg_stats.tablename AND c.oid = a.attrelid
        JOIN pg_namespace n ON n.nspname = pg_stats.schemaname AND n.oid = c.relnamespace
        WHERE pg_stats.tablename = $1 AND pg_stats.schemaname = $2
      `
    };
    
    const qualifiedTable = `"${schema}"."${table}"`;
    
    const rowCountResult = await dbConnector.query(queries.rowCount, [table, schema]);
    const sizeStatsResult = await dbConnector.query(queries.sizeStats, [table, schema, qualifiedTable]);
    const columnStatsResult = await dbConnector.query(queries.columnStats, [table, schema]);
    
    return {
      rowCount: rowCountResult.rows[0]?.row_count || 0,
      size: {
        total: sizeStatsResult.rows[0]?.total_size || '0 bytes',
        table: sizeStatsResult.rows[0]?.table_size || '0 bytes',
        indexes: sizeStatsResult.rows[0]?.index_size || '0 bytes'
      },
      columns: columnStatsResult.rows
    };
  }
}

module.exports = new QueryModel();