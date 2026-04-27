const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redisClient');
const logger = require('../utils/logger');


const createSecureLimiter = (options = {}) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000, // Default 15 minutes
        max: options.max || 100, // Default 100 requests per window
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        
        // Use the internal Redis store
        store: new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
            prefix: `rate-limit:${options.name || 'global'}:`
        }),

        // The "Secret Sauce": The Correlation Key
        keyGenerator: (req) => {
            const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
            const userId = req.user?.id || 'anonymous';
            const deviceFingerprint = req.headers['x-device-fingerprint'] || 'no-fingerprint';
            
            // Correlate all three to prevent both IP spoofing and UserID hopping
            return `${ip}:${userId}:${deviceFingerprint}`;
        },

        handler: (req, res) => {
            logger.warn({
                msg: 'Rate limit exceeded',
                ip: req.ip,
                userId: req.user?.id,
                path: req.path
            });
            res.status(429).json({
                success: false,
                message: 'Too many requests from this device/account. Please try again later.',
                retryAfter: Math.ceil(options.windowMs / 1000 / 60) + ' minutes'
            });
        },

        skip: (req) => {
            // Optional: Skip rate limiting for internal health check probes
            return req.path === '/api/health';
        }
    });
};

// Specialized Limiters
const authLimiter = createSecureLimiter({
    name: 'auth',
    windowMs: 15 * 60 * 1000,
    max: 10 // 10 attempts per 15 minutes (Strict for login/OTP)
});

const submissionLimiter = createSecureLimiter({
    name: 'submission',
    windowMs: 1 * 60 * 1000,
    max: 5 // 5 submissions per minute
});

const globalLimiter = createSecureLimiter({
    name: 'global',
    windowMs: 15 * 60 * 1000,
    max: 200
});

module.exports = {
    globalLimiter,
    authLimiter,
    submissionLimiter
};
