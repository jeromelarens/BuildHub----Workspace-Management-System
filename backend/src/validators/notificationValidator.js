/**
 * Notification Input Validation
 */

const ALLOWED_QUERY_FIELDS = ['is_read', 'type', 'page', 'limit'];

const validateNotificationId = (idParam) => {
  if (idParam === undefined || idParam === null || typeof idParam !== 'string') {
    return {
      isValid: false,
      error: 'Invalid notification ID. ID must be a positive integer',
    };
  }

  const trimmed = idParam.trim();
  const integerRegex = /^[1-9]\d*$/;

  if (!integerRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid notification ID. ID must be a positive integer',
    };
  }

  const parsedId = parseInt(trimmed, 10);
  if (isNaN(parsedId) || parsedId <= 0 || !Number.isSafeInteger(parsedId)) {
    return {
      isValid: false,
      error: 'Invalid notification ID. ID must be a positive integer',
    };
  }

  return {
    isValid: true,
    parsedId,
  };
};

const validateGetNotificationsQuery = (query) => {
  if (!query || typeof query !== 'object') {
    return { isValid: true, normalizedQuery: {} };
  }

  const errors = {};
  const queryKeys = Object.keys(query);
  for (const key of queryKeys) {
    if (!ALLOWED_QUERY_FIELDS.includes(key)) {
      errors[key] = `Unexpected query parameter '${key}' is not allowed`;
    }
  }

  const normalizedQuery = {};

  // is_read filter
  if (query.is_read !== undefined && query.is_read !== null && query.is_read !== '') {
    const val = String(query.is_read).trim().toLowerCase();
    if (val === 'true' || val === '1') {
      normalizedQuery.is_read = true;
    } else if (val === 'false' || val === '0') {
      normalizedQuery.is_read = false;
    } else {
      errors.is_read = 'is_read must be a boolean (true or false)';
    }
  }

  // type filter
  if (query.type !== undefined && query.type !== null && query.type !== '') {
    if (typeof query.type !== 'string') {
      errors.type = 'type must be a string';
    } else {
      normalizedQuery.type = query.type.trim();
    }
  }

  // page
  if (query.page !== undefined && query.page !== null && query.page !== '') {
    const pageNum = parseInt(String(query.page).trim(), 10);
    if (isNaN(pageNum) || pageNum < 1 || String(pageNum) !== String(query.page).trim()) {
      errors.page = 'Page must be a positive integer greater than or equal to 1';
    } else {
      normalizedQuery.page = pageNum;
    }
  }

  // limit
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

module.exports = {
  validateNotificationId,
  validateGetNotificationsQuery,
};
