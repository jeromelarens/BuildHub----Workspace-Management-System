const db = require('../config/database');

/**
 * Get notifications for the authenticated user
 * GET /api/notifications
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { is_read, type, page, limit } = req.validatedQuery || req.query || {};

    let queryText = 'SELECT id, user_id, type, title, message, entity_type, entity_id, is_read, created_at FROM notifications WHERE user_id = $1';
    const queryParams = [userId];

    if (is_read !== undefined) {
      queryParams.push(is_read);
      queryText += ` AND is_read = $${queryParams.length}`;
    }

    if (type) {
      queryParams.push(type);
      queryText += ` AND type = $${queryParams.length}`;
    }

    // Count
    const countQuery = `SELECT COUNT(*) FROM (${queryText}) AS total_count`;
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    queryText += ' ORDER BY created_at DESC';

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
      message: 'Notifications retrieved successfully',
      data: result.rows,
    };

    if (page || limit) {
      responsePayload.pagination = paginationMeta;
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Error in getNotifications:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get unread notifications count
 * GET /api/notifications/unread-count
 */
const getUnreadNotificationCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = 'SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = $1 AND is_read = FALSE';
    const result = await db.query(query, [userId]);
    const unreadCount = parseInt(result.rows[0].unread_count, 10) || 0;

    return res.status(200).json({
      success: true,
      message: 'Unread count retrieved successfully',
      data: {
        unread_count: unreadCount,
      },
    });
  } catch (error) {
    console.error('Error in getUnreadNotificationCount:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Mark a specific notification as read
 * PUT /api/notifications/:id/read
 */
const markNotificationAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const findQuery = 'SELECT id, user_id FROM notifications WHERE id = $1';
    const findResult = await db.query(findQuery, [notificationId]);

    if (findResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    if (findResult.rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this notification',
      });
    }

    const updateQuery = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1
      RETURNING id, user_id, type, title, message, entity_type, entity_id, is_read, created_at
    `;
    const updateResult = await db.query(updateQuery, [notificationId]);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Mark all notifications as read for current user
 * PUT /api/notifications/read-all
 */
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: null,
    });
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
const deleteNotification = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const findQuery = 'SELECT id, user_id FROM notifications WHERE id = $1';
    const findResult = await db.query(findQuery, [notificationId]);

    if (findResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    if (findResult.rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this notification',
      });
    }

    await db.query('DELETE FROM notifications WHERE id = $1', [notificationId]);

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
      data: null,
    });
  } catch (error) {
    console.error('Error in deleteNotification:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};
