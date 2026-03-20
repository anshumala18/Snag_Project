const express = require('express');
const router = express.Router();
const { register, login, getProfile, getContractors, sendOTP, verifyOTP, updateProfile } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.get('/test-email', (req, res) => {
    const { sendOTPEmail } = require('../utils/emailService');
    const testEmail = process.env.EMAIL_USER;
    sendOTPEmail(testEmail, '123456')
        .then(result => res.json({ success: true, message: `Test email sent to ${testEmail}`, result }))
        .catch(error => res.status(500).json({ success: false, message: 'Test email failed', error: error.message }));
});

// Protected routes
router.get('/profile', authMiddleware, getProfile);
router.get('/contractors', authMiddleware, getContractors);
router.post('/update-profile', authMiddleware, updateProfile);

module.exports = router;
