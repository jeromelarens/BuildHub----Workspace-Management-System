const express = require('express');
const {
  getUsers,
  getUserById,
  updateUserRole,
} = require('../controllers/userController');
const authenticateToken = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { requireJsonContentType } = require('../middleware/validationMiddleware');
const {
  validateUserId,
  validateUpdateUserRoleBody,
  validateGetUsersQuery,
} = require('../validators/userValidator');

const router = express.Router();

// Middleware to validate user ID param
const validateUserIdParam = (req, res, next) => {
  const validation = validateUserId(req.params.id);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.error || 'Invalid user ID. ID must be a positive integer',
      errors: { id: validation.error || 'Invalid user ID' },
    });
  }
  req.params.id = validation.parsedId;
  next();
};

// Middleware to validate role update body
const validateUpdateRole = (req, res, next) => {
  const validation = validateUpdateUserRoleBody(req.body);
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

// Middleware to validate query parameters
const validateGetUsersQueryParams = (req, res, next) => {
  const validation = validateGetUsersQuery(req.query);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }
  req.validatedQuery = validation.normalizedQuery;
  next();
};

// All user routes require authentication and Admin role
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

router.get('/', validateGetUsersQueryParams, getUsers);
router.get('/:id', validateUserIdParam, getUserById);
router.put('/:id/role', requireJsonContentType, validateUserIdParam, validateUpdateRole, updateUserRole);

module.exports = router;
