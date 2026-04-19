const { Worker } = require('bullmq');
const redisConnection = require('../config/redisClient');
const DbService = require('../config/dbConfig');


const worker = new Worker('FormSubmissionsQueue', async job => {
    const { session_id, question_id, user_id, answer_value } = job.data;

    const responseDb = await DbService.query(`
        INSERT INTO "Responses" (session_id, question_id, user_id, answer)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `, [session_id, question_id, user_id, String(answer_value)]);
    
    const responseData = responseDb.rows[0];

    const sessionRes = await DbService.query(`
        SELECT s.title, s.points_per_question 
        FROM "Sessions" sess
        JOIN "Surveys" s ON sess.survey_id = s.id
        WHERE sess.id = $1
    `, [session_id]);
    
    if (sessionRes.rows.length > 0) {
        const surveyConfig = sessionRes.rows[0];
        const points = surveyConfig.points_per_question || 1;
        const surveyTitle = surveyConfig.title || 'Form Submission';

        await DbService.query(`
            INSERT INTO "Rewards" (user_id, response_id, task_name, amount, transaction_type)
            VALUES ($1, $2, $3, $4, $5)
        `, [user_id, responseData.id, `${surveyTitle} (Q)`, points, 'earn']);

        // Check for participation milestones for the admin
        try {
            const { createNotification } = require('../controllers/notificationController');
            const surveyIdRes = await DbService.query('SELECT survey_id, started_by FROM "Sessions" WHERE id = $1', [session_id]);
            const { survey_id, started_by } = surveyIdRes.rows[0];

            if (started_by) {
                // Get total workers
                const { rows: workers } = await DbService.query("SELECT COUNT(*) FROM \"Users\" WHERE role = 'worker'");
                const totalWorkers = parseInt(workers[0].count);

                // Get unique participants for this survey
                const { rows: participants } = await DbService.query(`
                    SELECT COUNT(DISTINCT user_id) FROM "Responses" 
                    WHERE session_id IN (SELECT id FROM "Sessions" WHERE survey_id = $1)
                `, [survey_id]);
                const participantCount = parseInt(participants[0].count);

                if (totalWorkers > 0) {
                    const percent = (participantCount / totalWorkers) * 100;
                    
                    // Check if we should notify for 50%, 80%, or 100%
                    const milestones = [50, 80, 100];
                    for (const m of milestones) {
                        // If it just crossed the milestone
                        if (percent >= m && (percent - (1/totalWorkers)*100) < m) {
                            await createNotification(
                                started_by,
                                `Participation Milestone: ${m}%`,
                                `Survey "${surveyTitle}" has reached ${m}% participation (${participantCount}/${totalWorkers} workers).`,
                                'participation_milestone',
                                survey_id
                            );
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Failed to process admin milestone notification:', err);
        }
    }
    
    return { success: true, responseId: responseData.id };
}, { connection: redisConnection });

module.exports = worker;
