const db = require('../config/database');

/**
 * Fetch all permissions granted to a given role name
 * @param {string} roleName 
 * @returns {Promise<string[]>}
 */
const getPermissionsForRole = async (roleName) => {
  const query = `
    SELECT p.name
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN roles r ON rp.role_id = r.id
    WHERE r.name = $1
  `;
  const result = await db.query(query, [roleName]);
  return result.rows.map(row => row.name);
};

/**
 * Check if a given user role possesses a specific permission
 * @param {string} roleName 
 * @param {string} permissionName 
 * @returns {Promise<boolean>}
 */
const checkRolePermission = async (roleName, permissionName) => {
  // System Admin inherently holds all permissions
  if (roleName === 'admin') return true;

  const query = `
    SELECT 1
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN roles r ON rp.role_id = r.id
    WHERE r.name = $1 AND p.name = $2
    LIMIT 1
  `;
  const result = await db.query(query, [roleName, permissionName]);
  return result.rows.length > 0;
};

/**
 * Check if a user is a project lead for a given project
 * @param {number} projectId 
 * @param {number} userId 
 * @returns {Promise<boolean>}
 */
const isUserProjectLead = async (projectId, userId) => {
  if (!projectId || !userId) return false;

  // Check if user is the creator of the project
  const projectQuery = 'SELECT created_by FROM projects WHERE id = $1';
  const projectResult = await db.query(projectQuery, [projectId]);
  if (projectResult.rows.length > 0 && projectResult.rows[0].created_by === userId) {
    return true;
  }

  // Check if user has 'lead' role in project_members
  const memberQuery = "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2";
  const memberResult = await db.query(memberQuery, [projectId, userId]);
  if (memberResult.rows.length > 0) {
    return memberResult.rows[0].role === 'lead';
  }

  return false;
};

module.exports = {
  getPermissionsForRole,
  checkRolePermission,
  isUserProjectLead,
};
