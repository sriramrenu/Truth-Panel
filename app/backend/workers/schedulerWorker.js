const { Worker } = require('bullmq');
const { connection } = require('../services/scheduler');
const DbService = require('../config/dbConfig');
const logger = require('../utils/logger');

/**
 * The Executor for Distributed Tasks.
 */
const schedulerWorker = new Worker('distributed-tasks', async job => {
    logger.info(`Executing Scheduled Task: ${job.name}`);

    switch (job.name) {
        case 'clean-notifications':
            // Logic fixed to match actual TATA schema (updated_at + is_read)
            await DbService.query('DELETE FROM "Notifications" WHERE is_read = true AND updated_at < NOW() - INTERVAL \'30 days\'');
            logger.info('Cleaned old notifications');
            break;

        case 'survey-maintenance':
            try {
                // 1. Logic A: Ending Soon (Notify workers for surveys ending in ~24 hours)
                // Use a sliding window to ensure no surveys are missed if the task is delayed
                const endingSoonRes = await DbService.query(`
                    SELECT id, title, survey_id 
                    FROM "Survey_Versions" 
                    WHERE end_time > NOW() + INTERVAL '23 hours 45 minutes'
                      AND end_time <= NOW() + INTERVAL '24 hours'
                      AND deleted_at IS NULL
                `);

                if (endingSoonRes.rows.length > 0) {
                    const { notifyAllWorkers } = require('../controllers/notificationController');
                    for (const survey of endingSoonRes.rows) {
                        await notifyAllWorkers(
                            'Ending Soon!',
                            `Survey "${survey.title}" is ending in 24 hours. Don't miss out on your points!`,
                            'survey_assigned',
                            survey.survey_id
                        );
                        logger.info(`📢 Ending Soon notification sent for survey: ${survey.title}`);
                    }
                }

                // 2. Logic B: Expired Cleanup (Auto-expire sessions for ended surveys)
                const expiredRes = await DbService.query(`
                    UPDATE "Sessions" 
                    SET status = 'expired', ended_at = NOW() 
                    WHERE status = 'active' 
                      AND survey_version_id IN (SELECT id FROM "Survey_Versions" WHERE end_time < NOW())
                `);
                
                if (expiredRes.rowCount > 0) {
                    logger.info(`🧹 Auto-expired ${expiredRes.rowCount} sessions for ended surveys.`);
                }
            } catch (err) {
                logger.error('Survey maintenance task failed:', err);
            }
            break;

        case 'refresh-leaderboard':
            // High-speed leaderboard refresh
            await DbService.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_stats');
            logger.info('Leaderboard Materialized View Refreshed');
            break;

        case 'zombie-cleanup':
            // Close sessions that have been 'active' for more than 24 hours without updates
            await DbService.query(`
                UPDATE "Sessions" 
                SET status = 'expired', ended_at = NOW() 
                WHERE status = 'active' AND updated_at < NOW() - INTERVAL '24 hours'
            `);
            logger.info('Zombie sessions cleaned');
            break;

        default:
            logger.warn(`Unknown task: ${job.name}`);
    }
}, { connection });

module.exports = schedulerWorker;
