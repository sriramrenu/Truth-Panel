const { Queue } = require('bullmq');
const redisConnection = require('../config/redisClient');

const submissionQueue = new Queue('FormSubmissionsQueue', {
    connection: redisConnection
});

module.exports = submissionQueue;
