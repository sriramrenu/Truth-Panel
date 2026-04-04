const express = require('express');
const router = express.Router();
const { allocatePoints, getUserWallet } = require('../controllers/rewardController');
const { verifyAuth } = require('../middleware/authMiddleware');

router.post('/allocate', verifyAuth, allocatePoints);
router.get('/wallet', verifyAuth, getUserWallet);

module.exports = router;
