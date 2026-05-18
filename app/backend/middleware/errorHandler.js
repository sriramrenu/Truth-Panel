const logger = require('../utils/logger');

/**
 * Enterprise Global Error Handler (Clean Architecture)
 * - Captures all unhandled exceptions
 * - Logs exclusively to the Pino JSON stream (captured by Loki)
 * - Returns a secure, sanitized response to the client
 */
const errorHandler = async (err, req, res, next) => {
    const errorId = require('crypto').randomUUID();
    
    let safePayload = undefined;
    if (req.body) {
        safePayload = { ...req.body };
        const sensitiveKeys = ['password', 'token', 'refresh_token', 'otp'];
        for (const key of Object.keys(safePayload)) {
            if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                safePayload[key] = '[REDACTED]';
            }
        }
    }

    // Log to JSON stdout (High-speed stream for Loki/Grafana)
    // We include full context: Request ID, Path, Method, User, and Stack Trace
    logger.error({
        error_id: errorId,
        msg: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        payload: safePayload,
        userAgent: req.headers['user-agent']
    });

    // Return secure response (Hide stack trace in production)
    const status = err.status || 500;
    res.status(status).json({
        success: false,
        error_id: errorId, // Provide ID for internal TATA support traceability
        message: status === 500 ? 'An internal server error occurred' : err.message
    });
};

module.exports = errorHandler;
