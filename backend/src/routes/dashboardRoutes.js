const express = require('express');
const {
  getAdminDashboard,
  getMyTasksDashboard,
} = require('../controllers/dashboardController');
const authenticateToken = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// Require authentication for all dashboard routes
router.use(authenticateToken);

// Admin dashboard: Admin only
router.get('/admin', authorizeRoles('admin'), getAdminDashboard);

// Personal dashboard: Any authenticated user
router.get('/my-tasks', getMyTasksDashboard);

module.exports = router;
