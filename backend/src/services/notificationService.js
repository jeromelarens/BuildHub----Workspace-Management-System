const db = require('../config/database');

/**
 * Supported Notification Event Types
 */
const NOTIFICATION_TYPES = [
  'task_assigned',
  'task_updated',
  'task_completed',
  'task_due',
  'task_overdue',
  'comment_added',
  'project_added',
  'mention',
  'dependency_resolved',
];

/**
 * Dispatch an in-app notification to a user
 * 
 * @param {object} param0
 * @param {number} param0.userId
 * @param {string} param0.type
 * @param {string} param0.title
 * @param {string} param0.message
 * @param {string} [param0.entityType]
 * @param {number} [param0.entityId]
 * @returns {Promise<any>}
 */
const createNotification = async ({
  userId,
  type,
  title,
  message,
  entityType = null,
  entityId = null,
}) => {
  try {
    if (!userId) return null;

    // Deduplication check: Avoid spamming identical unread notifications within short window (e.g. 5 mins)
    const duplicateCheck = `
      SELECT id FROM notifications
      WHERE user_id = $1 AND type = $2 AND entity_type = $3 AND entity_id = $4 AND is_read = FALSE
        AND created_at > (CURRENT_TIMESTAMP - INTERVAL '5 minutes')
      LIMIT 1
    `;
    const dupRes = await db.query(duplicateCheck, [userId, type, entityType, entityId]);
    if (dupRes.rows.length > 0) {
      return null;
    }

    const insertQuery = `
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, type, title, message, entity_type, entity_id, is_read, created_at
    `;
    const result = await db.query(insertQuery, [
      userId,
      type,
      title,
      message,
      entityType,
      entityId,
    ]);

    return result.rows[0];
  } catch (error) {
    console.error('Error creating notification:', error.message);
    return null;
  }
};

/**
 * Notify when a task is assigned or reassigned
 */
const notifyTaskAssignment = async (task, assignedUserId, assignerUser, isReassignment = false) => {
  if (!assignedUserId || assignedUserId === assignerUser.id) return;

  const actionText = isReassignment ? 'reassigned to you' : 'assigned to you';
  await createNotification({
    userId: assignedUserId,
    type: 'task_assigned',
    title: `Task ${isReassignment ? 'Reassigned' : 'Assigned'}: ${task.title}`,
    message: `${assignerUser.name || 'A team member'} ${actionText}: "${task.title}"`,
    entityType: 'task',
    entityId: task.id,
  });
};

/**
 * Notify when a dependency is resolved (completed)
 */
const notifyDependencyResolved = async (completedTaskId) => {
  try {
    // Find all tasks that depend on this completed task
    const query = `
      SELECT td.task_id, t.title AS blocked_task_title, t.assigned_to, t.user_id
      FROM task_dependencies td
      JOIN tasks t ON td.task_id = t.id
      WHERE td.depends_on_task_id = $1
    `;
    const result = await db.query(query, [completedTaskId]);

    for (const row of result.rows) {
      const recipientId = row.assigned_to || row.user_id;
      if (recipientId) {
        // Check if all dependencies for this blocked task are now completed
        const pendingDeps = await db.query(`
          SELECT 1 FROM task_dependencies td
          JOIN tasks t ON td.depends_on_task_id = t.id
          WHERE td.task_id = $1 AND t.status != 'completed'
          LIMIT 1
        `, [row.task_id]);

        if (pendingDeps.rows.length === 0) {
          await createNotification({
            userId: recipientId,
            type: 'dependency_resolved',
            title: `Dependency Resolved for "${row.blocked_task_title}"`,
            message: `All blocking prerequisite tasks have been completed. You can now proceed with "${row.blocked_task_title}".`,
            entityType: 'task',
            entityId: row.task_id,
          });
        }
      }
    }
  } catch (err) {
    console.error('Error in notifyDependencyResolved:', err.message);
  }
};

module.exports = {
  NOTIFICATION_TYPES,
  createNotification,
  notifyTaskAssignment,
  notifyDependencyResolved,
};
