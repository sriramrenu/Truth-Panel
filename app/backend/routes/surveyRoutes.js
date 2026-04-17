const express = require('express');
const router = express.Router();
const { createSurvey, getAllSurveys, createSession, getActiveSession, deleteSurvey } = require('../controllers/surveyController');
const { verifyAuth } = require('../middleware/authMiddleware');
router.get('/', verifyAuth, getAllSurveys);
router.post('/', verifyAuth, createSurvey);
router.post('/session', verifyAuth, createSession);
router.get('/:survey_id/active-session', verifyAuth, getActiveSession);
router.delete('/:id', verifyAuth, deleteSurvey);

module.exports = router;
