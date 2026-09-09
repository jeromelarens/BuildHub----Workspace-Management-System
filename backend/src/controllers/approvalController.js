const approvalService = require('../services/approvalService');
const { logAuditEvent } = require('../services/auditService');

/**
 * Create approval workflow
 * POST /api/approvals/workflows
 */
const createWorkflow = async (req, res) => {
  try {
    const { name, entity_type, description, steps } = req.body;
    const workspaceId = req.workspace.id;
    const userId = req.user.id;

    const workflow = await approvalService.createApprovalWorkflow({
      workspaceId,
      name,
      entityType: entity_type || 'task',
      description,
      steps,
      userId,
    });

    await logAuditEvent({
      userId,
      action: 'APPROVAL_WORKFLOW_CREATED',
      entityType: 'approval_workflow',
      entityId: workflow.id,
      req,
      details: { workspaceId, name: workflow.name, stepsCount: workflow.steps.length },
    });

    return res.status(201).json({
      success: true,
      message: 'Approval workflow created successfully',
      data: workflow,
    });
  } catch (error) {
    console.error('Error in createWorkflow:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get all approval workflows for workspace
 * GET /api/approvals/workflows
 */
const getWorkflows = async (req, res) => {
  try {
    const workspaceId = req.workspace.id;
    const workflows = await approvalService.getWorkspaceApprovalWorkflows(workspaceId);

    return res.status(200).json({
      success: true,
      data: workflows,
    });
  } catch (error) {
    console.error('Error in getWorkflows:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Submit approval request
 * POST /api/approvals/requests
 */
const submitRequest = async (req, res) => {
  try {
    const { workflow_id, entity_type, entity_id } = req.body;
    const workspaceId = req.workspace.id;
    const requesterId = req.user.id;

    const request = await approvalService.submitApprovalRequest({
      workspaceId,
      workflowId: workflow_id,
      entityType: entity_type || 'task',
      entityId: entity_id,
      requesterId,
    });

    await logAuditEvent({
      userId: requesterId,
      action: 'APPROVAL_REQUEST_SUBMITTED',
      entityType: 'approval_request',
      entityId: request.id,
      req,
      details: { workspaceId, workflowId: workflow_id, entity_type, entity_id },
    });

    return res.status(201).json({
      success: true,
      message: 'Approval request submitted successfully',
      data: request,
    });
  } catch (error) {
    console.error('Error in submitRequest:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * List approval requests
 * GET /api/approvals/requests
 */
const listRequests = async (req, res) => {
  try {
    const workspaceId = req.workspace.id;
    const { status, entity_type, limit, offset } = req.query;

    const requests = await approvalService.listApprovalRequests(workspaceId, {
      status,
      entityType: entity_type,
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
    });

    return res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('Error in listRequests:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get single approval request by ID
 * GET /api/approvals/requests/:id
 */
const getRequestById = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const workspaceId = req.workspace.id;

    const request = await approvalService.getApprovalRequestById(requestId, workspaceId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Approval request not found' });
    }

    return res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error('Error in getRequestById:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Perform approval action (approve, reject, cancel)
 * POST /api/approvals/requests/:id/actions
 */
const performAction = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const workspaceId = req.workspace.id;
    const { action, reason } = req.body;

    const updatedRequest = await approvalService.processApprovalAction({
      requestId,
      workspaceId,
      actorId: req.user.id,
      actorRole: req.user.role,
      action,
      reason,
    });

    await logAuditEvent({
      userId: req.user.id,
      action: `APPROVAL_REQUEST_${action.toUpperCase()}`,
      entityType: 'approval_request',
      entityId: requestId,
      req,
      details: { action, reason },
    });

    return res.status(200).json({
      success: true,
      message: `Approval request ${action} successfully`,
      data: updatedRequest,
    });
  } catch (error) {
    console.error('Error in performAction:', error.message);
    const status = error.message.includes('permission') || error.message.includes('Self-approval') || error.message.includes('authority') ? 403 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
};

module.exports = {
  createWorkflow,
  getWorkflows,
  submitRequest,
  listRequests,
  getRequestById,
  performAction,
};
