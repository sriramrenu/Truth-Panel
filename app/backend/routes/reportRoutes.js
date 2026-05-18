const express = require('express');
const router = express.Router();
const { verifyAuth, restrictTo } = require('../middleware/authMiddleware');

router.get('/download/:sessionId', verifyAuth, restrictTo('admin', 'manager'), (req, res) => res.json({ message: 'Download report stub' }));

module.exports = router;
