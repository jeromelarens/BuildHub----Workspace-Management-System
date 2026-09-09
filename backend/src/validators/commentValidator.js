/**
 * Comment Input Validation Rules & Functions
 * Pure JavaScript validators with strict schema and boundary checks.
 */

const ALLOWED_COMMENT_FIELDS = ['comment'];

/**
 * Validate Comment ID Route Parameter
 * @param {any} idParam 
 * @returns {{ isValid: boolean, error?: string, parsedId?: number }}
 */
const validateCommentId = (idParam) => {
  if (idParam === undefined || idParam === null || typeof idParam !== 'string') {
    return {
      isValid: false,
      error: 'Invalid comment ID. ID must be a positive integer',
    };
  }

  const trimmed = idParam.trim();
  const integerRegex = /^[1-9]\d*$/;

  if (!integerRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid comment ID. ID must be a positive integer',
    };
  }

  const parsedId = parseInt(trimmed, 10);
  if (isNaN(parsedId) || parsedId <= 0 || !Number.isSafeInteger(parsedId)) {
    return {
      isValid: false,
      error: 'Invalid comment ID. ID must be a positive integer',
    };
  }

  return {
    isValid: true,
    parsedId,
  };
};

/**
 * Validate Create/Update Comment Request Body
 * @param {any} body 
 * @returns {{ isValid: boolean, errors?: Record<string, string>, normalizedData?: { comment: string } }}
 */
const validateCommentBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object' },
    };
  }

  const errors = {};

  const bodyKeys = Object.keys(body);
  for (const key of bodyKeys) {
    if (!ALLOWED_COMMENT_FIELDS.includes(key)) {
      errors[key] = `Unexpected field '${key}' is not allowed`;
    }
  }

  const { comment } = body;

  if (comment === undefined || comment === null) {
    errors.comment = 'Comment text is required';
  } else if (typeof comment !== 'string') {
    errors.comment = 'Comment must be a string';
  } else {
    const trimmedComment = comment.trim();
    if (trimmedComment.length === 0) {
      errors.comment = 'Comment cannot be empty or whitespace only';
    } else if (trimmedComment.length > 2000) {
      errors.comment = 'Comment must not exceed 2000 characters';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      comment: comment.trim(),
    },
  };
};

module.exports = {
  validateCommentId,
  validateCommentBody,
};
