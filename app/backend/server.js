require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./utils/logger');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
require('./workers/submissionWorker');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. TATA PRODUCTION HARDENING
// =============================================================================
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());
app.use(express.json());

// Replace standard console logging with high-speed Pino JSON stream
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: (message) => logger.info(message.trim()) }
}));

app.use(globalLimiter);

// 2. ROUTES & HEALTH CHECKS
// =============================================================================
const appRoutes = require('./routes/index');

app.get('/api/ping', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health', async (req, res) => {
    const DbService = require('./config/dbConfig');
    const redisClient = require('./config/redisClient');
    let dbStatus = 'ok';
    let redisStatus = 'ok';
    try { await DbService.query('SELECT 1'); } catch (e) { dbStatus = 'error'; }
    try { await redisClient.ping(); } catch (e) { redisStatus = 'error'; }
    const isHealthy = dbStatus === 'ok' && redisStatus === 'ok';
    res.status(isHealthy ? 200 : 503).json({ 
        status: isHealthy ? 'healthy' : 'unhealthy',
        database: dbStatus,
        redis: redisStatus,
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

app.use('/api', appRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Truth Panel TATA Production API is running!' });
});

// 3. INTERNAL OBSERVABILITY (Sovereign Error Tracking)
// =============================================================================
app.use(errorHandler);

const { startMaintenance } = require('./services/notificationMaintenanceService');
startMaintenance(); 

process.on('uncaughtException', (err) => {
    logger.fatal({ msg: 'UNCAUGHT EXCEPTION', stack: err.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error({ msg: 'UNHANDLED REJECTION', reason, promise });
});

if (require.main === module || process.env.IS_DOCKER === 'true') {
    app.listen(PORT, '0.0.0.0', () => {
        logger.info(`🚀 TATA Production Server running on port ${PORT}`);
    });
}

module.exports = app;
