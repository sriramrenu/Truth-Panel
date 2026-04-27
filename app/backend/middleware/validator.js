const logger = require('../utils/logger');

/**
 * Zod Validation Middleware
 * Ensures all incoming data matches the required schema.
 * Prevents malformed data from reaching controllers.
 */
const validate = (schema) => (req, res, next) => {
    try {
        // Validate Body, Query, and Params if defined in schema
        if (schema.body) req.body = schema.body.parse(req.body);
        if (schema.query) req.query = schema.query.parse(req.query);
        if (schema.params) req.params = schema.params.parse(req.params);
        
        next();
    } catch (error) {
        logger.warn({
            msg: 'Validation Failed',
            path: req.path,
            errors: error.errors
        });

        return res.status(400).json({
            success: false,
            message: 'Invalid request data',
            errors: error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message
            }))
        });
    }
};

module.exports = validate;
