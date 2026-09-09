const db = require('../config/database');

const SUPPORTED_FIELD_TYPES = ['text', 'number', 'boolean', 'date', 'select', 'multi_select', 'url'];

/**
 * Validate typed custom field value against definition
 */
const validateFieldValue = (definition, value) => {
  if (value === null || value === undefined || value === '') {
    if (definition.is_required) {
      throw new Error(`Custom field "${definition.name}" (${definition.field_key}) is required`);
    }
    return { stringVal: null, numVal: null, boolVal: null, dateVal: null, jsonVal: null };
  }

  let stringVal = null;
  let numVal = null;
  let boolVal = null;
  let dateVal = null;
  let jsonVal = null;

  switch (definition.field_type) {
    case 'text':
      stringVal = String(value);
      break;

    case 'number':
      const num = Number(value);
      if (isNaN(num)) {
        throw new Error(`Field "${definition.name}" expects a valid number, received "${value}"`);
      }
      numVal = num;
      break;

    case 'boolean':
      if (typeof value === 'boolean') {
        boolVal = value;
      } else if (value === 'true' || value === '1' || value === 1) {
        boolVal = true;
      } else if (value === 'false' || value === '0' || value === 0) {
        boolVal = false;
      } else {
        throw new Error(`Field "${definition.name}" expects a boolean (true/false)`);
      }
      break;

    case 'date':
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        throw new Error(`Field "${definition.name}" expects a valid date/timestamp`);
      }
      dateVal = d.toISOString();
      break;

    case 'select':
      const allowedOptions = Array.isArray(definition.options)
        ? definition.options
        : (typeof definition.options === 'string' ? JSON.parse(definition.options) : []);
      if (!allowedOptions.includes(value)) {
        throw new Error(`Invalid option "${value}" for field "${definition.name}". Allowed options: ${allowedOptions.join(', ')}`);
      }
      stringVal = String(value);
      break;

    case 'multi_select':
      const multiAllowed = Array.isArray(definition.options)
        ? definition.options
        : (typeof definition.options === 'string' ? JSON.parse(definition.options) : []);
      const selected = Array.isArray(value) ? value : [value];
      for (const opt of selected) {
        if (!multiAllowed.includes(opt)) {
          throw new Error(`Invalid option "${opt}" for multi-select field "${definition.name}". Allowed: ${multiAllowed.join(', ')}`);
        }
      }
      jsonVal = selected;
      break;

    case 'url':
      try {
        new URL(String(value));
        stringVal = String(value);
      } catch {
        throw new Error(`Field "${definition.name}" expects a valid URL (e.g. https://example.com)`);
      }
      break;

    default:
      stringVal = String(value);
  }

  return { stringVal, numVal, boolVal, dateVal, jsonVal };
};

/**
 * Create a new custom field definition in a workspace
 */
const createFieldDefinition = async ({ workspaceId, entityType = 'task', name, fieldKey, fieldType, isRequired = false, options = [], defaultValue = null, position = 0, userId }) => {
  if (!SUPPORTED_FIELD_TYPES.includes(fieldType)) {
    throw new Error(`Unsupported field type "${fieldType}". Supported types: ${SUPPORTED_FIELD_TYPES.join(', ')}`);
  }

  const normalizedKey = (fieldKey || name.toLowerCase().replace(/[^a-z0-9_]/g, '_')).trim();

  // Check unique key in workspace + entity_type
  const existing = await db.query(`
    SELECT id FROM custom_field_definitions
    WHERE workspace_id = $1 AND entity_type = $2 AND field_key = $3;
  `, [workspaceId, entityType, normalizedKey]);

  if (existing.rows.length > 0) {
    throw new Error(`A custom field with key "${normalizedKey}" already exists for ${entityType} in this workspace`);
  }

  const result = await db.query(`
    INSERT INTO custom_field_definitions (
      workspace_id, entity_type, name, field_key, field_type,
      is_required, options, default_value, position, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `, [
    workspaceId,
    entityType,
    name,
    normalizedKey,
    fieldType,
    Boolean(isRequired),
    JSON.stringify(Array.isArray(options) ? options : []),
    defaultValue ? JSON.stringify(defaultValue) : null,
    Number(position) || 0,
    userId,
  ]);

  return result.rows[0];
};

/**
 * Get all custom field definitions for an entity in a workspace
 */
const getFieldDefinitions = async (workspaceId, entityType = 'task') => {
  const result = await db.query(`
    SELECT * FROM custom_field_definitions
    WHERE workspace_id = $1 AND entity_type = $2
    ORDER BY position ASC, id ASC;
  `, [workspaceId, entityType]);

  return result.rows;
};

/**
 * Update custom field definition
 */
const updateFieldDefinition = async (definitionId, workspaceId, updates) => {
  const existingRes = await db.query(`
    SELECT * FROM custom_field_definitions
    WHERE id = $1 AND workspace_id = $2;
  `, [definitionId, workspaceId]);

  if (existingRes.rows.length === 0) {
    throw new Error('Custom field definition not found or access denied in this workspace');
  }

  const current = existingRes.rows[0];
  const name = updates.name !== undefined ? updates.name : current.name;
  const isRequired = updates.is_required !== undefined ? Boolean(updates.is_required) : current.is_required;
  const options = updates.options !== undefined ? JSON.stringify(updates.options) : current.options;
  const defaultValue = updates.default_value !== undefined ? JSON.stringify(updates.default_value) : current.default_value;
  const position = updates.position !== undefined ? Number(updates.position) : current.position;

  const result = await db.query(`
    UPDATE custom_field_definitions
    SET name = $1, is_required = $2, options = $3, default_value = $4, position = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6 AND workspace_id = $7
    RETURNING *;
  `, [name, isRequired, options, defaultValue, position, definitionId, workspaceId]);

  return result.rows[0];
};

/**
 * Delete custom field definition and cascade values
 */
const deleteFieldDefinition = async (definitionId, workspaceId) => {
  const result = await db.query(`
    DELETE FROM custom_field_definitions
    WHERE id = $1 AND workspace_id = $2
    RETURNING id;
  `, [definitionId, workspaceId]);

  if (result.rows.length === 0) {
    throw new Error('Custom field definition not found or access denied');
  }

  return { success: true, deletedId: definitionId };
};

/**
 * Set custom field values for an entity
 */
const setEntityCustomFieldValues = async (workspaceId, entityType, entityId, valuesObject) => {
  // Get all definitions for this workspace and entityType
  const defsRes = await db.query(`
    SELECT * FROM custom_field_definitions
    WHERE workspace_id = $1 AND entity_type = $2;
  `, [workspaceId, entityType]);

  const definitions = defsRes.rows;
  const defMap = new Map();
  for (const def of definitions) {
    defMap.set(def.field_key, def);
    defMap.set(String(def.id), def);
  }

  const savedValues = [];

  for (const [keyOrId, rawValue] of Object.entries(valuesObject)) {
    const definition = defMap.get(keyOrId);
    if (!definition) {
      continue; // Ignore fields not defined in this workspace
    }

    const { stringVal, numVal, boolVal, dateVal, jsonVal } = validateFieldValue(definition, rawValue);

    const upsertRes = await db.query(`
      INSERT INTO custom_field_values (
        field_definition_id, entity_type, entity_id,
        string_value, number_value, boolean_value, date_value, json_value, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (field_definition_id, entity_id) DO UPDATE SET
        string_value = EXCLUDED.string_value,
        number_value = EXCLUDED.number_value,
        boolean_value = EXCLUDED.boolean_value,
        date_value = EXCLUDED.date_value,
        json_value = EXCLUDED.json_value,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `, [
      definition.id,
      entityType,
      entityId,
      stringVal,
      numVal,
      boolVal,
      dateVal,
      jsonVal ? JSON.stringify(jsonVal) : null,
    ]);

    savedValues.push({
      field_key: definition.field_key,
      name: definition.name,
      field_type: definition.field_type,
      value: rawValue,
      rawRecord: upsertRes.rows[0],
    });
  }

  return savedValues;
};

/**
 * Get all custom field values for a specific entity
 */
const getEntityCustomFieldValues = async (workspaceId, entityType, entityId) => {
  const result = await db.query(`
    SELECT cfd.id AS definition_id, cfd.name, cfd.field_key, cfd.field_type, cfd.is_required, cfd.options,
           cfv.id AS value_id, cfv.string_value, cfv.number_value, cfv.boolean_value, cfv.date_value, cfv.json_value
    FROM custom_field_definitions cfd
    LEFT JOIN custom_field_values cfv ON cfd.id = cfv.field_definition_id AND cfv.entity_id = $1 AND cfv.entity_type = $2
    WHERE cfd.workspace_id = $3 AND cfd.entity_type = $2
    ORDER BY cfd.position ASC, cfd.id ASC;
  `, [entityId, entityType, workspaceId]);

  return result.rows.map((row) => {
    let resolvedValue = null;
    switch (row.field_type) {
      case 'number':
        resolvedValue = row.number_value !== null ? Number(row.number_value) : null;
        break;
      case 'boolean':
        resolvedValue = row.boolean_value;
        break;
      case 'date':
        resolvedValue = row.date_value;
        break;
      case 'multi_select':
        resolvedValue = row.json_value ? (typeof row.json_value === 'string' ? JSON.parse(row.json_value) : row.json_value) : [];
        break;
      default:
        resolvedValue = row.string_value;
    }

    return {
      definition_id: row.definition_id,
      name: row.name,
      field_key: row.field_key,
      field_type: row.field_type,
      is_required: row.is_required,
      options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      value: resolvedValue,
    };
  });
};

module.exports = {
  SUPPORTED_FIELD_TYPES,
  validateFieldValue,
  createFieldDefinition,
  getFieldDefinitions,
  updateFieldDefinition,
  deleteFieldDefinition,
  setEntityCustomFieldValues,
  getEntityCustomFieldValues,
};
