/**
 * query-controller.js
 * Endpoints for executing queries
 */
const express = require('express');
const router = express.Router();
const queryProvider = require('./query-provider');
const queryValidator = require('./query-validator');
const { ValidationError } = require('./error-handler');
const { logAIInteraction } = require('../utils/logger');

/**
 * Execute a SQL query
 * POST /api/query
 * Body: { sql: string, params: array }
 */
router.post('/query', async (req, res, next) => {
  try {
    const { sql, params = {}, aiContext = {} } = req.body;
    
    if (!sql) {
      throw new ValidationError('SQL query is required');
    }
    
    // Validate query
    const validation = queryValidator.validateQuery(sql);
    if (!validation.isValid) {
      throw new ValidationError('Invalid SQL query', validation.errors);
    }
    
    // Log AI interaction if present
    if (aiContext.source === 'ai') {
      await logAIInteraction({
        type: 'query_execution',
        query: sql,
        params,
        context: aiContext
      });
    }
    
    // Analyze query complexity
    const complexityAnalysis = queryValidator.analyzeQueryComplexity(sql);
    
    // Execute the query
    const result = await queryProvider.executeQuery(sql, params);
    
    // Add complexity warnings if any
    if (complexityAnalysis.isComplex) {
      result.warnings = complexityAnalysis.warnings;
    }
    
    // Format results for AI if requested
    if (aiContext.format === 'ai') {
      result.formatted = formatResultsForAI(result);
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Explain a SQL query execution plan
 * POST /api/query/explain
 * Body: { sql: string, params: array }
 */
router.post('/query/explain', async (req, res, next) => {
  try {
    const { sql, params = {}, aiContext = {} } = req.body;
    
    if (!sql) {
      throw new ValidationError('SQL query is required');
    }
    
    // Validate query
    const validation = queryValidator.validateQuery(sql);
    if (!validation.isValid) {
      throw new ValidationError('Invalid SQL query', validation.errors);
    }
    
    // Log AI interaction if present
    if (aiContext.source === 'ai') {
      await logAIInteraction({
        type: 'query_explanation',
        query: sql,
        params,
        context: aiContext
      });
    }
    
    // Get query explanation
    const result = await queryProvider.explainQuery(sql, params);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get a sample of data from a table
 * GET /api/schemas/:schema/tables/:table/sample?limit=100
 */
router.get('/schemas/:schema/tables/:table/sample', async (req, res, next) => {
  try {
    const { schema, table } = req.params;
    const limit = parseInt(req.query.limit || '100', 10);
    
    const result = await queryProvider.getTableSample(table, schema, limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get statistics about a table
 * GET /api/schemas/:schema/tables/:table/stats
 */
router.get('/schemas/:schema/tables/:table/stats', async (req, res, next) => {
  try {
    const { schema, table } = req.params;
    
    const result = await queryProvider.getTableStats(table, schema);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate a SELECT query for a table
 * GET /api/schemas/:schema/tables/:table/generate-select
 */
router.get('/schemas/:schema/tables/:table/generate-select', async (req, res, next) => {
  try {
    const { schema, table } = req.params;
    const { limit, orderBy, where, columns } = req.query;
    
    const options = {
      limit: limit ? parseInt(limit, 10) : 100,
      orderBy,
      where,
      columns
    };
    
    const sql = queryProvider.generateSelectQuery(table, schema, options);
    
    res.json({
      success: true,
      data: {
        sql,
        options
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate an aggregation query for a table
 * GET /api/schemas/:schema/tables/:table/generate-aggregation
 */
router.get('/schemas/:schema/tables/:table/generate-aggregation', async (req, res, next) => {
  try {
    const { schema, table } = req.params;
    const { aggregates, groupBy, having, orderBy, limit, where } = req.query;
    
    const options = {
      aggregates: aggregates ? aggregates.split(',') : undefined,
      groupBy: groupBy ? groupBy.split(',') : undefined,
      having,
      orderBy,
      limit: limit ? parseInt(limit, 10) : 100,
      where
    };
    
    const sql = queryProvider.generateAggregationQuery(table, schema, options);
    
    res.json({
      success: true,
      data: {
        sql,
        options
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate a JOIN query between two tables
 * GET /api/generate-join
 */
router.get('/generate-join', async (req, res, next) => {
  try {
    const { 
      table1, schema1 = 'public', 
      table2, schema2 = 'public', 
      joinCondition, joinType, columns, where, orderBy, limit
    } = req.query;
    
    if (!table1 || !table2 || !joinCondition) {
      throw new ValidationError('table1, table2, and joinCondition are required');
    }
    
    const options = {
      joinType,
      columns,
      where,
      orderBy,
      limit: limit ? parseInt(limit, 10) : 100
    };
    
    const sql = queryProvider.generateJoinQuery(
      table1, schema1, table2, schema2, joinCondition, options
    );
    
    res.json({
      success: true,
      data: {
        sql,
        options
      }
    });
  } catch (error) {
    next(error);
  }
});

function formatResultsForAI(results) {
  return {
    columns: results.columns,
    rowCount: results.rows.length,
    sampleData: results.rows.slice(0, 5),
    summary: generateDataSummary(results),
    suggestions: generateAnalysisSuggestions(results)
  };
}

function generateDataSummary(results) {
  // Generate statistical summary of the data
  return {
    numericColumns: analyzeNumericColumns(results),
    categoricalColumns: analyzeCategoricalColumns(results),
    missingValues: analyzeMissingValues(results)
  };
}

function generateAnalysisSuggestions(results) {
  // Generate suggestions for further analysis
  return {
    potentialInsights: identifyPotentialInsights(results),
    recommendedVisualizations: suggestVisualizations(results),
    followUpQueries: suggestFollowUpQueries(results)
  };
}

// ... existing helper methods ...

module.exports = router;