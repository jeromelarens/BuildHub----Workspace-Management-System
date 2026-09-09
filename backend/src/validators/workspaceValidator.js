/**
 * Workspace Input Validators
 */

const validateCreateWorkspaceBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { isValid: false, errors: { body: 'Request body must be an object' } };
  }
  const errors = {};
  const { name, slug, description } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.name = 'Workspace name is required';
  } else if (name.trim().length > 100) {
    errors.name = 'Workspace name must not exceed 100 characters';
  }

  if (slug !== undefined && slug !== null) {
    if (typeof slug !== 'string' || slug.trim().length === 0) {
      errors.slug = 'Slug must be a non-empty string';
    } else if (slug.length > 100) {
      errors.slug = 'Slug must not exceed 100 characters';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      name: name.trim(),
      slug: slug ? slug.trim().toLowerCase() : null,
      description: description ? description.trim() : null,
    },
  };
};

const validateAddWorkspaceMemberBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { isValid: false, errors: { body: 'Request body must be an object' } };
  }
  const errors = {};
  const { user_id, role } = body;

  const targetUserId = parseInt(user_id, 10);
  if (!user_id || isNaN(targetUserId) || targetUserId <= 0) {
    errors.user_id = 'Valid numeric user_id is required';
  }

  const allowedRoles = ['owner', 'admin', 'member', 'viewer'];
  if (role && !allowedRoles.includes(role)) {
    errors.role = `Invalid workspace role. Allowed: ${allowedRoles.join(', ')}`;
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      targetUserId,
      role: role || 'member',
    },
  };
};

module.exports = {
  validateCreateWorkspaceBody,
  validateAddWorkspaceMemberBody,
};
