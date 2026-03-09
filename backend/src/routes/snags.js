const express = require('express');
const router = express.Router();
const {
    createSnag,
    getAllSnags,
    getSnagById,
    updateSnag,
    sendReportToContractor,
    updateSnagStatus,
    deleteSnag,
    getDashboardStats,
} = require('../controllers/snagController');
const { authMiddleware, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All snag routes require authentication
router.use(authMiddleware);

// Dashboard stats
router.get('/stats', getDashboardStats);

// CRUD
router.get('/', getAllSnags);
router.get('/:id', getSnagById);

// Only site engineers can create/update snags
router.post('/', requireRole('site_engineer'), upload.single('image'), createSnag);
router.put('/:id', requireRole('site_engineer'), updateSnag);
router.delete('/:id', requireRole('site_engineer'), deleteSnag);

// Send report to contractor (site engineer only)
router.post('/:id/send-report', requireRole('site_engineer'), sendReportToContractor);

// Update status (contractor only)
router.patch('/:id/status', requireRole('contractor'), updateSnagStatus);

module.exports = router;
