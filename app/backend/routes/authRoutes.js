const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => res.json({ message: 'Auth Login Stub' }));
router.get('/profile', (req, res) => res.json({ message: 'Auth Profile Stub' }));

module.exports = router;
