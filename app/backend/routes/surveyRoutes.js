const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.json({ message: 'Get all surveys stub' }));
router.post('/', (req, res) => res.json({ message: 'Create survey stub' }));

module.exports = router;
