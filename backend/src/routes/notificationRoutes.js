const express = require('express');
const {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} = require('../controllers/notificationController');
const authenticateToken = require('../middleware/authMiddleware');
const {
  validateNotificationId,
  validateGetNotificationsQuery,
} = require('../validators/notificationValidator');

const router = express.Router();

const validateNotificationIdParam = (req, res, next) => {
  const validation = validateNotificationId(req.params.id);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.error || 'Invalid notification ID',
      errors: { id: validation.error || 'Invalid notification ID' },
    });
  }
  req.params.id = validation.parsedId;
  next();
};

const validateNotificationsQueryParams = (req, res, next) => {
  const validation = validateGetNotificationsQuery(req.query);
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

// Require authentication for all notification routes
router.use(authenticateToken);

router.get('/', validateNotificationsQueryParams, getNotifications);
router.get('/unread-count', getUnreadNotificationCount);
router.put('/read-all', markAllNotificationsAsRead);
router.put('/:id/read', validateNotificationIdParam, markNotificationAsRead);
router.delete('/:id', validateNotificationIdParam, deleteNotification);

module.exports = router;
