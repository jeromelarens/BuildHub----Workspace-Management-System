const db = require('../config/database');

/**
 * Start punch-clock timer for current user
 */
const startTimer = async ({ workspaceId, userId, taskId = null, projectId = null, description = null, isBillable = true }) => {
  // 1. Check if user already has a running timer in this workspace
  const activeRes = await db.query(`
    SELECT id, started_at, task_id, project_id
    FROM time_entries
    WHERE workspace_id = $1 AND user_id = $2 AND status = 'running';
  `, [workspaceId, userId]);

  if (activeRes.rows.length > 0) {
    throw new Error('You already have an active timer running. Please stop your current timer before starting a new one.');
  }

  // 2. Validate task belongs to workspace if provided
  if (taskId) {
    const taskRes = await db.query('SELECT id, workspace_id, project_id FROM tasks WHERE id = $1;', [taskId]);
    if (taskRes.rows.length === 0 || (taskRes.rows[0].workspace_id && taskRes.rows[0].workspace_id !== workspaceId)) {
      throw new Error('Task not found in this workspace');
    }
    if (!projectId && taskRes.rows[0].project_id) {
      projectId = taskRes.rows[0].project_id;
    }
  }

  // 3. Start timer
  const result = await db.query(`
    INSERT INTO time_entries (
      workspace_id, user_id, task_id, project_id,
      started_at, status, description, is_billable
    )
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'running', $5, $6)
    RETURNING *;
  `, [workspaceId, userId, taskId, projectId, description || null, Boolean(isBillable)]);

  return result.rows[0];
};

/**
 * Stop active punch-clock timer and calculate authoritative server duration
 */
const stopTimer = async ({ workspaceId, userId, timerId = null, description = null }) => {
  let query = `
    SELECT * FROM time_entries
    WHERE workspace_id = $1 AND user_id = $2 AND status = 'running'
  `;
  const params = [workspaceId, userId];

  if (timerId) {
    params.push(timerId);
    query += ` AND id = $${params.length}`;
  }

  query += ' ORDER BY started_at DESC LIMIT 1;';

  const entryRes = await db.query(query, params);
  if (entryRes.rows.length === 0) {
    throw new Error('No active running timer found to stop');
  }

  const entry = entryRes.rows[0];
  const now = new Date();
  const startTime = new Date(entry.started_at);
  const durationSeconds = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));

  const result = await db.query(`
    UPDATE time_entries
    SET ended_at = CURRENT_TIMESTAMP,
        duration_seconds = $1,
        status = 'completed',
        description = COALESCE($2, description),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *;
  `, [durationSeconds, description || null, entry.id]);

  return result.rows[0];
};

/**
 * Log manual time entry with strict server duration validation
 */
const createManualTimeEntry = async ({ workspaceId, userId, taskId = null, projectId = null, startedAt, endedAt, durationSeconds = null, description = null, isBillable = true }) => {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : null;

  if (isNaN(start.getTime())) {
    throw new Error('Invalid startedAt timestamp');
  }

  let calculatedDuration = durationSeconds;
  if (end) {
    if (isNaN(end.getTime())) {
      throw new Error('Invalid endedAt timestamp');
    }
    if (end < start) {
      throw new Error('Ended time cannot be earlier than started time');
    }
    calculatedDuration = Math.floor((end.getTime() - start.getTime()) / 1000);
  }

  if (calculatedDuration === null || calculatedDuration === undefined || calculatedDuration < 0) {
    throw new Error('Duration must be a positive number of seconds');
  }

  // Validate task if provided
  if (taskId) {
    const taskRes = await db.query('SELECT id, workspace_id, project_id FROM tasks WHERE id = $1;', [taskId]);
    if (taskRes.rows.length === 0 || (taskRes.rows[0].workspace_id && taskRes.rows[0].workspace_id !== workspaceId)) {
      throw new Error('Task not found in this workspace');
    }
    if (!projectId && taskRes.rows[0].project_id) {
      projectId = taskRes.rows[0].project_id;
    }
  }

  const result = await db.query(`
    INSERT INTO time_entries (
      workspace_id, user_id, task_id, project_id,
      started_at, ended_at, duration_seconds,
      status, description, is_billable
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8, $9)
    RETURNING *;
  `, [workspaceId, userId, taskId, projectId, start.toISOString(), end ? end.toISOString() : null, calculatedDuration, description, Boolean(isBillable)]);

  return result.rows[0];
};

/**
 * Get active timer for current user in workspace
 */
const getActiveTimer = async (workspaceId, userId) => {
  const result = await db.query(`
    SELECT te.*, t.title AS task_title, p.name AS project_name
    FROM time_entries te
    LEFT JOIN tasks t ON te.task_id = t.id
    LEFT JOIN projects p ON te.project_id = p.id
    WHERE te.workspace_id = $1 AND te.user_id = $2 AND te.status = 'running'
    ORDER BY te.started_at DESC LIMIT 1;
  `, [workspaceId, userId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(row.started_at).getTime()) / 1000));

  return {
    ...row,
    elapsed_seconds: elapsedSeconds,
  };
};

/**
 * List time entries with filtering & pagination
 */
const listTimeEntries = async (workspaceId, { userId = null, taskId = null, projectId = null, startDate = null, endDate = null, limit = 50, offset = 0 } = {}) => {
  let query = `
    SELECT te.*, u.name AS user_name, u.email AS user_email, t.title AS task_title, p.name AS project_name
    FROM time_entries te
    JOIN users u ON te.user_id = u.id
    LEFT JOIN tasks t ON te.task_id = t.id
    LEFT JOIN projects p ON te.project_id = p.id
    WHERE te.workspace_id = $1
  `;
  const params = [workspaceId];

  if (userId) {
    params.push(userId);
    query += ` AND te.user_id = $${params.length}`;
  }

  if (taskId) {
    params.push(taskId);
    query += ` AND te.task_id = $${params.length}`;
  }

  if (projectId) {
    params.push(projectId);
    query += ` AND te.project_id = $${params.length}`;
  }

  if (startDate) {
    params.push(new Date(startDate).toISOString());
    query += ` AND te.started_at >= $${params.length}`;
  }

  if (endDate) {
    params.push(new Date(endDate).toISOString());
    query += ` AND te.started_at <= $${params.length}`;
  }

  query += ` ORDER BY te.started_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  return result.rows;
};

/**
 * Update a time entry
 */
const updateTimeEntry = async (entryId, workspaceId, actorId, actorRole, updates) => {
  const existingRes = await db.query(`
    SELECT * FROM time_entries WHERE id = $1 AND workspace_id = $2;
  `, [entryId, workspaceId]);

  if (existingRes.rows.length === 0) {
    throw new Error('Time entry not found in this workspace');
  }

  const existing = existingRes.rows[0];

  // Authorization check: creator or manager/admin
  if (existing.user_id !== actorId && !['admin', 'manager'].includes(actorRole)) {
    throw new Error('You do not have permission to modify another user\'s time entry');
  }

  const newDescription = updates.description !== undefined ? updates.description : existing.description;
  const newBillable = updates.is_billable !== undefined ? Boolean(updates.is_billable) : existing.is_billable;
  let newDuration = existing.duration_seconds;

  if (updates.duration_seconds !== undefined) {
    newDuration = Number(updates.duration_seconds);
    if (isNaN(newDuration) || newDuration < 0) {
      throw new Error('Duration seconds must be a positive integer');
    }
  }

  const result = await db.query(`
    UPDATE time_entries
    SET description = $1, is_billable = $2, duration_seconds = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $4 AND workspace_id = $5
    RETURNING *;
  `, [newDescription, newBillable, newDuration, entryId, workspaceId]);

  return result.rows[0];
};

/**
 * Delete a time entry
 */
const deleteTimeEntry = async (entryId, workspaceId, actorId, actorRole) => {
  const existingRes = await db.query(`
    SELECT * FROM time_entries WHERE id = $1 AND workspace_id = $2;
  `, [entryId, workspaceId]);

  if (existingRes.rows.length === 0) {
    throw new Error('Time entry not found in this workspace');
  }

  const existing = existingRes.rows[0];

  if (existing.user_id !== actorId && !['admin', 'manager'].includes(actorRole)) {
    throw new Error('You do not have permission to delete another user\'s time entry');
  }

  await db.query('DELETE FROM time_entries WHERE id = $1 AND workspace_id = $2;', [entryId, workspaceId]);
  return { success: true, deletedId: entryId };
};

/**
 * Get Timesheet Analytics & Summaries
 */
const getTimesheetAnalytics = async (workspaceId, { userId = null, projectId = null, startDate = null, endDate = null } = {}) => {
  let baseQuery = 'WHERE te.workspace_id = $1 AND te.status = \'completed\'';
  const params = [workspaceId];

  if (userId) {
    params.push(userId);
    baseQuery += ` AND te.user_id = $${params.length}`;
  }

  if (projectId) {
    params.push(projectId);
    baseQuery += ` AND te.project_id = $${params.length}`;
  }

  if (startDate) {
    params.push(new Date(startDate).toISOString());
    baseQuery += ` AND te.started_at >= $${params.length}`;
  }

  if (endDate) {
    params.push(new Date(endDate).toISOString());
    baseQuery += ` AND te.started_at <= $${params.length}`;
  }

  // 1. Overall summary
  const summaryRes = await db.query(`
    SELECT
      COALESCE(SUM(te.duration_seconds), 0)::BIGINT AS total_seconds,
      COALESCE(SUM(CASE WHEN te.is_billable = TRUE THEN te.duration_seconds ELSE 0 END), 0)::BIGINT AS billable_seconds,
      COALESCE(SUM(CASE WHEN te.is_billable = FALSE THEN te.duration_seconds ELSE 0 END), 0)::BIGINT AS non_billable_seconds,
      COUNT(te.id)::INT AS total_entries
    FROM time_entries te
    ${baseQuery};
  `, params);

  const summary = summaryRes.rows[0];
  const totalSeconds = Number(summary.total_seconds);
  const billableSeconds = Number(summary.billable_seconds);
  const nonBillableSeconds = Number(summary.non_billable_seconds);

  // 2. Breakdown by project
  const projectBreakdownRes = await db.query(`
    SELECT
      p.id AS project_id,
      COALESCE(p.name, 'No Project') AS project_name,
      COALESCE(SUM(te.duration_seconds), 0)::BIGINT AS total_seconds,
      ROUND(COALESCE(SUM(te.duration_seconds), 0) / 3600.0, 2) AS total_hours
    FROM time_entries te
    LEFT JOIN projects p ON te.project_id = p.id
    ${baseQuery}
    GROUP BY p.id, p.name
    ORDER BY total_seconds DESC;
  `, params);

  // 3. Breakdown by user
  const userBreakdownRes = await db.query(`
    SELECT
      u.id AS user_id,
      u.name AS user_name,
      u.email AS user_email,
      COALESCE(SUM(te.duration_seconds), 0)::BIGINT AS total_seconds,
      ROUND(COALESCE(SUM(te.duration_seconds), 0) / 3600.0, 2) AS total_hours
    FROM time_entries te
    JOIN users u ON te.user_id = u.id
    ${baseQuery}
    GROUP BY u.id, u.name, u.email
    ORDER BY total_seconds DESC;
  `, params);

  return {
    total_seconds: totalSeconds,
    total_hours: Number((totalSeconds / 3600).toFixed(2)),
    billable_hours: Number((billableSeconds / 3600).toFixed(2)),
    non_billable_hours: Number((nonBillableSeconds / 3600).toFixed(2)),
    total_entries: summary.total_entries,
    by_project: projectBreakdownRes.rows,
    by_user: userBreakdownRes.rows,
  };
};

module.exports = {
  startTimer,
  stopTimer,
  createManualTimeEntry,
  getActiveTimer,
  listTimeEntries,
  updateTimeEntry,
  deleteTimeEntry,
  getTimesheetAnalytics,
};
