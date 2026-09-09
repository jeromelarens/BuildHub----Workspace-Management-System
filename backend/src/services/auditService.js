const db = require('../config/database');

const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'jwt', 'adminPassword', 'secret'];

/**
 * Sanitize details object to strip sensitive keys
 * @param {any} obj 
 * @returns {any}
 */
const sanitizeDetails = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeDetails);

  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some(sk => k.toLowerCase().includes(sk.toLowerCase()))) {
      clean[k] = '[REDACTED]';
    } else if (v && typeof v === 'object') {
      clean[k] = sanitizeDetails(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
};

/**
 * Log a security/audit event into append-only audit_logs
 * 
 * @param {object} param0
 * @param {number|null} [param0.userId]
 * @param {string} param0.action
 * @param {string} param0.entityType
 * @param {number|null} [param0.entityId]
 * @param {object} [param0.req]
 * @param {object} [param0.details]
 * @returns {Promise<any>}
 */
const logAuditEvent = async ({
  userId = null,
  action,
  entityType,
  entityId = null,
  req = null,
  details = {},
}) => {
  try {
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || null;
      if (typeof ipAddress === 'string' && ipAddress.includes(',')) {
        ipAddress = ipAddress.split(',')[0].trim();
      }
      userAgent = req.headers['user-agent'] || null;
      if (!userId && req.user?.id) {
        userId = req.user.id;
      }
    }

    const safeDetails = sanitizeDetails(details || {});

    const query = `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_id, action, entity_type, entity_id, ip_address, user_agent, details, created_at
    `;
    const result = await db.query(query, [
      userId || null,
      action,
      entityType,
      entityId || null,
      ipAddress,
      userAgent,
      JSON.stringify(safeDetails),
    ]);

    return result.rows[0];
  } catch (error) {
    console.error('Error logging audit event:', error.message);
    return null;
  }
};

/**
 * Fetch paginated audit logs with filters (Admin only)
 */
const getAuditLogsList = async ({
  action,
  entity_type,
  entity_id,
  user_id,
  startDate,
  endDate,
  page = 1,
  limit = 20,
}) => {
  const queryParams = [];
  const whereClauses = [];

  if (action) {
    queryParams.push(action);
    whereClauses.push(`a.action = $${queryParams.length}`);
  }

  if (entity_type) {
    queryParams.push(entity_type);
    whereClauses.push(`a.entity_type = $${queryParams.length}`);
  }

  if (entity_id) {
    queryParams.push(entity_id);
    whereClauses.push(`a.entity_id = $${queryParams.length}`);
  }

  if (user_id) {
    queryParams.push(user_id);
    whereClauses.push(`a.user_id = $${queryParams.length}`);
  }

  if (startDate) {
    queryParams.push(startDate);
    whereClauses.push(`a.created_at >= $${queryParams.length}`);
  }

  if (endDate) {
    queryParams.push(endDate);
    whereClauses.push(`a.created_at <= $${queryParams.length}`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) AS total FROM audit_logs a ${whereSql}`;
  const countRes = await db.query(countQuery, queryParams);
  const total = parseInt(countRes.rows[0].total, 10);

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const selectSql = `
    SELECT 
      a.id, a.user_id, a.action, a.entity_type, a.entity_id,
      a.ip_address, a.user_agent, a.details, a.created_at,
      u.name AS user_name, u.email AS user_email, u.role AS user_role
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ${whereSql}
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
  `;
  queryParams.push(limitNum, offset);

  const result = await db.query(selectSql, queryParams);

  return {
    logs: result.rows.map(r => ({
      id: r.id,
      action: r.action,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      ip_address: r.ip_address,
      user_agent: r.user_agent,
      details: r.details,
      created_at: r.created_at,
      actor: r.user_id ? {
        id: r.user_id,
        name: r.user_name,
        email: r.user_email,
        role: r.user_role,
      } : null,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

module.exports = {
  logAuditEvent,
  getAuditLogsList,
};
