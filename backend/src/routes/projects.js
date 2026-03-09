const express = require('express');
const router = express.Router();
const { createProject, getAllProjects, getProjectById, updateProject } = require('../controllers/projectController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', getAllProjects);
router.get('/:id', getProjectById);
router.post('/', requireRole('site_engineer'), createProject);
router.put('/:id', requireRole('site_engineer'), updateProject);

module.exports = router;
