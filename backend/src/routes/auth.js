const express = require('express');
const router = express.Router();
const { register, login, getProfile, getContractors, sendOTP, verifyOTP, updateProfile } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// Protected routes
router.get('/profile', authMiddleware, getProfile);
router.get('/contractors', authMiddleware, getContractors);
router.post('/update-profile', authMiddleware, updateProfile);

module.exports = router;
