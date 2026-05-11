const express = require('express');
const router = express.Router();
const { createSurvey, getAllSurveys, getSurveyById, createSession, getActiveSession, updateSurvey, deleteSurvey } = require('../controllers/surveyController');
const { verifyAuth } = require('../middleware/authMiddleware');
router.get('/', verifyAuth, getAllSurveys);
router.post('/', verifyAuth, createSurvey);
router.get('/:id', verifyAuth, getSurveyById);
router.patch('/:id', verifyAuth, updateSurvey);
router.post('/session', verifyAuth, createSession);
router.get('/:survey_id/active-session', verifyAuth, getActiveSession);
router.delete('/:id', verifyAuth, deleteSurvey);

module.exports = router;
