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
            // Logic moved from setInterval to here
            await DbService.query('DELETE FROM "Notifications" WHERE read_at < NOW() - INTERVAL \'30 days\'');
            logger.info('Cleaned old notifications');
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
