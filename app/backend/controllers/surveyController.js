const DbService = require('../config/dbConfig');
const createSurvey = async (req, res, next) => {
    try {
        const { title, description, questions, start_time, end_time, points_per_question } = req.body;
        
        if (!title || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ success: false, message: 'Invalid payload: title and questions array required' });
        }
        const surveyRes = await DbService.query(`
            INSERT INTO "Surveys" (title, description, start_time, end_time, points_per_question, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [title, description, start_time || null, end_time || null, points_per_question || 1, req.user?.id]);
        
        const surveyData = surveyRes.rows[0];
        if (questions.length > 0) {
            for (const q of questions) {
                await DbService.query(`
                    INSERT INTO "Questions" (survey_id, question_text, question_type, options)
                    VALUES ($1, $2, $3, $4)
                `, [
                    surveyData.id,
                    q.questionText || q.question_text,
                    q.type || q.question_type || 'MCQ',
                    JSON.stringify(q.options || [])
                ]);
            }
        }

        res.status(201).json({ success: true, message: 'Survey created successfully', survey: surveyData });

    } catch (error) {
        next(error);
    }
};
const getAllSurveys = async (req, res, next) => {
    try {
        const { rows: surveys } = await DbService.query('SELECT * FROM "Surveys" ORDER BY created_at DESC');
        
        for (let s of surveys) {
            const q = await DbService.query('SELECT * FROM "Questions" WHERE survey_id = $1', [s.id]);
            s.Questions = q.rows;
            
            const sess = await DbService.query('SELECT id FROM "Sessions" WHERE survey_id = $1', [s.id]);
            s.Sessions = [];
            for (let se of sess.rows) {
                const r = await DbService.query('SELECT user_id FROM "Responses" WHERE session_id = $1', [se.id]);
                s.Sessions.push({ Responses: r.rows });
            }
        }

        res.status(200).json({ success: true, data: surveys });
    } catch (error) {
        next(error);
    }
};
const createSession = async (req, res, next) => {
    try {
        const { survey_id } = req.body;
        const resDb = await DbService.query(`
            INSERT INTO "Sessions" (survey_id, pin_code, status, started_by)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [survey_id, 'ASSIGNED', 'active', req.user?.id]);

        const data = resDb.rows[0];
        
        // Notify all workers about the new survey availability
        try {
            const { notifyAllWorkers } = require('./notificationController');
            const surveyRes = await DbService.query('SELECT title, description FROM "Surveys" WHERE id = $1', [survey_id]);
            const survey = surveyRes.rows[0];
            if (survey) {
                await notifyAllWorkers(
                    'New Survey Available!',
                    `"${survey.title}" is now open for responses. Check your dashboard to participate!`,
                    'new_survey',
                    survey_id
                );
            }
        } catch (notifErr) {
            console.error('Failed to trigger new survey notifications:', notifErr);
        }

        res.status(201).json({ success: true, message: 'Session started successfully!', session: data });
    } catch (error) {
        next(error);
    }
};
const getActiveSession = async (req, res, next) => {
    try {
        const { survey_id } = req.params;
        const surveyRes = await DbService.query('SELECT end_time FROM "Surveys" WHERE id = $1', [survey_id]);
        const survey = surveyRes.rows[0];
            
        if (survey && survey.end_time) {
            const now = new Date();
            const endTime = new Date(survey.end_time);
            if (now > endTime) {
                return res.status(403).json({ success: false, message: 'Survey session has expired' });
            }
        }

        const sessionRes = await DbService.query(`
            SELECT * FROM "Sessions" 
            WHERE survey_id = $1 AND status = 'active'
            ORDER BY created_at DESC LIMIT 1
        `, [survey_id]);

        const data = sessionRes.rows[0] || null;

        if (!data) {
             return res.status(404).json({ success: false, message: 'No active session found' });
        }

        res.status(200).json({ success: true, session: data });
    } catch (error) {
        next(error);
    }
};
const deleteSurvey = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: 'Survey ID parameter is required' });
        }
        await DbService.query('DELETE FROM "Surveys" WHERE id = $1', [id]);
        
        res.status(200).json({ success: true, message: 'Survey deleted seamlessly' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createSurvey,
    getAllSurveys,
    createSession,
    getActiveSession,
    deleteSurvey
};
