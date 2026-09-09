/**
 * Custom Fields Input Validators
 */

const { SUPPORTED_FIELD_TYPES } = require('../services/customFieldService');

const validateCreateFieldDefinitionBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { isValid: false, errors: { body: 'Request body must be an object' } };
  }
  const errors = {};
  const { name, field_key, field_type, entity_type, is_required, options, default_value, position } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.name = 'Field name is required';
  }

  if (!field_type || !SUPPORTED_FIELD_TYPES.includes(field_type)) {
    errors.field_type = `Invalid field type. Supported types: ${SUPPORTED_FIELD_TYPES.join(', ')}`;
  }

  if (['select', 'multi_select'].includes(field_type)) {
    if (!Array.isArray(options) || options.length === 0) {
      errors.options = 'Options array is required for select and multi_select field types';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      name: name.trim(),
      fieldKey: field_key ? field_key.trim() : null,
      fieldType: field_type,
      entityType: entity_type || 'task',
      isRequired: Boolean(is_required),
      options: options || [],
      defaultValue: default_value || null,
      position: Number(position) || 0,
    },
  };
};

const validateSetFieldValuesBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { isValid: false, errors: { body: 'Request body must be an object containing field values' } };
  }
  return {
    isValid: true,
    normalizedData: body,
  };
};

module.exports = {
  validateCreateFieldDefinitionBody,
  validateSetFieldValuesBody,
};
