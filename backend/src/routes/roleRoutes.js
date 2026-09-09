const express = require('express');
const {
  getRoles,
  createRole,
  addPermissionToRole,
  removePermissionFromRole,
  deleteRole,
} = require('../controllers/roleController');
const authenticateToken = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { requireJsonContentType } = require('../middleware/validationMiddleware');
const {
  validateRoleId,
  validatePermissionId,
  validateCreateRoleBody,
  validateAddPermissionToRoleBody,
} = require('../validators/roleValidator');

const router = express.Router();

const validateRoleIdParam = (req, res, next) => {
  const validation = validateRoleId(req.params.id);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.error || 'Invalid role ID',
      errors: { id: validation.error || 'Invalid role ID' },
    });
  }
  req.params.id = validation.parsedId;
  next();
};

const validatePermissionIdParam = (req, res, next) => {
  const validation = validatePermissionId(req.params.permissionId);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.error || 'Invalid permission ID',
      errors: { permissionId: validation.error || 'Invalid permission ID' },
    });
  }
  req.params.permissionId = validation.parsedId;
  next();
};

const validateCreateRole = (req, res, next) => {
  const validation = validateCreateRoleBody(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }
  req.body = validation.normalizedData;
  next();
};

const validateAddPermission = (req, res, next) => {
  const validation = validateAddPermissionToRoleBody(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }
  req.body = validation.normalizedData;
  next();
};

// All role routes require authentication
router.use(authenticateToken);

// View roles: Authenticated users (Admin, Manager, Team Lead)
router.get('/', getRoles);

// Admin-only management endpoints
router.post('/', authorizeRoles('admin'), requireJsonContentType, validateCreateRole, createRole);
router.post('/:id/permissions', authorizeRoles('admin'), requireJsonContentType, validateRoleIdParam, validateAddPermission, addPermissionToRole);
router.delete('/:id/permissions/:permissionId', authorizeRoles('admin'), validateRoleIdParam, validatePermissionIdParam, removePermissionFromRole);
router.delete('/:id', authorizeRoles('admin'), validateRoleIdParam, deleteRole);

module.exports = router;
