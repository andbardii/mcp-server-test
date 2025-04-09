const express = require('express');
const router = express.Router();
const schemaController = require('../controllers/schema-controller');
const { rateLimit } = require('../middleware/rate-limiter');

// Basic schema routes
router.get('/schemas', 
    rateLimit('schemas', 50), 
    schemaController.getSchemas
);

router.get('/schemas/:schema/tables', 
    rateLimit('tables', 50), 
    schemaController.getTables
);

router.get('/schemas/:schema/tables/:table', 
    rateLimit('table', 50), 
    schemaController.getTableDetails
);

// Schema analysis routes
router.get('/schemas/:schema/analysis', 
    rateLimit('analysis', 20), 
    schemaController.analyzeSchema
);

router.get('/schemas/:schema/relationships', 
    rateLimit('relationships', 20), 
    schemaController.getRelationships
);

router.get('/schemas/:schema/statistics', 
    rateLimit('statistics', 20), 
    schemaController.getSchemaStatistics
);

// Schema search routes
router.get('/schemas/search', 
    rateLimit('search', 30), 
    schemaController.searchSchema
);

router.get('/schemas/:schema/search', 
    rateLimit('search', 30), 
    schemaController.searchInSchema
);

// Schema visualization routes
router.get('/schemas/:schema/visualize', 
    rateLimit('visualize', 10), 
    schemaController.visualizeSchema
);

router.get('/schemas/:schema/tables/:table/visualize', 
    rateLimit('visualize', 10), 
    schemaController.visualizeTable
);

// Schema export routes
router.get('/schemas/:schema/export', 
    rateLimit('export', 10), 
    schemaController.exportSchema
);

router.get('/schemas/:schema/tables/:table/export', 
    rateLimit('export', 10), 
    schemaController.exportTable
);

// Schema comparison routes
router.post('/schemas/compare', 
    rateLimit('compare', 10), 
    schemaController.compareSchemas
);

router.post('/schemas/:schema/tables/compare', 
    rateLimit('compare', 10), 
    schemaController.compareTables
);

module.exports = router; 