const express = require('express');
const router = express.Router();
const { getEmployees, createEmployee } = require('../controllers/adminController');
const { verifyAuth } = require('../middleware/authMiddleware');
const validate = require('../middleware/validator');
const { registerSchema } = require('../schemas');
const { authLimiter } = require('../middleware/rateLimiter');

// Protect admin routes with specialized authentication rate limiting and strict schema validation
router.get('/employees', verifyAuth, getEmployees);
router.post('/employee', verifyAuth, authLimiter, validate({ body: registerSchema }), createEmployee);

module.exports = router;
