const DbService = require('../config/dbConfig');
const submissionQueue = require('../workers/submissionQueue');

/**
 * Queues a response for asynchronous processing via BullMQ.
 */
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

/**
 * Fetches all responses for a specific session by joining with the Submissions table.
 */
const getSessionResponses = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        if (!sessionId) return res.status(400).json({ success: false, message: 'Session ID is required' });

        const { rows } = await DbService.query(`
            SELECT r.*, q.question_text as "Questions"
            FROM "Responses" r
            JOIN "Submissions" s ON r.submission_id = s.id
            LEFT JOIN "Questions" q ON r.question_id = q.id
            WHERE s.session_id = $1 AND s.deleted_at IS NULL
        `, [sessionId]);

        const formatData = rows.map(r => ({
            ...r,
            Questions: { question_text: r.question_text_snapshot || r.Questions }
        }));

        res.status(200).json({ success: true, total_responses: formatData.length, data: formatData });
    } catch (error) {
        next(error);
    }
};

/**
 * Fetches all responses for an entire survey across all sessions and versions.
 */
const getSurveyResponses = async (req, res, next) => {
    try {
        const { surveyId } = req.params;
        if (!surveyId) return res.status(400).json({ success: false, message: 'Survey ID is required' });

        const { rows } = await DbService.query(`
            SELECT r.*, q.question_text as "Questions"
            FROM "Responses" r
            JOIN "Submissions" sub ON r.submission_id = sub.id
            JOIN "Sessions" sess ON sub.session_id = sess.id
            JOIN "Survey_Versions" sv ON sess.survey_version_id = sv.id
            LEFT JOIN "Questions" q ON r.question_id = q.id
            WHERE sv.survey_id = $1 AND sub.deleted_at IS NULL
        `, [surveyId]);

        const formatData = rows.map(r => ({
            ...r,
            Questions: { question_text: r.question_text_snapshot || r.Questions }
        }));

        res.status(200).json({ success: true, total_responses: formatData.length, data: formatData });
    } catch (error) {
        next(error);
    }
};

/**
 * Checks if a user has already submitted a response for a specific session or survey.
 */
const checkUserSubmission = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { surveyId } = req.query;
        const userId = req.user?.id;

        if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

        let queryText = '';
        let queryParams = [];

        if (surveyId) {
            queryText = `
                SELECT s.id FROM "Submissions" s
                JOIN "Sessions" sess ON s.session_id = sess.id
                JOIN "Survey_Versions" sv ON sess.survey_version_id = sv.id
                WHERE s.user_id = $1::uuid AND sv.survey_id = $2::uuid AND s.status = 'submitted' AND s.deleted_at IS NULL
                LIMIT 1
            `;
            queryParams = [userId, surveyId];
        } else {
            if (!sessionId) return res.status(400).json({ success: false, message: 'session_id or survey_id required' });
            queryText = `SELECT id FROM "Submissions" WHERE session_id = $1::uuid AND user_id = $2::uuid AND status = 'submitted' AND deleted_at IS NULL LIMIT 1`;
            queryParams = [sessionId, userId];
        }

        const { rows } = await DbService.query(queryText, queryParams);
        res.status(200).json({ success: true, already_submitted: rows.length > 0 });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    submitResponse,
    getSessionResponses,
    checkUserSubmission,
    getSurveyResponses
};
