/**
 * schema-provider.js
 * Business logic for schema operations
 */
const SchemaModel = require('../models/schema-model');
const { logSchemaOperation, logPerformance } = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../middleware/error-handler');

class SchemaProvider {
  constructor() {
    this.schemaModel = new SchemaModel();
  }

  validateSchemaName(schema) {
    if (!schema || typeof schema !== 'string') {
      throw new ValidationError('Schema name must be a non-empty string');
    }

    // Validate schema name format
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
      throw new ValidationError('Invalid schema name format');
    }

    // Check for reserved names
    const reservedNames = ['pg_catalog', 'information_schema', 'public'];
    if (reservedNames.includes(schema.toLowerCase())) {
      throw new ValidationError('Schema name is reserved');
    }
  }

  validateTableName(table) {
    if (!table || typeof table !== 'string') {
      throw new ValidationError('Table name must be a non-empty string');
    }

    // Validate table name format
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      throw new ValidationError('Invalid table name format');
    }

    // Check for reserved names
    const reservedNames = ['pg_', 'sql_'];
    if (reservedNames.some(prefix => table.toLowerCase().startsWith(prefix))) {
      throw new ValidationError('Table name starts with reserved prefix');
    }
  }

  /**
   * Get all available schemas
   */
  async getSchemas() {
    const startTime = Date.now();
    try {
      const schemas = await this.schemaModel.getSchemas();
      logSchemaOperation('get_schemas');
      logPerformance('schema_retrieval', Date.now() - startTime);
      return this.formatSchemas(schemas);
    } catch (error) {
      throw new Error(`Failed to retrieve schemas: ${error.message}`);
    }
  }

  /**
   * Get all tables in a specific schema
   * @param {string} schema - Schema name
   */
  async getTables(schema) {
    const startTime = Date.now();
    try {
      this.validateSchemaName(schema);
      
      const tables = await this.schemaModel.getTables(schema);
      logSchemaOperation('get_tables', { schema });
      logPerformance('table_retrieval', Date.now() - startTime);
      return this.formatTables(tables);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to retrieve tables: ${error.message}`);
    }
  }

  /**
   * Get all views in a specific schema
   * @param {string} schema - Schema name
   */
  async getViews(schema = 'public') {
    const views = await this.schemaModel.getViews(schema);
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
    const tableSchema = await this.schemaModel.getTableSchema(table, schema);
    if (!tableSchema) {
      throw new NotFoundError(`Table ${schema}.${table} not found`);
    }
    return tableSchema;
  }

  /**
   * Get a comprehensive view of the database structure
   */
  async getDatabaseStructure() {
    return await this.schemaModel.getDatabaseStructure();
  }

  /**
   * Get relationship diagram data for tables
   * @param {string} schema - Schema name
   */
  async getRelationships(schema = 'public') {
    const startTime = Date.now();
    try {
      const relationships = await this.schemaModel.getRelationships(schema);
      logSchemaOperation('get_relationships', { schema });
      logPerformance('relationship_analysis', Date.now() - startTime);
      return this.formatRelationships(relationships);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search for tables and columns by name pattern
   * @param {string} searchTerm - Search pattern
   */
  async search(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
      throw new Error('Search term cannot be empty');
    }
    
    const startTime = Date.now();
    try {
      const results = await this.schemaModel.search(searchTerm);
      logSchemaOperation('search_schema', { searchTerm });
      logPerformance('schema_search', Date.now() - startTime);
      return this.formatSearchResults(results);
    } catch (error) {
      throw error;
    }
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

  formatSchemas(schemas) {
    return {
      schemas: schemas.map(schema => ({
        name: schema.name,
        description: schema.description,
        tableCount: schema.tableCount,
        size: schema.size
      }))
    };
  }

  formatTables(tables) {
    return {
      tables: tables.map(table => ({
        name: table.name,
        type: table.type,
        rowCount: table.rowCount,
        size: table.size,
        lastAnalyzed: table.lastAnalyzed
      }))
    };
  }

  formatTableDetails(details) {
    return {
      name: details.name,
      columns: this.formatColumns(details.columns),
      constraints: this.formatConstraints(details.constraints),
      indexes: this.formatIndexes(details.indexes),
      statistics: this.formatTableStatistics(details.statistics)
    };
  }

  formatSchemaAnalysis(analysis) {
    return {
      schema: analysis.schema,
      complexity: analysis.complexity,
      relationships: analysis.relationships,
      recommendations: this.generateRecommendations(analysis),
      potentialIssues: this.identifyPotentialIssues(analysis)
    };
  }

  formatRelationships(relationships) {
    return {
      relationships: relationships.map(rel => ({
        source: rel.source,
        target: rel.target,
        type: rel.type,
        cardinality: rel.cardinality,
        description: rel.description
      }))
    };
  }

  formatSearchResults(results) {
    return {
      matches: results.map(result => ({
        type: result.type,
        name: result.name,
        schema: result.schema,
        relevance: result.relevance,
        context: result.context
      }))
    };
  }

  formatStatistics(statistics) {
    return {
      schema: statistics.schema,
      size: statistics.size,
      tableCount: statistics.tableCount,
      rowCount: statistics.rowCount,
      indexCount: statistics.indexCount,
      constraintCount: statistics.constraintCount,
      lastAnalyzed: statistics.lastAnalyzed
    };
  }

  generateRecommendations(analysis) {
    return {
      optimization: this.suggestOptimizations(analysis),
      normalization: this.suggestNormalization(analysis),
      indexing: this.suggestIndexing(analysis)
    };
  }

  identifyPotentialIssues(analysis) {
    return {
      performance: this.identifyPerformanceIssues(analysis),
      design: this.identifyDesignIssues(analysis),
      security: this.identifySecurityIssues(analysis)
    };
  }

  // ... existing helper methods ...
}

module.exports = SchemaProvider;