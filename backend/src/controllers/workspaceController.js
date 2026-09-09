const workspaceService = require('../services/workspaceService');
const { logAuditEvent } = require('../services/auditService');

/**
 * Create a new workspace
 * POST /api/workspaces
 */
const createWorkspace = async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    const userId = req.user.id;

    const workspace = await workspaceService.createWorkspace({
      name,
      slug,
      description,
      userId,
    });

    await logAuditEvent({
      userId,
      action: 'WORKSPACE_CREATED',
      entityType: 'workspace',
      entityId: workspace.id,
      req,
      details: { name: workspace.name, slug: workspace.slug },
    });

    return res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      data: workspace,
    });
  } catch (error) {
    console.error('Error in createWorkspace:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

/**
 * Get all workspaces for current user
 * GET /api/workspaces
 */
const getUserWorkspaces = async (req, res) => {
  try {
    const workspaces = await workspaceService.getUserWorkspaces(req.user.id, req.user.role);
    return res.status(200).json({
      success: true,
      data: workspaces,
    });
  } catch (error) {
    console.error('Error in getUserWorkspaces:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get workspace details by ID
 * GET /api/workspaces/:id
 */
const getWorkspaceById = async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.id, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ success: false, message: 'Invalid workspace ID' });
    }

    const workspace = await workspaceService.getWorkspaceById(workspaceId, req.user.id, req.user.role);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found or access denied' });
    }

    return res.status(200).json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    console.error('Error in getWorkspaceById:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Update workspace
 * PUT /api/workspaces/:id
 */
const updateWorkspace = async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.id, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ success: false, message: 'Invalid workspace ID' });
    }

    const updated = await workspaceService.updateWorkspace(workspaceId, req.body, req.user.id, req.user.role);

    await logAuditEvent({
      userId: req.user.id,
      action: 'WORKSPACE_UPDATED',
      entityType: 'workspace',
      entityId: workspaceId,
      req,
      details: { updates: req.body },
    });

    return res.status(200).json({
      success: true,
      message: 'Workspace updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error in updateWorkspace:', error.message);
    const status = error.message.includes('permission') || error.message.includes('owner') ? 403 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
};

/**
 * Delete workspace
 * DELETE /api/workspaces/:id
 */
const deleteWorkspace = async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.id, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ success: false, message: 'Invalid workspace ID' });
    }

    const result = await workspaceService.deleteWorkspace(workspaceId, req.user.id, req.user.role);

    await logAuditEvent({
      userId: req.user.id,
      action: 'WORKSPACE_DELETED',
      entityType: 'workspace',
      entityId: workspaceId,
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Workspace deleted successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error in deleteWorkspace:', error.message);
    const status = error.message.includes('permission') || error.message.includes('owner') ? 403 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
};

/**
 * Get workspace members
 * GET /api/workspaces/:id/members
 */
const getWorkspaceMembers = async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.id, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ success: false, message: 'Invalid workspace ID' });
    }

    const members = await workspaceService.getWorkspaceMembers(workspaceId, req.user.id, req.user.role);
    return res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error('Error in getWorkspaceMembers:', error.message);
    return res.status(error.message.includes('denied') ? 403 : 400).json({ success: false, message: error.message });
  }
};

/**
 * Add member to workspace
 * POST /api/workspaces/:id/members
 */
const addWorkspaceMember = async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.id, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ success: false, message: 'Invalid workspace ID' });
    }

    const { targetUserId, user_id, role } = req.body;
    const resolvedTargetId = parseInt(targetUserId || user_id, 10);

    const member = await workspaceService.addWorkspaceMember(
      workspaceId,
      { targetUserId: resolvedTargetId, role },
      req.user.id,
      req.user.role
    );

    await logAuditEvent({
      userId: req.user.id,
      action: 'WORKSPACE_MEMBER_ADDED',
      entityType: 'workspace_member',
      entityId: member.id,
      req,
      details: { workspaceId, targetUserId: resolvedTargetId, role },
    });

    return res.status(201).json({
      success: true,
      message: 'Member added to workspace successfully',
      data: member,
    });
  } catch (error) {
    console.error('Error in addWorkspaceMember:', error.message);
    const status = error.message.includes('permission') ? 403 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
};

/**
 * Update workspace member role
 * PUT /api/workspaces/:id/members/:userId
 */
const updateWorkspaceMemberRole = async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.id, 10);
    const targetUserId = parseInt(req.params.userId, 10);
    const { role } = req.body;

    if (isNaN(workspaceId) || isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid workspace or user ID' });
    }

    const updated = await workspaceService.updateWorkspaceMemberRole(
      workspaceId,
      targetUserId,
      role,
      req.user.id,
      req.user.role
    );

    await logAuditEvent({
      userId: req.user.id,
      action: 'WORKSPACE_MEMBER_ROLE_UPDATED',
      entityType: 'workspace_member',
      entityId: updated.id,
      req,
      details: { workspaceId, targetUserId, newRole: role },
    });

    return res.status(200).json({
      success: true,
      message: 'Member role updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error in updateWorkspaceMemberRole:', error.message);
    const status = error.message.includes('permission') ? 403 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
};

/**
 * Remove member from workspace
 * DELETE /api/workspaces/:id/members/:userId
 */
const removeWorkspaceMember = async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.id, 10);
    const targetUserId = parseInt(req.params.userId, 10);

    if (isNaN(workspaceId) || isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid workspace or user ID' });
    }

    const result = await workspaceService.removeWorkspaceMember(
      workspaceId,
      targetUserId,
      req.user.id,
      req.user.role
    );

    await logAuditEvent({
      userId: req.user.id,
      action: 'WORKSPACE_MEMBER_REMOVED',
      entityType: 'workspace_member',
      entityId: targetUserId,
      req,
      details: { workspaceId, targetUserId },
    });

    return res.status(200).json({
      success: true,
      message: 'Member removed from workspace successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error in removeWorkspaceMember:', error.message);
    const status = error.message.includes('permission') ? 403 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
};

module.exports = {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
};
