const DbService = require('../config/dbConfig');
const cache = require('../services/cacheService');

const CACHE_KEYS = {
    SURVEY_TEMPLATES: 'survey_templates'
};


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

        // Invalidate templates
        await cache.del(CACHE_KEYS.SURVEY_TEMPLATES);


    } catch (error) {
        next(error);
    }
};



const getAllSurveys = async (req, res, next) => {
    try {
        const userId = req.user?.id;

        // 1. Get Static Templates (Surveys + Questions + Session Info)
        let templates = await cache.get(CACHE_KEYS.SURVEY_TEMPLATES);
        
        if (!templates) {
            const { rows: surveys } = await DbService.query('SELECT * FROM "Surveys" WHERE deleted_at IS NULL ORDER BY created_at DESC');
            
            for (let s of surveys) {
                // Get Questions
                const q = await DbService.query('SELECT * FROM "Questions" WHERE survey_id = $1 AND session_id IS NULL', [s.id]);
                s.Questions = q.rows;
                
                // Get Sessions
                const sess = await DbService.query('SELECT * FROM "Sessions" WHERE survey_id = $1 AND deleted_at IS NULL', [s.id]);
                s.Sessions = sess.rows;
                s.SessionIds = sess.rows.map(se => se.id);
            }
            
            templates = surveys;
            // Store static templates in cache for 10 minutes
            await cache.set(CACHE_KEYS.SURVEY_TEMPLATES, templates, 600);
        }

        // 2. Role-Aware Live Data (NEVER cached)
        // If Admin, we need to inject live responses into the sessions for charts/counts
        if (req.user?.role === 'admin') {
            for (let survey of templates) {
                if (survey.Sessions) {
                    for (let session of survey.Sessions) {
                        const resp = await DbService.query(
                            'SELECT user_id FROM "Responses" WHERE session_id = $1 AND deleted_at IS NULL', 
                            [session.id]
                        );
                        session.Responses = resp.rows;
                    }
                }
            }
        }

        // 2. Get User's Personal Progress (ALWAYS from Database)
        // This is a very fast query even with many users
        const { rows: userResponses } = await DbService.query(
            'SELECT session_id FROM "Responses" WHERE user_id = $1 AND deleted_at IS NULL', 
            [userId]
        );
        const respondedSessionIds = new Set(userResponses.map(r => r.session_id));

        // 3. Merge: Mark which surveys this specific user has finished
        const surveysWithStatus = templates.map(survey => {
            const isCompleted = survey.SessionIds.some(sid => respondedSessionIds.has(sid));
            return {
                ...survey,
                is_completed: isCompleted
            };
        });

        res.status(200).json({ 
            success: true, 
            data: surveysWithStatus, 
            source: 'hybrid (cache + db)' 
        });
    } catch (error) {
        next(error);
    }
};

const createSession = async (req, res, next) => {
    try {
        const { survey_id } = req.body;

        const resDb = await DbService.query(`
            INSERT INTO "Sessions" (survey_id, status, started_by)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [survey_id, 'active', req.user?.id]);

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
            WHERE survey_id = $1 AND status = 'active' AND deleted_at IS NULL
            ORDER BY started_at DESC LIMIT 1
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

        const userId = req.user?.id;
 
        await DbService.query(`
            UPDATE "Surveys" 
            SET deleted_at = NOW(), deleted_by = $2 
            WHERE id = $1
        `, [id, userId]);
        
        res.status(200).json({ success: true, message: 'Survey deleted (soft delete)' });

        // Invalidate templates
        await cache.del(CACHE_KEYS.SURVEY_TEMPLATES);

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
