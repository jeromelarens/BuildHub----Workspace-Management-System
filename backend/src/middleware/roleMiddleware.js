const db = require('../config/database');
const { checkRolePermission } = require('../services/permissionService');

/**
 * Role-Based Access Control Middleware Factory
 * Verifies that the authenticated user possesses one of the allowed roles.
 * Queries current live role from database to prevent stale JWT claim vulnerabilities.
 * 
 * @param  {...string} allowedRoles - List of authorized roles (e.g. 'admin', 'manager')
 * @returns {import('express').RequestHandler}
 */
const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Authentication required',
        });
      }

      // Query database for fresh user role to prevent stale JWT claims
      const userQuery = 'SELECT id, email, role FROM users WHERE id = $1';
      const userResult = await db.query(userQuery, [req.user.id]);

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User account not found or has been deactivated',
        });
      }

      const currentUser = userResult.rows[0];
      const userRole = currentUser.role || 'employee';

      // Update req.user with fresh role from database
      req.user.role = userRole;

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions for this resource',
        });
      }

      next();
    } catch (error) {
      console.error('Error in authorizeRoles middleware:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authorization check',
      });
    }
  };
};

/**
 * Dynamic Permission Middleware Factory
 * Verifies that the user's role has been granted the required system permission.
 * 
 * @param {string} permissionName - Permission string (e.g. 'custom_field:create')
 * @returns {import('express').RequestHandler}
 */
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Authentication required',
        });
      }

      const userQuery = 'SELECT id, email, role FROM users WHERE id = $1';
      const userResult = await db.query(userQuery, [req.user.id]);

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User account not found or has been deactivated',
        });
      }

      const currentUser = userResult.rows[0];
      const userRole = currentUser.role || 'employee';
      req.user.role = userRole;

      const hasPermission = await checkRolePermission(userRole, permissionName);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Requires permission: ${permissionName}`,
        });
      }

      next();
    } catch (error) {
      console.error('Error in requirePermission middleware:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during permission check',
      });
    }
  };
};

module.exports = {
  authorizeRoles,
  requirePermission,
};

