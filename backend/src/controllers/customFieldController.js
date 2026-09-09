const customFieldService = require('../services/customFieldService');
const { logAuditEvent } = require('../services/auditService');

/**
 * Create custom field definition
 * POST /api/custom-fields/definitions
 */
const createFieldDefinition = async (req, res) => {
  try {
    const { name, field_key, field_type, entity_type, is_required, options, default_value, position } = req.body;
    const workspaceId = req.workspace.id;
    const userId = req.user.id;

    const definition = await customFieldService.createFieldDefinition({
      workspaceId,
      entityType: entity_type || 'task',
      name,
      fieldKey: field_key,
      fieldType: field_type,
      isRequired: is_required,
      options,
      defaultValue: default_value,
      position,
      userId,
    });

    await logAuditEvent({
      userId,
      action: 'CUSTOM_FIELD_DEFINITION_CREATED',
      entityType: 'custom_field_definition',
      entityId: definition.id,
      req,
      details: { workspaceId, name: definition.name, field_key: definition.field_key, field_type: definition.field_type },
    });

    return res.status(201).json({
      success: true,
      message: 'Custom field definition created successfully',
      data: definition,
    });
  } catch (error) {
    console.error('Error in createFieldDefinition:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get all custom field definitions for entity in workspace
 * GET /api/custom-fields/definitions
 */
const getFieldDefinitions = async (req, res) => {
  try {
    const workspaceId = req.workspace.id;
    const entityType = req.query.entity_type || 'task';

    const definitions = await customFieldService.getFieldDefinitions(workspaceId, entityType);

    return res.status(200).json({
      success: true,
      data: definitions,
    });
  } catch (error) {
    console.error('Error in getFieldDefinitions:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Update custom field definition
 * PUT /api/custom-fields/definitions/:id
 */
const updateFieldDefinition = async (req, res) => {
  try {
    const definitionId = parseInt(req.params.id, 10);
    const workspaceId = req.workspace.id;

    const updated = await customFieldService.updateFieldDefinition(definitionId, workspaceId, req.body);

    await logAuditEvent({
      userId: req.user.id,
      action: 'CUSTOM_FIELD_DEFINITION_UPDATED',
      entityType: 'custom_field_definition',
      entityId: definitionId,
      req,
      details: { updates: req.body },
    });

    return res.status(200).json({
      success: true,
      message: 'Custom field definition updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error in updateFieldDefinition:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Delete custom field definition
 * DELETE /api/custom-fields/definitions/:id
 */
const deleteFieldDefinition = async (req, res) => {
  try {
    const definitionId = parseInt(req.params.id, 10);
    const workspaceId = req.workspace.id;

    const result = await customFieldService.deleteFieldDefinition(definitionId, workspaceId);

    await logAuditEvent({
      userId: req.user.id,
      action: 'CUSTOM_FIELD_DEFINITION_DELETED',
      entityType: 'custom_field_definition',
      entityId: definitionId,
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Custom field definition deleted successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error in deleteFieldDefinition:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Set custom field values for an entity
 * POST /api/custom-fields/values/:entityType/:entityId
 */
const setEntityFieldValues = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const parsedEntityId = parseInt(entityId, 10);
    const workspaceId = req.workspace.id;

    if (isNaN(parsedEntityId)) {
      return res.status(400).json({ success: false, message: 'Invalid entity ID' });
    }

    const savedValues = await customFieldService.setEntityCustomFieldValues(
      workspaceId,
      entityType,
      parsedEntityId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: 'Custom field values saved successfully',
      data: savedValues,
    });
  } catch (error) {
    console.error('Error in setEntityFieldValues:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get custom field values for an entity
 * GET /api/custom-fields/values/:entityType/:entityId
 */
const getEntityFieldValues = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const parsedEntityId = parseInt(entityId, 10);
    const workspaceId = req.workspace.id;

    if (isNaN(parsedEntityId)) {
      return res.status(400).json({ success: false, message: 'Invalid entity ID' });
    }

    const values = await customFieldService.getEntityCustomFieldValues(
      workspaceId,
      entityType,
      parsedEntityId
    );

    return res.status(200).json({
      success: true,
      data: values,
    });
  } catch (error) {
    console.error('Error in getEntityFieldValues:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  createFieldDefinition,
  getFieldDefinitions,
  updateFieldDefinition,
  deleteFieldDefinition,
  setEntityFieldValues,
  getEntityFieldValues,
};
