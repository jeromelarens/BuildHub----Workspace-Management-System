const express = require('express');
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  getProjectMembers,
  removeProjectMember,
} = require('../controllers/projectController');
const authenticateToken = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { requireJsonContentType } = require('../middleware/validationMiddleware');
const {
  validateProjectId,
  validateCreateProjectBody,
  validateUpdateProjectBody,
  validateAddMemberBody,
  validateGetProjectsQuery,
} = require('../validators/projectValidator');
const { validateUserId } = require('../validators/userValidator');

const router = express.Router();

// Param validation middleware
const validateProjectIdParam = (req, res, next) => {
  const validation = validateProjectId(req.params.id);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.error || 'Invalid project ID. ID must be a positive integer',
      errors: { id: validation.error || 'Invalid project ID' },
    });
  }
  req.params.id = validation.parsedId;
  next();
};

const validateMemberUserIdParam = (req, res, next) => {
  const validation = validateUserId(req.params.userId);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.error || 'Invalid user ID. ID must be a positive integer',
      errors: { userId: validation.error || 'Invalid user ID' },
    });
  }
  req.params.userId = validation.parsedId;
  next();
};

// Body validation middleware
const validateCreateProject = (req, res, next) => {
  const validation = validateCreateProjectBody(req.body);
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

const validateUpdateProject = (req, res, next) => {
  const validation = validateUpdateProjectBody(req.body);
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

const validateAddMember = (req, res, next) => {
  const validation = validateAddMemberBody(req.body);
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

// Query validation middleware
const validateGetProjectsQueryParams = (req, res, next) => {
  const validation = validateGetProjectsQuery(req.query);
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

// All project routes require authentication
router.use(authenticateToken);

// Project Endpoints
router.post('/', authorizeRoles('admin', 'manager'), requireJsonContentType, validateCreateProject, createProject);
router.get('/', validateGetProjectsQueryParams, getProjects);
router.get('/:id', validateProjectIdParam, getProjectById);
router.put('/:id', requireJsonContentType, validateProjectIdParam, validateUpdateProject, updateProject);
router.delete('/:id', validateProjectIdParam, deleteProject);

// Project Member Endpoints
router.post('/:id/members', requireJsonContentType, validateProjectIdParam, validateAddMember, addProjectMember);
router.get('/:id/members', validateProjectIdParam, getProjectMembers);
router.delete('/:id/members/:userId', validateProjectIdParam, validateMemberUserIdParam, removeProjectMember);

module.exports = router;
