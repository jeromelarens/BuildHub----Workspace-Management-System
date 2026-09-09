/**
 * Role and Permission Input Validation Rules & Functions
 */

const SYSTEM_ROLE_NAMES = ['admin', 'manager', 'team_lead', 'employee'];
const ALLOWED_CREATE_ROLE_FIELDS = ['name', 'description'];
const ALLOWED_UPDATE_ROLE_FIELDS = ['name', 'description'];
const ALLOWED_ADD_ROLE_PERMISSION_FIELDS = ['permission_id', 'permissionId'];

const validateRoleId = (idParam) => {
  if (idParam === undefined || idParam === null || typeof idParam !== 'string') {
    return {
      isValid: false,
      error: 'Invalid role ID. ID must be a positive integer',
    };
  }

  const trimmed = idParam.trim();
  const integerRegex = /^[1-9]\d*$/;

  if (!integerRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid role ID. ID must be a positive integer',
    };
  }

  const parsedId = parseInt(trimmed, 10);
  if (isNaN(parsedId) || parsedId <= 0 || !Number.isSafeInteger(parsedId)) {
    return {
      isValid: false,
      error: 'Invalid role ID. ID must be a positive integer',
    };
  }

  return {
    isValid: true,
    parsedId,
  };
};

const validatePermissionId = (idParam) => {
  if (idParam === undefined || idParam === null || typeof idParam !== 'string') {
    return {
      isValid: false,
      error: 'Invalid permission ID. ID must be a positive integer',
    };
  }

  const trimmed = idParam.trim();
  const integerRegex = /^[1-9]\d*$/;

  if (!integerRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid permission ID. ID must be a positive integer',
    };
  }

  const parsedId = parseInt(trimmed, 10);
  if (isNaN(parsedId) || parsedId <= 0 || !Number.isSafeInteger(parsedId)) {
    return {
      isValid: false,
      error: 'Invalid permission ID. ID must be a positive integer',
    };
  }

  return {
    isValid: true,
    parsedId,
  };
};

const validateCreateRoleBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object' },
    };
  }

  const errors = {};
  const bodyKeys = Object.keys(body);
  for (const key of bodyKeys) {
    if (!ALLOWED_CREATE_ROLE_FIELDS.includes(key)) {
      errors[key] = `Unexpected field '${key}' is not allowed`;
    }
  }

  const { name, description } = body;

  if (name === undefined || name === null) {
    errors.name = 'Role name is required';
  } else if (typeof name !== 'string') {
    errors.name = 'Role name must be a string';
  } else {
    const trimmed = name.trim().toLowerCase();
    if (trimmed.length < 2 || trimmed.length > 50) {
      errors.name = 'Role name must be between 2 and 50 characters';
    } else if (!/^[a-z0-9_]+$/.test(trimmed)) {
      errors.name = 'Role name must contain only lowercase letters, numbers, and underscores';
    }
  }

  let cleanDescription = null;
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.description = 'Description must be a string';
    } else {
      cleanDescription = description.trim();
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      name: name.trim().toLowerCase(),
      description: cleanDescription,
    },
  };
};

const validateAddPermissionToRoleBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object' },
    };
  }

  const errors = {};
  const bodyKeys = Object.keys(body);
  for (const key of bodyKeys) {
    if (!ALLOWED_ADD_ROLE_PERMISSION_FIELDS.includes(key)) {
      errors[key] = `Unexpected field '${key}' is not allowed`;
    }
  }

  const rawPermId = body.permission_id !== undefined ? body.permission_id : body.permissionId;

  if (rawPermId === undefined || rawPermId === null) {
    errors.permission_id = 'permission_id is required';
  } else {
    let parsed = null;
    if (typeof rawPermId === 'number' && Number.isInteger(rawPermId) && rawPermId > 0) {
      parsed = rawPermId;
    } else if (typeof rawPermId === 'string' && /^[1-9]\d*$/.test(rawPermId.trim())) {
      parsed = parseInt(rawPermId.trim(), 10);
    }

    if (!parsed || parsed <= 0 || !Number.isSafeInteger(parsed)) {
      errors.permission_id = 'permission_id must be a positive integer';
    } else {
      body.permission_id = parsed;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      permissionId: body.permission_id,
    },
  };
};

module.exports = {
  SYSTEM_ROLE_NAMES,
  validateRoleId,
  validatePermissionId,
  validateCreateRoleBody,
  validateAddPermissionToRoleBody,
};
