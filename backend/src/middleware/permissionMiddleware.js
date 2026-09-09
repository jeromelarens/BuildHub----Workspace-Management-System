const db = require('../config/database');
const { checkRolePermission } = require('../services/permissionService');

/**
 * Permission-Based Access Control Middleware Factory
 * Authorizes request based on live database verified user role and explicit permission mappings.
 * 
 * @param {string} permissionName 
 * @returns {import('express').RequestHandler}
 */
const authorizePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Authentication required',
        });
      }

      // Live Database Role Verification
      const userQuery = 'SELECT id, email, role FROM users WHERE id = $1';
      const userResult = await db.query(userQuery, [req.user.id]);

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User account not found or has been deactivated',
        });
      }

      const liveUser = userResult.rows[0];
      const userRole = liveUser.role || 'employee';
      req.user.role = userRole;

      if (userRole === 'admin') {
        return next();
      }

      const hasPerm = await checkRolePermission(userRole, permissionName);

      if (!hasPerm) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Requires permission: ${permissionName}`,
        });
      }

      next();
    } catch (error) {
      console.error(`Error in authorizePermission (${permissionName}):`, error.message);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during permission authorization check',
      });
    }
  };
};

module.exports = {
  authorizePermission,
};
