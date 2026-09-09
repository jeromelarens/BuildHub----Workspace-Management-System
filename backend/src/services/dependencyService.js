const db = require('../config/database');

/**
 * Check if a path exists from startTaskId to targetTaskId in the dependency graph
 * i.e., Does startTaskId transitively depend on targetTaskId?
 * 
 * @param {number} startTaskId 
 * @param {number} targetTaskId 
 * @returns {Promise<boolean>}
 */
const checkTransitiveDependency = async (startTaskId, targetTaskId) => {
  if (startTaskId === targetTaskId) return true;

  // Recursive CTE to find all tasks that startTaskId depends on
  const query = `
    WITH RECURSIVE dependency_chain AS (
      SELECT td.depends_on_task_id
      FROM task_dependencies td
      JOIN tasks t ON td.depends_on_task_id = t.id
      WHERE td.task_id = $1 AND t.deleted_at IS NULL

      UNION

      SELECT td.depends_on_task_id
      FROM task_dependencies td
      JOIN tasks t ON td.depends_on_task_id = t.id
      INNER JOIN dependency_chain dc ON td.task_id = dc.depends_on_task_id
      WHERE t.deleted_at IS NULL
    )
    SELECT 1 FROM dependency_chain WHERE depends_on_task_id = $2 LIMIT 1;
  `;
  const result = await db.query(query, [startTaskId, targetTaskId]);
  return result.rows.length > 0;
};

/**
 * Validate whether a task can be marked as completed based on its dependencies
 * Returns { canComplete: boolean, blockingTasks?: Array<{ id: number, title: string, status: string }> }
 * 
 * @param {number} taskId 
 * @returns {Promise<{ canComplete: boolean, blockingTasks: any[] }>}
 */
const validateTaskCompletionDependencies = async (taskId) => {
  const query = `
    SELECT t.id, t.title, t.status
    FROM task_dependencies td
    JOIN tasks t ON td.depends_on_task_id = t.id
    WHERE td.task_id = $1 AND t.status != 'completed' AND t.deleted_at IS NULL
  `;
  const result = await db.query(query, [taskId]);

  if (result.rows.length > 0) {
    return {
      canComplete: false,
      blockingTasks: result.rows,
    };
  }

  return {
    canComplete: true,
    blockingTasks: [],
  };
};

/**
 * Get all dependencies and dependents for a task
 * @param {number} taskId 
 */
const getTaskDependencies = async (taskId) => {
  // Prerequisite tasks that this task depends on (must be completed first)
  const dependsOnQuery = `
    SELECT td.id AS dependency_id, td.depends_on_task_id, td.created_at,
           t.title, t.status, t.priority, t.due_date,
           u.id AS assigned_to_id, u.name AS assigned_to_name
    FROM task_dependencies td
    JOIN tasks t ON td.depends_on_task_id = t.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE td.task_id = $1 AND t.deleted_at IS NULL
    ORDER BY td.created_at ASC
  `;
  const dependsOnRes = await db.query(dependsOnQuery, [taskId]);

  // Dependent tasks that depend on this task (blocked by this task)
  const blockedTasksQuery = `
    SELECT td.id AS dependency_id, td.task_id, td.created_at,
           t.title, t.status, t.priority, t.due_date,
           u.id AS assigned_to_id, u.name AS assigned_to_name
    FROM task_dependencies td
    JOIN tasks t ON td.task_id = t.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE td.depends_on_task_id = $1 AND t.deleted_at IS NULL
    ORDER BY td.created_at ASC
  `;
  const blockedTasksRes = await db.query(blockedTasksQuery, [taskId]);

  return {
    depends_on: dependsOnRes.rows.map(r => ({
      dependency_id: r.dependency_id,
      task: {
        id: r.depends_on_task_id,
        title: r.title,
        status: r.status,
        priority: r.priority,
        due_date: r.due_date,
        assigned_to: r.assigned_to_id ? { id: r.assigned_to_id, name: r.assigned_to_name } : null,
      },
      created_at: r.created_at,
    })),
    blocking: blockedTasksRes.rows.map(r => ({
      dependency_id: r.dependency_id,
      task: {
        id: r.task_id,
        title: r.title,
        status: r.status,
        priority: r.priority,
        due_date: r.due_date,
        assigned_to: r.assigned_to_id ? { id: r.assigned_to_id, name: r.assigned_to_name } : null,
      },
      created_at: r.created_at,
    })),
  };
};

module.exports = {
  checkTransitiveDependency,
  validateTaskCompletionDependencies,
  getTaskDependencies,
};
