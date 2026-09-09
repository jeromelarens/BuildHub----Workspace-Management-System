const db = require('../config/database');

/**
 * Generate a URL-friendly slug
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

/**
 * Create a new workspace and assign creator as owner
 */
const createWorkspace = async ({ name, slug = null, description = null, userId }) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const baseSlug = slug ? slugify(slug) : slugify(name);
    let finalSlug = baseSlug || `workspace-${Date.now()}`;

    // Ensure unique slug
    const existing = await client.query('SELECT id FROM workspaces WHERE slug = $1;', [finalSlug]);
    if (existing.rows.length > 0) {
      finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const wsRes = await client.query(`
      INSERT INTO workspaces (name, slug, description, status, owner_id)
      VALUES ($1, $2, $3, 'active', $4)
      RETURNING *;
    `, [name, finalSlug, description, userId]);

    const workspace = wsRes.rows[0];

    // Add creator as workspace owner
    await client.query(`
      INSERT INTO workspace_members (workspace_id, user_id, role, status)
      VALUES ($1, $2, 'owner', 'active');
    `, [workspace.id, userId]);

    await client.query('COMMIT');
    return workspace;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * List all workspaces the user is a member of (or all if system admin)
 */
const getUserWorkspaces = async (userId, userRole) => {
  if (userRole === 'admin') {
    const allWorkspaces = await db.query(`
      SELECT w.*,
             COALESCE(wm.role, 'admin') AS member_role,
             (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id)::INT AS member_count,
             u.name AS owner_name, u.email AS owner_email
      FROM workspaces w
      LEFT JOIN users u ON w.owner_id = u.id
      LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
      ORDER BY w.created_at ASC;
    `, [userId]);
    return allWorkspaces.rows;
  }

  const result = await db.query(`
    SELECT w.*, wm.role AS member_role, wm.status AS member_status,
           (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id)::INT AS member_count,
           u.name AS owner_name, u.email AS owner_email
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    LEFT JOIN users u ON w.owner_id = u.id
    WHERE wm.user_id = $1 AND wm.status = 'active'
    ORDER BY w.created_at ASC;
  `, [userId]);

  return result.rows;
};

/**
 * Get single workspace by ID with authorization verification
 */
const getWorkspaceById = async (workspaceId, userId, userRole) => {
  const wsRes = await db.query(`
    SELECT w.*, u.name AS owner_name, u.email AS owner_email
    FROM workspaces w
    LEFT JOIN users u ON w.owner_id = u.id
    WHERE w.id = $1;
  `, [workspaceId]);

  if (wsRes.rows.length === 0) {
    return null;
  }

  const workspace = wsRes.rows[0];

  // If system admin, allow access
  if (userRole === 'admin') {
    return { ...workspace, member_role: 'admin' };
  }

  // Check user membership
  const memberRes = await db.query(`
    SELECT role, status FROM workspace_members
    WHERE workspace_id = $1 AND user_id = $2 AND status = 'active';
  `, [workspaceId, userId]);

  if (memberRes.rows.length === 0) {
    return null; // Not a member
  }

  return { ...workspace, member_role: memberRes.rows[0].role };
};

/**
 * Update workspace settings (requires workspace owner/admin role or system admin)
 */
const updateWorkspace = async (workspaceId, updates, userId, userRole) => {
  const ws = await getWorkspaceById(workspaceId, userId, userRole);
  if (!ws) {
    throw new Error('Workspace not found or access denied');
  }

  if (userRole !== 'admin' && !['owner', 'admin'].includes(ws.member_role)) {
    throw new Error('You must be a workspace owner or admin to update workspace details');
  }

  const name = updates.name !== undefined ? updates.name : ws.name;
  const description = updates.description !== undefined ? updates.description : ws.description;
  const status = updates.status !== undefined ? updates.status : ws.status;

  const result = await db.query(`
    UPDATE workspaces
    SET name = $1, description = $2, status = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *;
  `, [name, description, status, workspaceId]);

  return result.rows[0];
};

/**
 * Delete a workspace (requires workspace owner or system admin)
 */
const deleteWorkspace = async (workspaceId, userId, userRole) => {
  const ws = await getWorkspaceById(workspaceId, userId, userRole);
  if (!ws) {
    throw new Error('Workspace not found or access denied');
  }

  if (userRole !== 'admin' && ws.member_role !== 'owner') {
    throw new Error('Only the workspace owner or system admin can delete this workspace');
  }

  // Prevent deleting the default workspace
  if (ws.slug === 'default-workspace') {
    throw new Error('The default system workspace cannot be deleted');
  }

  await db.query('DELETE FROM workspaces WHERE id = $1;', [workspaceId]);
  return { success: true, deletedId: workspaceId };
};

/**
 * List members of a workspace
 */
const getWorkspaceMembers = async (workspaceId, userId, userRole) => {
  const ws = await getWorkspaceById(workspaceId, userId, userRole);
  if (!ws) {
    throw new Error('Workspace not found or access denied');
  }

  const result = await db.query(`
    SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.status, wm.created_at,
           u.name, u.email, u.role AS system_role
    FROM workspace_members wm
    JOIN users u ON wm.user_id = u.id
    WHERE wm.workspace_id = $1
    ORDER BY wm.created_at ASC;
  `, [workspaceId]);

  return result.rows;
};

/**
 * Add a member to a workspace
 */
const addWorkspaceMember = async (workspaceId, { targetUserId, role = 'member' }, actorId, actorRole) => {
  const ws = await getWorkspaceById(workspaceId, actorId, actorRole);
  if (!ws) {
    throw new Error('Workspace not found or access denied');
  }

  if (actorRole !== 'admin' && !['owner', 'admin'].includes(ws.member_role)) {
    throw new Error('You do not have permission to add members to this workspace');
  }

  // Verify target user exists
  const userRes = await db.query('SELECT id, name, email FROM users WHERE id = $1;', [targetUserId]);
  if (userRes.rows.length === 0) {
    throw new Error('Target user does not exist');
  }

  const result = await db.query(`
    INSERT INTO workspace_members (workspace_id, user_id, role, status)
    VALUES ($1, $2, $3, 'active')
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET
      role = EXCLUDED.role,
      status = 'active',
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `, [workspaceId, targetUserId, role]);

  return {
    ...result.rows[0],
    user: userRes.rows[0],
  };
};

/**
 * Update member role in workspace
 */
const updateWorkspaceMemberRole = async (workspaceId, targetUserId, newRole, actorId, actorRole) => {
  const ws = await getWorkspaceById(workspaceId, actorId, actorRole);
  if (!ws) {
    throw new Error('Workspace not found or access denied');
  }

  if (actorRole !== 'admin' && !['owner', 'admin'].includes(ws.member_role)) {
    throw new Error('You do not have permission to modify member roles');
  }

  const result = await db.query(`
    UPDATE workspace_members
    SET role = $1, updated_at = CURRENT_TIMESTAMP
    WHERE workspace_id = $2 AND user_id = $3
    RETURNING *;
  `, [newRole, workspaceId, targetUserId]);

  if (result.rows.length === 0) {
    throw new Error('User is not a member of this workspace');
  }

  return result.rows[0];
};

/**
 * Remove a member from a workspace
 */
const removeWorkspaceMember = async (workspaceId, targetUserId, actorId, actorRole) => {
  const ws = await getWorkspaceById(workspaceId, actorId, actorRole);
  if (!ws) {
    throw new Error('Workspace not found or access denied');
  }

  if (actorRole !== 'admin' && !['owner', 'admin'].includes(ws.member_role) && actorId !== targetUserId) {
    throw new Error('You do not have permission to remove members from this workspace');
  }

  // Prevent removing the last owner
  const memberRes = await db.query(`
    SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2;
  `, [workspaceId, targetUserId]);

  if (memberRes.rows.length > 0 && memberRes.rows[0].role === 'owner') {
    const ownersRes = await db.query(`
      SELECT COUNT(*)::INT AS count FROM workspace_members
      WHERE workspace_id = $1 AND role = 'owner';
    `, [workspaceId]);

    if (ownersRes.rows[0].count <= 1) {
      throw new Error('Cannot remove the last owner of the workspace. Transfer ownership first.');
    }
  }

  await db.query(`
    DELETE FROM workspace_members
    WHERE workspace_id = $1 AND user_id = $2;
  `, [workspaceId, targetUserId]);

  return { success: true, removedUserId: targetUserId };
};

/**
 * Get default workspace for fallback
 */
const getDefaultWorkspace = async () => {
  const res = await db.query("SELECT * FROM workspaces WHERE slug = 'default-workspace' LIMIT 1;");
  if (res.rows.length > 0) return res.rows[0];
  const first = await db.query('SELECT * FROM workspaces ORDER BY id ASC LIMIT 1;');
  return first.rows[0] || null;
};

module.exports = {
  slugify,
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  getDefaultWorkspace,
};
