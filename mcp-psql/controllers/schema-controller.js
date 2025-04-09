/**
 * schema-controller.js
 * Endpoints for schema information
 */
const express = require('express');
const router = express.Router();
const schemaProvider = require('./schema-provider');
const { ValidationError, NotFoundError } = require('./error-handler');
const SchemaProvider = require('../providers/schema-provider');
const { logAIInteraction } = require('../utils/logger');

/**
 * Get all schemas
 * GET /api/schemas
 */
router.get('/schemas', async (req, res, next) => {
  try {
    const { aiContext = {} } = req.query;
    
    // Log AI interaction if present
    if (aiContext.source === 'ai') {
      await logAIInteraction({
        type: 'schema_list',
        context: aiContext
      });
    }

    const schemas = await schemaProvider.getSchemas();
    res.json({
      success: true,
      data: schemas
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all tables in a schema
 * GET /api/schemas/:schema/tables
 */
router.get('/schemas/:schema/tables', async (req, res, next) => {
  try {
    const { schema } = req.params;
    const { aiContext = {} } = req.query;
    
    // Log AI interaction if present
    if (aiContext.source === 'ai') {
      await logAIInteraction({
        type: 'table_list',
        schema,
        context: aiContext
      });
    }

    const tables = await schemaProvider.getTables(schema);
    res.json({
      success: true,
      data: tables
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all views in a schema
 * GET /api/schemas/:schema/views
 */
router.get('/schemas/:schema/views', async (req, res, next) => {
  try {
    const { schema } = req.params;
    const views = await schemaProvider.getViews(schema);
    res.json({
      success: true,
      data: views
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get table schema details
 * GET /api/schemas/:schema/tables/:table
 */
router.get('/schemas/:schema/tables/:table', async (req, res, next) => {
  try {
    const { schema, table } = req.params;
    const { aiContext = {} } = req.query;
    
    // Log AI interaction if present
    if (aiContext.source === 'ai') {
      await logAIInteraction({
        type: 'table_details',
        schema,
        table,
        context: aiContext
      });
    }

    const tableSchema = await schemaProvider.getTableSchema(table, schema);
    res.json({
      success: true,
      data: tableSchema
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return next(new NotFoundError(`Table ${schema}.${table} not found`));
    }
    next(error);
  }
});

/**
 * Get database structure
 * GET /api/structure
 */
router.get('/structure', async (req, res, next) => {
  try {
    const structure = await schemaProvider.getDatabaseStructure();
    res.json({
      success: true,
      data: structure
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get relationships between tables in a schema
 * GET /api/schemas/:schema/relationships
 */
router.get('/schemas/:schema/relationships', async (req, res, next) => {
  try {
    const { schema } = req.params;
    const { aiContext = {} } = req.query;
    
    // Log AI interaction if present
    if (aiContext.source === 'ai') {
      await logAIInteraction({
        type: 'relationship_analysis',
        schema,
        context: aiContext
      });
    }

    const relationships = await schemaProvider.getRelationships(schema);
    res.json({
      success: true,
      data: relationships
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Search for tables and columns
 * GET /api/search?q=searchTerm
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      throw new ValidationError('Search term is required');
    }
    const results = await schemaProvider.search(q);
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate OpenAPI schema
 * GET /api/openapi
 */
router.get('/openapi', async (req, res, next) => {
  try {
    const apiSchema = await schemaProvider.generateApiSchema();
    res.json(apiSchema);
  } catch (error) {
    next(error);
  }
});

class SchemaController {
  constructor() {
    this.schemaProvider = new SchemaProvider();
  }

  async analyzeSchema(req, res, next) {
    try {
      const { schema } = req.params;
      const { aiContext = {} } = req.query;
      
      // Log AI interaction if present
      if (aiContext.source === 'ai') {
        await logAIInteraction({
          type: 'schema_analysis',
          schema,
          context: aiContext
        });
      }

      const analysis = await this.schemaProvider.analyzeSchema(schema);
      res.json(analysis);
    } catch (error) {
      next(error);
    }
  }

  async searchSchema(req, res, next) {
    try {
      const { q: searchTerm } = req.query;
      const { aiContext = {} } = req.query;
      
      // Log AI interaction if present
      if (aiContext.source === 'ai') {
        await logAIInteraction({
          type: 'schema_search',
          searchTerm,
          context: aiContext
        });
      }

      const results = await this.schemaProvider.searchSchema(searchTerm);
      res.json(results);
    } catch (error) {
      next(error);
    }
  }

  async getSchemaStatistics(req, res, next) {
    try {
      const { schema } = req.params;
      const { aiContext = {} } = req.query;
      
      // Log AI interaction if present
      if (aiContext.source === 'ai') {
        await logAIInteraction({
          type: 'schema_statistics',
          schema,
          context: aiContext
        });
      }

      const statistics = await this.schemaProvider.getSchemaStatistics(schema);
      res.json(statistics);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SchemaController();