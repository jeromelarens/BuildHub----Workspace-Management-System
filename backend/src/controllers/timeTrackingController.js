const timeTrackingService = require('../services/timeTrackingService');
const { logAuditEvent } = require('../services/auditService');

/**
 * Start punch-clock timer
 * POST /api/time-entries/start
 */
const startTimer = async (req, res) => {
  try {
    const { taskId, projectId, description, isBillable } = req.body;
    const workspaceId = req.workspace.id;
    const userId = req.user.id;

    const entry = await timeTrackingService.startTimer({
      workspaceId,
      userId,
      taskId,
      projectId,
      description,
      isBillable,
    });

    await logAuditEvent({
      userId,
      action: 'TIMER_STARTED',
      entityType: 'time_entry',
      entityId: entry.id,
      req,
      details: { workspaceId, taskId, projectId },
    });

    return res.status(201).json({
      success: true,
      message: 'Timer started successfully',
      data: entry,
    });
  } catch (error) {
    console.error('Error in startTimer:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Stop active timer
 * POST /api/time-entries/stop or POST /api/time-entries/:id/stop
 */
const stopTimer = async (req, res) => {
  try {
    const timerId = req.params.id ? parseInt(req.params.id, 10) : (req.body && req.body.timerId ? parseInt(req.body.timerId, 10) : null);
    const workspaceId = req.workspace.id;
    const userId = req.user.id;
    const description = req.body && req.body.description ? req.body.description : null;

    const entry = await timeTrackingService.stopTimer({
      workspaceId,
      userId,
      timerId,
      description,
    });

    await logAuditEvent({
      userId,
      action: 'TIMER_STOPPED',
      entityType: 'time_entry',
      entityId: entry.id,
      req,
      details: { workspaceId, duration_seconds: entry.duration_seconds },
    });

    return res.status(200).json({
      success: true,
      message: 'Timer stopped successfully',
      data: entry,
    });
  } catch (error) {
    console.error('Error in stopTimer:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Create manual time entry
 * POST /api/time-entries
 */
const createManualEntry = async (req, res) => {
  try {
    const { taskId, projectId, startedAt, endedAt, durationSeconds, description, isBillable } = req.body;
    const workspaceId = req.workspace.id;
    const userId = req.user.id;

    const entry = await timeTrackingService.createManualTimeEntry({
      workspaceId,
      userId,
      taskId,
      projectId,
      startedAt,
      endedAt,
      durationSeconds,
      description,
      isBillable,
    });

    await logAuditEvent({
      userId,
      action: 'TIME_ENTRY_CREATED',
      entityType: 'time_entry',
      entityId: entry.id,
      req,
      details: { workspaceId, taskId, duration_seconds: entry.duration_seconds },
    });

    return res.status(201).json({
      success: true,
      message: 'Time entry logged successfully',
      data: entry,
    });
  } catch (error) {
    console.error('Error in createManualEntry:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get active running timer for current user
 * GET /api/time-entries/active
 */
const getActiveTimer = async (req, res) => {
  try {
    const workspaceId = req.workspace.id;
    const userId = req.user.id;

    const activeTimer = await timeTrackingService.getActiveTimer(workspaceId, userId);

    return res.status(200).json({
      success: true,
      data: activeTimer,
    });
  } catch (error) {
    console.error('Error in getActiveTimer:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * List time entries
 * GET /api/time-entries
 */
const listTimeEntries = async (req, res) => {
  try {
    const workspaceId = req.workspace.id;
    const { user_id, task_id, project_id, start_date, end_date, limit, offset } = req.query;

    // Permissions: non-managers can only view their own entries unless time:view_all permission
    let targetUserId = user_id ? parseInt(user_id, 10) : null;
    if (['employee'].includes(req.user.role) && !targetUserId) {
      targetUserId = req.user.id;
    }

    const entries = await timeTrackingService.listTimeEntries(workspaceId, {
      userId: targetUserId,
      taskId: task_id ? parseInt(task_id, 10) : null,
      projectId: project_id ? parseInt(project_id, 10) : null,
      startDate: start_date,
      endDate: end_date,
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
    });

    return res.status(200).json({
      success: true,
      data: entries,
    });
  } catch (error) {
    console.error('Error in listTimeEntries:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Update time entry
 * PUT /api/time-entries/:id
 */
const updateTimeEntry = async (req, res) => {
  try {
    const entryId = parseInt(req.params.id, 10);
    const workspaceId = req.workspace.id;

    const updated = await timeTrackingService.updateTimeEntry(
      entryId,
      workspaceId,
      req.user.id,
      req.user.role,
      req.body
    );

    await logAuditEvent({
      userId: req.user.id,
      action: 'TIME_ENTRY_UPDATED',
      entityType: 'time_entry',
      entityId: entryId,
      req,
      details: { updates: req.body },
    });

    return res.status(200).json({
      success: true,
      message: 'Time entry updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error in updateTimeEntry:', error.message);
    const status = error.message.includes('permission') ? 403 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
};

/**
 * Delete time entry
 * DELETE /api/time-entries/:id
 */
const deleteTimeEntry = async (req, res) => {
  try {
    const entryId = parseInt(req.params.id, 10);
    const workspaceId = req.workspace.id;

    const result = await timeTrackingService.deleteTimeEntry(
      entryId,
      workspaceId,
      req.user.id,
      req.user.role
    );

    await logAuditEvent({
      userId: req.user.id,
      action: 'TIME_ENTRY_DELETED',
      entityType: 'time_entry',
      entityId: entryId,
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Time entry deleted successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error in deleteTimeEntry:', error.message);
    const status = error.message.includes('permission') ? 403 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
};

/**
 * Get timesheet analytics
 * GET /api/time-entries/analytics
 */
const getTimesheetAnalytics = async (req, res) => {
  try {
    const workspaceId = req.workspace.id;
    const { user_id, project_id, start_date, end_date } = req.query;

    let targetUserId = user_id ? parseInt(user_id, 10) : null;
    if (['employee'].includes(req.user.role) && !targetUserId) {
      targetUserId = req.user.id;
    }

    const analytics = await timeTrackingService.getTimesheetAnalytics(workspaceId, {
      userId: targetUserId,
      projectId: project_id ? parseInt(project_id, 10) : null,
      startDate: start_date,
      endDate: end_date,
    });

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error in getTimesheetAnalytics:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  startTimer,
  stopTimer,
  createManualEntry,
  getActiveTimer,
  listTimeEntries,
  updateTimeEntry,
  deleteTimeEntry,
  getTimesheetAnalytics,
};
