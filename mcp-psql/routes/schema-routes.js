const express = require('express');
const router = express.Router();
const schemaController = require('../controllers/schema-controller');

// Schema routes
router.get('/schemas', schemaController.getSchemas);
router.get('/schemas/:schema/tables', schemaController.getTables);
router.get('/schemas/:schema/tables/:table', schemaController.getTableSchema);
router.get('/schemas/:schema/relationships', schemaController.getRelationships);
router.get('/structure', schemaController.getStructure);
router.get('/search', schemaController.search);

module.exports = router; 