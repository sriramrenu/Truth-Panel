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
app.use('/api', appRoutes);
app.get('/', (req, res) => {
    res.json({ message: 'Truth Panel API Server is running!' });
});
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);
if (require.main === module || process.env.IS_DOCKER === 'true') {
    app.listen(PORT);
}
module.exports = app;
