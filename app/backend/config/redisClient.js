const Redis = require('ioredis');

// 1. Resolve Redis Configuration 
const REDIS_URL = `redis://:${process.env.REDIS_PASSWORD}@redis:6379`;

const redisConnection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, 
    retryStrategy: (times) => Math.min(times * 50, 2000)
});

redisConnection.on('error', (err) => {
  const logger = require('../utils/logger');
  logger.error({ msg: 'Redis Connection Error', error: err.message });
});

module.exports = redisConnection;
