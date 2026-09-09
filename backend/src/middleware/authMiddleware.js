const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * JWT Authentication Middleware
 * Verifies Bearer token from the Authorization header and attaches live verified user from database to req.user.
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authorization header provided',
    });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization format. Format must be "Bearer <token>"',
    });
  }

  const token = parts[1];

  if (!token || token.trim() === '') {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Token is missing',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Live Database Role Verification: Fetch current role from PostgreSQL to prevent stale JWT claims
    const userQuery = 'SELECT id, name, email, role FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [decoded.id]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or has been deactivated',
      });
    }

    const liveUser = userResult.rows[0];

    // Attach authenticated user identity with live database verified role
    req.user = {
      id: liveUser.id,
      name: liveUser.name,
      email: liveUser.email,
      role: liveUser.role || 'employee',
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or malformed token',
      });
    }

    console.error('Error in authenticateToken middleware:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

/**
 * Role authorization helper middleware
 * @param  {...string} allowedRoles 
 */
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to access this resource',
      });
    }

    next();
  };
};

authenticateToken.authenticateToken = authenticateToken;
authenticateToken.authorizeRole = authorizeRole;

module.exports = authenticateToken;
