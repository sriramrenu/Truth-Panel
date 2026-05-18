const express = require('express');
const router = express.Router();
const { verifyAuth, restrictTo } = require('../middleware/authMiddleware');

router.get('/', verifyAuth, restrictTo('admin', 'manager'), (req, res) => res.json({ message: 'Get global analytics stub' }));
router.get('/session/:sessionId', verifyAuth, restrictTo('admin', 'manager'), (req, res) => res.json({ message: 'Get session analytics stub' }));

module.exports = router;
