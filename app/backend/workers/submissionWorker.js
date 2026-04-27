const { Worker } = require('bullmq');
const redisConnection = require('../config/redisClient');
const DbService = require('../config/dbConfig');

/**
 * Processes incoming responses, grouping them into Submissions and 
 * allocating rewards via the new Transactions ledger.
 */
const worker = new Worker('FormSubmissionsQueue', async job => {
    const { session_id, question_id, user_id, answer_value } = job.data;

    // 1. Ensure a Submission record exists for this session/user
    // We use an upsert-like logic to find or create the current 'in_progress' submission
    let submissionRes = await DbService.query(`
        SELECT id FROM "Submissions" 
        WHERE session_id = $1 AND user_id = $2 AND status = 'in_progress' AND deleted_at IS NULL
        LIMIT 1
    `, [session_id, user_id]);

    let submissionId;
    if (submissionRes.rows.length === 0) {
        const newSub = await DbService.query(`
            INSERT INTO "Submissions" (session_id, user_id, status)
            VALUES ($1, $2, 'in_progress')
            RETURNING id
        `, [session_id, user_id]);
        submissionId = newSub.rows[0].id;
    } else {
        submissionId = submissionRes.rows[0].id;
    }

    // 2. Capture the current question text snapshot for historical integrity
    const questionRes = await DbService.query('SELECT question_text FROM "Questions" WHERE id = $1', [question_id]);
    if (questionRes.rows.length === 0) throw new Error('Question not found');
    const questionText = questionRes.rows[0].question_text;

    // 3. Record the Response
    const responseDb = await DbService.query(`
        INSERT INTO "Responses" (submission_id, question_id, question_text_snapshot, answer)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `, [submissionId, question_id, questionText, String(answer_value)]);
    
    const responseData = responseDb.rows[0];

    // 4. Handle Rewards via Transactions
    const sessionRes = await DbService.query(`
        SELECT sv.title, sv.points_per_question 
        FROM "Sessions" s
        JOIN "Survey_Versions" sv ON s.survey_version_id = sv.id
        WHERE s.id = $1
    `, [session_id]);
    
    if (sessionRes.rows.length > 0) {
        const config = sessionRes.rows[0];
        const points = config.points_per_question || 1;
        const surveyTitle = config.title || 'Survey response';

        // Log the earning transaction
        await DbService.query(`
            INSERT INTO "Transactions" (user_id, submission_id, amount, type, description)
            VALUES ($1, $2, $3, 'earn', $4)
        `, [user_id, submissionId, points, `Earned for "${surveyTitle}"`]);

        // 5. Participation Milestones (Admin Notifications)
        try {
            const { createNotification } = require('../controllers/notificationController');
            const sessionMeta = await DbService.query(`
                SELECT sv.survey_id, s.started_by 
                FROM "Sessions" s
                JOIN "Survey_Versions" sv ON s.survey_version_id = sv.id
                WHERE s.id = $1
            `, [session_id]);
            
            const { survey_id, started_by } = sessionMeta.rows[0];

            if (started_by) {
                const { rows: workers } = await DbService.query("SELECT COUNT(*) FROM \"Users\" WHERE role = 'worker'");
                const totalWorkers = parseInt(workers[0].count);

                const { rows: participants } = await DbService.query(`
                    SELECT COUNT(DISTINCT user_id) FROM "Submissions" 
                    WHERE session_id IN (SELECT id FROM "Sessions" WHERE survey_version_id IN (SELECT id FROM "Survey_Versions" WHERE survey_id = $1))
                      AND status = 'submitted'
                `, [survey_id]);
                const participantCount = parseInt(participants[0].count);

                if (totalWorkers > 0) {
                    const percent = (participantCount / totalWorkers) * 100;
                    const milestones = [50, 80, 100];
                    for (const m of milestones) {
                        if (percent >= m && (percent - (1/totalWorkers)*100) < m) {
                            await createNotification(
                                started_by,
                                `Participation Milestone: ${m}%`,
                                `Survey "${surveyTitle}" has reached ${m}% participation.`,
                                'submission_scored', // Using an existing key from V2 migration
                                survey_id
                            );
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Milestone notification error:', err);
        }
    }
    
    return { success: true, responseId: responseData.id, submissionId };
}, { connection: redisConnection });

module.exports = worker;
