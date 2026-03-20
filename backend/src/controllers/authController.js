const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { sendOTPEmail, createTransporter } = require('../utils/emailService');

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// In-memory OTP store (for demo purposes)
const otpStore = new Map();

// ─── REGISTER ────────────────────────────────────────────────────────────────
const register = async (req, res) => {
    try {
        const { 
            name, 
            email, 
            password, 
            role, 
            companyName, 
            phone, 
            licenseNumber, 
            personalEmail, 
            companyEmail, 
            specialization, 
            consentTerms, 
            consentSurvey, 
            consentContact, 
            phoneVerified 
        } = req.body;

        // Use personal email as primary login identity
        const loginEmail = personalEmail || email;

        // Check if email already exists
        const existing = await pool.query('SELECT user_id FROM users WHERE email = $1', [loginEmail]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already registered.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Insert user with all details
        const result = await pool.query(
            `INSERT INTO users (
                name, email, password, role, company, phone, 
                license_number, personal_email, company_email, specialization,
                consent_terms, consent_survey, consent_contact, phone_verified,
                profile_completed
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *`,
            [
                name, 
                loginEmail, 
                hashedPassword, 
                role, 
                companyName || null, 
                phone || null,
                licenseNumber || null,
                personalEmail || null,
                companyEmail || null,
                specialization || null,
                consentTerms || false,
                consentSurvey || false,
                consentContact || false,
                phoneVerified || false,
                true // profile_completed
            ]
        );

        const user = result.rows[0];
        const token = generateToken(user.user_id);

        res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            data: { user, token },
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
};

// ─── OTP HANDLERS ────────────────────────────────────────────────────────────
const sendOTP = async (req, res) => {
    try {
        const { phone, email } = req.body;
        console.log(`[OTP] Generating for ${email} / ${phone}...`);
        
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store in-memory
        otpStore.set(phone, { otp, expires: Date.now() + 5 * 60 * 1000 });
        console.log(`[DEV ONLY] Universal OTP 123456 is active. Real OTP: ${otp}`);

        // Try to send email
        console.log(`[OTP] Attempting to send email to: ${email}`);
        
        // Securely log environment status (REDACTED)
        const userSet = !!process.env.EMAIL_USER;
        const passSet = !!process.env.EMAIL_PASSWORD;
        console.log(`[AUTH-DEBUG] Environment Check: EMAIL_USER=${userSet ? 'SET' : 'MISSING'}, EMAIL_PASS=${passSet ? 'SET' : 'MISSING'}`);

        // ─── Verify Connection ───
        const transporter = createTransporter();
        try {
            console.log(`[AUTH-DEBUG] Verifying SMTP connection...`);
            await transporter.verify();
            console.log(`[AUTH-DEBUG] SMTP connection verified successfully!`);
        } catch (vErr) {
            console.error(`[AUTH-DEBUG] SMTP Verification FAILED: ${vErr.message}`);
            // We'll still try to send, but we've logged the failure
        }

        const emailResult = await sendOTPEmail(email, otp);
        
        if (emailResult.success) {
            console.log(`[OTP] Email sent successfully to ${email}`);
            return res.json({ 
                success: true, 
                message: `OTP sent successfully to ${email}.` 
            });
        } else {
            console.error(`[OTP FAIL] Email to ${email} failed:`, emailResult.error);
            
            // Return 200 with success:false to avoid Red Console error and allow Toast to show clearly
            return res.status(400).json({ 
                success: false, 
                message: `OTP generated but email failed: ${emailResult.error || 'Connection timed out'}.`,
                dev_note: "If it works locally but not on Render, check if Gmail is blocking the data center IP.",
                error: emailResult.error
            });
        }
    } catch (error) {
        console.error(`[OTP ERROR] ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error generating OTP.' });
    }
};

const verifyOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        // Implementation of Universal Dev OTP for easier testing
        if (otp === '123456') {
            otpStore.delete(phone);
            return res.json({ success: true, message: 'Phone verified successfully (Dev OTP).' });
        }

        const record = otpStore.get(phone);
        if (!record || record.otp !== otp || record.expires < Date.now()) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        }

        otpStore.delete(phone);
        res.json({ success: true, message: 'Phone verified successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Verification failed.' });
    }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`[LOGIN] Attempt for: ${email} (pass_len: ${password?.length})`);

        // Trim email to avoid hidden space issues
        const cleanEmail = email?.trim();
        
        // Find user (Case-insensitive check)
        const result = await pool.query(
            'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true',
            [cleanEmail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const user = result.rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const token = generateToken(user.user_id);

        // Logic to determine if profile is COMPLETED (for old users)
        const isProfileComplete = 
            user.role === 'site_engineer' || (
                user.license_number && 
                user.company_email && 
                user.consent_terms && 
                user.phone_verified
            );

        res.json({
            success: true,
            message: 'Login successful.',
            data: {
                user: {
                    ...user,
                    password:  undefined, // Don't send password
                    profile_completed: !!isProfileComplete,
                },
                token,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
};

// ─── GET PROFILE ──────────────────────────────────────────────────────────────
const getProfile = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT user_id, name, email, role, company, phone, created_at, 
               license_number, personal_email, company_email, specialization,
               consent_terms, consent_survey, consent_contact, phone_verified, profile_completed
        FROM users WHERE user_id = $1`,
            [req.user.user_id]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── UPDATE PROFILE (For contractor forced completion or manual edit) ────────
const updateProfile = async (req, res) => {
    try {
        const { 
            name,
            license_number,
            company_email,
            specialization,
            consent_terms,
            consent_survey,
            consent_contact,
            phone_verified 
        } = req.body;

        const userId = req.user.user_id;

        // Ensure mandatory condition is met if trying to mark as completed
        const isComplete = name && license_number && company_email && consent_terms && phone_verified;

        const result = await pool.query(
            `UPDATE users 
             SET name = COALESCE($1, name),
                 company = COALESCE($1, company),
                 license_number = COALESCE($2, license_number),
                 company_email = COALESCE($3, company_email),
                 specialization = COALESCE($4, specialization),
                 consent_terms = COALESCE($5, consent_terms),
                 consent_survey = COALESCE($6, consent_survey),
                 consent_contact = COALESCE($7, consent_contact),
                 phone_verified = COALESCE($8, phone_verified),
                 profile_completed = $9,
                 updated_at = NOW()
             WHERE user_id = $10
             RETURNING *`,
            [
                name,
                license_number,
                company_email,
                specialization,
                consent_terms,
                consent_survey,
                consent_contact,
                phone_verified,
                !!isComplete,
                userId
            ]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully.',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Server error updating profile.' });
    }
};

// ─── GET ALL CONTRACTORS (for Site Engineers to pick a recipient) ─────────────
const getContractors = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT user_id, name, email, company, phone, specialization
       FROM users WHERE role = 'contractor' AND is_active = true ORDER BY name`
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get contractors error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { register, login, getProfile, getContractors, sendOTP, verifyOTP, updateProfile };
