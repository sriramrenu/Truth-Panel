require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

// Security and Logging
app.use(helmet());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// Main route index
const appRoutes = require('./routes/index');
app.use('/api', appRoutes);

// Health Check
app.get('/', (req, res) => {
    res.json({ message: 'Truth Panel API Server is running!' });
});

// Global error handler
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
