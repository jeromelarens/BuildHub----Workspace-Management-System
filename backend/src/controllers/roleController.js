const db = require('../config/database');
const { SYSTEM_ROLE_NAMES } = require('../validators/roleValidator');

/**
 * Get all roles with their assigned permissions
 * GET /api/roles
 */
const getRoles = async (req, res) => {
  try {
    const rolesQuery = `
      SELECT r.id, r.name, r.description, r.created_at, r.updated_at,
             COALESCE(
               json_agg(
                 json_build_object('id', p.id, 'name', p.name, 'description', p.description)
               ) FILTER (WHERE p.id IS NOT NULL), '[]'
             ) AS permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      GROUP BY r.id, r.name, r.description, r.created_at, r.updated_at
      ORDER BY r.id ASC
    `;
    const result = await db.query(rolesQuery);

    return res.status(200).json({
      success: true,
      message: 'Roles retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error in getRoles:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get all permissions
 * GET /api/permissions
 */
const getPermissions = async (req, res) => {
  try {
    const query = 'SELECT id, name, description, created_at FROM permissions ORDER BY id ASC';
    const result = await db.query(query);

    return res.status(200).json({
      success: true,
      message: 'Permissions retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error in getPermissions:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Create a new custom role (Admin only)
 * POST /api/roles
 */
const createRole = async (req, res) => {
  try {
    const { name, description } = req.body;

    const existingQuery = 'SELECT id FROM roles WHERE name = $1';
    const existingResult = await db.query(existingQuery, [name]);

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Role "${name}" already exists`,
      });
    }

    const insertQuery = `
      INSERT INTO roles (name, description)
      VALUES ($1, $2)
      RETURNING id, name, description, created_at, updated_at
    `;
    const insertResult = await db.query(insertQuery, [name, description]);

    return res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: insertResult.rows[0],
    });
  } catch (error) {
    console.error('Error in createRole:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Assign a permission to a role
 * POST /api/roles/:id/permissions
 */
const addPermissionToRole = async (req, res) => {
  try {
    const roleId = req.params.id;
    const { permissionId } = req.body;

    // Check role existence
    const roleQuery = 'SELECT id, name FROM roles WHERE id = $1';
    const roleResult = await db.query(roleQuery, [roleId]);
    if (roleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    // Check permission existence
    const permQuery = 'SELECT id, name, description FROM permissions WHERE id = $1';
    const permResult = await db.query(permQuery, [permissionId]);
    if (permResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found',
      });
    }

    // Check existing mapping
    const existingMap = await db.query(
      'SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
      [roleId, permissionId]
    );

    if (existingMap.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Permission already assigned to this role',
      });
    }

    await db.query(
      'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
      [roleId, permissionId]
    );

    return res.status(201).json({
      success: true,
      message: 'Permission assigned to role successfully',
      data: {
        role_id: parseInt(roleId, 10),
        permission: permResult.rows[0],
      },
    });
  } catch (error) {
    console.error('Error in addPermissionToRole:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Remove a permission from a role
 * DELETE /api/roles/:id/permissions/:permissionId
 */
const removePermissionFromRole = async (req, res) => {
  try {
    const roleId = req.params.id;
    const permissionId = req.params.permissionId;

    // Check role existence
    const roleResult = await db.query('SELECT id, name FROM roles WHERE id = $1', [roleId]);
    if (roleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    // Check permission existence
    const permResult = await db.query('SELECT id FROM permissions WHERE id = $1', [permissionId]);
    if (permResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found',
      });
    }

    // Check mapping
    const mapResult = await db.query(
      'SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
      [roleId, permissionId]
    );

    if (mapResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Permission is not assigned to this role',
      });
    }

    await db.query(
      'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
      [roleId, permissionId]
    );

    return res.status(200).json({
      success: true,
      message: 'Permission removed from role successfully',
      data: null,
    });
  } catch (error) {
    console.error('Error in removePermissionFromRole:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Delete a custom role
 * DELETE /api/roles/:id
 */
const deleteRole = async (req, res) => {
  try {
    const roleId = req.params.id;

    const roleResult = await db.query('SELECT id, name FROM roles WHERE id = $1', [roleId]);
    if (roleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    const role = roleResult.rows[0];

    // Protect system roles
    if (SYSTEM_ROLE_NAMES.includes(role.name)) {
      return res.status(403).json({
        success: false,
        message: `Cannot delete protected system role "${role.name}"`,
      });
    }

    // Check if role is currently assigned to any users
    const usersWithRole = await db.query('SELECT count(*) FROM users WHERE role = $1', [role.name]);
    if (parseInt(usersWithRole.rows[0].count, 10) > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete role "${role.name}" because it is currently assigned to users`,
      });
    }

    await db.query('DELETE FROM roles WHERE id = $1', [roleId]);

    return res.status(200).json({
      success: true,
      message: 'Role deleted successfully',
      data: null,
    });
  } catch (error) {
    console.error('Error in deleteRole:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getRoles,
  getPermissions,
  createRole,
  addPermissionToRole,
  removePermissionFromRole,
  deleteRole,
};
