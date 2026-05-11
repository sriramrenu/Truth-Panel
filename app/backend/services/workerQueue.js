const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// Connect to the local Redis container
const connection = new IORedis({
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null
});

// Create the submission processing queue
const submissionQueue = new Queue('survey-submissions', { 
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
});

console.log('🚀 BullMQ Submission Queue Initialized (Connected to Redis)');

module.exports = {
    submissionQueue,
    connection
};
