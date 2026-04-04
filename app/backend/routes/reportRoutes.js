const express = require('express');
const router = express.Router();

router.get('/download/:sessionId', (req, res) => res.json({ message: 'Download report stub' }));

module.exports = router;
