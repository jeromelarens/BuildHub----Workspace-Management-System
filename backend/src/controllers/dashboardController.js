const db = require('../config/database');

/**
 * Get Admin Dashboard Metrics
 * GET /api/dashboard/admin
 * Admin only
 */
const getAdminDashboard = async (req, res) => {
  try {
    // 1. User metrics
    const userStatsQuery = `
      SELECT 
        COUNT(*) AS total_users,
        COUNT(*) FILTER (WHERE role = 'admin') AS admin_count,
        COUNT(*) FILTER (WHERE role = 'manager') AS manager_count,
        COUNT(*) FILTER (WHERE role = 'team_lead') AS team_lead_count,
        COUNT(*) FILTER (WHERE role = 'employee') AS employee_count
      FROM users
    `;
    const userStatsResult = await db.query(userStatsQuery);
    const userStats = userStatsResult.rows[0];

    // 2. Project metrics (excluding soft deleted)
    const projectStatsQuery = `
      SELECT 
        COUNT(*) AS total_projects,
        COUNT(*) FILTER (WHERE status = 'active') AS active_projects,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_projects,
        COUNT(*) FILTER (WHERE status = 'archived') AS archived_projects,
        COUNT(*) FILTER (WHERE status = 'on_hold') AS on_hold_projects
      FROM projects
      WHERE deleted_at IS NULL
    `;
    const projectStatsResult = await db.query(projectStatsQuery);
    const projectStats = projectStatsResult.rows[0];

    // 3. Task metrics (excluding soft deleted)
    const taskStatsQuery = `
      SELECT 
        COUNT(*) AS total_tasks,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_tasks,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_tasks,
        COUNT(*) FILTER (WHERE priority = 'low') AS low_priority,
        COUNT(*) FILTER (WHERE priority = 'medium') AS medium_priority,
        COUNT(*) FILTER (WHERE priority = 'high') AS high_priority,
        COUNT(*) FILTER (WHERE priority = 'urgent') AS urgent_priority,
        COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) AS overdue_tasks
      FROM tasks
      WHERE deleted_at IS NULL
    `;
    const taskStatsResult = await db.query(taskStatsQuery);
    const taskStats = taskStatsResult.rows[0];

    // 4. Recent projects
    const recentProjectsQuery = `
      SELECT id, name, status, created_at
      FROM projects
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const recentProjectsResult = await db.query(recentProjectsQuery);

    // 5. Recent tasks
    const recentTasksQuery = `
      SELECT id, title, status, priority, due_date, created_at
      FROM tasks
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const recentTasksResult = await db.query(recentTasksQuery);

    return res.status(200).json({
      success: true,
      message: 'Admin dashboard metrics retrieved successfully',
      data: {
        users: {
          total: parseInt(userStats.total_users, 10) || 0,
          admin: parseInt(userStats.admin_count, 10) || 0,
          manager: parseInt(userStats.manager_count, 10) || 0,
          team_lead: parseInt(userStats.team_lead_count, 10) || 0,
          employee: parseInt(userStats.employee_count, 10) || 0,
        },
        projects: {
          total: parseInt(projectStats.total_projects, 10) || 0,
          active: parseInt(projectStats.active_projects, 10) || 0,
          completed: parseInt(projectStats.completed_projects, 10) || 0,
          archived: parseInt(projectStats.archived_projects, 10) || 0,
          on_hold: parseInt(projectStats.on_hold_projects, 10) || 0,
        },
        tasks: {
          total: parseInt(taskStats.total_tasks, 10) || 0,
          pending: parseInt(taskStats.pending_tasks, 10) || 0,
          in_progress: parseInt(taskStats.in_progress_tasks, 10) || 0,
          completed: parseInt(taskStats.completed_tasks, 10) || 0,
          cancelled: parseInt(taskStats.cancelled_tasks, 10) || 0,
          overdue: parseInt(taskStats.overdue_tasks, 10) || 0,
          by_priority: {
            low: parseInt(taskStats.low_priority, 10) || 0,
            medium: parseInt(taskStats.medium_priority, 10) || 0,
            high: parseInt(taskStats.high_priority, 10) || 0,
            urgent: parseInt(taskStats.urgent_priority, 10) || 0,
          },
        },
        recent_activity: {
          projects: recentProjectsResult.rows,
          tasks: recentTasksResult.rows,
        },
      },
    });
  } catch (error) {
    console.error('Error in getAdminDashboard:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get Personal User Dashboard Metrics
 * GET /api/dashboard/my-tasks
 * Authenticated user
 */
const getMyTasksDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Assigned tasks aggregation
    const assignedStatsQuery = `
      SELECT 
        COUNT(*) AS total_assigned,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_tasks,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_tasks,
        COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) AS overdue_tasks
      FROM tasks
      WHERE assigned_to = $1 AND deleted_at IS NULL
    `;
    const assignedResult = await db.query(assignedStatsQuery, [userId]);
    const assignedStats = assignedResult.rows[0];

    // 2. Created tasks aggregation
    const createdStatsQuery = `
      SELECT 
        COUNT(*) AS total_created,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_tasks,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_tasks
      FROM tasks
      WHERE user_id = $1 AND deleted_at IS NULL
    `;
    const createdResult = await db.query(createdStatsQuery, [userId]);
    const createdStats = createdResult.rows[0];

    // 3. Upcoming deadlines (assigned to user)
    const upcomingQuery = `
      SELECT 
        t.id, t.title, t.status, t.priority, t.due_date,
        p.id AS project_id, p.name AS project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.assigned_to = $1 
        AND t.deleted_at IS NULL
        AND t.due_date >= CURRENT_DATE 
        AND t.status NOT IN ('completed', 'cancelled')
      ORDER BY t.due_date ASC
      LIMIT 5
    `;
    const upcomingResult = await db.query(upcomingQuery, [userId]);

    // 4. Overdue tasks list (assigned to user)
    const overdueQuery = `
      SELECT 
        t.id, t.title, t.status, t.priority, t.due_date,
        p.id AS project_id, p.name AS project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.assigned_to = $1 
        AND t.deleted_at IS NULL
        AND t.due_date < CURRENT_DATE 
        AND t.status NOT IN ('completed', 'cancelled')
      ORDER BY t.due_date ASC
      LIMIT 5
    `;
    const overdueResult = await db.query(overdueQuery, [userId]);

    return res.status(200).json({
      success: true,
      message: 'My tasks dashboard metrics retrieved successfully',
      data: {
        assigned_tasks: {
          total: parseInt(assignedStats.total_assigned, 10) || 0,
          pending: parseInt(assignedStats.pending_tasks, 10) || 0,
          in_progress: parseInt(assignedStats.in_progress_tasks, 10) || 0,
          completed: parseInt(assignedStats.completed_tasks, 10) || 0,
          cancelled: parseInt(assignedStats.cancelled_tasks, 10) || 0,
          overdue: parseInt(assignedStats.overdue_tasks, 10) || 0,
        },
        created_tasks: {
          total: parseInt(createdStats.total_created, 10) || 0,
          pending: parseInt(createdStats.pending_tasks, 10) || 0,
          in_progress: parseInt(createdStats.in_progress_tasks, 10) || 0,
          completed: parseInt(createdStats.completed_tasks, 10) || 0,
          cancelled: parseInt(createdStats.cancelled_tasks, 10) || 0,
        },
        upcoming_deadlines: upcomingResult.rows.map(r => ({
          id: r.id,
          title: r.title,
          status: r.status,
          priority: r.priority,
          due_date: r.due_date ? (r.due_date.toISOString ? r.due_date.toISOString().slice(0, 10) : String(r.due_date).slice(0, 10)) : null,
          project: r.project_id ? { id: r.project_id, name: r.project_name } : null,
        })),
        overdue_tasks: overdueResult.rows.map(r => ({
          id: r.id,
          title: r.title,
          status: r.status,
          priority: r.priority,
          due_date: r.due_date ? (r.due_date.toISOString ? r.due_date.toISOString().slice(0, 10) : String(r.due_date).slice(0, 10)) : null,
          project: r.project_id ? { id: r.project_id, name: r.project_name } : null,
        })),
      },
    });
  } catch (error) {
    console.error('Error in getMyTasksDashboard:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getAdminDashboard,
  getMyTasksDashboard,
};
