const express = require('express');
const {
  createFieldDefinition,
  getFieldDefinitions,
  updateFieldDefinition,
  deleteFieldDefinition,
  setEntityFieldValues,
  getEntityFieldValues,
} = require('../controllers/customFieldController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireWorkspace } = require('../middleware/workspaceMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const { requireJsonContentType } = require('../middleware/validationMiddleware');

const router = express.Router();

// All custom field routes require authentication and workspace context
router.use(authenticateToken);
router.use(requireWorkspace);

// Definition Management
router.post('/definitions', requireJsonContentType, requirePermission('custom_field:create'), createFieldDefinition);
router.get('/definitions', requirePermission('custom_field:view'), getFieldDefinitions);
router.put('/definitions/:id', requireJsonContentType, requirePermission('custom_field:update'), updateFieldDefinition);
router.delete('/definitions/:id', requirePermission('custom_field:delete'), deleteFieldDefinition);

// Entity Values
router.post('/values/:entityType/:entityId', requireJsonContentType, requirePermission('custom_field:update'), setEntityFieldValues);
router.get('/values/:entityType/:entityId', requirePermission('custom_field:view'), getEntityFieldValues);

module.exports = router;
