const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.use(authorizeRole('admin'));

// GET /api/audit-logs (Admin only)
router.get('/', auditLogController.getAuditLogs);

module.exports = router;
