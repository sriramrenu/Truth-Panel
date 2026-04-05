const express = require('express');
const router = express.Router();
const { submitResponse, getSessionResponses, checkUserSubmission } = require('../controllers/responseController');
const { verifyAuth } = require('../middleware/authMiddleware');

// Employee submits a response to a given question
router.post('/', verifyAuth, submitResponse);

// Admin fetches all responses tied to a specific session (for Dashboard aggregation)
router.get('/:sessionId', verifyAuth, getSessionResponses);

// Check if current user already submitted responses for a specific session
router.get('/check/:sessionId', verifyAuth, checkUserSubmission);

module.exports = router;
