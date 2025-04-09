/**
 * schema-loader.js
 * Extracts database schema information
 */
const dbConnector = require('./db-connector');

class SchemaLoader {
  /**
   * Get all available schemas in the database
   */
  async getSchemas() {
    const query = `
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name;
    `;
    
    const result = await dbConnector.query(query);
    return result.rows.map(row => row.schema_name);
  }

  /**
   * Get all tables in a specific schema
   */
  async getTables(schema = 'public') {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const result = await dbConnector.query(query, [schema]);
    return result.rows.map(row => row.table_name);
  }

  /**
   * Get all views in a specific schema
   */
  async getViews(schema = 'public') {
    const query = `
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = $1
      ORDER BY table_name;
    `;
    
    const result = await dbConnector.query(query, [schema]);
    return result.rows.map(row => row.table_name);
  }

  /**
   * Get all columns for a specific table
   */
  async getTableColumns(table, schema = 'public') {
    const query = `
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length, 
        column_default, 
        is_nullable,
        udt_name
      FROM information_schema.columns 
      WHERE table_schema = $1 
      AND table_name = $2
      ORDER BY ordinal_position;
    `;
    
    const result = await dbConnector.query(query, [schema, table]);
    return result.rows;
  }

  /**
   * Get primary key columns for a specific table
   */
  async getPrimaryKeys(table, schema = 'public') {
    const query = `
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      JOIN pg_class c ON c.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = $1
      AND n.nspname = $2
      AND i.indisprimary;
    `;
    
    const result = await dbConnector.query(query, [table, schema]);
    return result.rows.map(row => row.attname);
  }

  /**
   * Get foreign key constraints for a specific table
   */
  async getForeignKeys(table, schema = 'public') {
    const query = `
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = $1
      AND tc.table_name = $2;
    `;
    
    const result = await dbConnector.query(query, [schema, table]);
    return result.rows;
  }

  /**
   * Get indices for a specific table
   */
  async getTableIndices(table, schema = 'public') {
    const query = `
      SELECT
        i.relname AS index_name,
        a.attname AS column_name,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary
      FROM
        pg_class t,
        pg_class i,
        pg_index ix,
        pg_attribute a,
        pg_namespace n
      WHERE
        t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND t.relname = $1
        AND n.oid = t.relnamespace
        AND n.nspname = $2
      ORDER BY
        i.relname;
    `;
    
    const result = await dbConnector.query(query, [table, schema]);
    return result.rows;
  }

  /**
   * Get a comprehensive schema with all details for a table
   */
  async getTableSchema(table, schema = 'public') {
    try {
      const columns = await this.getTableColumns(table, schema);
      const primaryKeys = await this.getPrimaryKeys(table, schema);
      const foreignKeys = await this.getForeignKeys(table, schema);
      const indices = await this.getTableIndices(table, schema);
      
      return {
        schema,
        table,
        columns,
        primaryKeys,
        foreignKeys,
        indices
      };
    } catch (error) {
      console.error(`Error getting schema for ${schema}.${table}:`, error);
      throw error;
    }
  }

  /**
   * Get all tables with their columns across all schemas
   */
  async getAllSchemasWithTables() {
    const schemas = await this.getSchemas();
    const result = {};
    
    for (const schema of schemas) {
      const tables = await this.getTables(schema);
      result[schema] = {};
      
      for (const table of tables) {
        const columns = await this.getTableColumns(table, schema);
        result[schema][table] = columns;
      }
    }
    
    return result;
  }
}

module.exports = new SchemaLoader();