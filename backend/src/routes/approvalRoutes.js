const express = require('express');
const {
  createWorkflow,
  getWorkflows,
  submitRequest,
  listRequests,
  getRequestById,
  performAction,
} = require('../controllers/approvalController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireWorkspace } = require('../middleware/workspaceMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const { requireJsonContentType } = require('../middleware/validationMiddleware');

const router = express.Router();

// All approval routes require authentication and workspace context
router.use(authenticateToken);
router.use(requireWorkspace);

// Workflows
router.post('/workflows', requireJsonContentType, requirePermission('approval:create'), createWorkflow);
router.get('/workflows', requirePermission('approval:view'), getWorkflows);

// Requests
router.post('/requests', requireJsonContentType, requirePermission('approval:create'), submitRequest);
router.get('/requests', requirePermission('approval:view'), listRequests);
router.get('/requests/:id', requirePermission('approval:view'), getRequestById);
router.post('/requests/:id/actions', requireJsonContentType, requirePermission('approval:action'), performAction);

module.exports = router;
