/**
 * schema-controller.js
 * Endpoints for schema information
 */
const express = require('express');
const router = express.Router();
const schemaProvider = require('./schema-provider');
const { ValidationError, NotFoundError } = require('./error-handler');

/**
 * Get all schemas
 * GET /api/schemas
 */
router.get('/schemas', async (req, res, next) => {
  try {
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

module.exports = router;