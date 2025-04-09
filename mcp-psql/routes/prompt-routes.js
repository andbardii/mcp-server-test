const express = require('express');
const router = express.Router();
const promptController = require('../controllers/prompt-controller');

// Prompt routes
router.get('/prompts', promptController.getPrompts);
router.get('/prompts/:templateId', promptController.getPromptTemplate);
router.post('/prompts/:templateId/generate', promptController.generateSQL);
router.get('/schemas/:schema/tables/:table/analysis/suggest', promptController.suggestAnalysis);

module.exports = router; 