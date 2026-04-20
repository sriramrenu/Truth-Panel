const redis = require('../config/redisClient');


const cacheService = {
    /**
     * Set a value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to store (will be JSON stringified)
     * @param {number} ttl - Time to live in seconds (default 300s / 5m)
     */
    async set(key, value, ttl = 300) {
        try {
            const stringValue = JSON.stringify(value);
            await redis.set(key, stringValue, 'EX', ttl);
        } catch (error) {
            console.error(`Cache Set Error [${key}]:`, error);
        }
    },

    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @returns {Promise<any|null>} - Parsed value or null if not found/error
     */
    async get(key) {
        try {
            const data = await redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Cache Get Error [${key}]:`, error);
            return null;
        }
    },

    /**
     * Delete a value from cache
     * @param {string} key - Cache key
     */
    async del(key) {
        try {
            await redis.del(key);
        } catch (error) {
            console.error(`Cache Del Error [${key}]:`, error);
        }
    }
};

module.exports = cacheService;
