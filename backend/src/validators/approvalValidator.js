/**
 * Approval Workflow Input Validators
 */

const validateCreateApprovalWorkflowBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { isValid: false, errors: { body: 'Request body must be an object' } };
  }
  const errors = {};
  const { name, entity_type, description, steps } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.name = 'Workflow name is required';
  }

  if (steps !== undefined && !Array.isArray(steps)) {
    errors.steps = 'Steps must be an array of approval step definitions';
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      name: name.trim(),
      entityType: entity_type || 'task',
      description: description ? description.trim() : null,
      steps: Array.isArray(steps) ? steps : [],
    },
  };
};

const validateSubmitApprovalRequestBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { isValid: false, errors: { body: 'Request body must be an object' } };
  }
  const errors = {};
  const { workflow_id, entity_type, entity_id } = body;

  const wfId = parseInt(workflow_id, 10);
  const entId = parseInt(entity_id, 10);

  if (!workflow_id || isNaN(wfId) || wfId <= 0) {
    errors.workflow_id = 'Valid numeric workflow_id is required';
  }

  if (!entity_type || typeof entity_type !== 'string') {
    errors.entity_type = 'Entity type (e.g. task) is required';
  }

  if (!entity_id || isNaN(entId) || entId <= 0) {
    errors.entity_id = 'Valid numeric entity_id is required';
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      workflowId: wfId,
      entityType: entity_type.trim(),
      entityId: entId,
    },
  };
};

const validateApprovalActionBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { isValid: false, errors: { body: 'Request body must be an object' } };
  }
  const errors = {};
  const { action, reason } = body;

  if (!action || !['approved', 'rejected', 'cancelled'].includes(action)) {
    errors.action = 'Action must be one of: approved, rejected, cancelled';
  }

  if (action === 'rejected' && (!reason || typeof reason !== 'string' || reason.trim().length === 0)) {
    errors.reason = 'A rejection reason is required';
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      action,
      reason: reason ? reason.trim() : null,
    },
  };
};

module.exports = {
  validateCreateApprovalWorkflowBody,
  validateSubmitApprovalRequestBody,
  validateApprovalActionBody,
};
