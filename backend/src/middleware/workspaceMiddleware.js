const db = require('../config/database');
const { getDefaultWorkspace } = require('../services/workspaceService');

/**
 * Workspace Context & Isolation Middleware
 * Resolves workspace context, verifies membership, and enforces tenant boundaries
 */
const requireWorkspace = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required before resolving workspace context',
      });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Extract requested workspace ID from header, query param, or body
    const rawWorkspaceId =
      req.headers['x-workspace-id'] ||
      req.headers['workspace-id'] ||
      req.query.workspace_id ||
      (req.body && req.body.workspace_id);

    let targetWorkspaceId = null;

    if (rawWorkspaceId) {
      targetWorkspaceId = parseInt(rawWorkspaceId, 10);
      if (isNaN(targetWorkspaceId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid workspace identifier. Must be a numeric ID.',
        });
      }
    }

    // 2. If no workspace ID provided, resolve default or first workspace for user
    if (!targetWorkspaceId) {
      const defaultWs = await getDefaultWorkspace();
      if (defaultWs) {
        targetWorkspaceId = defaultWs.id;
      }
    }

    if (!targetWorkspaceId) {
      return res.status(404).json({
        success: false,
        error: 'No active workspace found. Please specify an X-Workspace-Id header.',
      });
    }

    // 3. Verify workspace exists
    const wsRes = await db.query('SELECT * FROM workspaces WHERE id = $1;', [targetWorkspaceId]);
    if (wsRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found',
      });
    }

    const workspace = wsRes.rows[0];

    // 4. Verify user membership in target workspace
    let memberRole = 'member';

    if (userRole === 'admin') {
      // System admin has global workspace oversight
      memberRole = 'admin';
    } else {
      const memberRes = await db.query(`
        SELECT role, status FROM workspace_members
        WHERE workspace_id = $1 AND user_id = $2 AND status = 'active';
      `, [targetWorkspaceId, userId]);

      if (memberRes.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You are not a member of this workspace',
        });
      }

      memberRole = memberRes.rows[0].role;
    }

    // 5. Attach workspace context to request object
    req.workspace = {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      status: workspace.status,
      role: memberRole,
    };
    req.workspaceId = workspace.id;

    next();
  } catch (err) {
    console.error('[WorkspaceMiddleware] Resolution Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to resolve workspace context',
    });
  }
};

module.exports = {
  requireWorkspace,
};
