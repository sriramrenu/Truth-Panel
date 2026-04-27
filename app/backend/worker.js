/**
 * Standalone Worker Entrypoint
 * This script runs the BullMQ worker as a separate process for 
 * TATA Production scalability.
 */
require('dotenv').config();
const logger = require('./utils/logger');
const worker = require('./workers/submissionWorker');

logger.info('⚙️ Truth Panel Background Worker Started');

// Handle Shutdown
const shutdown = async () => {
    logger.info('Shutting down worker...');
    await worker.close();
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
