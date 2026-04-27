const DbService = require('../config/dbConfig');

/**
 * Enterprise Audit Logger
 * Records business-critical actions to the public."Audit_Logs" table.
 * Designed for TATA compliance and security forensics.
 */
const auditLog = async (req, { action, table, recordId, oldData = null, newData = null }) => {
    try {
        await DbService.query(`
            INSERT INTO public."Audit_Logs" (
                user_id, action, table_name, record_id, 
                old_data, new_data, ip_address, user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            req.user?.id || null,
            action,
            table,
            recordId,
            oldData ? JSON.stringify(oldData) : null,
            newData ? JSON.stringify(newData) : null,
            req.ip || req.headers['x-forwarded-for'] || null,
            req.headers['user-agent'] || null
        ]);
    } catch (err) {
        // We log audit failures to the system log (Pino) but don't crash the request
        const logger = require('./logger');
        logger.error({ 
            msg: 'AUDIT LOG FAILURE', 
            error: err.message,
            attemptedAction: action,
            table: table
        });
    }
};

module.exports = auditLog;
