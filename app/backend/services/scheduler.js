const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const logger = require('../utils/logger');
const DbService = require('../config/dbConfig');

const connection = new IORedis({
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null
});

const schedulerQueue = new Queue('distributed-tasks', { connection });

/**
 * Initialize all production background tasks.
 * Using BullMQ repeatable jobs ensures tasks run only ONCE across the cluster.
 */
const initScheduler = async () => {
    try {
        // 1. Clear old repeatable jobs to prevent duplicates on restart
        const oldJobs = await schedulerQueue.getRepeatableJobs();
        for (const job of oldJobs) {
            await schedulerQueue.removeRepeatableByKey(job.key);
        }

        // 2. Notification Maintenance (Every 5 minutes)
        await schedulerQueue.add('clean-notifications', {}, {
            repeat: { pattern: '*/5 * * * *' }
        });

        // 3. Refresh Leaderboard Materialized View (Every 10 minutes)
        await schedulerQueue.add('refresh-leaderboard', {}, {
            repeat: { pattern: '*/10 * * * *' }
        });

        // 4. Cleanup Zombie Sessions (Daily at 2 AM)
        await schedulerQueue.add('zombie-cleanup', {}, {
            repeat: { pattern: '0 2 * * *' }
        });

        logger.info('🗓️  Distributed Scheduler Initialized (BullMQ Cron Active)');
    } catch (err) {
        logger.error('Failed to initialize scheduler:', err);
    }
};

module.exports = { initScheduler, connection };
