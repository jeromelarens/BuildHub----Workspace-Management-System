const db = require('../config/database');
const { logAuditEvent } = require('../services/auditService');

/**
 * Get all users (Admin only)
 * GET /api/users
 */
const getUsers = async (req, res) => {
  try {
    const { role, page, limit } = req.validatedQuery || req.query || {};

    let queryText = 'SELECT id, name, email, role, created_at FROM users WHERE 1=1';
    const queryParams = [];

    if (role) {
      queryParams.push(role);
      queryText += ` AND role = $${queryParams.length}`;
    }

    // Count query for pagination
    const countQuery = `SELECT COUNT(*) FROM (${queryText}) AS total_count`;
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    queryText += ' ORDER BY id ASC';

    const paginationMeta = {};
    if (page || limit) {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;
      const offset = (pageNum - 1) * limitNum;

      queryParams.push(limitNum);
      queryText += ` LIMIT $${queryParams.length}`;
      queryParams.push(offset);
      queryText += ` OFFSET $${queryParams.length}`;

      paginationMeta.page = pageNum;
      paginationMeta.limit = limitNum;
      paginationMeta.total = total;
      paginationMeta.totalPages = Math.ceil(total / limitNum) || 1;
    }

    const result = await db.query(queryText, queryParams);

    const responsePayload = {
      success: true,
      message: 'Users retrieved successfully',
      data: result.rows,
    };

    if (page || limit) {
      responsePayload.pagination = paginationMeta;
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Error in getUsers:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get user by ID (Admin only)
 * GET /api/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const findQuery = 'SELECT id, name, email, role, created_at FROM users WHERE id = $1';
    const findResult = await db.query(findQuery, [userId]);

    if (findResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: findResult.rows[0],
    });
  } catch (error) {
    console.error('Error in getUserById:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Update user role (Admin only)
 * PUT /api/users/:id/role
 */
const updateUserRole = async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { role } = req.body;

    // Self-role modification protection
    if (req.user && req.user.id === targetUserId) {
      return res.status(403).json({
        success: false,
        message: 'Admins cannot modify their own role',
      });
    }

    // Check target user existence and current role
    const findQuery = 'SELECT id, name, email, role FROM users WHERE id = $1';
    const findResult = await db.query(findQuery, [targetUserId]);

    if (findResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const targetUser = findResult.rows[0];

    // Admin target protection: Cannot modify another Admin's role
    if (targetUser.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify the role of an Admin user',
      });
    }

    const oldRole = targetUser.role;

    // Execute role update
    const updateQuery = `
      UPDATE users
      SET role = $1
      WHERE id = $2
      RETURNING id, name, email, role, created_at
    `;
    const updateResult = await db.query(updateQuery, [role, targetUserId]);
    const updated = updateResult.rows[0];

    // Log audit event
    await logAuditEvent({
      userId: req.user.id,
      action: 'ROLE_CHANGE',
      entityType: 'user',
      entityId: targetUserId,
      req,
      details: { targetUserId, targetEmail: targetUser.email, oldRole, newRole: role },
    });

    return res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error in updateUserRole:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUserRole,
};
