const express = require('express');
const router = express.Router();
const { createSurvey, getAllSurveys, createSession, getActiveSession } = require('../controllers/surveyController');
const { verifyAuth } = require('../middleware/authMiddleware');

// Get all survey templates (with questions)
router.get('/', verifyAuth, getAllSurveys);

// Create a new survey template
router.post('/', verifyAuth, createSurvey);

// Start an active live session for an existing survey
router.post('/session', verifyAuth, createSession);

// Get the active session for a specific survey (for Workers - no PIN needed in closed ecosystem)
router.get('/:survey_id/active-session', verifyAuth, getActiveSession);

module.exports = router;
