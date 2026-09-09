const db = require('../config/database');
const { createNotification } = require('../services/notificationService');
const { calculateProjectProgressAndHealth } = require('../services/analyticsService');
const { logAuditEvent } = require('../services/auditService');

/**
 * Helper to check project membership
 */
const isUserProjectMember = async (projectId, userId) => {
  const query = 'SELECT id, role FROM project_members WHERE project_id = $1 AND user_id = $2';
  const result = await db.query(query, [projectId, userId]);
  return result.rows.length > 0;
};

/**
 * Create a new project
 * POST /api/projects
 * Roles: admin, manager
 */
const createProject = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const userId = req.user.id;

    // Insert project
    const insertQuery = `
      INSERT INTO projects (name, description, status, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, description, status, created_by, created_at, updated_at
    `;
    const result = await db.query(insertQuery, [name, description, status, userId]);
    const project = result.rows[0];

    // Automatically add creator as a project lead
    await db.query(
      "INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'lead') ON CONFLICT DO NOTHING",
      [project.id, userId]
    );

    // Audit log
    await logAuditEvent({
      userId,
      action: 'PROJECT_CREATED',
      entityType: 'project',
      entityId: project.id,
      req,
      details: { name, status },
    });

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error in createProject:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get all projects with role-based visibility, search, filtering, and pagination
 * GET /api/projects
 */
const getProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, search, page, limit } = req.validatedQuery || req.query || {};

    let baseFilter = 'p.deleted_at IS NULL';
    const queryParams = [];

    if (userRole === 'admin') {
      // Global
    } else {
      // Manager or Employee sees projects they created or are members of
      queryParams.push(userId);
      baseFilter += ` AND (p.created_by = $${queryParams.length} OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $${queryParams.length}))`;
    }

    if (status) {
      queryParams.push(status);
      baseFilter += ` AND p.status = $${queryParams.length}`;
    }

    if (search) {
      queryParams.push(`%${search}%`);
      baseFilter += ` AND (p.name ILIKE $${queryParams.length} OR p.description ILIKE $${queryParams.length})`;
    }

    // Count query for pagination
    const countQuery = `SELECT COUNT(*) FROM projects p WHERE ${baseFilter}`;
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    let selectQuery = `
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.status, 
        p.created_by, 
        p.created_at, 
        p.updated_at,
        u.name AS creator_name,
        u.email AS creator_email,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.deleted_at IS NULL) AS task_count
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE ${baseFilter}
      ORDER BY p.created_at DESC
    `;

    const paginationMeta = {};
    if (page || limit) {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;
      const offset = (pageNum - 1) * limitNum;

      queryParams.push(limitNum);
      selectQuery += ` LIMIT $${queryParams.length}`;
      queryParams.push(offset);
      selectQuery += ` OFFSET $${queryParams.length}`;

      paginationMeta.page = pageNum;
      paginationMeta.limit = limitNum;
      paginationMeta.total = total;
      paginationMeta.totalPages = Math.ceil(total / limitNum) || 1;
    }

    const result = await db.query(selectQuery, queryParams);

    const responsePayload = {
      success: true,
      message: 'Projects retrieved successfully',
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status,
        created_by: row.created_by,
        creator: row.created_by ? { id: row.created_by, name: row.creator_name, email: row.creator_email } : null,
        member_count: parseInt(row.member_count, 10) || 0,
        task_count: parseInt(row.task_count, 10) || 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
    };

    if (page || limit) {
      responsePayload.pagination = paginationMeta;
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Error in getProjects:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get project by ID
 * GET /api/projects/:id
 */
const getProjectById = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check project existence
    const projectQuery = `
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.status, 
        p.created_by, 
        p.created_at, 
        p.updated_at,
        u.name AS creator_name,
        u.email AS creator_email
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `;
    const projectResult = await db.query(projectQuery, [projectId]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const project = projectResult.rows[0];

    // Authorization check
    if (userRole !== 'admin') {
      const isMember = await isUserProjectMember(projectId, userId);
      const isCreator = project.created_by === userId;

      if (!isMember && !isCreator) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to view this project',
        });
      }
    }

    // Fetch members
    const membersQuery = `
      SELECT 
        pm.id AS membership_id,
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        pm.role AS project_role,
        pm.added_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
      ORDER BY pm.added_at ASC
    `;
    const membersResult = await db.query(membersQuery, [projectId]);

    // Calculate progress & health
    const health = await calculateProjectProgressAndHealth(projectId);

    return res.status(200).json({
      success: true,
      message: 'Project retrieved successfully',
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        created_by: project.created_by,
        creator: project.created_by ? { id: project.created_by, name: project.creator_name, email: project.creator_email } : null,
        members: membersResult.rows,
        task_stats: {
          total: health.total_tasks,
          completed: health.completed_tasks,
          pending: health.pending_tasks,
          in_progress: health.in_progress_tasks,
          overdue: health.overdue_tasks,
        },
        progress: {
          completion_percentage: health.completion_percentage,
          health_status: health.health_status,
        },
        created_at: project.created_at,
        updated_at: project.updated_at,
      },
    });
  } catch (error) {
    console.error('Error in getProjectById:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Update a project
 * PUT /api/projects/:id
 * Roles: Admin or project creator/manager
 */
const updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { name, description, status } = req.body;

    const findQuery = 'SELECT id, name, description, status, created_by FROM projects WHERE id = $1 AND deleted_at IS NULL';
    const findResult = await db.query(findQuery, [projectId]);

    if (findResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const project = findResult.rows[0];

    // Authorization: Admin or project creator
    if (userRole !== 'admin' && project.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to update this project',
      });
    }

    const updatedName = name !== undefined ? name : project.name;
    const updatedDescription = description !== undefined ? description : project.description;
    const updatedStatus = status !== undefined ? status : project.status;

    const updateQuery = `
      UPDATE projects
      SET name = $1,
          description = $2,
          status = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, name, description, status, created_by, created_at, updated_at
    `;
    const updateResult = await db.query(updateQuery, [
      updatedName,
      updatedDescription,
      updatedStatus,
      projectId,
    ]);

    await logAuditEvent({
      userId,
      action: 'PROJECT_UPDATED',
      entityType: 'project',
      entityId: projectId,
      req,
      details: { name: updatedName, status: updatedStatus },
    });

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Error in updateProject:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Delete a project
 * DELETE /api/projects/:id
 * Roles: Admin or project creator/manager
 */
const deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const findQuery = 'SELECT id, name, created_by FROM projects WHERE id = $1 AND deleted_at IS NULL';
    const findResult = await db.query(findQuery, [projectId]);

    if (findResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const project = findResult.rows[0];

    // Authorization: Admin or project creator
    if (userRole !== 'admin' && project.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to delete this project',
      });
    }

    // Delete project (DB foreign keys cascade to project_members and tasks)
    await db.query('DELETE FROM projects WHERE id = $1', [projectId]);

    await logAuditEvent({
      userId,
      action: 'PROJECT_DELETED',
      entityType: 'project',
      entityId: projectId,
      req,
      details: { name: project.name },
    });

    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
      data: null,
    });
  } catch (error) {
    console.error('Error in deleteProject:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Add a member to a project
 * POST /api/projects/:id/members
 */
const addProjectMember = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const targetUserId = req.body.user_id !== undefined ? req.body.user_id : req.body.userId;
    const role = req.body.role || 'member';

    // Check project existence
    const projectQuery = 'SELECT id, name, created_by FROM projects WHERE id = $1 AND deleted_at IS NULL';
    const projectResult = await db.query(projectQuery, [projectId]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const project = projectResult.rows[0];

    // Authorization: Admin, project creator, or project lead
    const isAdmin = userRole === 'admin';
    const isCreator = project.created_by === userId;
    const leadRes = await db.query('SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2 AND role = $3', [projectId, userId, 'lead']);
    const isLead = leadRes.rows.length > 0;

    if (!isAdmin && !isCreator && !isLead) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only project leads, managers, or admins can add members',
      });
    }

    // Check target user existence
    const userQuery = 'SELECT id, name, email, role FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [targetUserId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User to add not found',
      });
    }

    const targetUser = userResult.rows[0];

    // Add member
    const insertMemberQuery = `
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, $3)
      RETURNING id, project_id, user_id, role, added_at
    `;
    const memberResult = await db.query(insertMemberQuery, [projectId, targetUserId, role]);
    const member = memberResult.rows[0];

    // Create notification for added user
    await createNotification({
      userId: targetUserId,
      type: 'project_added',
      title: `Added to Project: ${project.name}`,
      message: `You have been added to project "${project.name}" as a ${role}.`,
      entityType: 'project',
      entityId: parseInt(projectId, 10),
    });

    await logAuditEvent({
      userId,
      action: 'PROJECT_MEMBER_ADDED',
      entityType: 'project_member',
      entityId: member.id,
      req,
      details: { projectId, targetUserId, role },
    });

    return res.status(201).json({
      success: true,
      message: 'Member added to project successfully',
      data: {
        id: member.id,
        project_id: member.project_id,
        user_id: member.user_id,
        role: member.role,
        added_at: member.added_at,
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
        },
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'User is already a member of this project',
      });
    }
    console.error('Error in addProjectMember:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Remove a member from a project
 * DELETE /api/projects/:id/members/:userId
 * Roles: Admin or project creator/manager
 */
const removeProjectMember = async (req, res) => {
  try {
    const projectId = req.params.id;
    const targetUserId = req.params.userId;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check project existence
    const projectQuery = 'SELECT id, name, created_by FROM projects WHERE id = $1 AND deleted_at IS NULL';
    const projectResult = await db.query(projectQuery, [projectId]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const project = projectResult.rows[0];

    // Authorization: Admin or project creator
    if (userRole !== 'admin' && project.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to remove members from this project',
      });
    }

    // Cannot remove project creator from members
    if (parseInt(targetUserId, 10) === project.created_by) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the project creator from the project',
      });
    }

    const deleteQuery = 'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING id';
    const deleteResult = await db.query(deleteQuery, [projectId, targetUserId]);

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this project',
      });
    }

    await logAuditEvent({
      userId,
      action: 'PROJECT_MEMBER_REMOVED',
      entityType: 'project_member',
      entityId: deleteResult.rows[0].id,
      req,
      details: { projectId, targetUserId },
    });

    return res.status(200).json({
      success: true,
      message: 'Member removed from project successfully',
      data: null,
    });
  } catch (error) {
    console.error('Error in removeProjectMember:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get members of a project
 * GET /api/projects/:id/members
 */
const getProjectMembers = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check project existence
    const projectQuery = 'SELECT id, created_by FROM projects WHERE id = $1 AND deleted_at IS NULL';
    const projectResult = await db.query(projectQuery, [projectId]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const project = projectResult.rows[0];

    // Authorization: Admin, project creator, or project member
    if (userRole !== 'admin') {
      const isMember = await isUserProjectMember(projectId, userId);
      const isCreator = project.created_by === userId;

      if (!isMember && !isCreator) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to view members of this project',
        });
      }
    }

    const membersQuery = `
      SELECT 
        pm.id AS membership_id,
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        pm.role AS project_role,
        pm.added_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
      ORDER BY pm.added_at ASC
    `;
    const membersResult = await db.query(membersQuery, [projectId]);

    return res.status(200).json({
      success: true,
      message: 'Project members retrieved successfully',
      data: membersResult.rows,
    });
  } catch (error) {
    console.error('Error in getProjectMembers:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectMembers,
};
