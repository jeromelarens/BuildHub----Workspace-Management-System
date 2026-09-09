const webhookService = require('../services/webhookService');
const { logAuditEvent } = require('../services/auditService');

/**
 * Create a new webhook endpoint
 * POST /api/webhooks
 */
const createWebhookEndpoint = async (req, res) => {
  try {
    const { url, description, events } = req.body;
    const workspaceId = req.workspace.id;
    const userId = req.user.id;

    const endpoint = await webhookService.createWebhookEndpoint({
      workspaceId,
      url,
      description,
      events,
      userId,
    });

    await logAuditEvent({
      userId,
      action: 'WEBHOOK_ENDPOINT_CREATED',
      entityType: 'webhook_endpoint',
      entityId: endpoint.id,
      req,
      details: { workspaceId, url: endpoint.url, events: endpoint.events },
    });

    return res.status(201).json({
      success: true,
      message: 'Webhook endpoint registered successfully',
      data: endpoint,
    });
  } catch (error) {
    console.error('Error in createWebhookEndpoint:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get all webhook endpoints for the current workspace
 * GET /api/webhooks
 */
const getWorkspaceWebhookEndpoints = async (req, res) => {
  try {
    const workspaceId = req.workspace.id;
    const endpoints = await webhookService.getWorkspaceWebhookEndpoints(workspaceId);

    return res.status(200).json({
      success: true,
      data: endpoints,
    });
  } catch (error) {
    console.error('Error in getWorkspaceWebhookEndpoints:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get single webhook endpoint by ID
 * GET /api/webhooks/:id
 */
const getWebhookEndpointById = async (req, res) => {
  try {
    const endpointId = parseInt(req.params.id, 10);
    const workspaceId = req.workspace.id;

    const endpoint = await webhookService.getWebhookEndpointById(endpointId, workspaceId);
    if (!endpoint) {
      return res.status(404).json({ success: false, message: 'Webhook endpoint not found' });
    }

    return res.status(200).json({
      success: true,
      data: endpoint,
    });
  } catch (error) {
    console.error('Error in getWebhookEndpointById:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Update webhook endpoint
 * PUT /api/webhooks/:id
 */
const updateWebhookEndpoint = async (req, res) => {
  try {
    const endpointId = parseInt(req.params.id, 10);
    const workspaceId = req.workspace.id;

    const updated = await webhookService.updateWebhookEndpoint(endpointId, workspaceId, req.body);

    await logAuditEvent({
      userId: req.user.id,
      action: 'WEBHOOK_ENDPOINT_UPDATED',
      entityType: 'webhook_endpoint',
      entityId: endpointId,
      req,
      details: { updates: req.body },
    });

    return res.status(200).json({
      success: true,
      message: 'Webhook endpoint updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error in updateWebhookEndpoint:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Delete webhook endpoint
 * DELETE /api/webhooks/:id
 */
const deleteWebhookEndpoint = async (req, res) => {
  try {
    const endpointId = parseInt(req.params.id, 10);
    const workspaceId = req.workspace.id;

    const result = await webhookService.deleteWebhookEndpoint(endpointId, workspaceId);

    await logAuditEvent({
      userId: req.user.id,
      action: 'WEBHOOK_ENDPOINT_DELETED',
      entityType: 'webhook_endpoint',
      entityId: endpointId,
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Webhook endpoint deleted successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error in deleteWebhookEndpoint:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get delivery attempts for a webhook endpoint
 * GET /api/webhooks/:id/deliveries
 */
const getEndpointDeliveries = async (req, res) => {
  try {
    const endpointId = parseInt(req.params.id, 10);
    const workspaceId = req.workspace.id;
    const limit = parseInt(req.query.limit, 10) || 50;

    const deliveries = await webhookService.getEndpointDeliveries(endpointId, workspaceId, limit);

    return res.status(200).json({
      success: true,
      data: deliveries,
    });
  } catch (error) {
    console.error('Error in getEndpointDeliveries:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Test trigger webhook event in current workspace
 * POST /api/webhooks/test-trigger
 */
const testTriggerEvent = async (req, res) => {
  try {
    const workspaceId = req.workspace.id;
    const { event_type, payload } = req.body;

    const result = await webhookService.publishWebhookEvent(
      workspaceId,
      event_type || 'test.event',
      payload || { message: 'Test webhook event payload from TaskFlow' }
    );

    return res.status(200).json({
      success: true,
      message: 'Webhook test event dispatched',
      data: result,
    });
  } catch (error) {
    console.error('Error in testTriggerEvent:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createWebhookEndpoint,
  getWorkspaceWebhookEndpoints,
  getWebhookEndpointById,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  getEndpointDeliveries,
  testTriggerEvent,
};
