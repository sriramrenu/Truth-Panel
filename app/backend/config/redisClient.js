const Redis = require('ioredis');

// 1. Resolve Redis Configuration
// =============================================================================
// If REDIS_URL is provided (e.g. Upstash), we use it directly.
// Otherwise, we fallback to the local Docker service 'redis' on port 6379.
const REDIS_URL = process.env.REDIS_URL || `redis://:${process.env.REDIS_PASSWORD}@redis:6379`;

const redisConnection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    // Automatically enable TLS if the URL starts with rediss://
    tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    // Ensure we retry connection on failure (essential for production)
    retryStrategy: (times) => Math.min(times * 50, 2000)
});

redisConnection.on('error', (err) => {
  const logger = require('../utils/logger');
  logger.error({ msg: 'Redis Connection Error', error: err.message });
});

module.exports = redisConnection;
