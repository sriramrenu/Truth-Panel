const express = require('express');
const router = express.Router();
const { allocatePoints, getUserWallet, redeemReward, transferPoints } = require('../controllers/rewardController');
const { verifyAuth } = require('../middleware/authMiddleware');

router.post('/allocate', verifyAuth, allocatePoints);
router.get('/wallet', verifyAuth, getUserWallet);
router.post('/redeem', verifyAuth, redeemReward);
router.post('/transfer', verifyAuth, transferPoints);

module.exports = router;
