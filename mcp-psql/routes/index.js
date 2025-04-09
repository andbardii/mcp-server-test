const express = require('express');
const router = express.Router();

// Import route modules
const schemaRoutes = require('./schema-routes');
const queryRoutes = require('./query-routes');
const promptRoutes = require('./prompt-routes');

// Mount routes
router.use('/api', schemaRoutes);
router.use('/api', queryRoutes);
router.use('/api', promptRoutes);

module.exports = router; 