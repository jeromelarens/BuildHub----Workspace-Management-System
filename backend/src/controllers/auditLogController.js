const { getAuditLogsList } = require('../services/auditService');

/**
 * Get system audit logs (Admin only)
 * GET /api/audit-logs
 */
const getAuditLogs = async (req, res) => {
  try {
    const { action, entity_type, entity_id, user_id, startDate, endDate, page, limit } = req.query;

    const result = await getAuditLogsList({
      action,
      entity_type,
      entity_id: entity_id ? parseInt(entity_id, 10) : undefined,
      user_id: user_id ? parseInt(user_id, 10) : undefined,
      startDate,
      endDate,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: 'Audit logs retrieved successfully',
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error in getAuditLogs:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getAuditLogs,
};
