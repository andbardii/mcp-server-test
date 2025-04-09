/**
 * prompt-controller.js
 * Endpoints for analysis prompts
 */
const express = require('express');
const router = express.Router();
const promptProvider = require('./prompt-provider');
const { ValidationError } = require('./error-handler');

/**
 * Get all prompt templates
 * GET /api/prompts
 */
router.get('/prompts', async (req, res, next) => {
  try {
    const templates = promptProvider.getAllPromptTemplates();
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get a specific prompt template
 * GET /api/prompts/:templateId
 */
router.get('/prompts/:templateId', async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const template = promptProvider.getPromptTemplate(templateId);
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate SQL from a prompt template
 * POST /api/prompts/:templateId/generate
 * Body: { params: Object }
 */
router.post('/prompts/:templateId/generate', async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const { params } = req.body;
    
    if (!params) {
      throw new ValidationError('Template parameters are required');
    }
    
    const sql = await promptProvider.generateSqlFromTemplate(templateId, params);
    
    res.json({
      success: true,
      data: {
        templateId,
        params,
        sql
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate basic table analysis template
 * GET /api/schemas/:schema/tables/:table/analysis/basic
 */
router.get('/schemas/:schema/tables/:table/analysis/basic', async (req, res, next) => {
  try {
    const { schema, table } = req.params;
    const result = await promptProvider.generateBasicAnalysisTemplate(table, schema);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate column distribution analysis template
 * GET /api/schemas/:schema/tables/:table/analysis/distribution
 */
router.get('/schemas/:schema/tables/:table/analysis/distribution', async (req, res, next) => {
  try {
    const { schema, table } = req.params;
    const { column } = req.query;
    
    const result = await promptProvider.generateColumnDistributionTemplate(table, schema, column);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate time series analysis template
 * GET /api/schemas/:schema/tables/:table/analysis/timeseries
 */
router.get('/schemas/:schema/tables/:table/analysis/timeseries', async (req, res, next) => {
  try {
    const { schema, table } = req.params;
    const { timestampColumn, timeUnit, whereClause } = req.query;
    
    const options = {
      timestampColumn,
      timeUnit,
      whereClause
    };
    
    const result = await promptProvider.generateTimeSeriesTemplate(table, schema, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate correlation analysis template
 * GET /api/schemas/:schema/tables/:table/analysis/correlation
 */
router.get('/schemas/:schema/tables/:table/analysis/correlation', async (req, res, next) => {
  try {
    const { schema, table } = req.params;
    const { column1, column2 } = req.query;
    
    const result = await promptProvider.generateCorrelationTemplate(table, schema, column1, column2);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Suggest analysis templates for a table
 * GET /api/schemas/:schema/tables/:table/analysis/suggest
 */
router.get('/schemas/:schema/tables/:table/analysis/suggest', async (req, res, next) => {
  try {
    const { schema, table } = req.params;
    
    const suggestions = await promptProvider.suggestAnalysisTemplates(table, schema);
    
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;