const db = require('../config/database');

/**
 * Record a single field change or action in task_activities
 * 
 * @param {object} param0
 * @param {number} param0.taskId
 * @param {number|null} param0.userId
 * @param {string} param0.action
 * @param {string|null} [param0.fieldName]
 * @param {string|null} [param0.oldValue]
 * @param {string|null} [param0.newValue]
 */
const recordTaskActivity = async ({
  taskId,
  userId,
  action,
  fieldName = null,
  oldValue = null,
  newValue = null,
}) => {
  try {
    const query = `
      INSERT INTO task_activities (task_id, user_id, action, field_name, old_value, new_value)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, task_id, user_id, action, field_name, old_value, new_value, created_at
    `;
    const result = await db.query(query, [
      taskId,
      userId || null,
      action,
      fieldName,
      oldValue !== null ? String(oldValue) : null,
      newValue !== null ? String(newValue) : null,
    ]);
    return result.rows[0];
  } catch (error) {
    console.error('Error in recordTaskActivity:', error.message);
    return null;
  }
};

/**
 * Record diffs between existing task and updated task attributes
 */
const recordTaskUpdateActivities = async (existingTask, updatedData, userId) => {
  const fields = ['title', 'description', 'status', 'priority', 'due_date', 'assigned_to', 'project_id'];

  for (const field of fields) {
    if (updatedData[field] !== undefined) {
      const oldVal = existingTask[field] !== undefined && existingTask[field] !== null
        ? (existingTask[field] instanceof Date ? existingTask[field].toISOString().slice(0, 10) : String(existingTask[field]))
        : null;
      const newVal = updatedData[field] !== null ? String(updatedData[field]) : null;

      if (oldVal !== newVal) {
        let action = `${field}_changed`;
        if (field === 'status') {
          action = newVal === 'completed' ? 'completion' : (oldVal === 'completed' ? 'reopened' : 'status_changed');
        } else if (field === 'assigned_to') {
          action = oldVal ? 'reassignment' : 'assignment';
        }

        await recordTaskActivity({
          taskId: existingTask.id,
          userId,
          action,
          fieldName: field,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }
  }
};

/**
 * Fetch chronological activity timeline for a task
 * @param {number} taskId 
 */
const getTaskActivities = async (taskId) => {
  const query = `
    SELECT ta.id, ta.task_id, ta.action, ta.field_name, ta.old_value, ta.new_value, ta.created_at,
           u.id AS user_id, u.name AS user_name, u.email AS user_email, u.role AS user_role
    FROM task_activities ta
    LEFT JOIN users u ON ta.user_id = u.id
    WHERE ta.task_id = $1
    ORDER BY ta.created_at ASC, ta.id ASC
  `;
  const result = await db.query(query, [taskId]);

  return result.rows.map(row => ({
    id: row.id,
    task_id: row.task_id,
    action: row.action,
    field_name: row.field_name,
    old_value: row.old_value,
    new_value: row.new_value,
    user: row.user_id ? {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      role: row.user_role,
    } : null,
    created_at: row.created_at,
  }));
};

module.exports = {
  recordTaskActivity,
  recordTaskUpdateActivities,
  getTaskActivities,
};
