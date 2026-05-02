require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./utils/logger');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.API_PORT;

// 1. TATA PRODUCTION HARDENING
// =============================================================================
app.set('trust proxy', 1);

// 1.1 Secure Headers (TATA Compliance)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", ...(process.env.CSP_CONNECT_SRC ? process.env.CSP_CONNECT_SRC.split(' ') : [])]
        }
    }
}));

// 1.2 Multi-Origin Production CORS
const whitelist = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Access blocked by Truth Panel Security Policy (CORS)'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-fingerprint'],
    credentials: true,
    maxAge: 86400 // Cache preflight requests for 24h
};
app.use(cors(corsOptions));

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

// 4. LIFECYCLE MANAGEMENT (Graceful Shutdown)
// =============================================================================
const gracefulShutdown = async (signal) => {
    logger.info(`${signal} signal received. Starting graceful shutdown...`);
    
    // 1. Stop accepting new requests
    const server = app.listen(PORT); // Reference to the server
    server.close(async () => {
        logger.info('HTTP server closed.');
        
        try {
            // 2. Close Database and Cache connections
            const DbService = require('./config/dbConfig');
            const redisClient = require('./config/redisClient');
            
            await DbService.shutdown();
            logger.info('Database pool closed.');
            
            await redisClient.quit();
            logger.info('Redis connection closed.');
            
            process.exit(0);
        } catch (err) {
            logger.error({ msg: 'Error during shutdown', error: err.message });
            process.exit(1);
        }
    });

    // Force shutdown after 10s if graceful fails
    setTimeout(() => {
        logger.fatal('Could not close connections in time, forceful shutdown.');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module || process.env.IS_DOCKER === 'true') {
    const server = app.listen(PORT, '0.0.0.0', () => {
        logger.info(`🚀 TATA Production Server running on port ${PORT}`);
    });
    
    // Override the gracefulShutdown closure with the actual server instance
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
    
    const handleSignal = (signal) => {
        logger.info(`${signal} received. Closing server...`);
        server.close(async () => {
            const DbService = require('./config/dbConfig');
            const redisClient = require('./config/redisClient');
            await DbService.shutdown();
            await redisClient.quit();
            process.exit(0);
        });
    };

    process.on('SIGTERM', () => handleSignal('SIGTERM'));
    process.on('SIGINT', () => handleSignal('SIGINT'));
}

module.exports = app;
