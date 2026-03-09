const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// ─── REGISTER ────────────────────────────────────────────────────────────────
const register = async (req, res) => {
    try {
        const { name, email, password, role, company, phone } = req.body;

        // Check if email already exists
        const existing = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already registered.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Insert user
        const result = await pool.query(
            `INSERT INTO users (name, email, password, role, company, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, name, email, role, company, phone, created_at`,
            [name, email, hashedPassword, role, company || null, phone || null]
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

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
            [email]
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

        res.json({
            success: true,
            message: 'Login successful.',
            data: {
                user: {
                    user_id: user.user_id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    company: user.company,
                    phone: user.phone,
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
            'SELECT user_id, name, email, role, company, phone, created_at FROM users WHERE user_id = $1',
            [req.user.user_id]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── GET ALL CONTRACTORS (for Site Engineers to pick a recipient) ─────────────
const getContractors = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT user_id, name, email, company, phone
       FROM users WHERE role = 'contractor' AND is_active = true ORDER BY name`
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get contractors error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { register, login, getProfile, getContractors };
