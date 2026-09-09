const express = require('express');
const {
  createTask,
  getTasks,
  getTaskById,
  advancedTaskSearch,
  updateTask,
  deleteTask,
  getTrashTasks,
  restoreTask,
  permanentDeleteTask,
  bulkUpdateTasks,
  bulkDeleteTasks,
  addTaskDependency,
  getTaskDependenciesList,
  removeTaskDependency,
  setTaskRecurrence,
  getTaskRecurrence,
  deleteTaskRecurrence,
  getTaskActivityHistory,
} = require('../controllers/taskController');
const {
  createTaskComment,
  getTaskComments,
} = require('../controllers/commentController');
const {
  uploadTaskAttachment,
  getTaskAttachments,
} = require('../controllers/attachmentController');
const { handleSingleUpload } = require('../middleware/uploadMiddleware');
const authenticateToken = require('../middleware/authMiddleware');
const {
  requireJsonContentType,
  validateCreateTask,
  validateUpdateTask,
  validateTaskIdParam,
  validateGetTasksQuery,
  validateAdvancedSearch,
  validateBulkUpdate,
  validateBulkDelete,
} = require('../middleware/validationMiddleware');
const {
  validateCommentBody,
} = require('../validators/commentValidator');
const {
  validateDependencyId,
  validateAddDependencyBody,
} = require('../validators/dependencyValidator');
const {
  validateRecurrenceBody,
} = require('../validators/recurrenceValidator');
const {
  bulkLimiter,
} = require('../middleware/rateLimitMiddleware');

const router = express.Router();

// Middleware to validate comment payload
const validateTaskComment = (req, res, next) => {
  const validation = validateCommentBody(req.body);
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

// Middleware to validate dependency payload
const validateAddDependency = (req, res, next) => {
  const validation = validateAddDependencyBody(req.body);
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

const validateDependencyIdParam = (req, res, next) => {
  const validation = validateDependencyId(req.params.dependencyId);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.error || 'Invalid dependency ID',
      errors: { dependencyId: validation.error || 'Invalid dependency ID' },
    });
  }
  req.params.dependencyId = validation.parsedId;
  next();
};

// Middleware to validate recurrence payload
const validateRecurrence = (req, res, next) => {
  const validation = validateRecurrenceBody(req.body);
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

// Apply JWT authentication middleware to all task routes
router.use(authenticateToken);

// ==========================================================
// STATIC & SPECIALIZED TASK ROUTES (MUST PRECEDE /:id)
// ==========================================================

// GET /api/tasks/trash - List soft-deleted tasks
router.get('/trash', getTrashTasks);

// GET /api/tasks/search/advanced - Advanced multi-filter search
router.get('/search/advanced', validateAdvancedSearch, advancedTaskSearch);

// POST /api/tasks/bulk-update - Bulk update tasks (Transactional)
router.post('/bulk-update', bulkLimiter, requireJsonContentType, validateBulkUpdate, bulkUpdateTasks);

// POST /api/tasks/bulk-delete - Bulk delete tasks (Transactional)
router.post('/bulk-delete', bulkLimiter, requireJsonContentType, validateBulkDelete, bulkDeleteTasks);

// ==========================================================
// CORE TASK CRUD ROUTES
// ==========================================================

router.post('/', requireJsonContentType, validateCreateTask, createTask);
router.get('/', validateGetTasksQuery, getTasks);
router.get('/:id', validateTaskIdParam, getTaskById);
router.put('/:id', requireJsonContentType, validateTaskIdParam, validateUpdateTask, updateTask);
router.delete('/:id', validateTaskIdParam, deleteTask);

// ==========================================================
// SOFT DELETE & RESTORE ROUTES
// ==========================================================

// POST /api/tasks/:id/restore - Restore soft-deleted task
router.post('/:id/restore', validateTaskIdParam, restoreTask);

// DELETE /api/tasks/:id/permanent - Permanently delete task (Admin only)
router.delete('/:id/permanent', validateTaskIdParam, permanentDeleteTask);

// ==========================================================
// TASK ATTACHMENTS ROUTES
// ==========================================================

// POST /api/tasks/:id/attachments - Upload file attachment
router.post('/:id/attachments', validateTaskIdParam, handleSingleUpload('file'), uploadTaskAttachment);

// GET /api/tasks/:id/attachments - Get task attachments
router.get('/:id/attachments', validateTaskIdParam, getTaskAttachments);

// ==========================================================
// TASK COMMENTS ROUTES
// ==========================================================

router.post('/:id/comments', requireJsonContentType, validateTaskIdParam, validateTaskComment, createTaskComment);
router.get('/:id/comments', validateTaskIdParam, getTaskComments);

// ==========================================================
// TASK DEPENDENCIES ROUTES (Phase 3 Part 1)
// ==========================================================

router.post('/:id/dependencies', requireJsonContentType, validateTaskIdParam, validateAddDependency, addTaskDependency);
router.get('/:id/dependencies', validateTaskIdParam, getTaskDependenciesList);
router.delete('/:id/dependencies/:dependencyId', validateTaskIdParam, validateDependencyIdParam, removeTaskDependency);

// ==========================================================
// TASK RECURRENCE ROUTES (Phase 3 Part 1)
// ==========================================================

router.post('/:id/recurrence', requireJsonContentType, validateTaskIdParam, validateRecurrence, setTaskRecurrence);
router.get('/:id/recurrence', validateTaskIdParam, getTaskRecurrence);
router.put('/:id/recurrence', requireJsonContentType, validateTaskIdParam, validateRecurrence, setTaskRecurrence);
router.delete('/:id/recurrence', validateTaskIdParam, deleteTaskRecurrence);

// ==========================================================
// TASK ACTIVITY TIMELINE ROUTE (Phase 3 Part 1)
// ==========================================================

router.get('/:id/activity', validateTaskIdParam, getTaskActivityHistory);

module.exports = router;
