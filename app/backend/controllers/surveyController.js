const DbService = require('../config/dbConfig');
const cache = require('../services/cacheService');

const CACHE_KEYS = {
    SURVEY_TEMPLATES: 'survey_templates'
};


const createSurvey = async (req, res, next) => {
    try {
        const { title, description, questions, start_time, end_time, points_per_question, category } = req.body;
        
        if (!title || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ success: false, message: 'Invalid payload: title and questions array required' });
        }

        // 1. Create Survey Entry (The stable anchor)
        const surveyRes = await DbService.query(`
            INSERT INTO "Surveys" (category, created_by)
            VALUES ($1, $2)
            RETURNING id
        `, [category || 'General', req.user?.id]);
        
        const surveyId = surveyRes.rows[0].id;

        // 2. Create Initial Version (Version 1)
        const versionRes = await DbService.query(`
            INSERT INTO "Survey_Versions" (survey_id, version_number, title, description, start_time, end_time, points_per_question)
            VALUES ($1, 1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [surveyId, title, description, start_time || null, end_time || null, points_per_question || 1]);

        const versionId = versionRes.rows[0].id;

        // 3. Create Questions for this version
        if (questions.length > 0) {
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                await DbService.query(`
                    INSERT INTO "Questions" (survey_version_id, question_text, question_type, options, order_index, is_required, logic)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    versionId,
                    q.questionText || q.question_text,
                    q.type || q.question_type || 'MCQ',
                    JSON.stringify(q.options || []),
                    q.order_index || i,
                    q.is_required !== undefined ? q.is_required : true,
                    JSON.stringify(q.logic || {})
                ]);
            }
        }

        const auditLog = require('../utils/auditLogger');
        await auditLog(req, {
            action: 'create',
            table: 'Survey_Versions',
            recordId: versionId,
            newData: { title, points_per_question }
        });

        res.status(201).json({ 
            success: true, 
            message: 'Survey created successfully', 
            surveyId, 
            versionId 
        });

        await cache.del(CACHE_KEYS.SURVEY_TEMPLATES);
    } catch (error) {
        next(error);
    }
};



const getAllSurveys = async (req, res, next) => {
    try {
        const userId = req.user?.id;

        let templates = await cache.get(CACHE_KEYS.SURVEY_TEMPLATES);
        
        if (!templates) {
            // Fetch the latest version for each active survey
            const { rows: surveys } = await DbService.query(`
                SELECT DISTINCT ON (s.id) 
                    s.id as survey_id, s.category, sv.id as version_id, sv.title, sv.description, 
                    sv.start_time, sv.end_time, sv.points_per_question, sv.version_number
                FROM "Surveys" s
                JOIN "Survey_Versions" sv ON s.id = sv.survey_id
                WHERE s.deleted_at IS NULL
                ORDER BY s.id, sv.version_number DESC
            `);
            
            for (let s of surveys) {
                // Get Questions for this specific version
                const q = await DbService.query('SELECT * FROM "Questions" WHERE survey_version_id = $1 AND deleted_at IS NULL ORDER BY order_index', [s.version_id]);
                s.Questions = q.rows;
                
                // Get Sessions linked to this version
                const sess = await DbService.query('SELECT * FROM "Sessions" WHERE survey_version_id = $1 AND deleted_at IS NULL', [s.version_id]);
                s.Sessions = sess.rows;
                s.SessionIds = sess.rows.map(se => se.id);
            }
            
            templates = surveys;
            await cache.set(CACHE_KEYS.SURVEY_TEMPLATES, templates, 600);
        }

        // 2. Admin Live Data
        if (req.user?.role === 'admin') {
            for (let survey of templates) {
                if (survey.Sessions) {
                    for (let session of survey.Sessions) {
                        const resp = await DbService.query(
                            'SELECT user_id FROM "Submissions" WHERE session_id = $1 AND status = \'submitted\' AND deleted_at IS NULL', 
                            [session.id]
                        );
                        session.Responses = resp.rows;
                    }
                }
            }
        }

        // 3. User Progress
        const { rows: userSubmissions } = await DbService.query(
            'SELECT session_id FROM "Submissions" WHERE user_id = $1 AND status = \'submitted\' AND deleted_at IS NULL', 
            [userId]
        );
        const submittedSessionIds = new Set(userSubmissions.map(r => r.session_id));

        const surveysWithStatus = templates.map(survey => {
            const isCompleted = survey.SessionIds.some(sid => submittedSessionIds.has(sid));
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
        const { survey_id, version_id } = req.body;

        // If version_id isn't provided, find the latest one
        let targetVersionId = version_id;
        if (!targetVersionId) {
            const latest = await DbService.query('SELECT id FROM "Survey_Versions" WHERE survey_id = $1 ORDER BY version_number DESC LIMIT 1', [survey_id]);
            if (latest.rows.length === 0) return res.status(404).json({ success: false, message: 'No versions found for survey' });
            targetVersionId = latest.rows[0].id;
        }

        const resDb = await DbService.query(`
            INSERT INTO "Sessions" (survey_version_id, status, started_by)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [targetVersionId, 'active', req.user?.id]);

        const data = resDb.rows[0];
        
        try {
            const { notifyAllWorkers } = require('./notificationController');
            const surveyRes = await DbService.query('SELECT title FROM "Survey_Versions" WHERE id = $1', [targetVersionId]);
            const survey = surveyRes.rows[0];
            if (survey) {
                await notifyAllWorkers(
                    'New Survey Available!',
                    `"${survey.title}" is now open for responses. Check your dashboard to participate!`,
                    'survey_assigned',
                    survey_id
                );
            }
        } catch (notifErr) {
            console.error('Failed to trigger notifications:', notifErr);
        }

        res.status(201).json({ success: true, message: 'Session started successfully!', session: data });
    } catch (error) {
        next(error);
    }
};

const getActiveSession = async (req, res, next) => {
    try {
        const { survey_id } = req.params;

        // Check the latest version's expiry
        const versionRes = await DbService.query(`
            SELECT id, end_time FROM "Survey_Versions" 
            WHERE survey_id = $1 ORDER BY version_number DESC LIMIT 1
        `, [survey_id]);
        
        const version = versionRes.rows[0];
        if (!version) return res.status(404).json({ success: false, message: 'Survey version not found' });
            
        if (version.end_time) {
            const now = new Date();
            const endTime = new Date(version.end_time);
            if (now > endTime) return res.status(403).json({ success: false, message: 'Survey version has expired' });
        }

        const sessionRes = await DbService.query(`
            SELECT * FROM "Sessions" 
            WHERE survey_version_id = $1 AND status = 'active' AND deleted_at IS NULL
            ORDER BY started_at DESC LIMIT 1
        `, [version.id]);

        const data = sessionRes.rows[0] || null;
        if (!data) return res.status(404).json({ success: false, message: 'No active session found' });

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
