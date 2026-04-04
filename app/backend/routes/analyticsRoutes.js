const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.json({ message: 'Get global analytics stub' }));
router.get('/session/:sessionId', (req, res) => res.json({ message: 'Get session analytics stub' }));

module.exports = router;
