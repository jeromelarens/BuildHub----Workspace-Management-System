const express = require('express');
const {
  createWebhookEndpoint,
  getWorkspaceWebhookEndpoints,
  getWebhookEndpointById,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  getEndpointDeliveries,
  testTriggerEvent,
} = require('../controllers/webhookController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireWorkspace } = require('../middleware/workspaceMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const { requireJsonContentType } = require('../middleware/validationMiddleware');

const router = express.Router();

// All webhook routes require authentication and workspace context
router.use(authenticateToken);
router.use(requireWorkspace);

router.post('/', requireJsonContentType, requirePermission('webhook:create'), createWebhookEndpoint);
router.get('/', requirePermission('webhook:view'), getWorkspaceWebhookEndpoints);
router.get('/:id', requirePermission('webhook:view'), getWebhookEndpointById);
router.put('/:id', requireJsonContentType, requirePermission('webhook:update'), updateWebhookEndpoint);
router.delete('/:id', requirePermission('webhook:delete'), deleteWebhookEndpoint);
router.get('/:id/deliveries', requirePermission('webhook:view'), getEndpointDeliveries);
router.post('/test-trigger', requireJsonContentType, requirePermission('webhook:create'), testTriggerEvent);

module.exports = router;
