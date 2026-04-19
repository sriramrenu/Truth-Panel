require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('./workers/submissionWorker');

const app = express();
const PORT = process.env.PORT || 5000;
app.use(helmet());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
const appRoutes = require('./routes/index');

// 1. Health Checks (Place BEFORE any complex middleware or routes)
app.get('/api/ping', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

app.use('/api', appRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Truth Panel API Server is running!' });
});

const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

const { startMaintenance } = require('./services/notificationMaintenanceService');
startMaintenance(); // Run every 5 minutes by default

// Process Error Handlers to prevent silent crashes in production
process.on('uncaughtException', (err) => {
    console.error('FATAL ERROR: Uncaught Exception:', err);
    // In a real production app, you might want to gracefully shutdown here
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('FATAL ERROR: Unhandled Rejection at:', promise, 'reason:', reason);
});

if (require.main === module || process.env.IS_DOCKER === 'true') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Backend Server is running on port ${PORT}`);
        console.log(`🔗 Health check available at: http://localhost:${PORT}/api/ping`);
    });
}
module.exports = app;
