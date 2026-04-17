const express = require('express');
const router = express.Router();
const { submitResponse, getSessionResponses, checkUserSubmission, getSurveyResponses } = require('../controllers/responseController');
const { verifyAuth } = require('../middleware/authMiddleware');
router.post('/', verifyAuth, submitResponse);
router.get('/:sessionId', verifyAuth, getSessionResponses);
router.get('/check/:sessionId', verifyAuth, checkUserSubmission);
router.get('/check-survey', verifyAuth, checkUserSubmission);
router.get('/survey/:surveyId', verifyAuth, getSurveyResponses);

module.exports = router;
