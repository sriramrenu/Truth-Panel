const logger = require('../utils/logger');

/**
 * Enterprise Global Error Handler (Clean Architecture)
 * - Captures all unhandled exceptions
 * - Logs exclusively to the Pino JSON stream (captured by Loki)
 * - Returns a secure, sanitized response to the client
 */
const errorHandler = async (err, req, res, next) => {
    const errorId = require('crypto').randomUUID();
    
    // Log to JSON stdout (High-speed stream for Loki/Grafana)
    // We include full context: Request ID, Path, Method, User, and Stack Trace
    logger.error({
        error_id: errorId,
        msg: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        payload: req.body ? req.body : undefined,
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
