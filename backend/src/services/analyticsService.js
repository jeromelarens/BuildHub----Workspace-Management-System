const db = require('../config/database');

/**
 * Build SQL task visibility filter based on user role and ID
 * @param {object} user - { id, role }
 * @param {string} taskAlias - SQL alias for tasks table (e.g. 't')
 * @returns {{ whereClause: string, params: any[] }}
 */
const buildTaskVisibilityFilter = (user, taskAlias = 't') => {
  if (user.role === 'admin') {
    return { whereClause: `${taskAlias}.deleted_at IS NULL`, params: [] };
  }

  if (user.role === 'manager') {
    return {
      whereClause: `
        ${taskAlias}.deleted_at IS NULL AND (
          ${taskAlias}.user_id = $1
          OR ${taskAlias}.assigned_to = $1
          OR ${taskAlias}.project_id IN (SELECT id FROM projects WHERE created_by = $1 AND deleted_at IS NULL)
          OR ${taskAlias}.project_id IN (SELECT project_id FROM project_members WHERE user_id = $1)
        )
      `,
      params: [user.id],
    };
  }

  if (user.role === 'team_lead') {
    return {
      whereClause: `
        ${taskAlias}.deleted_at IS NULL AND (
          ${taskAlias}.user_id = $1
          OR ${taskAlias}.assigned_to = $1
          OR ${taskAlias}.project_id IN (SELECT project_id FROM project_members WHERE user_id = $1)
        )
      `,
      params: [user.id],
    };
  }

  // Employee
  return {
    whereClause: `
      ${taskAlias}.deleted_at IS NULL AND (
        ${taskAlias}.user_id = $1
        OR ${taskAlias}.assigned_to = $1
        OR ${taskAlias}.project_id IN (SELECT project_id FROM project_members WHERE user_id = $1)
      )
    `,
    params: [user.id],
  };
};

/**
 * Calculate Project Health & Progress
 * @param {number} projectId 
 */
const calculateProjectProgressAndHealth = async (projectId) => {
  const query = `
    SELECT 
      COUNT(*) AS total_tasks,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_tasks,
      COUNT(CASE WHEN status != 'completed' AND due_date < CURRENT_DATE THEN 1 END) AS overdue_tasks,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) AS in_progress_tasks,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_tasks
    FROM tasks
    WHERE project_id = $1 AND deleted_at IS NULL
  `;
  const res = await db.query(query, [projectId]);
  const row = res.rows[0];

  const totalTasks = parseInt(row.total_tasks, 10);
  const completedTasks = parseInt(row.completed_tasks, 10);
  const overdueTasks = parseInt(row.overdue_tasks, 10);
  const inProgressTasks = parseInt(row.in_progress_tasks, 10);
  const pendingTasks = parseInt(row.pending_tasks, 10);

  const completionPercentage = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 10000) / 100
    : 0;

  let healthStatus = 'ON_TRACK';
  if (overdueTasks >= 3) {
    healthStatus = 'DELAYED';
  } else if (overdueTasks >= 1) {
    healthStatus = 'AT_RISK';
  } else {
    healthStatus = 'ON_TRACK';
  }

  return {
    total_tasks: totalTasks,
    completed_tasks: completedTasks,
    in_progress_tasks: inProgressTasks,
    pending_tasks: pendingTasks,
    overdue_tasks: overdueTasks,
    completion_percentage: completionPercentage,
    health_status: healthStatus,
  };
};

/**
 * Get Overview Analytics
 * @param {object} user - { id, role }
 */
const getOverviewAnalytics = async (user) => {
  const { whereClause, params } = buildTaskVisibilityFilter(user, 't');

  // Task metrics
  const taskMetricsQuery = `
    SELECT
      COUNT(*) AS total_tasks,
      COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS completed_tasks,
      COUNT(CASE WHEN t.status != 'completed' THEN 1 END) AS active_tasks,
      COUNT(CASE WHEN t.status != 'completed' AND t.due_date < CURRENT_DATE THEN 1 END) AS overdue_tasks,
      COUNT(CASE WHEN t.status = 'pending' THEN 1 END) AS pending_tasks,
      COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) AS in_progress_tasks,
      COUNT(CASE WHEN t.priority = 'high' THEN 1 END) AS priority_high,
      COUNT(CASE WHEN t.priority = 'medium' THEN 1 END) AS priority_medium,
      COUNT(CASE WHEN t.priority = 'low' THEN 1 END) AS priority_low
    FROM tasks t
    WHERE ${whereClause}
  `;
  const taskRes = await db.query(taskMetricsQuery, params);
  const tRow = taskRes.rows[0];

  const totalTasks = parseInt(tRow.total_tasks, 10);
  const completedTasks = parseInt(tRow.completed_tasks, 10);
  const activeTasks = parseInt(tRow.active_tasks, 10);
  const overdueTasks = parseInt(tRow.overdue_tasks, 10);

  const completionRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 10000) / 100
    : 0;

  // Project count
  let projectCountQuery = 'SELECT COUNT(*) AS total_projects FROM projects WHERE deleted_at IS NULL';
  let projectParams = [];
  if (user.role !== 'admin') {
    projectCountQuery += `
      AND (created_by = $1 OR id IN (SELECT project_id FROM project_members WHERE user_id = $1))
    `;
    projectParams = [user.id];
  }
  const projRes = await db.query(projectCountQuery, projectParams);
  const totalProjects = parseInt(projRes.rows[0].total_projects, 10);

  return {
    projects: {
      total_active_projects: totalProjects,
    },
    tasks: {
      total_tasks: totalTasks,
      active_tasks: activeTasks,
      completed_tasks: completedTasks,
      overdue_tasks: overdueTasks,
      completion_rate_percentage: completionRate,
    },
    priority_distribution: {
      high: parseInt(tRow.priority_high, 10),
      medium: parseInt(tRow.priority_medium, 10),
      low: parseInt(tRow.priority_low, 10),
    },
    status_distribution: {
      pending: parseInt(tRow.pending_tasks, 10),
      in_progress: parseInt(tRow.in_progress_tasks, 10),
      completed: completedTasks,
    },
  };
};

/**
 * Get Team Velocity Analytics
 * @param {object} user - { id, role }
 * @param {object} filters - { startDate, endDate, period }
 */
const getTeamVelocityAnalytics = async (user, { startDate, endDate }) => {
  const { whereClause, params } = buildTaskVisibilityFilter(user, 't');
  const queryParams = [...params];

  let dateFilter = '';
  if (startDate) {
    queryParams.push(startDate);
    dateFilter += ` AND t.updated_at >= $${queryParams.length}`;
  }
  if (endDate) {
    queryParams.push(endDate);
    dateFilter += ` AND t.updated_at <= $${queryParams.length}`;
  }

  // Completed tasks by date (velocity)
  const velocityQuery = `
    SELECT 
      TO_CHAR(t.updated_at, 'YYYY-MM-DD') AS completion_date,
      COUNT(*) AS completed_count
    FROM tasks t
    WHERE ${whereClause} AND t.status = 'completed' ${dateFilter}
    GROUP BY TO_CHAR(t.updated_at, 'YYYY-MM-DD')
    ORDER BY completion_date ASC
  `;
  const velocityRes = await db.query(velocityQuery, queryParams);

  // Workload by assignee
  const workloadQuery = `
    SELECT 
      t.assigned_to,
      u.name AS assignee_name,
      u.email AS assignee_email,
      COUNT(*) AS total_assigned_tasks,
      COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS completed_tasks,
      COUNT(CASE WHEN t.status != 'completed' THEN 1 END) AS active_tasks,
      COUNT(CASE WHEN t.status != 'completed' AND t.due_date < CURRENT_DATE THEN 1 END) AS overdue_tasks
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE ${whereClause}
    GROUP BY t.assigned_to, u.name, u.email
    ORDER BY total_assigned_tasks DESC
  `;
  const workloadRes = await db.query(workloadQuery, params);

  // Average completion time in hours
  const avgTimeQuery = `
    SELECT 
      AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at)) / 3600) AS avg_completion_hours
    FROM tasks t
    WHERE ${whereClause} AND t.status = 'completed' ${dateFilter}
  `;
  const avgTimeRes = await db.query(avgTimeQuery, queryParams);
  const avgHours = parseFloat(avgTimeRes.rows[0].avg_completion_hours) || 0;

  return {
    summary: {
      average_completion_hours: Math.round(avgHours * 10) / 10,
      average_completion_days: Math.round((avgHours / 24) * 10) / 10,
    },
    velocity_timeline: velocityRes.rows.map(r => ({
      date: r.completion_date,
      completed_tasks: parseInt(r.completed_count, 10),
    })),
    workload_by_assignee: workloadRes.rows.map(r => ({
      user_id: r.assigned_to,
      name: r.assignee_name || (r.assigned_to ? 'Unknown User' : 'Unassigned'),
      email: r.assignee_email || null,
      total_assigned: parseInt(r.total_assigned_tasks, 10),
      active: parseInt(r.active_tasks, 10),
      completed: parseInt(r.completed_tasks, 10),
      overdue: parseInt(r.overdue_tasks, 10),
    })),
  };
};

/**
 * Get Burndown Chart Data for a specific project
 * @param {number} projectId 
 * @param {object} user - { id, role }
 */
const getProjectBurndownAnalytics = async (projectId, user) => {
  // Check project access
  const projRes = await db.query('SELECT id, name, created_by FROM projects WHERE id = $1 AND deleted_at IS NULL', [projectId]);
  if (projRes.rows.length === 0) {
    return { error: 'Project not found', status: 404 };
  }

  const project = projRes.rows[0];
  if (user.role !== 'admin' && project.created_by !== user.id) {
    const memRes = await db.query('SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, user.id]);
    if (memRes.rows.length === 0) {
      return { error: 'Access denied to project analytics', status: 403 };
    }
  }

  // Project task count
  const countRes = await db.query(
    'SELECT COUNT(*) AS total FROM tasks WHERE project_id = $1 AND deleted_at IS NULL',
    [projectId]
  );
  const totalTasks = parseInt(countRes.rows[0].total, 10);

  // Completed tasks by date
  const completedRes = await db.query(`
    SELECT 
      TO_CHAR(updated_at, 'YYYY-MM-DD') AS completed_date,
      COUNT(*) AS count
    FROM tasks
    WHERE project_id = $1 AND status = 'completed' AND deleted_at IS NULL
    GROUP BY TO_CHAR(updated_at, 'YYYY-MM-DD')
    ORDER BY completed_date ASC
  `, [projectId]);

  let runningCompleted = 0;
  const timeline = completedRes.rows.map(r => {
    runningCompleted += parseInt(r.count, 10);
    return {
      date: r.completed_date,
      tasks_completed_on_date: parseInt(r.count, 10),
      cumulative_completed: runningCompleted,
      remaining_tasks: Math.max(0, totalTasks - runningCompleted),
    };
  });

  return {
    project: {
      id: project.id,
      name: project.name,
      total_scope_tasks: totalTasks,
      currently_completed: runningCompleted,
      currently_remaining: Math.max(0, totalTasks - runningCompleted),
    },
    burndown_timeline: timeline,
  };
};

module.exports = {
  calculateProjectProgressAndHealth,
  getOverviewAnalytics,
  getTeamVelocityAnalytics,
  getProjectBurndownAnalytics,
};
