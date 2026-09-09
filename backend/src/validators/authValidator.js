/**
 * Authentication Input Validation Rules & Functions
 * Pure JavaScript validators with strict schema and boundary checks.
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const ALLOWED_REGISTER_FIELDS = ['name', 'email', 'password', 'role'];
const ALLOWED_PUBLIC_REGISTRATION_ROLES = ['employee', 'manager'];
const ALLOWED_LOGIN_FIELDS = ['email', 'password'];

/**
 * Validate Registration Request Body
 * @param {any} body 
 * @returns {{ isValid: boolean, errors?: Record<string, string>, normalizedData?: { name: string, email: string, password: string, role: string } }}
 */
const validateRegisterBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object' },
    };
  }

  const errors = {};

  // Check for unexpected fields (prevent mass-assignment)
  const bodyKeys = Object.keys(body);
  for (const key of bodyKeys) {
    if (!ALLOWED_REGISTER_FIELDS.includes(key)) {
      errors[key] = `Unexpected field '${key}' is not allowed`;
    }
  }

  const { name, email, password, role } = body;

  // Validate 'name'
  if (name === undefined || name === null) {
    errors.name = 'Name is required';
  } else if (typeof name !== 'string') {
    errors.name = 'Name must be a string';
  } else {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      errors.name = 'Name cannot be empty or whitespace only';
    } else if (trimmedName.length > 100) {
      errors.name = 'Name must not exceed 100 characters';
    }
  }

  // Validate 'email'
  if (email === undefined || email === null) {
    errors.email = 'Email is required';
  } else if (typeof email !== 'string') {
    errors.email = 'Email must be a string';
  } else {
    const trimmedEmail = email.trim();
    if (trimmedEmail.length === 0) {
      errors.email = 'Email cannot be empty';
    } else if (trimmedEmail.length > 150) {
      errors.email = 'Email must not exceed 150 characters';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Please provide a valid email address';
    }
  }

  // Validate 'password'
  if (password === undefined || password === null) {
    errors.password = 'Password is required';
  } else if (typeof password !== 'string') {
    errors.password = 'Password must be a string';
  } else {
    if (password.length === 0 || password.trim().length === 0) {
      errors.password = 'Password cannot be empty or whitespace only';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    } else if (password.length > 128) {
      errors.password = 'Password must not exceed 128 characters';
    }
  }

  // Validate 'role' (optional, defaults to 'employee' if omitted; only 'employee' and 'manager' permitted)
  let resolvedRole = 'employee';
  if (role !== undefined && role !== null) {
    if (typeof role !== 'string') {
      errors.role = 'Role must be a string';
    } else {
      const exactRole = role.trim();
      if (!ALLOWED_PUBLIC_REGISTRATION_ROLES.includes(exactRole)) {
        errors.role = `Invalid registration role. Public registration allows only: ${ALLOWED_PUBLIC_REGISTRATION_ROLES.join(', ')}`;
      } else {
        resolvedRole = exactRole;
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
      email: email.trim().toLowerCase(),
      password, // Password is NOT trimmed to preserve user intent
      role: resolvedRole,
    },
  };
};

/**
 * Validate Login Request Body
 * @param {any} body 
 * @returns {{ isValid: boolean, errors?: Record<string, string>, normalizedData?: { email: string, password: string } }}
 */
const validateLoginBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object' },
    };
  }

  const errors = {};

  // Check for unexpected fields
  const bodyKeys = Object.keys(body);
  for (const key of bodyKeys) {
    if (!ALLOWED_LOGIN_FIELDS.includes(key)) {
      errors[key] = `Unexpected field '${key}' is not allowed`;
    }
  }

  const { email, password } = body;

  // Validate 'email'
  if (email === undefined || email === null) {
    errors.email = 'Email is required';
  } else if (typeof email !== 'string') {
    errors.email = 'Email must be a string';
  } else {
    const trimmedEmail = email.trim();
    if (trimmedEmail.length === 0) {
      errors.email = 'Email cannot be empty';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Please provide a valid email address';
    }
  }

  // Validate 'password'
  if (password === undefined || password === null) {
    errors.password = 'Password is required';
  } else if (typeof password !== 'string') {
    errors.password = 'Password must be a string';
  } else if (password.length === 0) {
    errors.password = 'Password cannot be empty';
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      email: email.trim().toLowerCase(),
      password,
    },
  };
};

/**
 * Validate Forgot Password Request Body
 */
const validateForgotPasswordBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object' },
    };
  }

  const errors = {};
  const { email } = body;

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Please provide a valid email address';
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      email: email.trim().toLowerCase(),
    },
  };
};

/**
 * Validate Reset Password Request Body
 */
const validateResetPasswordBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object' },
    };
  }

  const errors = {};
  const { token, newPassword } = body;

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    errors.token = 'Reset token is required';
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    errors.newPassword = 'New password must be at least 6 characters long';
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      token: token.trim(),
      newPassword,
    },
  };
};

/**
 * Validate Verify Email Request Body
 */
const validateVerifyEmailBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object' },
    };
  }

  const errors = {};
  const { token } = body;

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    errors.token = 'Verification token is required';
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      token: token.trim(),
    },
  };
};

/**
 * Validate Resend Verification Request Body
 */
const validateResendVerificationBody = (body) => {
  return validateForgotPasswordBody(body);
};

module.exports = {
  validateRegisterBody,
  validateLoginBody,
  validateForgotPasswordBody,
  validateResetPasswordBody,
  validateVerifyEmailBody,
  validateResendVerificationBody,
  ALLOWED_PUBLIC_REGISTRATION_ROLES,
};

