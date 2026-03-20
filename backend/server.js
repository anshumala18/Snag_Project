require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const { connectDB } = require('./src/config/db');
const { initSocket } = require('./src/config/socket');

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes = require('./src/routes/auth');
const snagRoutes = require('./src/routes/snags');
const projectRoutes = require('./src/routes/projects');

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Initialize Socket.IO ─────────────────────────────────────────────────────
initSocket(server);

// ─── Middleware ───────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
    'https://snag-project.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.CLIENT_URL
].filter(Boolean);

console.log('✅ Allowed Origins:', ALLOWED_ORIGINS);

// ─── Static Files for AI Outputs ─────────────────────────────────────────────
app.use(
  '/outputs',
  express.static(path.join(__dirname, 'snag-detection-system'))
);

// 1. Standard CORS Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        if (ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`⚠️ CORS blocked for origin: ${origin}`);
            callback(null, false); // Don't throw error, just don't allow
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. Extra Safety: Manual Header Fallback for ALL responses
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// ─── Serve Uploaded Images Statically ────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Health Check Route ───────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🏗️ Snag Detection API is running!',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/auth',
            snags: '/api/snags',
            projects: '/api/projects',
        },
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/snags', snagRoutes);
app.use('/api/projects', projectRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found.`,
    });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('❌ Global Error:', err);

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large. Max 10MB allowed.' });
    }
    if (err.message && err.message.includes('Only image')) {
        return res.status(400).json({ success: false, message: err.message });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error.',
    });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB(); // connect to DB & create tables

    server.listen(PORT, () => {
        console.log('\n========================================');
        console.log(`🚀 Snag Detection Server running!`);
        console.log(`📡 Port     : http://localhost:${PORT}`);
        console.log(`🌍 Env      : ${process.env.NODE_ENV || 'development'}`);
        console.log(`📂 Uploads  : /uploads`);
        console.log(`🔌 Socket   : enabled`);
        console.log('========================================\n');
    });
};

startServer();

module.exports = app;
