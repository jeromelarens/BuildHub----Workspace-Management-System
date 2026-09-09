/**
 * Punch-Clock & Time Tracking Input Validators
 */

const validateStartTimerBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { isValid: true, normalizedData: {} }; // Optional body for start timer
  }
  const { task_id, project_id, description, is_billable } = body;

  const taskId = task_id ? parseInt(task_id, 10) : null;
  const projectId = project_id ? parseInt(project_id, 10) : null;

  return {
    isValid: true,
    normalizedData: {
      taskId: isNaN(taskId) ? null : taskId,
      projectId: isNaN(projectId) ? null : projectId,
      description: description ? String(description).trim() : null,
      isBillable: is_billable !== undefined ? Boolean(is_billable) : true,
    },
  };
};

const validateManualTimeEntryBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { isValid: false, errors: { body: 'Request body must be an object' } };
  }
  const errors = {};
  const { task_id, project_id, started_at, ended_at, duration_seconds, description, is_billable } = body;

  if (!started_at) {
    errors.started_at = 'Started timestamp is required';
  } else if (isNaN(new Date(started_at).getTime())) {
    errors.started_at = 'Invalid started_at timestamp format';
  }

  if (ended_at && isNaN(new Date(ended_at).getTime())) {
    errors.ended_at = 'Invalid ended_at timestamp format';
  }

  const taskId = task_id ? parseInt(task_id, 10) : null;
  const projectId = project_id ? parseInt(project_id, 10) : null;
  const durationSec = duration_seconds !== undefined ? parseInt(duration_seconds, 10) : null;

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      taskId: isNaN(taskId) ? null : taskId,
      projectId: isNaN(projectId) ? null : projectId,
      startedAt: started_at,
      endedAt: ended_at || null,
      durationSeconds: isNaN(durationSec) ? null : durationSec,
      description: description ? String(description).trim() : null,
      isBillable: is_billable !== undefined ? Boolean(is_billable) : true,
    },
  };
};

module.exports = {
  validateStartTimerBody,
  validateManualTimeEntryBody,
};
