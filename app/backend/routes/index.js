const express = require('express');
const router = express.Router();

// Route modules
const authRoutes = require('./authRoutes');
const surveyRoutes = require('./surveyRoutes');
const responseRoutes = require('./responseRoutes');
const rewardRoutes = require('./rewardRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const reportRoutes = require('./reportRoutes');
const adminRoutes = require('./adminRoutes');

// API Endpoints
router.use('/auth', authRoutes);
router.use('/surveys', surveyRoutes);
router.use('/responses', responseRoutes);
router.use('/rewards', rewardRoutes);
router.use('/admin', adminRoutes);
// router.use('/analytics', analyticsRoutes);
// router.use('/reports', reportRoutes);

module.exports = router;
