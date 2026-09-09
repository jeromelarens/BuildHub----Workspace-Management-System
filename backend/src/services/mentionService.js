const db = require('../config/database');
const { createNotification } = require('./notificationService');

/**
 * Extract distinct mention tokens from text
 * Matches @username or @email.prefix
 * @param {string} text 
 * @returns {string[]}
 */
const extractMentions = (text) => {
  if (!text || typeof text !== 'string') return [];
  const regex = /(?:^|\s)@([a-zA-Z0-9._-]+)/g;
  const matches = new Set();
  let match;
  while ((match = regex.exec(text)) !== null) {
    const token = match[1].trim();
    if (token.length > 1) {
      matches.add(token.toLowerCase());
    }
  }
  return Array.from(matches);
};

/**
 * Parse mentions and dispatch notifications
 * 
 * @param {object} param0
 * @param {string} param0.text - Text containing mentions
 * @param {number} param0.taskId - Associated task ID
 * @param {string} param0.taskTitle - Title of the task
 * @param {number|null} [param0.projectId] - Associated project ID
 * @param {object} param0.author - Author user object { id, name, email }
 * @param {string} [param0.sourceType] - 'task' or 'comment'
 * @param {number|null} [param0.commentId] - Associated comment ID if source is comment
 */
const parseAndNotifyMentions = async ({
  text,
  taskId,
  taskTitle,
  projectId = null,
  author,
  sourceType = 'task',
  commentId = null,
}) => {
  try {
    const tokens = extractMentions(text);
    if (tokens.length === 0) return [];

    const notifiedUserIds = new Set();

    for (const token of tokens) {
      // Find matching user by name or email or prefix
      const userRes = await db.query(`
        SELECT id, name, email, role
        FROM users
        WHERE LOWER(name) = $1 
           OR LOWER(email) = $1 
           OR LOWER(email) LIKE $2
           OR LOWER(REPLACE(name, ' ', '')) = $1
           OR LOWER(REPLACE(name, ' ', '_')) = $1
           OR LOWER(REPLACE(name, ' ', '.')) = $1
        LIMIT 1
      `, [token, `${token}@%`]);

      if (userRes.rows.length === 0) continue;

      const targetUser = userRes.rows[0];

      // Prevent self-notification
      if (targetUser.id === author.id) continue;

      // Prevent duplicate notification in same action
      if (notifiedUserIds.has(targetUser.id)) continue;

      // Authorization verification: Target user must have access to project/task or be admin
      let hasAccess = false;
      if (targetUser.role === 'admin') {
        hasAccess = true;
      } else if (projectId) {
        const projRes = await db.query(
          'SELECT id FROM projects WHERE id = $1 AND (created_by = $2 OR deleted_at IS NULL)',
          [projectId, targetUser.id]
        );
        const memberRes = await db.query(
          'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
          [projectId, targetUser.id]
        );
        if (projRes.rows.length > 0 && (projRes.rows[0].created_by === targetUser.id || memberRes.rows.length > 0)) {
          hasAccess = true;
        }
      } else {
        // Standalone task: target user is creator or assignee
        const standaloneRes = await db.query(
          'SELECT id FROM tasks WHERE id = $1 AND (user_id = $2 OR assigned_to = $2)',
          [taskId, targetUser.id]
        );
        if (standaloneRes.rows.length > 0) {
          hasAccess = true;
        }
      }

      if (!hasAccess) continue;

      // Dispatch notification
      const sourceDesc = sourceType === 'comment' ? 'in a comment on' : 'in';
      await createNotification({
        userId: targetUser.id,
        type: 'mention',
        title: `Mentioned in ${sourceType === 'comment' ? 'Comment' : 'Task'}`,
        message: `${author.name || 'A user'} mentioned you ${sourceDesc} task "${taskTitle || `#${taskId}`}"`,
        entityType: sourceType === 'comment' ? 'task_comment' : 'task',
        entityId: sourceType === 'comment' && commentId ? commentId : taskId,
      });

      notifiedUserIds.add(targetUser.id);
    }

    return Array.from(notifiedUserIds);
  } catch (error) {
    console.error('Error processing mentions:', error.message);
    return [];
  }
};

module.exports = {
  extractMentions,
  parseAndNotifyMentions,
};
