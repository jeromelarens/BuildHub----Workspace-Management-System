const db = require('../config/database');
const {
  checkTransitiveDependency,
  validateTaskCompletionDependencies,
  getTaskDependencies,
} = require('../services/dependencyService');
const {
  calculateNextRunDate,
} = require('../services/recurrenceService');
const {
  recordTaskActivity,
  recordTaskUpdateActivities,
  getTaskActivities,
} = require('../services/activityService');
const {
  notifyTaskAssignment,
  notifyDependencyResolved,
} = require('../services/notificationService');
const { parseAndNotifyMentions } = require('../services/mentionService');
const { logAuditEvent } = require('../services/auditService');

/**
 * Helper to check if a user is a member of a project
 */
const isUserProjectMember = async (projectId, userId) => {
  if (!projectId || !userId) return false;
  const query = 'SELECT id, role FROM project_members WHERE project_id = $1 AND user_id = $2';
  const result = await db.query(query, [projectId, userId]);
  return result.rows.length > 0;
};

/**
 * Helper to check if a user is a project lead (creator or role='lead')
 */
const isProjectLeadOrManager = async (projectId, userId) => {
  if (!projectId || !userId) return false;
  const projRes = await db.query('SELECT created_by FROM projects WHERE id = $1', [projectId]);
  if (projRes.rows.length > 0 && projRes.rows[0].created_by === userId) {
    return true;
  }
  const memberRes = await db.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
  if (memberRes.rows.length > 0 && memberRes.rows[0].role === 'lead') {
    return true;
  }
  return false;
};

/**
 * Helper to check if user is the creator / manager of a project
 */
const isProjectCreator = async (projectId, userId) => {
  if (!projectId || !userId) return false;
  const query = 'SELECT id FROM projects WHERE id = $1 AND created_by = $2';
  const result = await db.query(query, [projectId, userId]);
  return result.rows.length > 0;
};

/**
 * Format task row with nested metadata and overdue status
 */
const formatTaskRow = (row) => {
  const isOverdue =
    Boolean(row.due_date) &&
    new Date(row.due_date) < new Date(new Date().toISOString().slice(0, 10)) &&
    !['completed', 'cancelled'].includes(row.status);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority || 'medium',
    due_date: row.due_date ? (row.due_date.toISOString ? row.due_date.toISOString().slice(0, 10) : String(row.due_date).slice(0, 10)) : null,
    is_overdue: isOverdue,
    deleted_at: row.deleted_at || null,
    user_id: row.user_id,
    creator: row.user_id ? {
      id: row.user_id,
      name: row.creator_name || null,
      email: row.creator_email || null,
    } : null,
    project_id: row.project_id || null,
    project: row.project_id ? {
      id: row.project_id,
      name: row.project_name || null,
    } : null,
    assigned_to: row.assigned_to || null,
    assigned_user: row.assigned_to ? {
      id: row.assigned_to,
      name: row.assigned_user_name || null,
      email: row.assigned_user_email || null,
    } : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

/**
 * Create a new task
 * POST /api/tasks
 */
const createTask = async (req, res) => {
  try {
    const {
      title,
      description = null,
      status = 'pending',
      priority = 'medium',
      due_date = null,
      project_id = null,
      assigned_to = null,
    } = req.validatedData || req.body;

    const userId = req.user.id;
    const userRole = req.user.role;

    // Role-based authorization & context validation
    if (project_id !== null) {
      const projQuery = 'SELECT id, name, created_by FROM projects WHERE id = $1 AND deleted_at IS NULL';
      const projResult = await db.query(projQuery, [project_id]);

      if (projResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      const project = projResult.rows[0];

      if (userRole !== 'admin') {
        const isCreator = project.created_by === userId;
        const isMember = await isUserProjectMember(project_id, userId);

        if (!isCreator && !isMember) {
          return res.status(403).json({
            success: false,
            message: 'You must be a member or manager of this project to create tasks in it',
          });
        }
      }

      if (assigned_to !== null) {
        const userExistsQuery = 'SELECT id FROM users WHERE id = $1';
        const userExists = await db.query(userExistsQuery, [assigned_to]);
        if (userExists.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Assigned user not found',
          });
        }

        const isTargetMember = await isUserProjectMember(project_id, assigned_to);
        const isTargetCreator = await isProjectCreator(project_id, assigned_to);
        if (!isTargetMember && !isTargetCreator && userRole !== 'admin') {
          return res.status(400).json({
            success: false,
            message: 'Assigned user must be a member of the project',
          });
        }
      }
    } else {
      // Standalone task
      if (assigned_to !== null && assigned_to !== userId && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only assign tasks to other users within a shared project',
        });
      }
    }

    const insertQuery = `
      INSERT INTO tasks (title, description, status, priority, due_date, project_id, assigned_to, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, title, description, status, priority, due_date, project_id, assigned_to, user_id, created_at, updated_at
    `;

    const result = await db.query(insertQuery, [
      title,
      description,
      status,
      priority,
      due_date,
      project_id,
      assigned_to,
      userId,
    ]);

    const createdTask = result.rows[0];

    // Fetch full task with joins
    const fetchQuery = `
      SELECT 
        t.id, t.title, t.description, t.status, t.priority, t.due_date, t.deleted_at,
        t.user_id, t.project_id, t.assigned_to, t.created_at, t.updated_at,
        u_creator.name AS creator_name, u_creator.email AS creator_email,
        p.name AS project_name,
        u_assigned.name AS assigned_user_name, u_assigned.email AS assigned_user_email
      FROM tasks t
      LEFT JOIN users u_creator ON t.user_id = u_creator.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      WHERE t.id = $1
    `;
    const fullResult = await db.query(fetchQuery, [createdTask.id]);
    const formatted = formatTaskRow(fullResult.rows[0]);

    // Record creation activity
    await recordTaskActivity({
      taskId: createdTask.id,
      userId,
      action: 'created',
      newValue: title,
    });

    // Mention notification dispatch
    if (description) {
      await parseAndNotifyMentions({
        text: description,
        taskId: createdTask.id,
        taskTitle: title,
        projectId: project_id,
        author: req.user,
        sourceType: 'task',
      });
    }

    // Notify assignee if assigned
    if (assigned_to && assigned_to !== userId) {
      await notifyTaskAssignment(createdTask, assigned_to, req.user, false);
    }

    // Log audit event
    await logAuditEvent({
      userId,
      action: 'TASK_CREATED',
      entityType: 'task',
      entityId: createdTask.id,
      req,
      details: { title, priority, project_id, assigned_to },
    });

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: formatted,
    });
  } catch (error) {
    console.error('Error in createTask:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get all tasks with role-based visibility, filtering, search, and pagination
 * GET /api/tasks
 */
const getTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      status,
      priority,
      project_id,
      assigned_to,
      search,
      page,
      limit,
    } = req.validatedQuery || req.query || {};

    let baseFilter = 't.deleted_at IS NULL';
    const queryParams = [];

    // Role-based visibility scope
    if (userRole === 'admin') {
      // Admin sees all non-deleted tasks
    } else if (userRole === 'manager') {
      queryParams.push(userId);
      baseFilter += ` AND (
        t.user_id = $${queryParams.length}
        OR t.assigned_to = $${queryParams.length}
        OR (t.project_id IS NOT NULL AND (
          EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id AND p.created_by = $${queryParams.length} AND p.deleted_at IS NULL)
          OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = t.project_id AND pm.user_id = $${queryParams.length})
        ))
      )`;
    } else {
      // Team lead and Employee
      queryParams.push(userId);
      baseFilter += ` AND (
        t.user_id = $${queryParams.length}
        OR t.assigned_to = $${queryParams.length}
        OR (t.project_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM project_members pm WHERE pm.project_id = t.project_id AND pm.user_id = $${queryParams.length}
        ))
      )`;
    }

    if (status) {
      queryParams.push(status);
      baseFilter += ` AND t.status = $${queryParams.length}`;
    }

    if (priority) {
      queryParams.push(priority);
      baseFilter += ` AND t.priority = $${queryParams.length}`;
    }

    if (project_id) {
      queryParams.push(project_id);
      baseFilter += ` AND t.project_id = $${queryParams.length}`;
    }

    if (assigned_to) {
      queryParams.push(assigned_to);
      baseFilter += ` AND t.assigned_to = $${queryParams.length}`;
    }

    if (search) {
      queryParams.push(`%${search}%`);
      baseFilter += ` AND (t.title ILIKE $${queryParams.length} OR t.description ILIKE $${queryParams.length})`;
    }

    // Count query for pagination
    const countQuery = `SELECT COUNT(*) FROM tasks t WHERE ${baseFilter}`;
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    let selectQuery = `
      SELECT 
        t.id, t.title, t.description, t.status, t.priority, t.due_date, t.deleted_at,
        t.user_id, t.project_id, t.assigned_to, t.created_at, t.updated_at,
        u_creator.name AS creator_name, u_creator.email AS creator_email,
        p.name AS project_name,
        u_assigned.name AS assigned_user_name, u_assigned.email AS assigned_user_email
      FROM tasks t
      LEFT JOIN users u_creator ON t.user_id = u_creator.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      WHERE ${baseFilter}
      ORDER BY t.created_at DESC
    `;

    const paginationMeta = {};
    if (page || limit) {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;
      const offset = (pageNum - 1) * limitNum;

      queryParams.push(limitNum);
      selectQuery += ` LIMIT $${queryParams.length}`;
      queryParams.push(offset);
      selectQuery += ` OFFSET $${queryParams.length}`;

      paginationMeta.page = pageNum;
      paginationMeta.limit = limitNum;
      paginationMeta.total = total;
      paginationMeta.totalPages = Math.ceil(total / limitNum) || 1;
    }

    const result = await db.query(selectQuery, queryParams);

    const responsePayload = {
      success: true,
      message: 'Tasks retrieved successfully',
      data: result.rows.map(formatTaskRow),
    };

    if (page || limit) {
      responsePayload.pagination = paginationMeta;
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Error in getTasks:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get a single task by ID
 * GET /api/tasks/:id
 */
const getTaskById = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const findQuery = `
      SELECT 
        t.id, t.title, t.description, t.status, t.priority, t.due_date, t.deleted_at,
        t.user_id, t.project_id, t.assigned_to, t.created_at, t.updated_at,
        u_creator.name AS creator_name, u_creator.email AS creator_email,
        p.name AS project_name, p.created_by AS project_created_by,
        u_assigned.name AS assigned_user_name, u_assigned.email AS assigned_user_email
      FROM tasks t
      LEFT JOIN users u_creator ON t.user_id = u_creator.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      WHERE t.id = $1 AND t.deleted_at IS NULL
    `;
    const findResult = await db.query(findQuery, [taskId]);

    if (findResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const task = findResult.rows[0];

    // Authorization check
    if (userRole !== 'admin') {
      const isCreator = task.user_id === userId;
      const isAssignee = task.assigned_to === userId;
      let hasProjectAccess = false;

      if (task.project_id) {
        const isProjCreator = task.project_created_by === userId;
        const isMember = await isUserProjectMember(task.project_id, userId);
        hasProjectAccess = isProjCreator || isMember;
      }

      if (!isCreator && !isAssignee && !hasProjectAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to access this task',
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Task retrieved successfully',
      data: formatTaskRow(task),
    });
  } catch (error) {
    console.error('Error in getTaskById:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Advanced Task Search
 * GET /api/tasks/search/advanced
 */
const advancedTaskSearch = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      search,
      startDate,
      endDate,
      status,
      priority,
      project_id,
      assigned_to,
      hasAttachments,
      isOverdue,
      isBlocked,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = req.validatedQuery || req.query;

    let baseFilter = 't.deleted_at IS NULL';
    const queryParams = [];

    // RBAC visibility
    if (userRole === 'admin') {
      // Global
    } else if (userRole === 'manager') {
      queryParams.push(userId);
      baseFilter += ` AND (
        t.user_id = $${queryParams.length}
        OR t.assigned_to = $${queryParams.length}
        OR (t.project_id IS NOT NULL AND (
          EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id AND p.created_by = $${queryParams.length} AND p.deleted_at IS NULL)
          OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = t.project_id AND pm.user_id = $${queryParams.length})
        ))
      )`;
    } else {
      queryParams.push(userId);
      baseFilter += ` AND (
        t.user_id = $${queryParams.length}
        OR t.assigned_to = $${queryParams.length}
        OR (t.project_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM project_members pm WHERE pm.project_id = t.project_id AND pm.user_id = $${queryParams.length}
        ))
      )`;
    }

    if (search) {
      queryParams.push(`%${search}%`);
      baseFilter += ` AND (t.title ILIKE $${queryParams.length} OR t.description ILIKE $${queryParams.length})`;
    }

    if (startDate) {
      queryParams.push(startDate);
      baseFilter += ` AND t.created_at >= $${queryParams.length}`;
    }

    if (endDate) {
      queryParams.push(endDate);
      baseFilter += ` AND t.created_at <= $${queryParams.length}`;
    }

    if (status) {
      queryParams.push(status);
      baseFilter += ` AND t.status = $${queryParams.length}`;
    }

    if (priority) {
      queryParams.push(priority);
      baseFilter += ` AND t.priority = $${queryParams.length}`;
    }

    if (project_id) {
      queryParams.push(project_id);
      baseFilter += ` AND t.project_id = $${queryParams.length}`;
    }

    if (assigned_to) {
      queryParams.push(assigned_to);
      baseFilter += ` AND t.assigned_to = $${queryParams.length}`;
    }

    if (hasAttachments === true) {
      baseFilter += ' AND EXISTS (SELECT 1 FROM task_attachments ta WHERE ta.task_id = t.id)';
    } else if (hasAttachments === false) {
      baseFilter += ' AND NOT EXISTS (SELECT 1 FROM task_attachments ta WHERE ta.task_id = t.id)';
    }

    if (isOverdue === true) {
      baseFilter += " AND t.due_date < CURRENT_DATE AND t.status NOT IN ('completed', 'cancelled')";
    } else if (isOverdue === false) {
      baseFilter += " AND (t.due_date >= CURRENT_DATE OR t.due_date IS NULL OR t.status IN ('completed', 'cancelled'))";
    }

    if (isBlocked === true) {
      baseFilter += ` AND EXISTS (
        SELECT 1 FROM task_dependencies td
        JOIN tasks dep_t ON td.depends_on_task_id = dep_t.id
        WHERE td.task_id = t.id AND dep_t.status != 'completed' AND dep_t.deleted_at IS NULL
      )`;
    } else if (isBlocked === false) {
      baseFilter += ` AND NOT EXISTS (
        SELECT 1 FROM task_dependencies td
        JOIN tasks dep_t ON td.depends_on_task_id = dep_t.id
        WHERE td.task_id = t.id AND dep_t.status != 'completed' AND dep_t.deleted_at IS NULL
      )`;
    }

    const countQuery = `SELECT COUNT(*) FROM tasks t WHERE ${baseFilter}`;
    const countRes = await db.query(countQuery, queryParams);
    const total = parseInt(countRes.rows[0].count, 10);

    const safeSortBy = ['due_date', 'created_at', 'priority', 'title', 'status'].includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const selectQuery = `
      SELECT 
        t.id, t.title, t.description, t.status, t.priority, t.due_date, t.deleted_at,
        t.user_id, t.project_id, t.assigned_to, t.created_at, t.updated_at,
        u_creator.name AS creator_name, u_creator.email AS creator_email,
        p.name AS project_name,
        u_assigned.name AS assigned_user_name, u_assigned.email AS assigned_user_email,
        (SELECT COUNT(*) FROM task_attachments ta WHERE ta.task_id = t.id) AS attachments_count
      FROM tasks t
      LEFT JOIN users u_creator ON t.user_id = u_creator.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      WHERE ${baseFilter}
      ORDER BY t.${safeSortBy} ${safeSortOrder}, t.id DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    queryParams.push(limitNum, offset);

    const result = await db.query(selectQuery, queryParams);

    return res.status(200).json({
      success: true,
      message: 'Advanced search tasks retrieved successfully',
      data: result.rows.map(formatTaskRow),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('Error in advancedTaskSearch:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Update a task
 * PUT /api/tasks/:id
 */
const updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      title,
      description,
      status,
      priority,
      due_date,
      project_id,
      assigned_to,
    } = req.validatedData || req.body;

    const findQuery = `
      SELECT 
        t.id, t.title, t.description, t.status, t.priority, t.due_date,
        t.user_id, t.project_id, t.assigned_to, t.created_at, t.updated_at,
        p.created_by AS project_created_by
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1 AND t.deleted_at IS NULL
    `;
    const findResult = await db.query(findQuery, [taskId]);

    if (findResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const existingTask = findResult.rows[0];

    const isCreator = existingTask.user_id === userId;
    const isAssignee = existingTask.assigned_to === userId;
    const isProjectManager = existingTask.project_id && existingTask.project_created_by === userId;
    const isProjectLead = existingTask.project_id && (await isProjectLeadOrManager(existingTask.project_id, userId));
    const isAdmin = userRole === 'admin';

    // Authorization: User must be Admin, Project Manager, Project Lead, Task Creator, or Task Assignee
    if (!isAdmin && !isProjectManager && !isProjectLead && !isCreator && !isAssignee) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to update this task',
      });
    }

    // Detail changes authorization:
    const hasDetailChanges =
      title !== undefined ||
      description !== undefined ||
      priority !== undefined ||
      due_date !== undefined ||
      project_id !== undefined ||
      assigned_to !== undefined;

    const canModifyDetails = isAdmin || isProjectManager || isProjectLead || isCreator;

    if (hasDetailChanges && !canModifyDetails) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify task details. Only the task creator, project lead, project manager, or admin can update task details',
      });
    }

    // Reassignment check
    if (assigned_to !== undefined && assigned_to !== null && assigned_to !== existingTask.assigned_to) {
      if (!canModifyDetails) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to assign or reassign tasks',
        });
      }

      // Verify new assigned user exists
      const targetUserRes = await db.query('SELECT id FROM users WHERE id = $1', [assigned_to]);
      if (targetUserRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Assigned user not found',
        });
      }

      const targetProjectId = project_id !== undefined ? project_id : existingTask.project_id;
      if (targetProjectId) {
        const isTargetMember = await isUserProjectMember(targetProjectId, assigned_to);
        const isTargetCreator = await isProjectCreator(targetProjectId, assigned_to);
        if (!isTargetMember && !isTargetCreator && !isAdmin) {
          return res.status(400).json({
            success: false,
            message: 'Assigned user must be a member of the project',
          });
        }
      }
    }

    // If project_id is being changed
    if (project_id !== undefined && project_id !== null && project_id !== existingTask.project_id) {
      if (!isAdmin && !isProjectManager) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to move tasks to different projects',
        });
      }

      const newProjRes = await db.query('SELECT id, created_by FROM projects WHERE id = $1 AND deleted_at IS NULL', [project_id]);
      if (newProjRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }
    }

    // Check Task Completion Dependency Blocker
    if (status === 'completed' && existingTask.status !== 'completed') {
      const depValidation = await validateTaskCompletionDependencies(taskId);
      if (!depValidation.canComplete) {
        return res.status(409).json({
          success: false,
          message: 'Cannot complete task because unresolved prerequisite tasks are pending',
          blocking_tasks: depValidation.blockingTasks,
        });
      }
    }

    const updatedTitle = title !== undefined ? title : existingTask.title;
    const updatedDescription = description !== undefined ? description : existingTask.description;
    const updatedStatus = status !== undefined ? status : existingTask.status;
    const updatedPriority = priority !== undefined ? priority : existingTask.priority;
    const updatedDueDate = due_date !== undefined ? due_date : existingTask.due_date;
    const updatedProjectId = project_id !== undefined ? project_id : existingTask.project_id;
    const updatedAssignedTo = assigned_to !== undefined ? assigned_to : existingTask.assigned_to;

    const updateQuery = `
      UPDATE tasks
      SET title = $1,
          description = $2,
          status = $3,
          priority = $4,
          due_date = $5,
          project_id = $6,
          assigned_to = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING id
    `;
    await db.query(updateQuery, [
      updatedTitle,
      updatedDescription,
      updatedStatus,
      updatedPriority,
      updatedDueDate,
      updatedProjectId,
      updatedAssignedTo,
      taskId,
    ]);

    // Record activity diffs
    await recordTaskUpdateActivities(existingTask, {
      title, description, status, priority, due_date, project_id, assigned_to
    }, userId);

    // Mentions parsing on updated description
    if (description && description !== existingTask.description) {
      await parseAndNotifyMentions({
        text: description,
        taskId,
        taskTitle: updatedTitle,
        projectId: updatedProjectId,
        author: req.user,
        sourceType: 'task',
      });
    }

    // Notify if reassigned
    if (assigned_to !== undefined && assigned_to !== null && assigned_to !== existingTask.assigned_to) {
      await notifyTaskAssignment(existingTask, assigned_to, req.user, true);
    }

    // If task became completed, notify blocked tasks that dependency is resolved
    if (status === 'completed' && existingTask.status !== 'completed') {
      await notifyDependencyResolved(taskId);
    }

    // Log audit event
    await logAuditEvent({
      userId,
      action: 'TASK_UPDATED',
      entityType: 'task',
      entityId: taskId,
      req,
      details: {
        title, description, status, priority, due_date, project_id, assigned_to
      },
    });

    // Fetch full updated task
    const fetchQuery = `
      SELECT 
        t.id, t.title, t.description, t.status, t.priority, t.due_date, t.deleted_at,
        t.user_id, t.project_id, t.assigned_to, t.created_at, t.updated_at,
        u_creator.name AS creator_name, u_creator.email AS creator_email,
        p.name AS project_name,
        u_assigned.name AS assigned_user_name, u_assigned.email AS assigned_user_email
      FROM tasks t
      LEFT JOIN users u_creator ON t.user_id = u_creator.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      WHERE t.id = $1
    `;
    const updatedResult = await db.query(fetchQuery, [taskId]);

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: formatTaskRow(updatedResult.rows[0]),
    });
  } catch (error) {
    console.error('Error in updateTask:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Soft Delete a task
 * DELETE /api/tasks/:id
 */
const deleteTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const findQuery = `
      SELECT 
        t.id, t.title, t.user_id, t.project_id,
        p.created_by AS project_created_by
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1 AND t.deleted_at IS NULL
    `;
    const findResult = await db.query(findQuery, [taskId]);

    if (findResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const task = findResult.rows[0];

    const isCreator = task.user_id === userId;
    const isProjectManager = task.project_id && task.project_created_by === userId;
    const isProjectLead = task.project_id && (await isProjectLeadOrManager(task.project_id, userId));
    const isAdmin = userRole === 'admin';

    if (!isAdmin && !isProjectManager && !isProjectLead && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to delete this task',
      });
    }

    // Soft delete
    await db.query('UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [taskId]);

    await recordTaskActivity({
      taskId,
      userId,
      action: 'task_deleted',
      newValue: 'Task moved to trash',
    });

    await logAuditEvent({
      userId,
      action: 'TASK_DELETED',
      entityType: 'task',
      entityId: taskId,
      req,
      details: { title: task.title },
    });

    return res.status(200).json({
      success: true,
      message: 'Task moved to trash successfully',
      data: null,
    });
  } catch (error) {
    console.error('Error in deleteTask:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get Trash (soft-deleted tasks)
 * GET /api/tasks/trash
 */
const getTrashTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let baseFilter = 't.deleted_at IS NOT NULL';
    const queryParams = [];

    if (userRole === 'admin') {
      // Global trash
    } else if (userRole === 'manager') {
      queryParams.push(userId);
      baseFilter += ` AND (
        t.user_id = $1
        OR (t.project_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM projects p WHERE p.id = t.project_id AND p.created_by = $1
        ))
      )`;
    } else {
      // Team lead / Employee: only tasks created by them in trash
      queryParams.push(userId);
      baseFilter += ` AND t.user_id = $1`;
    }

    const selectQuery = `
      SELECT 
        t.id, t.title, t.description, t.status, t.priority, t.due_date, t.deleted_at,
        t.user_id, t.project_id, t.assigned_to, t.created_at, t.updated_at,
        u_creator.name AS creator_name, u_creator.email AS creator_email,
        p.name AS project_name,
        u_assigned.name AS assigned_user_name, u_assigned.email AS assigned_user_email
      FROM tasks t
      LEFT JOIN users u_creator ON t.user_id = u_creator.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      WHERE ${baseFilter}
      ORDER BY t.deleted_at DESC
    `;
    const result = await db.query(selectQuery, queryParams);

    return res.status(200).json({
      success: true,
      message: 'Trash tasks retrieved successfully',
      data: result.rows.map(formatTaskRow),
    });
  } catch (error) {
    console.error('Error in getTrashTasks:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Restore a soft-deleted task
 * POST /api/tasks/:id/restore
 */
const restoreTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const findQuery = `
      SELECT t.id, t.title, t.user_id, t.project_id, p.created_by AS project_created_by
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1 AND t.deleted_at IS NOT NULL
    `;
    const findRes = await db.query(findQuery, [taskId]);

    if (findRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Deleted task not found in trash',
      });
    }

    const task = findRes.rows[0];

    const isCreator = task.user_id === userId;
    const isProjectManager = task.project_id && task.project_created_by === userId;
    const isProjectLead = task.project_id && (await isProjectLeadOrManager(task.project_id, userId));
    const isAdmin = userRole === 'admin';

    if (!isAdmin && !isProjectManager && !isProjectLead && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to restore this task',
      });
    }

    await db.query('UPDATE tasks SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [taskId]);

    await recordTaskActivity({
      taskId,
      userId,
      action: 'task_restored',
      newValue: 'Task restored from trash',
    });

    await logAuditEvent({
      userId,
      action: 'TASK_RESTORED',
      entityType: 'task',
      entityId: taskId,
      req,
      details: { title: task.title },
    });

    return res.status(200).json({
      success: true,
      message: 'Task restored successfully',
    });
  } catch (error) {
    console.error('Error in restoreTask:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Permanently Delete a task (Admin only)
 * DELETE /api/tasks/:id/permanent
 */
const permanentDeleteTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only System Administrators can permanently delete tasks',
      });
    }

    const findRes = await db.query('SELECT id, title FROM tasks WHERE id = $1', [taskId]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const task = findRes.rows[0];

    await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);

    await logAuditEvent({
      userId,
      action: 'TASK_PERMANENTLY_DELETED',
      entityType: 'task',
      entityId: taskId,
      req,
      details: { title: task.title },
    });

    return res.status(200).json({
      success: true,
      message: 'Task permanently deleted from database',
    });
  } catch (error) {
    console.error('Error in permanentDeleteTask:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Bulk Update Tasks (Transactional)
 * POST /api/tasks/bulk-update
 */
const bulkUpdateTasks = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { task_ids, status, priority, due_date, assigned_to } = req.validatedData || req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const isAdmin = userRole === 'admin';

    await client.query('BEGIN');

    const updatedTasks = [];

    for (const taskId of task_ids) {
      const findRes = await client.query(`
        SELECT t.id, t.title, t.status, t.priority, t.due_date, t.assigned_to, t.user_id, t.project_id,
               p.created_by AS project_created_by
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.id = $1 AND t.deleted_at IS NULL
      `, [taskId]);

      if (findRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: `Task #${taskId} not found or has been deleted`,
        });
      }

      const task = findRes.rows[0];

      const isCreator = task.user_id === userId;
      const isAssignee = task.assigned_to === userId;
      const isProjectManager = task.project_id && task.project_created_by === userId;
      const isProjectLead = task.project_id && (await isProjectLeadOrManager(task.project_id, userId));

      const hasDetailChanges = priority !== undefined || due_date !== undefined || assigned_to !== undefined;
      const canModifyDetails = isAdmin || isProjectManager || isProjectLead || isCreator;

      if (!isAdmin && !isProjectManager && !isProjectLead && !isCreator && !isAssignee) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          message: `Access denied. You do not have permission to update Task #${taskId}`,
        });
      }

      if (hasDetailChanges && !canModifyDetails) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          message: `You do not have permission to modify details for Task #${taskId}`,
        });
      }

      // If status changed to completed, verify dependency blockers
      if (status === 'completed' && task.status !== 'completed') {
        const depCheck = await validateTaskCompletionDependencies(taskId);
        if (!depCheck.canComplete) {
          await client.query('ROLLBACK');
          return res.status(409).json({
            success: false,
            message: `Cannot complete Task #${taskId} due to unresolved prerequisite dependencies`,
            blocking_tasks: depCheck.blockingTasks,
          });
        }
      }

      // If assigned_to changed
      if (assigned_to !== undefined && assigned_to !== null && assigned_to !== task.assigned_to) {
        if (!canModifyDetails) {
          await client.query('ROLLBACK');
          return res.status(403).json({
            success: false,
            message: `You do not have permission to reassign Task #${taskId}`,
          });
        }

        if (task.project_id) {
          const isTargetMember = await isUserProjectMember(task.project_id, assigned_to);
          const isTargetCreator = await isProjectCreator(task.project_id, assigned_to);
          if (!isTargetMember && !isTargetCreator && !isAdmin) {
            await client.query('ROLLBACK');
            return res.status(400).json({
              success: false,
              message: `Assigned user #${assigned_to} is not a member of the project for Task #${taskId}`,
            });
          }
        }
      }

      const newStatus = status !== undefined ? status : task.status;
      const newPriority = priority !== undefined ? priority : task.priority;
      const newDueDate = due_date !== undefined ? due_date : task.due_date;
      const newAssignedTo = assigned_to !== undefined ? assigned_to : task.assigned_to;

      await client.query(`
        UPDATE tasks
        SET status = $1, priority = $2, due_date = $3, assigned_to = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `, [newStatus, newPriority, newDueDate, newAssignedTo, taskId]);

      updatedTasks.push({ id: taskId, status: newStatus, priority: newPriority, due_date: newDueDate, assigned_to: newAssignedTo });
    }

    await client.query('COMMIT');

    await logAuditEvent({
      userId,
      action: 'BULK_TASK_UPDATE',
      entityType: 'task',
      req,
      details: {
        task_ids,
        changes: { status, priority, due_date, assigned_to },
        affected_count: updatedTasks.length,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Successfully updated ${updatedTasks.length} tasks in batch`,
      data: { updated_tasks: updatedTasks },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in bulkUpdateTasks:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  } finally {
    client.release();
  }
};

/**
 * Bulk Delete Tasks (Transactional Soft Delete)
 * POST /api/tasks/bulk-delete
 */
const bulkDeleteTasks = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { task_ids } = req.validatedData || req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const isAdmin = userRole === 'admin';

    await client.query('BEGIN');

    for (const taskId of task_ids) {
      const findRes = await client.query(`
        SELECT t.id, t.title, t.user_id, t.project_id, p.created_by AS project_created_by
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.id = $1 AND t.deleted_at IS NULL
      `, [taskId]);

      if (findRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: `Task #${taskId} not found or already deleted`,
        });
      }

      const task = findRes.rows[0];
      const isCreator = task.user_id === userId;
      const isProjectManager = task.project_id && task.project_created_by === userId;
      const isProjectLead = task.project_id && (await isProjectLeadOrManager(task.project_id, userId));

      if (!isAdmin && !isProjectManager && !isProjectLead && !isCreator) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          message: `Access denied. You do not have permission to delete Task #${taskId}`,
        });
      }

      await client.query('UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [taskId]);
    }

    await client.query('COMMIT');

    await logAuditEvent({
      userId,
      action: 'BULK_TASK_DELETE',
      entityType: 'task',
      req,
      details: {
        task_ids,
        deleted_count: task_ids.length,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Successfully moved ${task_ids.length} tasks to trash`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in bulkDeleteTasks:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  } finally {
    client.release();
  }
};

// ==========================================================
// PHASE 3 PART 1: DEPENDENCY ENDPOINTS
// ==========================================================

/**
 * Add a prerequisite dependency to a task
 * POST /api/tasks/:id/dependencies
 */
const addTaskDependency = async (req, res) => {
  try {
    const taskId = req.params.id;
    const dependsOnTaskId = req.body.dependsOnTaskId;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (taskId === dependsOnTaskId) {
      return res.status(400).json({
        success: false,
        message: 'A task cannot depend on itself',
      });
    }

    // Verify task existence
    const taskRes = await db.query('SELECT id, project_id, user_id FROM tasks WHERE id = $1 AND deleted_at IS NULL', [taskId]);
    if (taskRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Verify prerequisite task existence
    const depTaskRes = await db.query('SELECT id, project_id, user_id FROM tasks WHERE id = $1 AND deleted_at IS NULL', [dependsOnTaskId]);
    if (depTaskRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prerequisite task not found',
      });
    }

    const task = taskRes.rows[0];

    // Authorization check: Admin, Project Manager, Project Lead, or Task Creator
    const isCreator = task.user_id === userId;
    const isProjectManager = task.project_id && (await isProjectCreator(task.project_id, userId));
    const isProjectLead = task.project_id && (await isProjectLeadOrManager(task.project_id, userId));
    const isAdmin = userRole === 'admin';

    if (!isAdmin && !isProjectManager && !isProjectLead && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to manage dependencies for this task',
      });
    }

    // Check duplicate
    const existing = await db.query(
      'SELECT id FROM task_dependencies WHERE task_id = $1 AND depends_on_task_id = $2',
      [taskId, dependsOnTaskId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Dependency already exists between these tasks',
      });
    }

    // DAG Cycle Detection
    const createsCycle = await checkTransitiveDependency(dependsOnTaskId, taskId);
    if (createsCycle) {
      return res.status(409).json({
        success: false,
        message: 'Cyclic dependency detected: Adding this dependency would create a cycle',
      });
    }

    const insertQuery = `
      INSERT INTO task_dependencies (task_id, depends_on_task_id)
      VALUES ($1, $2)
      RETURNING id, task_id, depends_on_task_id, created_at
    `;
    const insertRes = await db.query(insertQuery, [taskId, dependsOnTaskId]);

    await recordTaskActivity({
      taskId,
      userId,
      action: 'dependency_added',
      newValue: `Added dependency on task #${dependsOnTaskId}`,
    });

    await logAuditEvent({
      userId,
      action: 'TASK_DEPENDENCY_ADDED',
      entityType: 'task_dependency',
      entityId: insertRes.rows[0].id,
      req,
      details: { taskId, dependsOnTaskId },
    });

    return res.status(201).json({
      success: true,
      message: 'Task dependency added successfully',
      data: insertRes.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Dependency already exists',
      });
    }
    console.error('Error in addTaskDependency:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get all dependencies for a task
 * GET /api/tasks/:id/dependencies
 */
const getTaskDependenciesList = async (req, res) => {
  try {
    const taskId = req.params.id;

    const taskRes = await db.query('SELECT id FROM tasks WHERE id = $1 AND deleted_at IS NULL', [taskId]);
    if (taskRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const dependencies = await getTaskDependencies(taskId);

    return res.status(200).json({
      success: true,
      message: 'Task dependencies retrieved successfully',
      data: dependencies,
    });
  } catch (error) {
    console.error('Error in getTaskDependenciesList:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Remove a dependency from a task
 * DELETE /api/tasks/:id/dependencies/:dependencyId
 */
const removeTaskDependency = async (req, res) => {
  try {
    const taskId = req.params.id;
    const dependencyId = req.params.dependencyId;
    const userId = req.user.id;
    const userRole = req.user.role;

    const taskRes = await db.query('SELECT id, user_id, project_id FROM tasks WHERE id = $1 AND deleted_at IS NULL', [taskId]);
    if (taskRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const task = taskRes.rows[0];

    // Authorization: Admin, Project Manager, Project Lead, or Task Creator
    const isCreator = task.user_id === userId;
    const isProjectManager = task.project_id && (await isProjectCreator(task.project_id, userId));
    const isProjectLead = task.project_id && (await isProjectLeadOrManager(task.project_id, userId));
    const isAdmin = userRole === 'admin';

    if (!isAdmin && !isProjectManager && !isProjectLead && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to remove dependencies for this task',
      });
    }

    const depRes = await db.query(
      'SELECT id, depends_on_task_id FROM task_dependencies WHERE id = $1 AND task_id = $2',
      [dependencyId, taskId]
    );

    if (depRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dependency not found for this task',
      });
    }

    const dep = depRes.rows[0];

    await db.query('DELETE FROM task_dependencies WHERE id = $1', [dependencyId]);

    await recordTaskActivity({
      taskId,
      userId,
      action: 'dependency_removed',
      newValue: `Removed dependency on task #${dep.depends_on_task_id}`,
    });

    await logAuditEvent({
      userId,
      action: 'TASK_DEPENDENCY_REMOVED',
      entityType: 'task_dependency',
      entityId: dependencyId,
      req,
      details: { taskId, dependsOnTaskId: dep.depends_on_task_id },
    });

    return res.status(200).json({
      success: true,
      message: 'Task dependency removed successfully',
    });
  } catch (error) {
    console.error('Error in removeTaskDependency:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// ==========================================================
// PHASE 3 PART 1: RECURRING TASK ENDPOINTS
// ==========================================================

/**
 * Configure recurrence rule for a task
 * POST /api/tasks/:id/recurrence
 * PUT /api/tasks/:id/recurrence
 */
const setTaskRecurrence = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      frequency,
      interval_count: intervalCount = 1,
      day_of_week: dayOfWeek = null,
      day_of_month: dayOfMonth = null,
      next_run_date: nextRunDate = null,
      end_date: endDate = null,
      is_active: isActive = true,
    } = req.body;

    const taskRes = await db.query('SELECT id, user_id, project_id, due_date FROM tasks WHERE id = $1 AND deleted_at IS NULL', [taskId]);
    if (taskRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const task = taskRes.rows[0];

    // Authorization: Admin, Project Manager, Project Lead, or Task Creator
    const isCreator = task.user_id === userId;
    const isProjectManager = task.project_id && (await isProjectCreator(task.project_id, userId));
    const isProjectLead = task.project_id && (await isProjectLeadOrManager(task.project_id, userId));
    const isAdmin = userRole === 'admin';

    if (!isAdmin && !isProjectManager && !isProjectLead && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to configure recurrence for this task',
      });
    }

    const computedNextRun = nextRunDate || calculateNextRunDate(
      frequency,
      intervalCount,
      dayOfWeek,
      dayOfMonth,
      task.due_date ? new Date(task.due_date) : new Date()
    );

    const upsertQuery = `
      INSERT INTO task_recurrence_rules (
        task_id, frequency, interval_count, day_of_week, day_of_month, next_run_date, end_date, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (task_id) DO UPDATE
      SET frequency = EXCLUDED.frequency,
          interval_count = EXCLUDED.interval_count,
          day_of_week = EXCLUDED.day_of_week,
          day_of_month = EXCLUDED.day_of_month,
          next_run_date = EXCLUDED.next_run_date,
          end_date = EXCLUDED.end_date,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
      RETURNING id, task_id, frequency, interval_count, day_of_week, day_of_month, next_run_date, end_date, is_active, created_at, updated_at
    `;
    const result = await db.query(upsertQuery, [
      taskId,
      frequency,
      intervalCount,
      dayOfWeek,
      dayOfMonth,
      computedNextRun,
      endDate,
      isActive,
    ]);

    await recordTaskActivity({
      taskId,
      userId,
      action: 'recurrence_created',
      newValue: `Recurrence set to ${frequency} (every ${intervalCount})`,
    });

    await logAuditEvent({
      userId,
      action: 'TASK_RECURRENCE_CONFIGURED',
      entityType: 'task_recurrence',
      entityId: result.rows[0].id,
      req,
      details: { taskId, frequency, intervalCount },
    });

    return res.status(200).json({
      success: true,
      message: 'Task recurrence configured successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error in setTaskRecurrence:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get recurrence configuration for a task
 * GET /api/tasks/:id/recurrence
 */
const getTaskRecurrence = async (req, res) => {
  try {
    const taskId = req.params.id;

    const taskRes = await db.query('SELECT id FROM tasks WHERE id = $1 AND deleted_at IS NULL', [taskId]);
    if (taskRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const ruleRes = await db.query(
      'SELECT id, task_id, frequency, interval_count, day_of_week, day_of_month, next_run_date, end_date, is_active, created_at, updated_at FROM task_recurrence_rules WHERE task_id = $1',
      [taskId]
    );

    if (ruleRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No recurrence rule configured for this task',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task recurrence rule retrieved successfully',
      data: ruleRes.rows[0],
    });
  } catch (error) {
    console.error('Error in getTaskRecurrence:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Delete recurrence configuration for a task
 * DELETE /api/tasks/:id/recurrence
 */
const deleteTaskRecurrence = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const taskRes = await db.query('SELECT id, user_id, project_id FROM tasks WHERE id = $1 AND deleted_at IS NULL', [taskId]);
    if (taskRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const task = taskRes.rows[0];

    // Authorization: Admin, Project Manager, Project Lead, or Task Creator
    const isCreator = task.user_id === userId;
    const isProjectManager = task.project_id && (await isProjectCreator(task.project_id, userId));
    const isProjectLead = task.project_id && (await isProjectLeadOrManager(task.project_id, userId));
    const isAdmin = userRole === 'admin';

    if (!isAdmin && !isProjectManager && !isProjectLead && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to delete recurrence for this task',
      });
    }

    const deleteRes = await db.query('DELETE FROM task_recurrence_rules WHERE task_id = $1 RETURNING id', [taskId]);

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No recurrence rule found to delete',
      });
    }

    await recordTaskActivity({
      taskId,
      userId,
      action: 'recurrence_deleted',
      newValue: 'Task recurrence rule removed',
    });

    await logAuditEvent({
      userId,
      action: 'TASK_RECURRENCE_DELETED',
      entityType: 'task_recurrence',
      entityId: taskId,
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Task recurrence rule deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteTaskRecurrence:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// ==========================================================
// PHASE 3 PART 1: TASK ACTIVITY TIMELINE
// ==========================================================

/**
 * Get activity history for a task
 * GET /api/tasks/:id/activity
 */
const getTaskActivityHistory = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const taskRes = await db.query(`
      SELECT t.id, t.user_id, t.assigned_to, t.project_id, p.created_by AS project_created_by
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1
    `, [taskId]);

    if (taskRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const task = taskRes.rows[0];

    // Authorization check
    if (userRole !== 'admin') {
      const isCreator = task.user_id === userId;
      const isAssignee = task.assigned_to === userId;
      let hasProjectAccess = false;
      if (task.project_id) {
        hasProjectAccess = task.project_created_by === userId || (await isUserProjectMember(task.project_id, userId));
      }
      if (!isCreator && !isAssignee && !hasProjectAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to view activity for this task',
        });
      }
    }

    const activities = await getTaskActivities(taskId);

    return res.status(200).json({
      success: true,
      message: 'Task activity history retrieved successfully',
      data: activities,
    });
  } catch (error) {
    console.error('Error in getTaskActivityHistory:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  advancedTaskSearch,
  updateTask,
  deleteTask,
  getTrashTasks,
  restoreTask,
  permanentDeleteTask,
  bulkUpdateTasks,
  bulkDeleteTasks,
  addTaskDependency,
  getTaskDependenciesList,
  removeTaskDependency,
  setTaskRecurrence,
  getTaskRecurrence,
  deleteTaskRecurrence,
  getTaskActivityHistory,
};
