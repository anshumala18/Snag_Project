// const express = require('express');
// const router = express.Router();
// const {
//     createSnag,
//     getAllSnags,
//     getSnagById,
//     updateSnag,
//     sendReportToContractor,
//     updateSnagStatus,
//     deleteSnag,
//     getDashboardStats,
// } = require('../controllers/snagController');
// const { authMiddleware, requireRole } = require('../middleware/auth');
// const upload = require('../middleware/upload');

// // All snag routes require authentication
// router.use(authMiddleware);

// // Dashboard stats
// router.get('/stats', getDashboardStats);

// // CRUD
// router.get('/', getAllSnags);
// router.get('/:id', getSnagById);

// // Only site engineers can create/update snags
// router.post('/', requireRole('site_engineer'), upload.single('image'), createSnag);
// router.put('/:id', requireRole('site_engineer'), updateSnag);
// router.delete('/:id', requireRole('site_engineer'), deleteSnag);

// // Send report to contractor (site engineer only)
// router.post('/:id/send-report', requireRole('site_engineer'), sendReportToContractor);

// // Update status (contractor only)
// router.patch('/:id/status', requireRole('contractor'), updateSnagStatus);

// module.exports = router;


const express = require('express');
const router = express.Router();

const snagController = require('../controllers/snagController');

console.log("DEBUG CONTROLLER:", snagController);
const { authMiddleware, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All snag routes require authentication
router.use(authMiddleware);

// Dashboard stats
router.get('/stats', snagController.getDashboardStats);

// Mail logs (new)
router.get('/mail-logs', snagController.getMailLogs);

// CRUD
router.get('/', snagController.getAllSnags);
router.get('/:id', snagController.getSnagById);

// Preview report
router.get('/:id/preview-report', snagController.getReportPreview);

// Create
router.post(
  '/',
  requireRole('site_engineer'),
  upload.single('image'),
  snagController.createSnag
);

// Update
router.put('/:id', requireRole('site_engineer'), snagController.updateSnag);
router.delete('/:id', requireRole('site_engineer'), snagController.deleteSnag);

// Send report
router.post(
  '/:id/send-report',
  requireRole('site_engineer'),
  snagController.sendReportToContractor
);

// Status update
router.patch(
  '/:id/status',
  requireRole('contractor'),
  snagController.updateSnagStatus
);

module.exports = router;