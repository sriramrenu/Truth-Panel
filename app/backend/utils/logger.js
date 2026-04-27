const pino = require('pino');


const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    base: {
        env: process.env.NODE_ENV || 'development',
        service: 'truth-panel-api'
    },
    // In development, use pino-pretty for readability
    transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard'
        }
    } : undefined,
    // Add specific redaction for PII/Sensitive data to ensure TATA compliance
    redact: {
        paths: ['req.headers.authorization', 'password', 'token', 'refresh_token'],
        placeholder: '[REDACTED]'
    }
});

module.exports = logger;
