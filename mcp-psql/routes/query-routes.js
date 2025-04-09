const express = require('express');
const router = express.Router();
const queryController = require('../controllers/query-controller');
const { validateQuery } = require('../middleware/query-validator');
const { rateLimit } = require('../middleware/rate-limiter');

// Query execution routes
router.post('/query', 
    rateLimit('query', 100), 
    validateQuery, 
    queryController.executeQuery
);

router.post('/query/explain', 
    rateLimit('explain', 50), 
    validateQuery, 
    queryController.explainQuery
);

// AI-specific query routes
router.post('/query/suggest', 
    rateLimit('suggest', 30), 
    queryController.suggestQuery
);

router.post('/query/optimize', 
    rateLimit('optimize', 30), 
    validateQuery, 
    queryController.optimizeQuery
);

// Query analysis routes
router.get('/query/analysis/:queryId', 
    rateLimit('analysis', 20), 
    queryController.getQueryAnalysis
);

router.post('/query/analyze', 
    rateLimit('analyze', 20), 
    validateQuery, 
    queryController.analyzeQuery
);

// Query history routes
router.get('/query/history', 
    rateLimit('history', 30), 
    queryController.getQueryHistory
);

router.get('/query/history/:queryId', 
    rateLimit('history', 30), 
    queryController.getQueryHistoryItem
);

// Query templates routes
router.get('/query/templates', 
    rateLimit('templates', 20), 
    queryController.getQueryTemplates
);

router.get('/query/templates/:templateId', 
    rateLimit('templates', 20), 
    queryController.getQueryTemplate
);

// Query export routes
router.post('/query/export/csv', 
    rateLimit('export', 10), 
    queryController.exportToCSV
);

router.post('/query/export/json', 
    rateLimit('export', 10), 
    queryController.exportToJSON
);

module.exports = router; 