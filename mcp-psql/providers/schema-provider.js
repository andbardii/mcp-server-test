/**
 * schema-provider.js
 * Business logic for schema operations
 */
const schemaModel = require('./schema-model');
const { NotFoundError } = require('./error-handler');

class SchemaProvider {
  /**
   * Get all available schemas
   */
  async getSchemas() {
    return await schemaModel.getSchemas();
  }

  /**
   * Get all tables in a specific schema
   * @param {string} schema - Schema name
   */
  async getTables(schema = 'public') {
    const tables = await schemaModel.getTables(schema);
    if (!tables || tables.length === 0) {
      // Return empty array instead of error to handle empty schemas
      return [];
    }
    return tables;
  }

  /**
   * Get all views in a specific schema
   * @param {string} schema - Schema name
   */
  async getViews(schema = 'public') {
    const views = await schemaModel.getViews(schema);
    if (!views || views.length === 0) {
      // Return empty array instead of error to handle schemas without views
      return [];
    }
    return views;
  }

  /**
   * Get detailed schema for a table
   * @param {string} table - Table name
   * @param {string} schema - Schema name
   */
  async getTableSchema(table, schema = 'public') {
    const tableSchema = await schemaModel.getTableSchema(table, schema);
    if (!tableSchema) {
      throw new NotFoundError(`Table ${schema}.${table} not found`);
    }
    return tableSchema;
  }

  /**
   * Get a comprehensive view of the database structure
   */
  async getDatabaseStructure() {
    return await schemaModel.getDatabaseStructure();
  }

  /**
   * Get relationship diagram data for tables
   * @param {string} schema - Schema name
   */
  async getRelationships(schema = 'public') {
    return await schemaModel.getRelationships(schema);
  }

  /**
   * Search for tables and columns by name pattern
   * @param {string} searchTerm - Search pattern
   */
  async search(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
      throw new Error('Search term cannot be empty');
    }
    
    return await schemaModel.search(searchTerm);
  }

  /**
   * Generate metadata for OpenAPI schema
   */
  async generateApiSchema() {
    const dbStructure = await this.getDatabaseStructure();
    const apiSchema = {
      openapi: '3.0.0',
      info: {
        title: 'Database API',
        version: '1.0.0',
        description: 'Auto-generated API for database access'
      },
      paths: {},
      components: {
        schemas: {}
      }
    };
    
    // Generate schema components and paths
    for (const schemaName in dbStructure) {
      const schemaObj = dbStructure[schemaName];
      
      for (const tableName in schemaObj.tables) {
        const tableSchema = schemaObj.tables[tableName];
        
        // Generate component schema
        apiSchema.components.schemas[`${schemaName}_${tableName}`] = {
          type: 'object',
          properties: {}
        };
        
        // Add properties based on columns
        tableSchema.columns.forEach(column => {
          apiSchema.components.schemas[`${schemaName}_${tableName}`].properties[column.column_name] = {
            type: this._mapPostgresTypeToOpenApiType(column.data_type),
            description: `${column.data_type}${column.character_maximum_length ? `(${column.character_maximum_length})` : ''}`
          };
          
          if (column.is_nullable === 'NO') {
            if (!apiSchema.components.schemas[`${schemaName}_${tableName}`].required) {
              apiSchema.components.schemas[`${schemaName}_${tableName}`].required = [];
            }
            apiSchema.components.schemas[`${schemaName}_${tableName}`].required.push(column.column_name);
          }
        });
        
        // Generate paths for table
        const basePath = `/api/${schemaName}/${tableName}`;
        
        // GET collection
        apiSchema.paths[basePath] = {
          get: {
            summary: `Get all records from ${schemaName}.${tableName}`,
            parameters: [
              {
                name: 'limit',
                in: 'query',
                description: 'Maximum number of records to return',
                schema: {
                  type: 'integer',
                  default: 100
                }
              },
              {
                name: 'offset',
                in: 'query',
                description: 'Number of records to skip',
                schema: {
                  type: 'integer',
                  default: 0
                }
              }
            ],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: `#/components/schemas/${schemaName}_${tableName}`
                      }
                    }
                  }
                }
              }
            }
          }
        };
        
        // GET by ID if primary key exists
        if (tableSchema.primaryKeys && tableSchema.primaryKeys.length > 0) {
          const primaryKey = tableSchema.primaryKeys[0];
          
          apiSchema.paths[`${basePath}/{${primaryKey}}`] = {
            get: {
              summary: `Get a single record from ${schemaName}.${tableName} by ID`,
              parameters: [
                {
                  name: primaryKey,
                  in: 'path',
                  required: true,
                  description: `Primary key of ${schemaName}.${tableName}`,
                  schema: {
                    type: this._mapPostgresTypeToOpenApiType(
                      tableSchema.columns.find(col => col.column_name === primaryKey)?.data_type || 'integer'
                    )
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Successful response',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: `#/components/schemas/${schemaName}_${tableName}`
                      }
                    }
                  }
                },
                '404': {
                  description: 'Record not found'
                }
              }
            }
          };
        }
      }
    }
    
    return apiSchema;
  }
  
  /**
   * Map PostgreSQL data types to OpenAPI types
   * @param {string} pgType - PostgreSQL data type
   * @returns {string} OpenAPI type
   */
  _mapPostgresTypeToOpenApiType(pgType) {
    const typeMap = {
      'integer': 'integer',
      'bigint': 'integer',
      'smallint': 'integer',
      'int': 'integer',
      'int2': 'integer',
      'int4': 'integer',
      'int8': 'integer',
      'decimal': 'number',
      'numeric': 'number',
      'real': 'number',
      'float': 'number',
      'double precision': 'number',
      'float4': 'number',
      'float8': 'number',
      'boolean': 'boolean',
      'bool': 'boolean',
      'character': 'string',
      'character varying': 'string',
      'varchar': 'string',
      'text': 'string',
      'char': 'string',
      'uuid': 'string',
      'json': 'object',
      'jsonb': 'object',
      'date': 'string',
      'time': 'string',
      'timestamp': 'string',
      'timestamptz': 'string',
      'timestamp with time zone': 'string',
      'timestamp without time zone': 'string',
      'time with time zone': 'string',
      'time without time zone': 'string',
      'interval': 'string',
      'bytea': 'string',
      'bit': 'string',
      'bit varying': 'string',
      'varbit': 'string',
      'money': 'number',
      'xml': 'string',
      'cidr': 'string',
      'inet': 'string',
      'macaddr': 'string'
    };
    
    return typeMap[pgType.toLowerCase()] || 'string';
  }
}

module.exports = new SchemaProvider();