const express = require('express');
const router = express.Router();
const { allocatePoints, getUserWallet, redeemReward, transferPoints } = require('../controllers/rewardController');
const { verifyAuth, restrictTo } = require('../middleware/authMiddleware');

router.post('/allocate', verifyAuth, restrictTo('admin', 'manager'), allocatePoints);
router.get('/wallet', verifyAuth, getUserWallet);
router.post('/redeem', verifyAuth, redeemReward);
router.post('/transfer', verifyAuth, transferPoints);

module.exports = router;
