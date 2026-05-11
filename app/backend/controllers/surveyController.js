const DbService = require('../config/dbConfig');
const cache = require('../services/cacheService');

const CACHE_KEYS = {
    SURVEY_TEMPLATES: 'survey_templates'
};


const createSurvey = async (req, res, next) => {
    const client = await DbService.getClient(); // Get a client for the transaction
    try {
        const { title, description, questions, start_time, end_time, points_per_question, category, max_score } = req.body;
        
        if (!title || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ success: false, message: 'Invalid payload' });
        }

        await client.query('BEGIN');

        // 1. Create Survey Anchor
        const surveyRes = await client.query(`
            INSERT INTO "Surveys" (category, created_by)
            VALUES ($1, $2)
            RETURNING id
        `, [category || 'General', req.user?.id]);
        
        const surveyId = surveyRes.rows[0].id;

        // 2. Create Initial Version
        const versionRes = await client.query(`
            INSERT INTO "Survey_Versions" (survey_id, version_number, title, description, start_time, end_time, points_per_question, max_score)
            VALUES ($1, 1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `, [surveyId, title, description, start_time || null, end_time || null, points_per_question || 1, max_score || null]);

        const versionId = versionRes.rows[0].id;

        // 3. BATCH Insert Questions
        if (questions.length > 0) {
            const questionValues = [];
            const placeholders = [];
            
            questions.forEach((q, i) => {
                const base = i * 7;
                placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`);
                questionValues.push(
                    versionId,
                    q.questionText || q.question_text,
                    q.type || q.question_type || 'MCQ',
                    JSON.stringify(q.options || []),
                    q.order_index !== undefined ? q.order_index : i,
                    q.is_required !== undefined ? q.is_required : true,
                    JSON.stringify(q.logic || {})
                );
            });

            const queryText = `
                INSERT INTO "Questions" (survey_version_id, question_text, question_type, options, order_index, is_required, logic)
                VALUES ${placeholders.join(', ')}
            `;
            await client.query(queryText, questionValues);
        }

        await client.query('COMMIT');

        // Post-commit tasks
        const auditLog = require('../utils/auditLogger');
        await auditLog(req, {
            action: 'create',
            table: 'Survey_Versions',
            recordId: versionId,
            newData: { title, points_per_question }
        });

        await cache.del(CACHE_KEYS.SURVEY_TEMPLATES);

        res.status(201).json({ success: true, surveyId, versionId });

    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

const getAllSurveys = async (req, res, next) => {
    try {
        let templates = await cache.get(CACHE_KEYS.SURVEY_TEMPLATES);
        
        if (!templates) {
            // Optimized query: Fetches latest versions only, without N+1 loop
            const { rows: surveys } = await DbService.query(`
                SELECT 
                    s.id as survey_id, s.category, 
                    sv.id as version_id, sv.title, sv.description, 
                    sv.start_time, sv.end_time, sv.points_per_question, sv.version_number,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', q.id,
                                'text', q.question_text,
                                'type', q.question_type,
                                'options', q.options,
                                'order', q.order_index
                            ) ORDER BY q.order_index
                        ) FILTER (WHERE q.id IS NOT NULL), '[]'
                    ) as questions
                FROM "Surveys" s
                JOIN "Survey_Versions" sv ON s.id = sv.survey_id
                LEFT JOIN "Questions" q ON sv.id = q.survey_version_id AND q.deleted_at IS NULL
                WHERE s.deleted_at IS NULL
                  AND sv.version_number = (
                      SELECT MAX(version_number) 
                      FROM "Survey_Versions" 
                      WHERE survey_id = s.id
                  )
                GROUP BY s.id, sv.id
                ORDER BY s.created_at DESC
            `);
            
            templates = surveys;
            await cache.set(CACHE_KEYS.SURVEY_TEMPLATES, templates, 3600); // Cache for 1 hour
        }
        
        res.status(200).json({ success: true, data: templates });
    } catch (error) {
        next(error);
    }
};


const createSession = async (req, res, next) => {
    try {
        const { survey_id, version_id } = req.body;
        const userId = req.user?.id;

        // 1. Resolve Version
        let targetVersionId = version_id;
        if (!targetVersionId) {
            const latest = await DbService.query('SELECT id FROM "Survey_Versions" WHERE survey_id = $1 ORDER BY version_number DESC LIMIT 1', [survey_id]);
            if (latest.rows.length === 0) return res.status(404).json({ success: false, message: 'Survey not found' });
            targetVersionId = latest.rows[0].id;
        }

        // 2. Idempotency Check: Don't allow multiple active sessions for the same user/version
        const existing = await DbService.query(
            'SELECT id FROM "Sessions" WHERE survey_version_id = $1 AND started_by = $2 AND status = \'active\' AND deleted_at IS NULL',
            [targetVersionId, userId]
        );
        
        if (existing.rows.length > 0) {
            return res.status(200).json({ success: true, message: 'Resuming existing session', session: existing.rows[0] });
        }

        // 3. Create Session
        const resDb = await DbService.query(`
            INSERT INTO "Sessions" (survey_version_id, status, started_by)
            VALUES ($1, 'active', $2)
            RETURNING *
        `, [targetVersionId, userId]);

        const session = resDb.rows[0];
        
        const auditLog = require('../utils/auditLogger');
        await auditLog(req, {
            action: 'create',
            table: 'Sessions',
            recordId: session.id,
            newData: { survey_id, version_id: targetVersionId }
        });

        res.status(201).json({ success: true, message: 'Session started successfully!', session });
    } catch (error) {
        next(error);
    }
};

const submitSurvey = async (req, res, next) => {
    const client = await DbService.getClient();
    try {
        const { session_id, answers } = req.body; // answers: [{question_id, answer}]
        const userId = req.user?.id;

        if (!session_id || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Invalid submission payload' });
        }

        await client.query('BEGIN');

        // 1. Validate Session & State
        const sessionRes = await client.query(
            'SELECT s.id, s.status, sv.points_per_question FROM "Sessions" s JOIN "Survey_Versions" sv ON s.survey_version_id = sv.id WHERE s.id = $1 AND s.started_by = $2',
            [session_id, userId]
        );
        
        if (sessionRes.rows.length === 0) throw new Error('Session not found or access denied');
        const session = sessionRes.rows[0];
        if (session.status !== 'active') throw new Error('Session is no longer active');

        // 2. Create Submission Record (The Ledger)
        const submissionRes = await client.query(`
            INSERT INTO "Submissions" (session_id, user_id, status, submitted_at)
            VALUES ($1, $2, 'submitted', NOW())
            RETURNING id
        `, [session_id, userId]);
        
        const submissionId = submissionRes.rows[0].id;

        // 3. BATCH Insert Responses (Into Partitioned Table)
        const responseValues = [];
        const placeholders = [];
        
        // Fetch question snapshots for data integrity
        const qIds = answers.map(a => a.question_id);
        const { rows: qSnapshots } = await client.query('SELECT id, question_text FROM "Questions" WHERE id = ANY($1)', [qIds]);
        const qMap = new Map(qSnapshots.map(q => [q.id, q.question_text]));

        answers.forEach((ans, i) => {
            const base = i * 4;
            placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
            responseValues.push(
                submissionId,
                ans.question_id,
                qMap.get(ans.question_id) || 'Unknown Question',
                ans.answer
            );
        });

        await client.query(`
            INSERT INTO "Responses" (submission_id, question_id, question_text_snapshot, answer)
            VALUES ${placeholders.join(', ')}
        `, responseValues);

        // 4. Close Session
        await client.query('UPDATE "Sessions" SET status = \'completed\', ended_at = NOW() WHERE id = $1', [session_id]);

        await client.query('COMMIT');

        // 5. TRIGGER WORKER (Async)
        try {
            const { submissionQueue } = require('../services/workerQueue'); // We need to define this
            await submissionQueue.add('process-submission', {
                submissionId,
                userId,
                pointsPerQuestion: session.points_per_question
            });
        } catch (queueErr) {
            console.error('Worker Queue Trigger Failed:', queueErr);
            // Don't fail the request, worker can pick it up via a sweep later
        }

        res.status(200).json({ success: true, message: 'Survey submitted successfully!', submissionId });

    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
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

const getSurveyById = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // 1. Get Survey and Latest Version
        const surveyRes = await DbService.query(`
            SELECT s.id, s.category, sv.id as version_id, sv.title, sv.description, 
                   sv.start_time, sv.end_time, sv.points_per_question, sv.version_number
            FROM "Surveys" s
            JOIN "Survey_Versions" sv ON s.id = sv.survey_id
            WHERE s.id = $1 AND s.deleted_at IS NULL
            ORDER BY sv.version_number DESC
            LIMIT 1
        `, [id]);
        
        if (surveyRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Survey not found' });
        }
        
        const survey = surveyRes.rows[0];
        
        // 2. Get Questions
        const questionsRes = await DbService.query(`
            SELECT id, question_text, question_type, options, order_index, is_required, logic 
            FROM "Questions" 
            WHERE survey_version_id = $1 AND deleted_at IS NULL 
            ORDER BY order_index
        `, [survey.version_id]);
        
        survey.Questions = questionsRes.rows;
        
        res.status(200).json({ success: true, data: survey });
    } catch (error) {
        next(error);
    }
};

const updateSurvey = async (req, res, next) => {
    const client = await DbService.getClient();
    try {
        const { id } = req.params;
        const { title, description, questions, start_time, end_time, points_per_question, category, max_score } = req.body;
        
        if (!title || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ success: false, message: 'Invalid payload' });
        }

        await client.query('BEGIN');

        // 1. Get and Lock Latest Version
        const versionRes = await client.query(`
            SELECT id, version_number FROM "Survey_Versions" 
            WHERE survey_id = $1 ORDER BY version_number DESC LIMIT 1 FOR UPDATE
        `, [id]);
        
        if (versionRes.rows.length === 0) throw new Error('Survey version not found');
        const versionId = versionRes.rows[0].id;

        // 2. Safety Check: Cannot update if sessions exist
        const sessionRes = await client.query('SELECT id FROM "Sessions" WHERE survey_version_id = $1 AND deleted_at IS NULL LIMIT 1', [versionId]);
        if (sessionRes.rows.length > 0) {
            throw new Error('Cannot update a live survey version.');
        }

        // 3. Update Version Metadata
        await client.query(`
            UPDATE "Survey_Versions"
            SET title = $1, description = $2, start_time = $3, end_time = $4, points_per_question = $5, max_score = $6, updated_at = NOW()
            WHERE id = $7
        `, [title, description, start_time || null, end_time || null, points_per_question || 1, max_score || null, versionId]);

        // 4. Update Category
        await client.query('UPDATE "Surveys" SET category = $1 WHERE id = $2', [category || 'General', id]);

        // 5. BATCH Update Questions (Delete then Bulk Insert)
        await client.query('UPDATE "Questions" SET deleted_at = NOW() WHERE survey_version_id = $1', [versionId]);
        
        if (questions.length > 0) {
            const questionValues = [];
            const placeholders = [];
            
            questions.forEach((q, i) => {
                const base = i * 7;
                placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`);
                questionValues.push(
                    versionId,
                    q.questionText || q.question_text,
                    q.type || q.question_type || 'MCQ',
                    JSON.stringify(q.options || []),
                    q.order_index !== undefined ? q.order_index : i,
                    q.is_required !== undefined ? q.is_required : true,
                    JSON.stringify(q.logic || {})
                );
            });

            await client.query(`
                INSERT INTO "Questions" (survey_version_id, question_text, question_type, options, order_index, is_required, logic)
                VALUES ${placeholders.join(', ')}
            `, questionValues);
        }

        await client.query('COMMIT');

        const auditLog = require('../utils/auditLogger');
        await auditLog(req, {
            action: 'update',
            table: 'Survey_Versions',
            recordId: versionId,
            newData: { title }
        });

        await cache.del(CACHE_KEYS.SURVEY_TEMPLATES);
        res.status(200).json({ success: true, message: 'Survey updated successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

module.exports = {
    createSurvey,
    getAllSurveys,
    getSurveyById,
    createSession,
    getActiveSession,
    updateSurvey,
    deleteSurvey
};
