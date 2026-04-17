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
    }
    
    return { success: true, responseId: responseData.id };
}, { connection: redisConnection });

module.exports = worker;
