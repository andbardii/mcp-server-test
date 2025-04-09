const express = require('express');
const router = express.Router();
const queryController = require('../controllers/query-controller');

// Query routes
router.post('/query', queryController.executeQuery);
router.post('/query/explain', queryController.explainQuery);
router.get('/schemas/:schema/tables/:table/sample', queryController.getSampleData);
router.get('/schemas/:schema/tables/:table/stats', queryController.getTableStats);

module.exports = router; 