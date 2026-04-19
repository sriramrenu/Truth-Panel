const express = require('express');
const router = express.Router();
const { getUserNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const { verifyAuth } = require('../middleware/authMiddleware');

router.get('/', verifyAuth, getUserNotifications);
router.patch('/read-all', verifyAuth, markAllAsRead);
router.patch('/:id/read', verifyAuth, markAsRead);

module.exports = router;
