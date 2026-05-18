const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyAuth } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validator');
const { loginSchema, sendOTPSchema, verifyOTPSchema, resetPasswordSchema } = require('../schemas');

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);
router.get('/profile', verifyAuth, authController.getProfile);
router.post('/send-otp', authLimiter, validate(sendOTPSchema), authController.sendOTP);
router.post('/verify-otp', authLimiter, validate(verifyOTPSchema), authController.verifyOTP);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);

module.exports = router;
