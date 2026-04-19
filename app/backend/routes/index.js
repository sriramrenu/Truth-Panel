const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const surveyRoutes = require('./surveyRoutes');
const responseRoutes = require('./responseRoutes');
const rewardRoutes = require('./rewardRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const reportRoutes = require('./reportRoutes');
const adminRoutes = require('./adminRoutes');
const notificationRoutes = require('./notificationRoutes');
router.use('/auth', authRoutes);
router.use('/surveys', surveyRoutes);
router.use('/responses', responseRoutes);
router.use('/rewards', rewardRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
