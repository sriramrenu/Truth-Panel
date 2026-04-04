const express = require('express');
const router = express.Router();

router.post('/allocate', (req, res) => res.json({ message: 'Allocate points stub' }));
router.get('/wallet', (req, res) => res.json({ message: 'Get wallet info stub' }));

module.exports = router;
