/**
 * Task Dependency Input Validation
 */

const ALLOWED_DEPENDENCY_FIELDS = ['depends_on_task_id', 'dependsOnTaskId'];

const validateDependencyId = (idParam) => {
  if (idParam === undefined || idParam === null || typeof idParam !== 'string') {
    return {
      isValid: false,
      error: 'Invalid dependency ID. ID must be a positive integer',
    };
  }

  const trimmed = idParam.trim();
  const integerRegex = /^[1-9]\d*$/;

  if (!integerRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid dependency ID. ID must be a positive integer',
    };
  }

  const parsedId = parseInt(trimmed, 10);
  if (isNaN(parsedId) || parsedId <= 0 || !Number.isSafeInteger(parsedId)) {
    return {
      isValid: false,
      error: 'Invalid dependency ID. ID must be a positive integer',
    };
  }

  return {
    isValid: true,
    parsedId,
  };
};

const validateAddDependencyBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object' },
    };
  }

  const errors = {};
  const bodyKeys = Object.keys(body);
  for (const key of bodyKeys) {
    if (!ALLOWED_DEPENDENCY_FIELDS.includes(key)) {
      errors[key] = `Unexpected field '${key}' is not allowed`;
    }
  }

  const rawTargetId = body.depends_on_task_id !== undefined ? body.depends_on_task_id : body.dependsOnTaskId;

  if (rawTargetId === undefined || rawTargetId === null) {
    errors.depends_on_task_id = 'depends_on_task_id is required';
  } else {
    let parsed = null;
    if (typeof rawTargetId === 'number' && Number.isInteger(rawTargetId) && rawTargetId > 0) {
      parsed = rawTargetId;
    } else if (typeof rawTargetId === 'string' && /^[1-9]\d*$/.test(rawTargetId.trim())) {
      parsed = parseInt(rawTargetId.trim(), 10);
    }

    if (!parsed || parsed <= 0 || !Number.isSafeInteger(parsed)) {
      errors.depends_on_task_id = 'depends_on_task_id must be a positive integer';
    } else {
      body.depends_on_task_id = parsed;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      dependsOnTaskId: body.depends_on_task_id,
    },
  };
};

module.exports = {
  validateDependencyId,
  validateAddDependencyBody,
};
