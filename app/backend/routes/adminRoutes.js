const express = require('express');
const router = express.Router();
const { getEmployees, createEmployee } = require('../controllers/adminController');
const { verifyAuth } = require('../middleware/authMiddleware');

router.get('/employees', verifyAuth, getEmployees);
router.post('/employee', verifyAuth, createEmployee);

module.exports = router;
