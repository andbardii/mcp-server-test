/**
 * schema-model.js
 * Represents database schema objects
 */
const schemaLoader = require('./schema-loader');

class SchemaModel {
  /**
   * Get all available schemas
   */
  async getSchemas() {
    try {
      return await schemaLoader.getSchemas();
    } catch (error) {
      console.error('Error fetching schemas:', error);
      throw new Error('Failed to fetch database schemas');
    }
  }

  /**
   * Get all tables in a schema
   * @param {string} schema - Schema name
   */
  async getTables(schema = 'public') {
    try {
      return await schemaLoader.getTables(schema);
    } catch (error) {
      console.error(`Error fetching tables for schema ${schema}:`, error);
      throw new Error(`Failed to fetch tables for schema ${schema}`);
    }
  }

  /**
   * Get all views in a schema
   * @param {string} schema - Schema name
   */
  async getViews(schema = 'public') {
    try {
      return await schemaLoader.getViews(schema);
    } catch (error) {
      console.error(`Error fetching views for schema ${schema}:`, error);
      throw new Error(`Failed to fetch views for schema ${schema}`);
    }
  }

  /**
   * Get detailed schema for a table
   * @param {string} table - Table name
   * @param {string} schema - Schema name
   */
  async getTableSchema(table, schema = 'public') {
    try {
      return await schemaLoader.getTableSchema(table, schema);
    } catch (error) {
      console.error(`Error fetching schema for ${schema}.${table}:`, error);
      throw new Error(`Failed to fetch schema for ${schema}.${table}`);
    }
  }

  /**
   * Get a comprehensive view of the database structure
   */
  async getDatabaseStructure() {
    try {
      const schemas = await this.getSchemas();
      const structure = {};
      
      for (const schema of schemas) {
        structure[schema] = {
          tables: {},
          views: []
        };
        
        // Get tables
        const tables = await this.getTables(schema);
        for (const table of tables) {
          const tableSchema = await this.getTableSchema(table, schema);
          structure[schema].tables[table] = tableSchema;
        }
        
        // Get views
        structure[schema].views = await this.getViews(schema);
      }
      
      return structure;
    } catch (error) {
      console.error('Error fetching database structure:', error);
      throw new Error('Failed to fetch database structure');
    }
  }

  /**
   * Get relationship diagram data for tables
   * @param {string} schema - Schema name
   */
  async getRelationships(schema = 'public') {
    try {
      const tables = await this.getTables(schema);
      const relationships = [];
      
      for (const table of tables) {
        const tableSchema = await this.getTableSchema(table, schema);
        
        if (tableSchema.foreignKeys && tableSchema.foreignKeys.length > 0) {
          tableSchema.foreignKeys.forEach(fk => {
            relationships.push({
              source: {
                schema: schema,
                table: table,
                column: fk.column_name
              },
              target: {
                schema: fk.foreign_table_schema,
                table: fk.foreign_table_name,
                column: fk.foreign_column_name
              },
              name: fk.constraint_name
            });
          });
        }
      }
      
      return relationships;
    } catch (error) {
      console.error(`Error fetching relationships for schema ${schema}:`, error);
      throw new Error(`Failed to fetch relationships for schema ${schema}`);
    }
  }

  /**
   * Search for tables and columns by name pattern
   * @param {string} searchTerm - Search pattern
   */
  async search(searchTerm) {
    try {
      const schemas = await this.getSchemas();
      const results = {
        tables: [],
        columns: []
      };
      
      for (const schema of schemas) {
        const tables = await this.getTables(schema);
        
        for (const table of tables) {
          // Check if table name matches search term
          if (table.toLowerCase().includes(searchTerm.toLowerCase())) {
            results.tables.push({
              schema,
              table
            });
          }
          
          // Check columns
          const columns = await schemaLoader.getTableColumns(table, schema);
          
          for (const column of columns) {
            if (column.column_name.toLowerCase().includes(searchTerm.toLowerCase())) {
              results.columns.push({
                schema,
                table,
                column: column.column_name,
                dataType: column.data_type
              });
            }
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Error searching for "${searchTerm}":`, error);
      throw new Error(`Failed to search for "${searchTerm}"`);
    }
  }
}

module.exports = new SchemaModel();