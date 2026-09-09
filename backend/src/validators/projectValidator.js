/**
 * Project Input Validation Rules & Functions
 * Pure JavaScript validators with strict schema and boundary checks.
 */

const VALID_PROJECT_STATUSES = ['active', 'completed', 'archived', 'on_hold'];
const ALLOWED_CREATE_PROJECT_FIELDS = ['name', 'description', 'status'];
const ALLOWED_UPDATE_PROJECT_FIELDS = ['name', 'description', 'status'];
const ALLOWED_ADD_MEMBER_FIELDS = ['user_id', 'userId', 'role'];
const ALLOWED_MEMBER_ROLES = ['member', 'lead'];
const ALLOWED_GET_PROJECTS_QUERY_FIELDS = ['status', 'search', 'page', 'limit'];

/**
 * Validate Project ID Route Parameter
 * @param {any} idParam 
 * @returns {{ isValid: boolean, error?: string, parsedId?: number }}
 */
const validateProjectId = (idParam) => {
  if (idParam === undefined || idParam === null || typeof idParam !== 'string') {
    return {
      isValid: false,
      error: 'Invalid project ID. ID must be a positive integer',
    };
  }

  const trimmed = idParam.trim();
  const integerRegex = /^[1-9]\d*$/;

  if (!integerRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid project ID. ID must be a positive integer',
    };
  }

  const parsedId = parseInt(trimmed, 10);
  if (isNaN(parsedId) || parsedId <= 0 || !Number.isSafeInteger(parsedId)) {
    return {
      isValid: false,
      error: 'Invalid project ID. ID must be a positive integer',
    };
  }

  return {
    isValid: true,
    parsedId,
  };
};

/**
 * Validate Project Creation Request Body
 * @param {any} body 
 * @returns {{ isValid: boolean, errors?: Record<string, string>, normalizedData?: { name: string, description: string | null, status: string } }}
 */
const validateCreateProjectBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object' },
    };
  }

  const errors = {};

  const bodyKeys = Object.keys(body);
  for (const key of bodyKeys) {
    if (!ALLOWED_CREATE_PROJECT_FIELDS.includes(key)) {
      errors[key] = `Unexpected field '${key}' is not allowed`;
    }
  }

  const { name, description, status } = body;

  // Validate 'name'
  if (name === undefined || name === null) {
    errors.name = 'Project name is required';
  } else if (typeof name !== 'string') {
    errors.name = 'Project name must be a string';
  } else {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      errors.name = 'Project name cannot be empty or whitespace only';
    } else if (trimmedName.length > 200) {
      errors.name = 'Project name must not exceed 200 characters';
    }
  }

  // Validate 'description' (optional)
  let cleanDescription = null;
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.description = 'Project description must be a string';
    } else {
      const trimmedDescription = description.trim();
      if (trimmedDescription.length > 5000) {
        errors.description = 'Project description must not exceed 5000 characters';
      } else {
        cleanDescription = trimmedDescription.length > 0 ? trimmedDescription : null;
      }
    }
  }

  // Validate 'status' (optional, defaults to 'active')
  let cleanStatus = 'active';
  if (status !== undefined && status !== null) {
    if (typeof status !== 'string') {
      errors.status = 'Project status must be a string';
    } else {
      const lowerStatus = status.trim().toLowerCase();
      if (!VALID_PROJECT_STATUSES.includes(lowerStatus)) {
        errors.status = `Invalid project status. Allowed values: ${VALID_PROJECT_STATUSES.join(', ')}`;
      } else {
        cleanStatus = lowerStatus;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      name: name.trim(),
      description: cleanDescription,
      status: cleanStatus,
    },
  };
};

/**
 * Validate Project Update Request Body
 * @param {any} body 
 * @returns {{ isValid: boolean, errors?: Record<string, string>, normalizedData?: { name?: string, description?: string | null, status?: string } }}
 */
const validateUpdateProjectBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object' },
    };
  }

  const errors = {};

  const bodyKeys = Object.keys(body);
  for (const key of bodyKeys) {
    if (!ALLOWED_UPDATE_PROJECT_FIELDS.includes(key)) {
      errors[key] = `Unexpected field '${key}' is not allowed`;
    }
  }

  const { name, description, status } = body;

  const hasName = name !== undefined;
  const hasDescription = description !== undefined;
  const hasStatus = status !== undefined;

  if (!hasName && !hasDescription && !hasStatus) {
    errors.body = 'At least one valid field (name, description, or status) is required to update';
    return { isValid: false, errors };
  }

  const normalizedData = {};

  if (hasName) {
    if (name === null || typeof name !== 'string') {
      errors.name = 'Project name must be a string';
    } else {
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        errors.name = 'Project name cannot be empty or whitespace only';
      } else if (trimmedName.length > 200) {
        errors.name = 'Project name must not exceed 200 characters';
      } else {
        normalizedData.name = trimmedName;
      }
    }
  }

  if (hasDescription) {
    if (description === null) {
      normalizedData.description = null;
    } else if (typeof description !== 'string') {
      errors.description = 'Project description must be a string or null';
    } else {
      const trimmedDescription = description.trim();
      if (trimmedDescription.length > 5000) {
        errors.description = 'Project description must not exceed 5000 characters';
      } else {
        normalizedData.description = trimmedDescription.length > 0 ? trimmedDescription : null;
      }
    }
  }

  if (hasStatus) {
    if (status === null || typeof status !== 'string') {
      errors.status = 'Project status must be a string';
    } else {
      const lowerStatus = status.trim().toLowerCase();
      if (!VALID_PROJECT_STATUSES.includes(lowerStatus)) {
        errors.status = `Invalid project status. Allowed values: ${VALID_PROJECT_STATUSES.join(', ')}`;
      } else {
        normalizedData.status = lowerStatus;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData,
  };
};

/**
 * Validate Add Member Request Body
 * @param {any} body 
 * @returns {{ isValid: boolean, errors?: Record<string, string>, normalizedData?: { userId: number } }}
 */
const validateAddMemberBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object' },
    };
  }

  const errors = {};

  const bodyKeys = Object.keys(body);
  for (const key of bodyKeys) {
    if (!ALLOWED_ADD_MEMBER_FIELDS.includes(key)) {
      errors[key] = `Unexpected field '${key}' is not allowed`;
    }
  }

  const rawUserId = body.user_id !== undefined ? body.user_id : body.userId;

  if (rawUserId === undefined || rawUserId === null) {
    errors.user_id = 'user_id is required';
  } else {
    let parsed = null;
    if (typeof rawUserId === 'number' && Number.isInteger(rawUserId) && rawUserId > 0) {
      parsed = rawUserId;
    } else if (typeof rawUserId === 'string' && /^[1-9]\d*$/.test(rawUserId.trim())) {
      parsed = parseInt(rawUserId.trim(), 10);
    }

    if (!parsed || parsed <= 0 || !Number.isSafeInteger(parsed)) {
      errors.user_id = 'user_id must be a positive integer';
    } else {
      body.user_id = parsed;
    }
  }

  let memberRole = 'member';
  if (body.role !== undefined && body.role !== null) {
    if (typeof body.role !== 'string') {
      errors.role = 'role must be a string';
    } else {
      const trimmedRole = body.role.trim().toLowerCase();
      if (!ALLOWED_MEMBER_ROLES.includes(trimmedRole)) {
        errors.role = `Invalid member role. Allowed values: ${ALLOWED_MEMBER_ROLES.join(', ')}`;
      } else {
        memberRole = trimmedRole;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      userId: body.user_id,
      user_id: body.user_id,
      role: memberRole,
    },
  };
};

/**
 * Validate Get Projects Query Parameters
 * @param {any} query 
 * @returns {{ isValid: boolean, errors?: Record<string, string>, normalizedQuery?: { status?: string, search?: string, page?: number, limit?: number } }}
 */
const validateGetProjectsQuery = (query) => {
  if (!query || typeof query !== 'object') {
    return { isValid: true, normalizedQuery: {} };
  }

  const errors = {};

  const queryKeys = Object.keys(query);
  for (const key of queryKeys) {
    if (!ALLOWED_GET_PROJECTS_QUERY_FIELDS.includes(key)) {
      errors[key] = `Unexpected query parameter '${key}' is not allowed`;
    }
  }

  const normalizedQuery = {};

  if (query.status !== undefined && query.status !== null && query.status !== '') {
    const lowerStatus = String(query.status).trim().toLowerCase();
    if (!VALID_PROJECT_STATUSES.includes(lowerStatus)) {
      errors.status = `Invalid status filter. Allowed values: ${VALID_PROJECT_STATUSES.join(', ')}`;
    } else {
      normalizedQuery.status = lowerStatus;
    }
  }

  if (query.search !== undefined && query.search !== null && query.search !== '') {
    if (typeof query.search !== 'string') {
      errors.search = 'Search query must be a string';
    } else {
      const trimmedSearch = query.search.trim();
      if (trimmedSearch.length > 200) {
        errors.search = 'Search query must not exceed 200 characters';
      } else {
        normalizedQuery.search = trimmedSearch;
      }
    }
  }

  if (query.page !== undefined && query.page !== null && query.page !== '') {
    const pageNum = parseInt(query.page, 10);
    if (isNaN(pageNum) || pageNum < 1 || String(pageNum) !== String(query.page).trim()) {
      errors.page = 'Page must be a positive integer greater than or equal to 1';
    } else {
      normalizedQuery.page = pageNum;
    }
  }

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
  VALID_PROJECT_STATUSES,
  validateProjectId,
  validateCreateProjectBody,
  validateUpdateProjectBody,
  validateAddMemberBody,
  validateGetProjectsQuery,
};
