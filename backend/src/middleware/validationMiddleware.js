const {
  validateRegisterBody,
  validateLoginBody,
  validateForgotPasswordBody,
  validateResetPasswordBody,
  validateVerifyEmailBody,
  validateResendVerificationBody,
} = require('../validators/authValidator');
const {
  validateTaskId,
  validateCreateTaskBody,
  validateUpdateTaskBody,
  validateGetTasksQuery,
  validateAdvancedSearchQuery,
  validateBulkUpdateBody,
  validateBulkDeleteBody,
} = require('../validators/taskValidator');

/**
 * Middleware to enforce Content-Type: application/json for requests with payloads
 */
const requireJsonContentType = (req, res, next) => {
  const methodsWithBody = ['POST', 'PUT', 'PATCH'];
  if (methodsWithBody.includes(req.method)) {
    const contentType = req.headers['content-type'] || '';
    const contentLength = req.headers['content-length'];

    // If there is content or chunked transfer, require application/json (unless multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      return next();
    }

    if ((contentLength && parseInt(contentLength, 10) > 0) || req.headers['transfer-encoding']) {
      if (!contentType.includes('application/json')) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: {
            header: 'Content-Type must be application/json',
          },
        });
      }
    }
  }
  next();
};

/**
 * Validate Registration Request
 */
const validateRegister = (req, res, next) => {
  const validation = validateRegisterBody(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  req.body = validation.normalizedData;
  req.validatedBody = validation.normalizedData;
  next();
};

/**
 * Validate Login Request
 */
const validateLogin = (req, res, next) => {
  const validation = validateLoginBody(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  req.body = validation.normalizedData;
  req.validatedBody = validation.normalizedData;
  next();
};

/**
 * Validate Forgot Password Request
 */
const validateForgotPassword = (req, res, next) => {
  const validation = validateForgotPasswordBody(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  req.body = validation.normalizedData;
  next();
};

/**
 * Validate Reset Password Request
 */
const validateResetPassword = (req, res, next) => {
  const validation = validateResetPasswordBody(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  req.body = validation.normalizedData;
  next();
};

/**
 * Validate Verify Email Request
 */
const validateVerifyEmail = (req, res, next) => {
  const validation = validateVerifyEmailBody(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  req.body = validation.normalizedData;
  next();
};

/**
 * Validate Resend Verification Request
 */
const validateResendVerification = (req, res, next) => {
  const validation = validateResendVerificationBody(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  req.body = validation.normalizedData;
  next();
};

/**
 * Validate Task Creation Request
 */
const validateCreateTask = (req, res, next) => {
  const validation = validateCreateTaskBody(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  req.body = validation.normalizedData;
  req.validatedData = validation.normalizedData;
  next();
};

/**
 * Validate Task Update Request
 */
const validateUpdateTask = (req, res, next) => {
  const validation = validateUpdateTaskBody(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  req.body = validation.normalizedData;
  req.validatedData = validation.normalizedData;
  next();
};

/**
 * Validate Task ID Route Parameter
 */
const validateTaskIdParam = (req, res, next) => {
  const validation = validateTaskId(req.params.id);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.error || 'Invalid task ID. ID must be a positive integer',
      errors: {
        id: validation.error || 'Invalid task ID',
      },
    });
  }

  req.params.id = validation.parsedId;
  req.taskId = validation.parsedId;
  next();
};

/**
 * Validate Get Tasks Query Parameters
 */
const validateGetTasksQueryParam = (req, res, next) => {
  const validation = validateGetTasksQuery(req.query);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  req.validatedQuery = validation.normalizedQuery;
  next();
};

/**
 * Validate Advanced Search Query Parameters
 */
const validateAdvancedSearchParam = (req, res, next) => {
  const validation = validateAdvancedSearchQuery(req.query);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  req.validatedQuery = validation.normalizedQuery;
  next();
};

/**
 * Validate Bulk Update Request Body
 */
const validateBulkUpdate = (req, res, next) => {
  const validation = validateBulkUpdateBody(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  req.validatedData = validation.normalizedData;
  next();
};

/**
 * Validate Bulk Delete Request Body
 */
const validateBulkDelete = (req, res, next) => {
  const validation = validateBulkDeleteBody(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  req.validatedData = validation.normalizedData;
  next();
};

module.exports = {
  requireJsonContentType,
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyEmail,
  validateResendVerification,
  validateCreateTask,
  validateUpdateTask,
  validateTaskIdParam,
  validateGetTasksQuery: validateGetTasksQueryParam,
  validateAdvancedSearch: validateAdvancedSearchParam,
  validateBulkUpdate,
  validateBulkDelete,
};

