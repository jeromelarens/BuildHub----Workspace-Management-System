const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// GET /api/analytics/overview
router.get('/overview', analyticsController.getOverview);

// GET /api/analytics/team-velocity
router.get('/team-velocity', analyticsController.getTeamVelocity);

// GET /api/analytics/burndown/:projectId
router.get('/burndown/:projectId', analyticsController.getBurndown);

module.exports = router;
