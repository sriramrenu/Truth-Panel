const express = require('express');
const router = express.Router();
const { createSurvey, getAllSurveys, createSession } = require('../controllers/surveyController');
const { verifyAuth } = require('../middleware/authMiddleware');

// Get all survey templates (with questions)
router.get('/', verifyAuth, getAllSurveys);

// Create a new survey template
router.post('/', verifyAuth, createSurvey);

// Start an active live session for an existing survey
router.post('/session', verifyAuth, createSession);

module.exports = router;
