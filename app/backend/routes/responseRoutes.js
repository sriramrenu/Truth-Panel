const express = require('express');
const router = express.Router();
const { submitResponse, getSessionResponses, checkUserSubmission, getSurveyResponses } = require('../controllers/responseController');
const { verifyAuth, restrictTo } = require('../middleware/authMiddleware');
const { submissionLimiter } = require('../middleware/rateLimiter');
router.post('/', verifyAuth, submissionLimiter, submitResponse);
router.get('/:sessionId', verifyAuth, restrictTo('admin', 'manager'), getSessionResponses);
router.get('/check/:sessionId', verifyAuth, checkUserSubmission);
router.get('/check-survey', verifyAuth, checkUserSubmission);
router.get('/survey/:surveyId', verifyAuth, restrictTo('admin', 'manager'), getSurveyResponses);

module.exports = router;
