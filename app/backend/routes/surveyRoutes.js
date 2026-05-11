const express = require('express');
const router = express.Router();
const { 
    createSurvey, 
    getAllSurveys, 
    getSurveyById, 
    createSession, 
    getActiveSession, 
    updateSurvey, 
    deleteSurvey,
    submitSurvey
} = require('../controllers/surveyController');
const { verifyAuth, restrictTo } = require('../middleware/authMiddleware');
const validate = require('../middleware/validator');
const { createSurveySchema, submissionSchema } = require('../schemas');

router.get('/', verifyAuth, getAllSurveys);
router.post('/', verifyAuth, restrictTo('admin', 'manager'), validate({ body: createSurveySchema }), createSurvey);
router.get('/:id', verifyAuth, getSurveyById);
router.patch('/:id', verifyAuth, restrictTo('admin', 'manager'), validate({ body: createSurveySchema }), updateSurvey);
router.post('/session', verifyAuth, restrictTo('admin', 'manager'), createSession);
router.post('/submit', verifyAuth, validate({ body: submissionSchema }), submitSurvey);
router.get('/:survey_id/active-session', verifyAuth, getActiveSession);
router.delete('/:id', verifyAuth, restrictTo('admin'), deleteSurvey);

module.exports = router;
