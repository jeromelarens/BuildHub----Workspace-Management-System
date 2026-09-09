/**
 * Task Validation Rules & Functions
 * Pure JavaScript validators with strict schema and boundary checks for Phase 1, Phase 2 & Phase 3.
 */

const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VALID_SORT_FIELDS = ['due_date', 'created_at', 'priority', 'title', 'status'];
const VALID_SORT_ORDERS = ['asc', 'desc'];

const ALLOWED_CREATE_FIELDS = [
  'title',
  'description',
  'status',
  'priority',
  'due_date',
  'project_id',
  'assigned_to',
];

const ALLOWED_UPDATE_FIELDS = [
  'title',
  'description',
  'status',
  'priority',
  'due_date',
  'project_id',
  'assigned_to',
];

const ALLOWED_QUERY_FIELDS = [
  'status',
  'priority',
  'project_id',
  'assigned_to',
  'search',
  'page',
  'limit',
];

const ALLOWED_ADVANCED_SEARCH_FIELDS = [
  'search',
  'startDate',
  'endDate',
  'status',
  'priority',
  'project_id',
  'assigned_to',
  'hasAttachments',
  'isOverdue',
  'isBlocked',
  'sortBy',
  'sortOrder',
  'page',
  'limit',
];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Helper to validate ISO Date string (YYYY-MM-DD)
 * @param {string} dateStr 
 * @returns {boolean}
 */
const isValidIsoDate = (dateStr) => {
  if (!DATE_REGEX.test(dateStr)) return false;
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const dateObj = new Date(year, month - 1, day);
  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
};

/**
 * Validate Task ID Route Parameter
 * @param {any} idParam 
 * @returns {{ isValid: boolean, error?: string, parsedId?: number }}
 */
const validateTaskId = (idParam) => {
  if (idParam === undefined || idParam === null || typeof idParam !== 'string') {
    return {
      isValid: false,
      error: 'Invalid task ID. ID must be a positive integer',
    };
  }

  const trimmed = idParam.trim();
  const integerRegex = /^[1-9]\d*$/;

  if (!integerRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid task ID. ID must be a positive integer',
    };
  }

  const parsedId = parseInt(trimmed, 10);
  if (isNaN(parsedId) || parsedId <= 0 || !Number.isSafeInteger(parsedId)) {
    return {
      isValid: false,
      error: 'Invalid task ID. ID must be a positive integer',
    };
  }

  return {
    isValid: true,
    parsedId,
  };
};

/**
 * Validate Task Creation Request Body
 * @param {any} body 
 * @returns {{ isValid: boolean, errors?: Record<string, string>, normalizedData?: any }}
 */
const validateCreateTaskBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object' },
    };
  }

  const errors = {};

  // Check for unexpected fields (prevent mass assignment like user_id, created_at, id)
  const bodyKeys = Object.keys(body);
  for (const key of bodyKeys) {
    if (!ALLOWED_CREATE_FIELDS.includes(key)) {
      errors[key] = `Unexpected field '${key}' is not allowed`;
    }
  }

  const { title, description, status, priority, due_date, project_id, assigned_to } = body;

  // Validate 'title' (required)
  if (title === undefined || title === null) {
    errors.title = 'Task title is required';
  } else if (typeof title !== 'string') {
    errors.title = 'Task title must be a string';
  } else {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      errors.title = 'Task title cannot be empty or whitespace only';
    } else if (trimmedTitle.length > 200) {
      errors.title = 'Task title must not exceed 200 characters';
    }
  }

  // Validate 'description' (optional)
  let cleanDescription = null;
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.description = 'Task description must be a string';
    } else {
      const trimmedDescription = description.trim();
      if (trimmedDescription.length > 5000) {
        errors.description = 'Task description must not exceed 5000 characters';
      } else {
        cleanDescription = trimmedDescription.length > 0 ? trimmedDescription : null;
      }
    }
  }

  // Validate 'status' (optional, defaults to 'pending')
  let cleanStatus = 'pending';
  if (status !== undefined && status !== null) {
    if (typeof status !== 'string') {
      errors.status = 'Task status must be a string';
    } else {
      const lowerStatus = status.trim().toLowerCase();
      if (!VALID_STATUSES.includes(lowerStatus)) {
        errors.status = `Invalid task status. Allowed values: ${VALID_STATUSES.join(', ')}`;
      } else {
        cleanStatus = lowerStatus;
      }
    }
  }

  // Validate 'priority' (optional, defaults to 'medium')
  let cleanPriority = 'medium';
  if (priority !== undefined && priority !== null) {
    if (typeof priority !== 'string') {
      errors.priority = 'Task priority must be a string';
    } else {
      const lowerPriority = priority.trim().toLowerCase();
      if (!VALID_PRIORITIES.includes(lowerPriority)) {
        errors.priority = `Invalid task priority. Allowed values: ${VALID_PRIORITIES.join(', ')}`;
      } else {
        cleanPriority = lowerPriority;
      }
    }
  }

  // Validate 'due_date' (optional, format YYYY-MM-DD)
  let cleanDueDate = null;
  if (due_date !== undefined && due_date !== null) {
    if (typeof due_date !== 'string') {
      errors.due_date = 'Task due_date must be a string in YYYY-MM-DD format';
    } else {
      const trimmedDate = due_date.trim();
      if (trimmedDate.length > 0) {
        if (!isValidIsoDate(trimmedDate)) {
          errors.due_date = 'Invalid due_date. Must be a valid real date in YYYY-MM-DD format';
        } else {
          cleanDueDate = trimmedDate;
        }
      }
    }
  }

  // Validate 'project_id' (optional, integer)
  let cleanProjectId = null;
  if (project_id !== undefined && project_id !== null) {
    let parsedProjId = null;
    if (typeof project_id === 'number' && Number.isInteger(project_id) && project_id > 0) {
      parsedProjId = project_id;
    } else if (typeof project_id === 'string' && /^[1-9]\d*$/.test(project_id.trim())) {
      parsedProjId = parseInt(project_id.trim(), 10);
    }

    if (!parsedProjId || parsedProjId <= 0 || !Number.isSafeInteger(parsedProjId)) {
      errors.project_id = 'project_id must be a positive integer';
    } else {
      cleanProjectId = parsedProjId;
    }
  }

  // Validate 'assigned_to' (optional, integer)
  let cleanAssignedTo = null;
  if (assigned_to !== undefined && assigned_to !== null) {
    let parsedAssignedTo = null;
    if (typeof assigned_to === 'number' && Number.isInteger(assigned_to) && assigned_to > 0) {
      parsedAssignedTo = assigned_to;
    } else if (typeof assigned_to === 'string' && /^[1-9]\d*$/.test(assigned_to.trim())) {
      parsedAssignedTo = parseInt(assigned_to.trim(), 10);
    }

    if (!parsedAssignedTo || parsedAssignedTo <= 0 || !Number.isSafeInteger(parsedAssignedTo)) {
      errors.assigned_to = 'assigned_to must be a positive integer';
    } else {
      cleanAssignedTo = parsedAssignedTo;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      title: title.trim(),
      description: cleanDescription,
      status: cleanStatus,
      priority: cleanPriority,
      due_date: cleanDueDate,
      project_id: cleanProjectId,
      assigned_to: cleanAssignedTo,
    },
  };
};

/**
 * Validate Task Update Request Body
 * @param {any} body 
 * @returns {{ isValid: boolean, errors?: Record<string, string>, normalizedData?: any }}
 */
const validateUpdateTaskBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object' },
    };
  }

  const errors = {};

  // Check for unexpected fields (e.g. id, user_id, created_at, updated_at)
  const bodyKeys = Object.keys(body);
  for (const key of bodyKeys) {
    if (!ALLOWED_UPDATE_FIELDS.includes(key)) {
      errors[key] = `Unexpected field '${key}' is not allowed`;
    }
  }

  const { title, description, status, priority, due_date, project_id, assigned_to } = body;

  const hasTitle = title !== undefined;
  const hasDescription = description !== undefined;
  const hasStatus = status !== undefined;
  const hasPriority = priority !== undefined;
  const hasDueDate = due_date !== undefined;
  const hasProjectId = project_id !== undefined;
  const hasAssignedTo = assigned_to !== undefined;

  if (
    !hasTitle &&
    !hasDescription &&
    !hasStatus &&
    !hasPriority &&
    !hasDueDate &&
    !hasProjectId &&
    !hasAssignedTo
  ) {
    errors.body = 'At least one valid field is required to update';
    return { isValid: false, errors };
  }

  const normalizedData = {};

  // Validate 'title' if present
  if (hasTitle) {
    if (title === null || typeof title !== 'string') {
      errors.title = 'Task title must be a string';
    } else {
      const trimmedTitle = title.trim();
      if (trimmedTitle.length === 0) {
        errors.title = 'Task title cannot be empty or whitespace only';
      } else if (trimmedTitle.length > 200) {
        errors.title = 'Task title must not exceed 200 characters';
      } else {
        normalizedData.title = trimmedTitle;
      }
    }
  }

  // Validate 'description' if present
  if (hasDescription) {
    if (description === null) {
      normalizedData.description = null;
    } else if (typeof description !== 'string') {
      errors.description = 'Task description must be a string or null';
    } else {
      const trimmedDescription = description.trim();
      if (trimmedDescription.length > 5000) {
        errors.description = 'Task description must not exceed 5000 characters';
      } else {
        normalizedData.description = trimmedDescription.length > 0 ? trimmedDescription : null;
      }
    }
  }

  // Validate 'status' if present
  if (hasStatus) {
    if (status === null || typeof status !== 'string') {
      errors.status = 'Task status must be a string';
    } else {
      const lowerStatus = status.trim().toLowerCase();
      if (!VALID_STATUSES.includes(lowerStatus)) {
        errors.status = `Invalid task status. Allowed values: ${VALID_STATUSES.join(', ')}`;
      } else {
        normalizedData.status = lowerStatus;
      }
    }
  }

  // Validate 'priority' if present
  if (hasPriority) {
    if (priority === null || typeof priority !== 'string') {
      errors.priority = 'Task priority must be a string';
    } else {
      const lowerPriority = priority.trim().toLowerCase();
      if (!VALID_PRIORITIES.includes(lowerPriority)) {
        errors.priority = `Invalid task priority. Allowed values: ${VALID_PRIORITIES.join(', ')}`;
      } else {
        normalizedData.priority = lowerPriority;
      }
    }
  }

  // Validate 'due_date' if present
  if (hasDueDate) {
    if (due_date === null) {
      normalizedData.due_date = null;
    } else if (typeof due_date !== 'string') {
      errors.due_date = 'Task due_date must be a string in YYYY-MM-DD format or null';
    } else {
      const trimmedDate = due_date.trim();
      if (trimmedDate.length === 0) {
        normalizedData.due_date = null;
      } else if (!isValidIsoDate(trimmedDate)) {
        errors.due_date = 'Invalid due_date. Must be a valid real date in YYYY-MM-DD format';
      } else {
        normalizedData.due_date = trimmedDate;
      }
    }
  }

  // Validate 'project_id' if present
  if (hasProjectId) {
    if (project_id === null) {
      normalizedData.project_id = null;
    } else {
      let parsedProjId = null;
      if (typeof project_id === 'number' && Number.isInteger(project_id) && project_id > 0) {
        parsedProjId = project_id;
      } else if (typeof project_id === 'string' && /^[1-9]\d*$/.test(project_id.trim())) {
        parsedProjId = parseInt(project_id.trim(), 10);
      }

      if (!parsedProjId || parsedProjId <= 0 || !Number.isSafeInteger(parsedProjId)) {
        errors.project_id = 'project_id must be a positive integer or null';
      } else {
        normalizedData.project_id = parsedProjId;
      }
    }
  }

  // Validate 'assigned_to' if present
  if (hasAssignedTo) {
    if (assigned_to === null) {
      normalizedData.assigned_to = null;
    } else {
      let parsedAssignedTo = null;
      if (typeof assigned_to === 'number' && Number.isInteger(assigned_to) && assigned_to > 0) {
        parsedAssignedTo = assigned_to;
      } else if (typeof assigned_to === 'string' && /^[1-9]\d*$/.test(assigned_to.trim())) {
        parsedAssignedTo = parseInt(assigned_to.trim(), 10);
      }

      if (!parsedAssignedTo || parsedAssignedTo <= 0 || !Number.isSafeInteger(parsedAssignedTo)) {
        errors.assigned_to = 'assigned_to must be a positive integer or null';
      } else {
        normalizedData.assigned_to = parsedAssignedTo;
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
 * Validate Query Parameters for Task List
 * @param {any} query 
 * @returns {{ isValid: boolean, errors?: Record<string, string>, normalizedQuery?: any }}
 */
const validateGetTasksQuery = (query) => {
  if (!query || typeof query !== 'object') {
    return { isValid: true, normalizedQuery: {} };
  }

  const errors = {};

  // Check for unexpected query parameters
  const queryKeys = Object.keys(query);
  for (const key of queryKeys) {
    if (!ALLOWED_QUERY_FIELDS.includes(key)) {
      errors[key] = `Unexpected query parameter '${key}' is not allowed`;
    }
  }

  const normalizedQuery = {};

  // Filter: status
  if (query.status !== undefined && query.status !== null && query.status !== '') {
    const lowerStatus = String(query.status).trim().toLowerCase();
    if (!VALID_STATUSES.includes(lowerStatus)) {
      errors.status = `Invalid status filter. Allowed values: ${VALID_STATUSES.join(', ')}`;
    } else {
      normalizedQuery.status = lowerStatus;
    }
  }

  // Filter: priority
  if (query.priority !== undefined && query.priority !== null && query.priority !== '') {
    const lowerPriority = String(query.priority).trim().toLowerCase();
    if (!VALID_PRIORITIES.includes(lowerPriority)) {
      errors.priority = `Invalid priority filter. Allowed values: ${VALID_PRIORITIES.join(', ')}`;
    } else {
      normalizedQuery.priority = lowerPriority;
    }
  }

  // Filter: project_id
  if (query.project_id !== undefined && query.project_id !== null && query.project_id !== '') {
    const parsedProjId = parseInt(String(query.project_id).trim(), 10);
    if (isNaN(parsedProjId) || parsedProjId <= 0 || String(parsedProjId) !== String(query.project_id).trim()) {
      errors.project_id = 'project_id filter must be a positive integer';
    } else {
      normalizedQuery.project_id = parsedProjId;
    }
  }

  // Filter: assigned_to
  if (query.assigned_to !== undefined && query.assigned_to !== null && query.assigned_to !== '') {
    const parsedAssigned = parseInt(String(query.assigned_to).trim(), 10);
    if (isNaN(parsedAssigned) || parsedAssigned <= 0 || String(parsedAssigned) !== String(query.assigned_to).trim()) {
      errors.assigned_to = 'assigned_to filter must be a positive integer';
    } else {
      normalizedQuery.assigned_to = parsedAssigned;
    }
  }

  // Filter: search
  if (query.search !== undefined && query.search !== null && query.search !== '') {
    if (typeof query.search !== 'string') {
      errors.search = 'search must be a string';
    } else {
      const trimmedSearch = query.search.trim();
      if (trimmedSearch.length > 200) {
        errors.search = 'search query must not exceed 200 characters';
      } else {
        normalizedQuery.search = trimmedSearch;
      }
    }
  }

  // Pagination: page
  if (query.page !== undefined && query.page !== null && query.page !== '') {
    const pageNum = parseInt(String(query.page).trim(), 10);
    if (isNaN(pageNum) || pageNum < 1 || String(pageNum) !== String(query.page).trim()) {
      errors.page = 'Page must be a positive integer greater than or equal to 1';
    } else {
      normalizedQuery.page = pageNum;
    }
  }

  // Pagination: limit
  if (query.limit !== undefined && query.limit !== null && query.limit !== '') {
    const limitNum = parseInt(String(query.limit).trim(), 10);
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

/**
 * Validate Query Parameters for Advanced Task Search
 * @param {any} query 
 */
const validateAdvancedSearchQuery = (query) => {
  if (!query || typeof query !== 'object') {
    return { isValid: true, normalizedQuery: {} };
  }

  const errors = {};

  for (const key of Object.keys(query)) {
    if (!ALLOWED_ADVANCED_SEARCH_FIELDS.includes(key)) {
      errors[key] = `Unexpected query parameter '${key}' is not allowed`;
    }
  }

  const normalized = {};

  if (query.search) {
    const trimmed = String(query.search).trim();
    if (trimmed.length > 200) errors.search = 'search query must not exceed 200 characters';
    else normalized.search = trimmed;
  }

  if (query.startDate) {
    const trimmed = String(query.startDate).trim();
    if (!isValidIsoDate(trimmed)) errors.startDate = 'startDate must be in YYYY-MM-DD format';
    else normalized.startDate = trimmed;
  }

  if (query.endDate) {
    const trimmed = String(query.endDate).trim();
    if (!isValidIsoDate(trimmed)) errors.endDate = 'endDate must be in YYYY-MM-DD format';
    else normalized.endDate = trimmed;
  }

  if (query.status) {
    const s = String(query.status).trim().toLowerCase();
    if (!VALID_STATUSES.includes(s)) errors.status = `Invalid status: ${VALID_STATUSES.join(', ')}`;
    else normalized.status = s;
  }

  if (query.priority) {
    const p = String(query.priority).trim().toLowerCase();
    if (!VALID_PRIORITIES.includes(p)) errors.priority = `Invalid priority: ${VALID_PRIORITIES.join(', ')}`;
    else normalized.priority = p;
  }

  if (query.project_id) {
    const pid = parseInt(String(query.project_id).trim(), 10);
    if (isNaN(pid) || pid <= 0) errors.project_id = 'project_id must be a positive integer';
    else normalized.project_id = pid;
  }

  if (query.assigned_to) {
    const uid = parseInt(String(query.assigned_to).trim(), 10);
    if (isNaN(uid) || uid <= 0) errors.assigned_to = 'assigned_to must be a positive integer';
    else normalized.assigned_to = uid;
  }

  if (query.hasAttachments !== undefined && query.hasAttachments !== null && query.hasAttachments !== '') {
    const str = String(query.hasAttachments).trim().toLowerCase();
    if (str === 'true' || str === '1') normalized.hasAttachments = true;
    else if (str === 'false' || str === '0') normalized.hasAttachments = false;
    else errors.hasAttachments = 'hasAttachments must be boolean (true/false)';
  }

  if (query.isOverdue !== undefined && query.isOverdue !== null && query.isOverdue !== '') {
    const str = String(query.isOverdue).trim().toLowerCase();
    if (str === 'true' || str === '1') normalized.isOverdue = true;
    else if (str === 'false' || str === '0') normalized.isOverdue = false;
    else errors.isOverdue = 'isOverdue must be boolean (true/false)';
  }

  if (query.isBlocked !== undefined && query.isBlocked !== null && query.isBlocked !== '') {
    const str = String(query.isBlocked).trim().toLowerCase();
    if (str === 'true' || str === '1') normalized.isBlocked = true;
    else if (str === 'false' || str === '0') normalized.isBlocked = false;
    else errors.isBlocked = 'isBlocked must be boolean (true/false)';
  }

  if (query.sortBy) {
    const sb = String(query.sortBy).trim().toLowerCase();
    if (!VALID_SORT_FIELDS.includes(sb)) errors.sortBy = `sortBy must be one of: ${VALID_SORT_FIELDS.join(', ')}`;
    else normalized.sortBy = sb;
  } else {
    normalized.sortBy = 'created_at';
  }

  if (query.sortOrder) {
    const so = String(query.sortOrder).trim().toLowerCase();
    if (!VALID_SORT_ORDERS.includes(so)) errors.sortOrder = 'sortOrder must be asc or desc';
    else normalized.sortOrder = so;
  } else {
    normalized.sortOrder = 'desc';
  }

  if (query.page) {
    const p = parseInt(String(query.page).trim(), 10);
    if (isNaN(p) || p < 1) errors.page = 'page must be a positive integer';
    else normalized.page = p;
  } else {
    normalized.page = 1;
  }

  if (query.limit) {
    const l = parseInt(String(query.limit).trim(), 10);
    if (isNaN(l) || l < 1 || l > 100) errors.limit = 'limit must be between 1 and 100';
    else normalized.limit = l;
  } else {
    normalized.limit = 10;
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return { isValid: true, normalizedQuery: normalized };
};

/**
 * Validate Bulk Update Request Body
 * @param {any} body 
 */
const validateBulkUpdateBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { isValid: false, errors: { body: 'Request body must be a valid JSON object' } };
  }

  const errors = {};
  const allowed = ['task_ids', 'status', 'priority', 'due_date', 'assigned_to'];

  for (const k of Object.keys(body)) {
    if (!allowed.includes(k)) {
      errors[k] = `Unexpected field '${k}' is not allowed`;
    }
  }

  const { task_ids, status, priority, due_date, assigned_to } = body;

  // Validate task_ids
  if (!Array.isArray(task_ids) || task_ids.length === 0) {
    errors.task_ids = 'task_ids must be a non-empty array of positive integers';
  } else if (task_ids.length > 50) {
    errors.task_ids = 'Bulk operations support a maximum batch size of 50 tasks';
  } else {
    const seen = new Set();
    for (let i = 0; i < task_ids.length; i++) {
      const id = task_ids[i];
      if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
        errors.task_ids = `Invalid task ID at index ${i}. Must be positive integer`;
        break;
      }
      if (seen.has(id)) {
        errors.task_ids = `Duplicate task ID ${id} detected in batch`;
        break;
      }
      seen.add(id);
    }
  }

  const hasStatus = status !== undefined;
  const hasPriority = priority !== undefined;
  const hasDueDate = due_date !== undefined;
  const hasAssignedTo = assigned_to !== undefined;

  if (!hasStatus && !hasPriority && !hasDueDate && !hasAssignedTo) {
    errors.body = 'At least one field to update (status, priority, due_date, assigned_to) is required';
  }

  const normalized = { task_ids };

  if (hasStatus) {
    if (typeof status !== 'string') errors.status = 'status must be a string';
    else {
      const s = status.trim().toLowerCase();
      if (!VALID_STATUSES.includes(s)) errors.status = `Invalid status: ${VALID_STATUSES.join(', ')}`;
      else normalized.status = s;
    }
  }

  if (hasPriority) {
    if (typeof priority !== 'string') errors.priority = 'priority must be a string';
    else {
      const p = priority.trim().toLowerCase();
      if (!VALID_PRIORITIES.includes(p)) errors.priority = `Invalid priority: ${VALID_PRIORITIES.join(', ')}`;
      else normalized.priority = p;
    }
  }

  if (hasDueDate) {
    if (due_date === null) {
      normalized.due_date = null;
    } else if (typeof due_date !== 'string') {
      errors.due_date = 'due_date must be string YYYY-MM-DD or null';
    } else {
      const d = due_date.trim();
      if (d.length > 0 && !isValidIsoDate(d)) errors.due_date = 'Invalid date format (YYYY-MM-DD)';
      else normalized.due_date = d.length > 0 ? d : null;
    }
  }

  if (hasAssignedTo) {
    if (assigned_to === null) {
      normalized.assigned_to = null;
    } else {
      const aid = parseInt(assigned_to, 10);
      if (isNaN(aid) || aid <= 0) errors.assigned_to = 'assigned_to must be positive integer or null';
      else normalized.assigned_to = aid;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return { isValid: true, normalizedData: normalized };
};

/**
 * Validate Bulk Delete Request Body
 * @param {any} body 
 */
const validateBulkDeleteBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { isValid: false, errors: { body: 'Request body must be a valid JSON object' } };
  }

  const errors = {};
  for (const k of Object.keys(body)) {
    if (k !== 'task_ids') {
      errors[k] = `Unexpected field '${k}' is not allowed`;
    }
  }

  const { task_ids } = body;
  if (!Array.isArray(task_ids) || task_ids.length === 0) {
    errors.task_ids = 'task_ids must be a non-empty array of positive integers';
  } else if (task_ids.length > 50) {
    errors.task_ids = 'Bulk delete supports a maximum batch size of 50 tasks';
  } else {
    const seen = new Set();
    for (let i = 0; i < task_ids.length; i++) {
      const id = task_ids[i];
      if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
        errors.task_ids = `Invalid task ID at index ${i}. Must be positive integer`;
        break;
      }
      if (seen.has(id)) {
        errors.task_ids = `Duplicate task ID ${id} detected in batch`;
        break;
      }
      seen.add(id);
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return { isValid: true, normalizedData: { task_ids } };
};

module.exports = {
  VALID_STATUSES,
  VALID_PRIORITIES,
  VALID_SORT_FIELDS,
  VALID_SORT_ORDERS,
  validateTaskId,
  validateCreateTaskBody,
  validateUpdateTaskBody,
  validateGetTasksQuery,
  validateAdvancedSearchQuery,
  validateBulkUpdateBody,
  validateBulkDeleteBody,
};
