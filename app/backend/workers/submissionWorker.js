const { Worker } = require('bullmq');
const redisConnection = require('../config/redisClient');
const DbService = require('../config/dbConfig');
const logger = require('../utils/logger');

/**
 * Processes a completed Survey Submission.
 * Groups points, updates the transaction ledger, and triggers milestones.
 */
const worker = new Worker('survey-submissions', async job => {
    const { submissionId, userId, pointsPerQuestion } = job.data;
    const client = await DbService.getClient();

    try {
        await client.query('BEGIN');

        // 1. Calculate Total Score for this submission
        const countRes = await client.query(
            'SELECT COUNT(*) FROM "Responses" WHERE submission_id = $1',
            [submissionId]
        );
        const questionCount = parseInt(countRes.rows[0].count);
        const totalPoints = questionCount * pointsPerQuestion;

        // 2. Fetch Survey Title for the ledger
        const surveyInfo = await client.query(`
            SELECT sv.title, s.created_by 
            FROM "Submissions" sub
            JOIN "Sessions" sess ON sub.session_id = sess.id
            JOIN "Survey_Versions" sv ON sess.survey_version_id = sv.id
            JOIN "Surveys" s ON sv.survey_id = s.id
            WHERE sub.id = $1
        `, [submissionId]);
        
        const { title, created_by } = surveyInfo.rows[0];

        // 3. Log the Transaction (The Ledger)
        await client.query(`
            INSERT INTO "Transactions" (user_id, submission_id, amount, type, description)
            VALUES ($1, $2, $3, 'earn', $4)
        `, [userId, submissionId, totalPoints, `Earned for completion of "${title}"`]);

        // 4. Update the Submission Status to 'processed' (if you have such a state)
        await client.query('UPDATE "Submissions" SET updated_at = NOW() WHERE id = $1', [submissionId]);

        await client.query('COMMIT');

        // 5. Participation Milestones (Notify the Survey Creator)
        if (created_by) {
            try {
                const { rows: workers } = await client.query("SELECT COUNT(*) FROM \"Users\" WHERE role = 'worker'");
                const totalWorkers = parseInt(workers[0].count);

                const { rows: participants } = await client.query(`
                    SELECT COUNT(DISTINCT user_id) FROM "Submissions" 
                    WHERE session_id IN (
                        SELECT id FROM "Sessions" WHERE survey_version_id IN (
                            SELECT id FROM "Survey_Versions" WHERE survey_id = (
                                SELECT survey_id FROM "Survey_Versions" WHERE title = $1 LIMIT 1
                            )
                        )
                    ) AND status = 'submitted'
                `, [title]);
                
                const participantCount = parseInt(participants[0].count);

                if (totalWorkers > 0) {
                    const percent = (participantCount / totalWorkers) * 100;
                    const milestones = [50, 80, 100];
                    for (const m of milestones) {
                        // Notify if exactly hitting a milestone
                        if (percent >= m && (percent - (1/totalWorkers)*100) < m) {
                            const { createNotification } = require('../controllers/notificationController');
                            await createNotification(
                                created_by,
                                `Milestone: ${m}% Reached!`,
                                `Survey "${title}" has reached ${m}% participation.`,
                                'submission_scored'
                            );
                        }
                    }
                }
            } catch (notifErr) {
                logger.error('Milestone processing failed:', notifErr);
            }
        }

        logger.info(`✅ Processed Submission ${submissionId}: User ${userId} earned ${totalPoints} points.`);
        return { success: true, submissionId, totalPoints };

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`❌ Worker Error for Submission ${submissionId}:`, error);
        throw error;
    } finally {
        client.release();
    }
}, { 
    connection: redisConnection,
    concurrency: 5 // Process 5 submissions in parallel per worker container
});

module.exports = worker;
