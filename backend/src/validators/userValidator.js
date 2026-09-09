/**
 * User Input Validation Rules & Functions (Admin Operations)
 */

const ALLOWED_ROLES = ['admin', 'manager', 'team_lead', 'employee'];
const ALLOWED_TARGET_ROLES = ['manager', 'team_lead', 'employee'];
const ALLOWED_ROLE_UPDATE_FIELDS = ['role'];
const ALLOWED_GET_USERS_QUERY_FIELDS = ['role', 'page', 'limit'];

/**
 * Validate User ID Route Parameter
 * @param {any} idParam 
 * @returns {{ isValid: boolean, error?: string, parsedId?: number }}
 */
const validateUserId = (idParam) => {
  if (idParam === undefined || idParam === null || typeof idParam !== 'string') {
    return {
      isValid: false,
      error: 'Invalid user ID. ID must be a positive integer',
    };
  }

  const trimmed = idParam.trim();
  const integerRegex = /^[1-9]\d*$/;

  if (!integerRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid user ID. ID must be a positive integer',
    };
  }

  const parsedId = parseInt(trimmed, 10);
  if (isNaN(parsedId) || parsedId <= 0 || !Number.isSafeInteger(parsedId)) {
    return {
      isValid: false,
      error: 'Invalid user ID. ID must be a positive integer',
    };
  }

  return {
    isValid: true,
    parsedId,
  };
};

/**
 * Validate User Role Update Request Body
 * @param {any} body 
 * @returns {{ isValid: boolean, errors?: Record<string, string>, normalizedData?: { role: string } }}
 */
const validateUpdateUserRoleBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object' },
    };
  }

  const errors = {};

  const bodyKeys = Object.keys(body);
  for (const key of bodyKeys) {
    if (!ALLOWED_ROLE_UPDATE_FIELDS.includes(key)) {
      errors[key] = `Unexpected field '${key}' is not allowed`;
    }
  }

  const { role } = body;

  if (role === undefined || role === null) {
    errors.role = 'Role is required';
  } else if (typeof role !== 'string') {
    errors.role = 'Role must be a string';
  } else {
    const trimmedRole = role.trim();
    if (!ALLOWED_TARGET_ROLES.includes(trimmedRole)) {
      errors.role = `Invalid role. Allowed values: ${ALLOWED_TARGET_ROLES.join(', ')}`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      role: role.trim(),
    },
  };
};

/**
 * Validate Query Parameters for Get Users
 * @param {any} query 
 * @returns {{ isValid: boolean, errors?: Record<string, string>, normalizedQuery?: { role?: string, page?: number, limit?: number } }}
 */
const validateGetUsersQuery = (query) => {
  if (!query || typeof query !== 'object') {
    return { isValid: true, normalizedQuery: {} };
  }

  const errors = {};

  const queryKeys = Object.keys(query);
  for (const key of queryKeys) {
    if (!ALLOWED_GET_USERS_QUERY_FIELDS.includes(key)) {
      errors[key] = `Unexpected query parameter '${key}' is not allowed`;
    }
  }

  const normalizedQuery = {};

  // Validate 'role' if present
  if (query.role !== undefined && query.role !== null && query.role !== '') {
    if (typeof query.role !== 'string' || !ALLOWED_ROLES.includes(query.role.trim().toLowerCase())) {
      errors.role = `Invalid role filter. Allowed values: ${ALLOWED_ROLES.join(', ')}`;
    } else {
      normalizedQuery.role = query.role.trim().toLowerCase();
    }
  }

  // Validate 'page' if present
  if (query.page !== undefined && query.page !== null && query.page !== '') {
    const pageNum = parseInt(query.page, 10);
    if (isNaN(pageNum) || pageNum < 1 || String(pageNum) !== String(query.page).trim()) {
      errors.page = 'Page must be a positive integer greater than or equal to 1';
    } else {
      normalizedQuery.page = pageNum;
    }
  }

  // Validate 'limit' if present
  if (query.limit !== undefined && query.limit !== null && query.limit !== '') {
    const limitNum = parseInt(query.limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100 || String(limitNum) !== String(query.limit).trim()) {
      errors.limit = 'Limit must be a positive integer between 1 and 100';
    } else {
      normalizedQuery.limit = limitNum;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedQuery,
  };
};

module.exports = {
  ALLOWED_ROLES,
  ALLOWED_TARGET_ROLES,
  validateUserId,
  validateUpdateUserRoleBody,
  validateGetUsersQuery,
};
