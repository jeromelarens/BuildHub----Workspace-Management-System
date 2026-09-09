const db = require('../config/database');

/**
 * Create a new approval workflow with sequential steps
 */
const createApprovalWorkflow = async ({ workspaceId, name, entityType = 'task', description, steps = [], userId }) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const wfRes = await client.query(`
      INSERT INTO approval_workflows (workspace_id, name, entity_type, description, is_active, created_by)
      VALUES ($1, $2, $3, $4, TRUE, $5)
      RETURNING *;
    `, [workspaceId, name, entityType, description || null, userId]);

    const workflow = wfRes.rows[0];

    const createdSteps = [];
    const normalizedSteps = steps.length > 0 ? steps : [{ name: 'Manager Approval', approver_role: 'manager' }];

    for (let i = 0; i < normalizedSteps.length; i++) {
      const step = normalizedSteps[i];
      const stepOrder = i + 1;
      const stepRes = await client.query(`
        INSERT INTO approval_steps (workflow_id, step_order, name, approver_role, approver_user_id, is_required)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `, [
        workflow.id,
        stepOrder,
        step.name || `Step ${stepOrder}`,
        step.approver_role || null,
        step.approver_user_id || null,
        step.is_required !== undefined ? Boolean(step.is_required) : true,
      ]);
      createdSteps.push(stepRes.rows[0]);
    }

    await client.query('COMMIT');
    return { ...workflow, steps: createdSteps };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get all approval workflows for a workspace
 */
const getWorkspaceApprovalWorkflows = async (workspaceId) => {
  const result = await db.query(`
    SELECT aw.*,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', ast.id,
                 'step_order', ast.step_order,
                 'name', ast.name,
                 'approver_role', ast.approver_role,
                 'approver_user_id', ast.approver_user_id,
                 'is_required', ast.is_required
               ) ORDER BY ast.step_order ASC
             ) FILTER (WHERE ast.id IS NOT NULL), '[]'
           ) AS steps
    FROM approval_workflows aw
    LEFT JOIN approval_steps ast ON aw.id = ast.workflow_id
    WHERE aw.workspace_id = $1
    GROUP BY aw.id
    ORDER BY aw.created_at DESC;
  `, [workspaceId]);

  return result.rows;
};

/**
 * Submit an approval request for an entity
 */
const submitApprovalRequest = async ({ workspaceId, workflowId, entityType, entityId, requesterId }) => {
  // Check workflow exists in workspace and is active
  const wfRes = await db.query(`
    SELECT * FROM approval_workflows
    WHERE id = $1 AND workspace_id = $2 AND is_active = TRUE;
  `, [workflowId, workspaceId]);

  if (wfRes.rows.length === 0) {
    throw new Error('Approval workflow not found or inactive in this workspace');
  }

  // Check if there is already an active pending request for this entity
  const pendingCheck = await db.query(`
    SELECT id FROM approval_requests
    WHERE workspace_id = $1 AND entity_type = $2 AND entity_id = $3 AND status = 'pending';
  `, [workspaceId, entityType, entityId]);

  if (pendingCheck.rows.length > 0) {
    throw new Error('An active approval request is already pending for this item');
  }

  const result = await db.query(`
    INSERT INTO approval_requests (
      workspace_id, workflow_id, entity_type, entity_id, requester_id, status, current_step_order
    )
    VALUES ($1, $2, $3, $4, $5, 'pending', 1)
    RETURNING *;
  `, [workspaceId, workflowId, entityType, entityId, requesterId]);

  return result.rows[0];
};

/**
 * Process Approval Action (approve, reject, cancel) with transactional state transitions
 */
const processApprovalAction = async ({ requestId, workspaceId, actorId, actorRole, action, reason }) => {
  if (!['approved', 'rejected', 'cancelled'].includes(action)) {
    throw new Error('Invalid approval action. Must be "approved", "rejected", or "cancelled"');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch request with row lock for concurrency safety
    const reqRes = await client.query(`
      SELECT ar.*, aw.name AS workflow_name
      FROM approval_requests ar
      JOIN approval_workflows aw ON ar.workflow_id = aw.id
      WHERE ar.id = $1 AND ar.workspace_id = $2
      FOR UPDATE;
    `, [requestId, workspaceId]);

    if (reqRes.rows.length === 0) {
      throw new Error('Approval request not found in this workspace');
    }

    const request = reqRes.rows[0];

    if (request.status !== 'pending') {
      throw new Error(`Cannot perform action. Request is already ${request.status}`);
    }

    // Cancellation can be done by requester or admin
    if (action === 'cancelled') {
      if (request.requester_id !== actorId && actorRole !== 'admin') {
        throw new Error('Only the original requester or system admin can cancel this request');
      }

      const updated = await client.query(`
        UPDATE approval_requests
        SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *;
      `, [requestId]);

      await client.query(`
        INSERT INTO approval_actions (request_id, step_id, actor_id, action, reason)
        VALUES ($1, NULL, $2, 'cancelled', $3);
      `, [requestId, actorId, reason || 'Cancelled by requester']);

      await client.query('COMMIT');
      return updated.rows[0];
    }

    // 2. Self-approval protection: Requester cannot approve their own request unless admin override
    if (action === 'approved' && request.requester_id === actorId && actorRole !== 'admin') {
      throw new Error('Self-approval policy violation: You cannot approve your own request');
    }

    // 3. Fetch current step definition
    const stepRes = await client.query(`
      SELECT * FROM approval_steps
      WHERE workflow_id = $1 AND step_order = $2;
    `, [request.workflow_id, request.current_step_order]);

    if (stepRes.rows.length === 0) {
      throw new Error(`Invalid step configuration: Step ${request.current_step_order} not found`);
    }

    const currentStep = stepRes.rows[0];

    // 4. Verify Actor Authority for current step
    let isAuthorized = actorRole === 'admin';
    if (!isAuthorized) {
      if (currentStep.approver_user_id && currentStep.approver_user_id === actorId) {
        isAuthorized = true;
      } else if (currentStep.approver_role) {
        const allowedRoles = ['admin'];
        if (currentStep.approver_role === 'manager') allowedRoles.push('manager');
        if (currentStep.approver_role === 'team_lead') allowedRoles.push('manager', 'team_lead');
        if (currentStep.approver_role === 'employee') allowedRoles.push('manager', 'team_lead', 'employee');
        if (allowedRoles.includes(actorRole)) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      throw new Error(`You do not have the required authority (${currentStep.approver_role || 'designated approver'}) to approve this step`);
    }

    // 5. Record the action
    await client.query(`
      INSERT INTO approval_actions (request_id, step_id, actor_id, action, reason)
      VALUES ($1, $2, $3, $4, $5);
    `, [requestId, currentStep.id, actorId, action, reason || null]);

    if (action === 'rejected') {
      const updated = await client.query(`
        UPDATE approval_requests
        SET status = 'rejected', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *;
      `, [requestId]);

      await client.query('COMMIT');
      return updated.rows[0];
    }

    // Action is 'approved': check if more steps exist
    const nextStepRes = await client.query(`
      SELECT id FROM approval_steps
      WHERE workflow_id = $1 AND step_order = $2;
    `, [request.workflow_id, request.current_step_order + 1]);

    let updatedReq;
    if (nextStepRes.rows.length > 0) {
      // Advance to next step
      updatedReq = await client.query(`
        UPDATE approval_requests
        SET current_step_order = current_step_order + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *;
      `, [requestId]);
    } else {
      // Final step approved -> Mark entire request APPROVED
      updatedReq = await client.query(`
        UPDATE approval_requests
        SET status = 'approved', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *;
      `, [requestId]);
    }

    await client.query('COMMIT');
    return updatedReq.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get approval request details and full action history
 */
const getApprovalRequestById = async (requestId, workspaceId) => {
  const reqRes = await db.query(`
    SELECT ar.*, aw.name AS workflow_name, u.name AS requester_name, u.email AS requester_email
    FROM approval_requests ar
    JOIN approval_workflows aw ON ar.workflow_id = aw.id
    JOIN users u ON ar.requester_id = u.id
    WHERE ar.id = $1 AND ar.workspace_id = $2;
  `, [requestId, workspaceId]);

  if (reqRes.rows.length === 0) {
    return null;
  }

  const actionsRes = await db.query(`
    SELECT aa.*, u.name AS actor_name, ast.name AS step_name
    FROM approval_actions aa
    JOIN users u ON aa.actor_id = u.id
    LEFT JOIN approval_steps ast ON aa.step_id = ast.id
    WHERE aa.request_id = $1
    ORDER BY aa.created_at ASC;
  `, [requestId]);

  const stepsRes = await db.query(`
    SELECT * FROM approval_steps
    WHERE workflow_id = $1
    ORDER BY step_order ASC;
  `, [reqRes.rows[0].workflow_id]);

  return {
    ...reqRes.rows[0],
    steps: stepsRes.rows,
    history: actionsRes.rows,
  };
};

/**
 * List approval requests in workspace with status filtering
 */
const listApprovalRequests = async (workspaceId, { status, entityType, limit = 50, offset = 0 } = {}) => {
  let query = `
    SELECT ar.*, aw.name AS workflow_name, u.name AS requester_name, u.email AS requester_email
    FROM approval_requests ar
    JOIN approval_workflows aw ON ar.workflow_id = aw.id
    JOIN users u ON ar.requester_id = u.id
    WHERE ar.workspace_id = $1
  `;
  const params = [workspaceId];

  if (status) {
    params.push(status);
    query += ` AND ar.status = $${params.length}`;
  }

  if (entityType) {
    params.push(entityType);
    query += ` AND ar.entity_type = $${params.length}`;
  }

  query += ` ORDER BY ar.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  return result.rows;
};

module.exports = {
  createApprovalWorkflow,
  getWorkspaceApprovalWorkflows,
  submitApprovalRequest,
  processApprovalAction,
  getApprovalRequestById,
  listApprovalRequests,
};
