const db = require('../config/database');
const { recordTaskActivity } = require('../services/activityService');
const { createNotification } = require('../services/notificationService');
const { parseAndNotifyMentions } = require('../services/mentionService');
const { logAuditEvent } = require('../services/auditService');

/**
 * Helper to verify user access to a task
 */
const verifyTaskAccess = async (taskId, userId, userRole) => {
  const query = `
    SELECT 
      t.id, t.title, t.user_id, t.assigned_to, t.project_id,
      p.created_by AS project_created_by
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.id = $1 AND t.deleted_at IS NULL
  `;
  const result = await db.query(query, [taskId]);

  if (result.rows.length === 0) {
    return { exists: false };
  }

  const task = result.rows[0];

  if (userRole === 'admin') {
    return { exists: true, allowed: true, task };
  }

  const isCreator = task.user_id === userId;
  const isAssignee = task.assigned_to === userId;
  let hasProjectAccess = false;

  if (task.project_id) {
    const isProjCreator = task.project_created_by === userId;
    const memberQuery = 'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2';
    const memberResult = await db.query(memberQuery, [task.project_id, userId]);
    hasProjectAccess = isProjCreator || memberResult.rows.length > 0;
  }

  const allowed = isCreator || isAssignee || hasProjectAccess;
  return { exists: true, allowed, task };
};

/**
 * Create a comment on a task
 * POST /api/tasks/:id/comments
 */
const createTaskComment = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { comment } = req.body;

    const access = await verifyTaskAccess(taskId, userId, userRole);

    if (!access.exists) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to comment on this task',
      });
    }

    const insertQuery = `
      INSERT INTO task_comments (task_id, user_id, comment)
      VALUES ($1, $2, $3)
      RETURNING id, task_id, user_id, comment, created_at
    `;
    const insertResult = await db.query(insertQuery, [taskId, userId, comment]);
    const createdComment = insertResult.rows[0];

    // Fetch author info
    const userResult = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
    const author = userResult.rows[0];

    // Record activity
    await recordTaskActivity({
      taskId,
      userId,
      action: 'comment_added',
      newValue: comment.length > 50 ? `${comment.slice(0, 47)}...` : comment,
    });

    // Notify assignee and creator if different from commenter
    const recipientIds = new Set();
    if (access.task.assigned_to && access.task.assigned_to !== userId) {
      recipientIds.add(access.task.assigned_to);
    }
    if (access.task.user_id && access.task.user_id !== userId) {
      recipientIds.add(access.task.user_id);
    }

    for (const recipientId of recipientIds) {
      await createNotification({
        userId: recipientId,
        type: 'comment_added',
        title: `New Comment on "${access.task.title}"`,
        message: `${author.name || 'A team member'} commented: "${comment.length > 80 ? comment.slice(0, 77) + '...' : comment}"`,
        entityType: 'task',
        entityId: parseInt(taskId, 10),
      });
    }

    // Mention Notification parsing
    await parseAndNotifyMentions({
      text: comment,
      taskId: parseInt(taskId, 10),
      taskTitle: access.task.title,
      projectId: access.task.project_id,
      author,
      sourceType: 'comment',
      commentId: createdComment.id,
    });

    // Log audit event
    await logAuditEvent({
      userId,
      action: 'COMMENT_CREATED',
      entityType: 'task_comment',
      entityId: createdComment.id,
      req,
      details: { taskId },
    });

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: {
        id: createdComment.id,
        task_id: createdComment.task_id,
        comment: createdComment.comment,
        created_at: createdComment.created_at,
        user: {
          id: author.id,
          name: author.name,
          email: author.email,
          role: author.role,
        },
      },
    });
  } catch (error) {
    console.error('Error in createTaskComment:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get all comments for a task
 * GET /api/tasks/:id/comments
 */
const getTaskComments = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const access = await verifyTaskAccess(taskId, userId, userRole);

    if (!access.exists) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view comments for this task',
      });
    }

    const commentsQuery = `
      SELECT 
        c.id, c.task_id, c.comment, c.created_at,
        u.id AS user_id, u.name AS user_name, u.email AS user_email, u.role AS user_role
      FROM task_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = $1
      ORDER BY c.created_at ASC
    `;
    const result = await db.query(commentsQuery, [taskId]);

    return res.status(200).json({
      success: true,
      message: 'Comments retrieved successfully',
      data: result.rows.map(row => ({
        id: row.id,
        task_id: row.task_id,
        comment: row.comment,
        created_at: row.created_at,
        user: {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email,
          role: row.user_role,
        },
      })),
    });
  } catch (error) {
    console.error('Error in getTaskComments:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Update an existing comment
 * PUT /api/comments/:id
 */
const updateComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;
    const { comment } = req.body;

    const findQuery = 'SELECT id, task_id, user_id, comment, created_at FROM task_comments WHERE id = $1';
    const findResult = await db.query(findQuery, [commentId]);

    if (findResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    const existingComment = findResult.rows[0];

    // Only comment author can update
    if (existingComment.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own comments',
      });
    }

    const updateQuery = `
      UPDATE task_comments
      SET comment = $1
      WHERE id = $2
      RETURNING id, task_id, user_id, comment, created_at
    `;
    const updateResult = await db.query(updateQuery, [comment, commentId]);
    const updated = updateResult.rows[0];

    const userResult = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
    const author = userResult.rows[0];

    return res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      data: {
        id: updated.id,
        task_id: updated.task_id,
        comment: updated.comment,
        created_at: updated.created_at,
        user: {
          id: author.id,
          name: author.name,
          email: author.email,
          role: author.role,
        },
      },
    });
  } catch (error) {
    console.error('Error in updateComment:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Delete a comment
 * DELETE /api/comments/:id
 */
const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const findQuery = 'SELECT id, task_id, user_id FROM task_comments WHERE id = $1';
    const findResult = await db.query(findQuery, [commentId]);

    if (findResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    const existingComment = findResult.rows[0];

    // Comment owner or Admin moderation delete override
    if (userRole !== 'admin' && existingComment.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to delete this comment',
      });
    }

    await db.query('DELETE FROM task_comments WHERE id = $1', [commentId]);

    await logAuditEvent({
      userId,
      action: 'COMMENT_DELETED',
      entityType: 'task_comment',
      entityId: commentId,
      req,
      details: { taskId: existingComment.task_id },
    });

    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
      data: null,
    });
  } catch (error) {
    console.error('Error in deleteComment:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  createTaskComment,
  getTaskComments,
  updateComment,
  deleteComment,
};
