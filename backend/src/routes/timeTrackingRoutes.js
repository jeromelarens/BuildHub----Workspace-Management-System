const express = require('express');
const {
  startTimer,
  stopTimer,
  createManualEntry,
  getActiveTimer,
  listTimeEntries,
  updateTimeEntry,
  deleteTimeEntry,
  getTimesheetAnalytics,
} = require('../controllers/timeTrackingController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireWorkspace } = require('../middleware/workspaceMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const { requireJsonContentType } = require('../middleware/validationMiddleware');
const { validateStartTimerBody, validateManualTimeEntryBody } = require('../validators/timeTrackingValidator');

const router = express.Router();

// All time tracking routes require authentication and workspace context
router.use(authenticateToken);
router.use(requireWorkspace);

// Timer & Entries
router.post('/start', requireJsonContentType, requirePermission('time:track'), (req, res, next) => {
  const validation = validateStartTimerBody(req.body);
  req.body = validation.normalizedData;
  next();
}, startTimer);

router.post('/stop', requirePermission('time:track'), stopTimer);
router.post('/:id/stop', requirePermission('time:track'), stopTimer);

router.post('/', requireJsonContentType, requirePermission('time:track'), (req, res, next) => {
  const validation = validateManualTimeEntryBody(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: validation.errors });
  }
  req.body = validation.normalizedData;
  next();
}, createManualEntry);

router.get('/active', requirePermission('time:track'), getActiveTimer);
router.get('/analytics', requirePermission('time:view_own'), getTimesheetAnalytics);
router.get('/', requirePermission('time:view_own'), listTimeEntries);
router.put('/:id', requireJsonContentType, requirePermission('time:track'), updateTimeEntry);
router.delete('/:id', requirePermission('time:track'), deleteTimeEntry);

module.exports = router;
