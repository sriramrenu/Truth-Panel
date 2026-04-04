const express = require('express');
const router = express.Router();
const { submitResponse, getSessionResponses } = require('../controllers/responseController');
const { verifyAuth } = require('../middleware/authMiddleware');

// Employee submits a response to a given question
router.post('/', verifyAuth, submitResponse);

// Admin fetches all responses tied to a specific session (for Dashboard aggregation)
router.get('/:sessionId', verifyAuth, getSessionResponses);

module.exports = router;
