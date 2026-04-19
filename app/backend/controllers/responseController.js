const DbService = require('../config/dbConfig');
const submissionQueue = require('../workers/submissionQueue');
const submitResponse = async (req, res, next) => {
    try {
        const { session_id, question_id, answer_value } = req.body;
        
        if (!session_id || !question_id || answer_value === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid payload: session_id, question_id, and answer_value are required' 
            });
        }
        const job = await submissionQueue.add('process-response', {
            session_id,
            question_id,
            user_id: req.user?.id,
            answer_value
        });
        res.status(202).json({ success: true, message: 'Response queued successfully', jobId: job.id });

    } catch (error) {
        next(error);
    }
};
const getSessionResponses = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({ success: false, message: 'Session ID parameter is required' });
        }

        const { rows } = await DbService.query(`
            SELECT r.*, q.question_text as "Questions"
            FROM "Responses" r
            LEFT JOIN "Questions" q ON r.question_id = q.id
            WHERE r.session_id = $1
        `, [sessionId]);
        const formatData = rows.map(r => ({
            ...r,
            Questions: { question_text: r.Questions }
        }));

        res.status(200).json({ success: true, total_responses: formatData.length, data: formatData });

    } catch (error) {
        next(error);
    }
};
const getSurveyResponses = async (req, res, next) => {
    try {
        const { surveyId } = req.params;

        if (!surveyId) {
            return res.status(400).json({ success: false, message: 'Survey ID parameter is required' });
        }
        const sessRes = await DbService.query('SELECT id FROM "Sessions" WHERE survey_id = $1', [surveyId]);
        const sessionIds = sessRes.rows.map(s => s.id);

        if (sessionIds.length === 0) {
            return res.status(200).json({ success: true, total_responses: 0, data: [] });
        }
        const { rows } = await DbService.query(`
            SELECT r.*, q.question_text as "Questions"
            FROM "Responses" r
            LEFT JOIN "Questions" q ON r.question_id = q.id
            WHERE r.session_id = ANY($1::uuid[])
        `, [sessionIds]);

        const formatData = rows.map(r => ({
            ...r,
            Questions: { question_text: r.Questions }
        }));

        res.status(200).json({ success: true, total_responses: formatData.length, data: formatData });

    } catch (error) {
        next(error);
    }
};
const checkUserSubmission = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { surveyId } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'auth token required' });
        }

        let queryText = '';
        let queryParams = [];

        if (surveyId) {
            queryText = `
                SELECT id FROM "Responses" 
                WHERE user_id = $1::uuid AND session_id IN (SELECT id FROM "Sessions" WHERE survey_id = $2::uuid)
                LIMIT 1
            `;
            queryParams = [userId, surveyId];
        } else {
            if (!sessionId) {
                return res.status(400).json({ success: false, message: 'session_id or survey_id required' });
            }
            queryText = `SELECT id FROM "Responses" WHERE session_id = $1::uuid AND user_id = $2::uuid LIMIT 1`;
            queryParams = [sessionId, userId];
        }

        const { rows } = await DbService.query(queryText, queryParams);

        res.status(200).json({ success: true, already_submitted: rows.length > 0 });
    } catch (error) {
        console.error('Error in checkUserSubmission:', error);
        next(error);
    }
};

module.exports = {
    submitResponse,
    getSessionResponses,
    checkUserSubmission,
    getSurveyResponses
};
