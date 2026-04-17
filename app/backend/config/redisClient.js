const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
    throw new Error("Missing REDIS_URL configuration! Pure Hosted Redis is required.");
}


const redisConnection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ

    tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
});

redisConnection.on('error', (err) => {
  console.error('Redis Connection Error:', err);
});

module.exports = redisConnection;
