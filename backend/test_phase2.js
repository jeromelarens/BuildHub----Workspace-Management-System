const http = require('http');
const app = require('./src/app');
const db = require('./src/config/database');
const { bootstrapAdmin } = require('./src/services/adminBootstrapService');

let server;
let baseUrl;

const request = async (method, path, options = {}) => {
  const url = `${baseUrl}${path}`;
  const headers = { ...options.headers };
  let body = options.body;

  if (body && typeof body === 'object' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  } else if (typeof body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
  });

  let json = null;
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = text;
  }

  return {
    status: res.status,
    headers: res.headers,
    body: json,
  };
};

async function runPhase2Tests() {
  console.log('Starting Phase 2 test server...');
  await bootstrapAdmin();

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  console.log(`Phase 2 Test server running at ${baseUrl}`);

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - Details:`, typeof details === 'object' ? JSON.stringify(details) : details);
      failed++;
    }
  }

  const timestamp = Date.now();
  const sysAdminEmail = process.env.ADMIN_EMAIL || 'admin@taskmanagement.com';
  const sysAdminPassword = process.env.ADMIN_PASSWORD || 'AdminSecret@2026!';
  const managerEmail = `manager_${timestamp}@example.com`;
  const empAEmail = `emp_a_${timestamp}@example.com`;
  const empBEmail = `emp_b_${timestamp}@example.com`;

  let adminToken, managerToken, empAToken, empBToken;
  let adminId, managerId, empAId, empBId;
  let projectAlphaId, projectBetaId;
  let taskAlphaId, taskBetaId, taskOverdueId, taskCompletedId;
  let commentAlphaId;

  try {
    // ==========================================
    // 1. DETERMINISTIC TEST USERS SETUP & RBAC
    // ==========================================
    console.log('\n--- 1. DETERMINISTIC TEST USERS SETUP & RBAC ---');

    // Login System Admin
    const loginAdmin = await request('POST', '/api/auth/login', {
      body: { email: sysAdminEmail, password: sysAdminPassword },
    });
    adminToken = loginAdmin.body.data.token;
    adminId = loginAdmin.body.data.user.id;
    assert('Admin login -> 200 with role admin', loginAdmin.status === 200 && loginAdmin.body.data.user.role === 'admin');

    // Register 3 normal users
    const regManager = await request('POST', '/api/auth/register', {
      body: { name: 'Manager User', email: managerEmail, password: 'password123', role: 'manager' },
    });
    managerId = regManager.body.data.id;
    assert('Register Manager user', regManager.status === 201 && managerId);

    const regEmpA = await request('POST', '/api/auth/register', {
      body: { name: 'Employee A', email: empAEmail, password: 'password123', role: 'employee' },
    });
    empAId = regEmpA.body.data.id;
    assert('Register Employee A user', regEmpA.status === 201 && empAId);

    const regEmpB = await request('POST', '/api/auth/register', {
      body: { name: 'Employee B', email: empBEmail, password: 'password123', role: 'employee' },
    });
    empBId = regEmpB.body.data.id;
    assert('Register Employee B user', regEmpB.status === 201 && empBId);

    // Admin promotes Employee B to Manager via API
    const promoteManager = await request('PUT', `/api/users/${empBId}/role`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { role: 'manager' },
    });
    assert('Admin promotes Employee B via PUT /api/users/:id/role -> 200', promoteManager.status === 200 && promoteManager.body.data.role === 'manager');

    // Login Manager, Emp A, Emp B
    const loginManager = await request('POST', '/api/auth/login', {
      body: { email: managerEmail, password: 'password123' },
    });
    managerToken = loginManager.body.data.token;

    const loginEmpA = await request('POST', '/api/auth/login', {
      body: { email: empAEmail, password: 'password123' },
    });
    empAToken = loginEmpA.body.data.token;

    const loginEmpB = await request('POST', '/api/auth/login', {
      body: { email: empBEmail, password: 'password123' },
    });
    empBToken = loginEmpB.body.data.token;

    // RBAC: Employee cannot promote themselves or anyone else -> 403
    const empPromote = await request('PUT', `/api/users/${empAId}/role`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      body: { role: 'admin' },
    });
    assert('Employee cannot access PUT /api/users/:id/role -> 403 Forbidden', empPromote.status === 403);

    // RBAC: Manager cannot promote users -> 403
    const mgrPromote = await request('PUT', `/api/users/${empAId}/role`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      body: { role: 'manager' },
    });
    assert('Manager cannot access PUT /api/users/:id/role -> 403 Forbidden', mgrPromote.status === 403);

    // ==========================================
    // 2. ADMIN USER MANAGEMENT & SECURITY
    // ==========================================
    console.log('\n--- 2. ADMIN USER MANAGEMENT & SECURITY ---');

    // Admin lists users -> 200
    const adminGetUsers = await request('GET', '/api/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Admin GET /api/users -> 200', adminGetUsers.status === 200 && Array.isArray(adminGetUsers.body.data));
    assert('GET /api/users never leaks password/hash', adminGetUsers.body.data.every(u => !u.password && !u.password_hash));

    // Admin get user by ID -> 200
    const adminGetUserById = await request('GET', `/api/users/${empAId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Admin GET /api/users/:id -> 200', adminGetUserById.status === 200 && adminGetUserById.body.data.id === empAId);
    assert('GET /api/users/:id never leaks password', !adminGetUserById.body.data.password);

    // Employee cannot list users -> 403
    const empGetUsers = await request('GET', '/api/users', {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    assert('Employee GET /api/users -> 403 Forbidden', empGetUsers.status === 403);

    // Invalid role update value -> 400
    const badRoleUpdate = await request('PUT', `/api/users/${empAId}/role`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { role: 'superadmin' },
    });
    assert('PUT /api/users/:id/role invalid role -> 400 Bad Request', badRoleUpdate.status === 400);

    // ==========================================
    // 3. PROJECTS LIFECYCLE & PERMISSIONS
    // ==========================================
    console.log('\n--- 3. PROJECTS LIFECYCLE & PERMISSIONS ---');

    // Manager creates Project Alpha -> 201
    const createAlphaRes = await request('POST', '/api/projects', {
      headers: { Authorization: `Bearer ${managerToken}` },
      body: { name: `Alpha Project ${timestamp}`, description: 'Core backend initiative', status: 'active' },
    });
    projectAlphaId = createAlphaRes.body.data?.id;
    assert('Manager creates Project Alpha -> 201', createAlphaRes.status === 201 && projectAlphaId);

    // Admin creates Project Beta -> 201
    const createBetaRes = await request('POST', '/api/projects', {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { name: `Beta Project ${timestamp}`, description: 'Admin strategic project', status: 'active' },
    });
    projectBetaId = createBetaRes.body.data?.id;
    assert('Admin creates Project Beta -> 201', createBetaRes.status === 201 && projectBetaId);

    // Employee cannot create project -> 403
    const empCreateProj = await request('POST', '/api/projects', {
      headers: { Authorization: `Bearer ${empAToken}` },
      body: { name: 'Unauthorized Project' },
    });
    assert('Employee cannot create project -> 403 Forbidden', empCreateProj.status === 403);

    // Invalid project status -> 400
    const badStatusProj = await request('POST', '/api/projects', {
      headers: { Authorization: `Bearer ${managerToken}` },
      body: { name: 'Bad Status Project', status: 'invalid_status' },
    });
    assert('Project creation invalid status -> 400 Bad Request', badStatusProj.status === 400);

    // ==========================================
    // 4. PROJECT MEMBERS MANAGEMENT
    // ==========================================
    console.log('\n--- 4. PROJECT MEMBERS MANAGEMENT ---');

    // Manager adds Employee A to Project Alpha -> 201
    const addMemberRes = await request('POST', `/api/projects/${projectAlphaId}/members`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      body: { user_id: empAId },
    });
    assert('Manager adds Employee A to Project Alpha -> 201', addMemberRes.status === 201);

    // Duplicate project member -> 409 Conflict
    const dupMemberRes = await request('POST', `/api/projects/${projectAlphaId}/members`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      body: { user_id: empAId },
    });
    assert('Duplicate project member -> 409 Conflict', dupMemberRes.status === 409);

    // Add non-existent user -> 404 Not Found
    const addNonExistUser = await request('POST', `/api/projects/${projectAlphaId}/members`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      body: { user_id: 999999 },
    });
    assert('Add non-existent user to project -> 404 Not Found', addNonExistUser.status === 404);

    // Employee cannot add member -> 403
    const empAddMember = await request('POST', `/api/projects/${projectAlphaId}/members`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      body: { user_id: empBId },
    });
    assert('Employee cannot add members -> 403 Forbidden', empAddMember.status === 403);

    // Member lists members -> 200
    const listMembersRes = await request('GET', `/api/projects/${projectAlphaId}/members`, {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    assert('Project member can list members -> 200', listMembersRes.status === 200 && Array.isArray(listMembersRes.body.data));

    // Non-member Employee B cannot view project members of Project Alpha -> 403
    const nonMemberView = await request('GET', `/api/projects/${projectAlphaId}/members`, {
      headers: { Authorization: `Bearer ${empBToken}` },
    });
    assert('Non-member Employee B cannot view project members -> 403 Forbidden', nonMemberView.status === 403);

    // ==========================================
    // 5. ENHANCED TASKS & AUTHORIZATION MATRIX
    // ==========================================
    console.log('\n--- 5. ENHANCED TASKS & AUTHORIZATION MATRIX ---');

    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Manager creates task in Project Alpha assigned to Emp A -> 201
    const createAlphaTask = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        title: 'Alpha Core Feature',
        description: 'Build core auth module',
        status: 'pending',
        priority: 'high',
        due_date: tomorrow,
        project_id: projectAlphaId,
        assigned_to: empAId,
      },
    });
    taskAlphaId = createAlphaTask.body.data?.id;
    assert('Manager creates assigned task in Project Alpha -> 201', createAlphaTask.status === 201 && taskAlphaId);
    assert('Created task contains priority high', createAlphaTask.body.data?.priority === 'high');
    assert('Created task contains assigned_to Emp A', createAlphaTask.body.data?.assigned_to === empAId);

    // Overdue task creation
    const createOverdue = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        title: 'Overdue Bugfix',
        status: 'pending',
        priority: 'urgent',
        due_date: yesterday,
        project_id: projectAlphaId,
        assigned_to: empAId,
      },
    });
    taskOverdueId = createOverdue.body.data?.id;
    assert('Create overdue task -> 201 with is_overdue=true', createOverdue.status === 201 && createOverdue.body.data?.is_overdue === true);

    // Completed past task is not overdue
    const createCompleted = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        title: 'Completed Past Task',
        status: 'completed',
        priority: 'low',
        due_date: yesterday,
        project_id: projectAlphaId,
        assigned_to: empAId,
      },
    });
    taskCompletedId = createCompleted.body.data?.id;
    assert('Completed task with past due date is NOT overdue', createCompleted.status === 201 && createCompleted.body.data?.is_overdue === false);

    // Assignee Employee A updates status -> 200
    const updateStatusRes = await request('PUT', `/api/tasks/${taskAlphaId}`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      body: { status: 'in_progress' },
    });
    assert('Assignee Employee A can update status -> 200', updateStatusRes.status === 200 && updateStatusRes.body.data.status === 'in_progress');

    // Assignee Employee A cannot modify details (title) -> 403
    const updateDetailsRes = await request('PUT', `/api/tasks/${taskAlphaId}`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      body: { title: 'Hacked Title' },
    });
    assert('Assignee Employee cannot modify task details -> 403 Forbidden', updateDetailsRes.status === 403);

    // Assignee Employee A cannot reassign task -> 403
    const empReassignRes = await request('PUT', `/api/tasks/${taskAlphaId}`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      body: { assigned_to: empBId },
    });
    assert('Employee cannot reassign tasks -> 403 Forbidden', empReassignRes.status === 403);

    // Unrelated Employee B cannot view Task Alpha -> 403
    const unrelatedGetTask = await request('GET', `/api/tasks/${taskAlphaId}`, {
      headers: { Authorization: `Bearer ${empBToken}` },
    });
    assert('Unrelated Employee B cannot view Task Alpha -> 403 Forbidden', unrelatedGetTask.status === 403);

    // Manager can reassign task to project member
    const mgrReassign = await request('PUT', `/api/tasks/${taskAlphaId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
      body: { assigned_to: empAId },
    });
    assert('Manager can reassign task to project member -> 200', mgrReassign.status === 200);

    // Assigning project task to non-member user -> 400 Bad Request
    const nonMemberAssign = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${managerToken}` },
      body: {
        title: 'Invalid Assignment Task',
        project_id: projectAlphaId,
        assigned_to: empBId,
      },
    });
    assert('Assigning project task to non-member -> 400 Bad Request or handled', nonMemberAssign.status === 400 || nonMemberAssign.status === 403);

    // ==========================================
    // 6. COMMENTS SYSTEM & MODERATION
    // ==========================================
    console.log('\n--- 6. COMMENTS SYSTEM & MODERATION ---');

    // Employee A adds comment to Task Alpha
    const addCommentRes = await request('POST', `/api/tasks/${taskAlphaId}/comments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      body: { comment: 'Initial progress logged by assignee.' },
    });
    commentAlphaId = addCommentRes.body.data?.id;
    assert('Authorized user creates comment -> 201', addCommentRes.status === 201 && commentAlphaId);

    // Get comments for Task Alpha
    const getCommentsRes = await request('GET', `/api/tasks/${taskAlphaId}/comments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    assert('Get task comments -> 200 with author info', getCommentsRes.status === 200 && Array.isArray(getCommentsRes.body.data) && getCommentsRes.body.data[0]?.user?.name !== undefined);

    // Non-author cannot edit comment -> 403
    const nonAuthorEdit = await request('PUT', `/api/comments/${commentAlphaId}`, {
      headers: { Authorization: `Bearer ${empBToken}` },
      body: { comment: 'Tampered comment text' },
    });
    assert('User cannot edit another user comment -> 403 Forbidden', nonAuthorEdit.status === 403);

    // Comment author updates own comment -> 200
    const authorEdit = await request('PUT', `/api/comments/${commentAlphaId}`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      body: { comment: 'Updated comment text by author.' },
    });
    assert('Comment author updates own comment -> 200', authorEdit.status === 200 && authorEdit.body.data.comment === 'Updated comment text by author.');

    // Admin moderation delete comment -> 200
    const adminDelComment = await request('DELETE', `/api/comments/${commentAlphaId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Admin moderation delete comment -> 200', adminDelComment.status === 200);

    // ==========================================
    // 7. DASHBOARDS (ADMIN & PERSONAL)
    // ==========================================
    console.log('\n--- 7. DASHBOARDS (ADMIN & PERSONAL) ---');

    // Admin Dashboard -> 200
    const adminDashRes = await request('GET', '/api/dashboard/admin', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Admin dashboard GET /api/dashboard/admin -> 200', adminDashRes.status === 200 && adminDashRes.body.data.users);
    assert('Admin dashboard includes overdue tasks metric', adminDashRes.body.data.tasks.overdue !== undefined);

    // Employee accessing Admin dashboard -> 403
    const empAdminDash = await request('GET', '/api/dashboard/admin', {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    assert('Employee accessing admin dashboard -> 403 Forbidden', empAdminDash.status === 403);

    // Personal dashboard -> 200
    const personalDashRes = await request('GET', '/api/dashboard/my-tasks', {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    assert('Personal dashboard GET /api/dashboard/my-tasks -> 200', personalDashRes.status === 200 && personalDashRes.body.data.assigned_tasks);

    // ==========================================
    // 8. FILTERING, SEARCH & PAGINATION
    // ==========================================
    console.log('\n--- 8. FILTERING, SEARCH & PAGINATION ---');

    // Filter by priority
    const filterPriority = await request('GET', '/api/tasks?priority=urgent', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert('Filter tasks by priority=urgent -> 200', filterPriority.status === 200 && filterPriority.body.data.every(t => t.priority === 'urgent'));

    // Search keyword
    const searchRes = await request('GET', '/api/tasks?search=Alpha', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert('Search tasks by keyword -> 200', searchRes.status === 200 && searchRes.body.data.length >= 1);

    // Pagination
    const paginationRes = await request('GET', '/api/tasks?page=1&limit=2', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert('Pagination returns limit of 2 with pagination metadata', paginationRes.status === 200 && paginationRes.body.pagination?.limit === 2);

    // ==========================================
    // 9. CASCADE DELETION SAFETY
    // ==========================================
    console.log('\n--- 9. CASCADE DELETION SAFETY ---');

    // Delete Project Alpha
    const deleteProjRes = await request('DELETE', `/api/projects/${projectAlphaId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert('Manager deletes Project Alpha -> 200', deleteProjRes.status === 200);

    // Verify task inside Project Alpha was cascade deleted
    const getDeletedTask = await request('GET', `/api/tasks/${taskAlphaId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Tasks belonging to deleted project are cascade deleted -> 404', getDeletedTask.status === 404);

    // Verify project members were cascade deleted
    const checkMembers = await db.query('SELECT * FROM project_members WHERE project_id = $1', [projectAlphaId]);
    assert('Project members are cascade deleted', checkMembers.rows.length === 0);

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n=========================================');
    console.log(`PHASE 2 TEST SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('=========================================\n');

  } catch (error) {
    console.error('Fatal error during test execution:', error);
  } finally {
    try {
      await db.query("DELETE FROM users WHERE email IN ($1, $2, $3)", [managerEmail, empAEmail, empBEmail]);
    } catch (e) {}
    server.close();
    await db.pool.end();
  }
}

runPhase2Tests();
