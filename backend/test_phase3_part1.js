const http = require('http');
const app = require('./src/app');
const db = require('./src/config/database');
const { bootstrapAdmin } = require('./src/services/adminBootstrapService');
const { runPhase3Part1Migration } = require('./src/services/dbMigrationService');
const { processRecurringTasks } = require('./src/services/recurrenceService');

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

async function runPhase3Part1Tests() {
  console.log('\n============================================================');
  console.log('STARTING PHASE 3 PART 1 COMPREHENSIVE TEST SUITE');
  console.log('============================================================\n');

  await runPhase3Part1Migration();
  await bootstrapAdmin();

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  console.log(`Test server running at ${baseUrl}`);

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
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@taskmanagement.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecret@2026!';
  const mgrEmail = `mgr_p3_${timestamp}@example.com`;
  const lead1Email = `lead1_p3_${timestamp}@example.com`;
  const lead2Email = `lead2_p3_${timestamp}@example.com`;
  const empAEmail = `empa_p3_${timestamp}@example.com`;
  const empBEmail = `empb_p3_${timestamp}@example.com`;

  let adminToken, mgrToken, lead1Token, lead2Token, empAToken, empBToken;
  let adminId, mgrId, lead1Id, lead2Id, empAId, empBId;
  let projectId, taskAId, taskBId, taskCId, taskDId, dependencyId;

  try {
    // -------------------------------------------------------------
    // 1. SETUP USERS & ROLE MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n--- 1. ROLES & PERMISSIONS BASELINE TESTS ---');

    // Admin login
    const adminLogin = await request('POST', '/api/auth/login', {
      body: { email: adminEmail, password: adminPassword },
    });
    adminToken = adminLogin.body.data.token;
    adminId = adminLogin.body.data.user.id;
    assert('Admin login successful -> 200', adminLogin.status === 200 && adminToken);

    // Register Manager, Team Lead 1 (will be 'lead' on project), Team Lead 2 (will be 'member' on project), Emp A, Emp B
    const regMgr = await request('POST', '/api/auth/register', {
      body: { name: 'Manager P3', email: mgrEmail, password: 'Password@123', role: 'manager' },
    });
    mgrId = regMgr.body.data?.id;

    const regLead1 = await request('POST', '/api/auth/register', {
      body: { name: 'Lead One', email: lead1Email, password: 'Password@123', role: 'employee' },
    });
    lead1Id = regLead1.body.data?.id;

    const regLead2 = await request('POST', '/api/auth/register', {
      body: { name: 'Lead Two', email: lead2Email, password: 'Password@123', role: 'employee' },
    });
    lead2Id = regLead2.body.data?.id;

    const regEmpA = await request('POST', '/api/auth/register', {
      body: { name: 'Employee A', email: empAEmail, password: 'Password@123', role: 'employee' },
    });
    empAId = regEmpA.body.data?.id;

    const regEmpB = await request('POST', '/api/auth/register', {
      body: { name: 'Employee B', email: empBEmail, password: 'Password@123', role: 'employee' },
    });
    empBId = regEmpB.body.data?.id;

    // Public registration rejects team_lead
    const regLeadDirect = await request('POST', '/api/auth/register', {
      body: { name: 'Lead Direct', email: `leaddirect_${timestamp}@test.com`, password: 'Password@123', role: 'team_lead' },
    });
    assert('Public registration with role=team_lead rejected -> 400', regLeadDirect.status === 400);

    // Admin promotes lead1Id and lead2Id to 'team_lead'
    const promoteLead1 = await request('PUT', `/api/users/${lead1Id}/role`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { role: 'team_lead' },
    });
    assert('Admin promotes user to team_lead -> 200', promoteLead1.status === 200 && promoteLead1.body.data.role === 'team_lead');

    const promoteLead2 = await request('PUT', `/api/users/${lead2Id}/role`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { role: 'team_lead' },
    });
    assert('Admin promotes second user to team_lead -> 200', promoteLead2.status === 200 && promoteLead2.body.data.role === 'team_lead');

    // Admin promotes team_lead to manager then demotes to team_lead
    const leadToMgr = await request('PUT', `/api/users/${lead1Id}/role`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { role: 'manager' },
    });
    assert('Admin updates team_lead to manager -> 200', leadToMgr.status === 200 && leadToMgr.body.data.role === 'manager');

    const mgrToLead = await request('PUT', `/api/users/${lead1Id}/role`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { role: 'team_lead' },
    });
    assert('Admin updates manager to team_lead -> 200', mgrToLead.status === 200 && mgrToLead.body.data.role === 'team_lead');

    // Login Manager, Team Lead 1, Team Lead 2, Employee A, Employee B
    const loginMgr = await request('POST', '/api/auth/login', { body: { email: mgrEmail, password: 'Password@123' } });
    mgrToken = loginMgr.body.data.token;

    const loginLead1 = await request('POST', '/api/auth/login', { body: { email: lead1Email, password: 'Password@123' } });
    lead1Token = loginLead1.body.data.token;

    const loginLead2 = await request('POST', '/api/auth/login', { body: { email: lead2Email, password: 'Password@123' } });
    lead2Token = loginLead2.body.data.token;

    const loginEmpA = await request('POST', '/api/auth/login', { body: { email: empAEmail, password: 'Password@123' } });
    empAToken = loginEmpA.body.data.token;

    const loginEmpB = await request('POST', '/api/auth/login', { body: { email: empBEmail, password: 'Password@123' } });
    empBToken = loginEmpB.body.data.token;

    // -------------------------------------------------------------
    // 2. ROLES & PERMISSIONS API
    // -------------------------------------------------------------
    console.log('\n--- 2. ROLES & PERMISSIONS API TESTS ---');

    // Get Roles
    const getRolesRes = await request('GET', '/api/roles', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('GET /api/roles -> 200 with 4 core roles', getRolesRes.status === 200 && getRolesRes.body.data.length >= 4);

    // Get Permissions
    const getPermsRes = await request('GET', '/api/permissions', {
      headers: { Authorization: `Bearer ${mgrToken}` },
    });
    assert('GET /api/permissions -> 200 with permissions list', getPermsRes.status === 200 && getPermsRes.body.data.length >= 25);

    // Admin creates custom role
    const customRoleName = `qa_engineer_${timestamp}`;
    const createRoleRes = await request('POST', '/api/roles', {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { name: customRoleName, description: 'Quality assurance role' },
    });
    assert('Admin creates custom role -> 201', createRoleRes.status === 201 && createRoleRes.body.data.id);
    const customRoleId = createRoleRes.body.data?.id;

    // Assign permission to custom role
    const permId = getPermsRes.body.data[0].id;
    const addPermRes = await request('POST', `/api/roles/${customRoleId}/permissions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { permission_id: permId },
    });
    assert('Admin assigns permission to role -> 201', addPermRes.status === 201);

    // Remove permission from role
    const remPermRes = await request('DELETE', `/api/roles/${customRoleId}/permissions/${permId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Admin removes permission from role -> 200', remPermRes.status === 200);

    // Non-admin cannot create role -> 403
    const nonAdminRole = await request('POST', '/api/roles', {
      headers: { Authorization: `Bearer ${lead1Token}` },
      body: { name: 'unauthorized_role' },
    });
    assert('Team Lead cannot create roles -> 403 Forbidden', nonAdminRole.status === 403);

    // Cannot delete system role (e.g. admin or employee) -> 403
    const adminRoleId = getRolesRes.body.data.find(r => r.name === 'admin').id;
    const delAdminRole = await request('DELETE', `/api/roles/${adminRoleId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Cannot delete system role admin -> 403 Forbidden', delAdminRole.status === 403);

    // Delete custom role -> 200
    const delCustomRole = await request('DELETE', `/api/roles/${customRoleId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Admin deletes custom role -> 200', delCustomRole.status === 200);

    // -------------------------------------------------------------
    // 3. TEAM LEAD AUTHORIZATION & PROJECT ROLE BOUNDARIES
    // -------------------------------------------------------------
    console.log('\n--- 3. TEAM LEAD AUTHORIZATION & BOUNDARY TESTS ---');

    const projectName = `Project Titan ${timestamp}`;
    // Manager creates Project
    const createProjRes = await request('POST', '/api/projects', {
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: { name: projectName, description: 'Titan Core', status: 'active' },
    });
    projectId = createProjRes.body.data?.id;
    assert('Manager creates project -> 201', createProjRes.status === 201 && projectId);

    // Manager adds Team Lead 1 to Project as 'lead'
    const addLead1Res = await request('POST', `/api/projects/${projectId}/members`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: { user_id: lead1Id, role: 'lead' },
    });
    assert('Manager adds Team Lead 1 as lead -> 201', addLead1Res.status === 201 && addLead1Res.body.data.role === 'lead');

    // Manager adds Team Lead 2 to Project as normal 'member'
    const addLead2Res = await request('POST', `/api/projects/${projectId}/members`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: { user_id: lead2Id, role: 'member' },
    });
    assert('Manager adds Team Lead 2 as member -> 201', addLead2Res.status === 201 && addLead2Res.body.data.role === 'member');

    // Manager adds Employee A to Project
    const addEmpRes = await request('POST', `/api/projects/${projectId}/members`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: { user_id: empAId, role: 'member' },
    });
    assert('Manager adds Employee A to project -> 201', addEmpRes.status === 201);

    // Notification Verification for Employee A: Check project name is actual name, NOT "undefined"
    const notifsEmpA = await request('GET', '/api/notifications', {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    const projAddedNotif = notifsEmpA.body.data.find(n => n.type === 'project_added');
    assert('Project added notification contains actual project name', projAddedNotif && projAddedNotif.title.includes(projectName));
    assert('Project added notification does NOT contain "undefined"', projAddedNotif && !projAddedNotif.title.includes('undefined') && !projAddedNotif.message.includes('undefined'));

    // Team Lead 1 (Project Lead) creates Task A assigned to Team Lead 2
    const createLeadTask = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${lead1Token}` },
      body: {
        title: 'Task A (Design Architecture)',
        description: 'Design architecture specifications',
        status: 'pending',
        priority: 'high',
        project_id: projectId,
        assigned_to: lead2Id,
      },
    });
    taskAId = createLeadTask.body.data?.id;
    assert('Team Lead 1 creates task assigned to team member -> 201', createLeadTask.status === 201 && taskAId);

    // Team Lead 1 creates Task B and Task C in project
    const createB = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${lead1Token}` },
      body: { title: 'Task B (Backend Implementation)', status: 'pending', priority: 'medium', project_id: projectId, assigned_to: empAId },
    });
    taskBId = createB.body.data?.id;

    const createC = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${lead1Token}` },
      body: { title: 'Task C (Integration Tests)', status: 'pending', priority: 'medium', project_id: projectId, assigned_to: empAId },
    });
    taskCId = createC.body.data?.id;
    assert('Team Lead 1 creates Task B and Task C -> 201', taskBId && taskCId);

    // Team Lead 2 (normal member) creates Task D
    const createD = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${lead2Token}` },
      body: { title: 'Task D (Member Task)', status: 'pending', priority: 'low', project_id: projectId, assigned_to: lead2Id },
    });
    taskDId = createD.body.data?.id;
    assert('Team Lead 2 (member) creates own task -> 201', createD.status === 201 && taskDId);

    // 1. Team Lead + project lead -> update another user's task details -> 200
    const lead1UpdateTaskB = await request('PUT', `/api/tasks/${taskBId}`, {
      headers: { Authorization: `Bearer ${lead1Token}` },
      body: { title: 'Task B (Backend Implementation v2)' },
    });
    assert('1. Team Lead + project lead updates another user task details -> 200', lead1UpdateTaskB.status === 200 && lead1UpdateTaskB.body.data.title.includes('v2'));

    // 2. Team Lead + project member -> update another user's task details -> 403
    const lead2UpdateTaskB = await request('PUT', `/api/tasks/${taskBId}`, {
      headers: { Authorization: `Bearer ${lead2Token}` },
      body: { title: 'Task B (Hacked by member)' },
    });
    assert('2. Team Lead + project member updating another user task details -> 403 Forbidden', lead2UpdateTaskB.status === 403);

    // 3. Team Lead + project member -> update own created task details -> 200
    const lead2UpdateOwnTask = await request('PUT', `/api/tasks/${taskDId}`, {
      headers: { Authorization: `Bearer ${lead2Token}` },
      body: { title: 'Task D (Member Task Updated by Creator)' },
    });
    assert('3. Team Lead + project member updates own created task details -> 200', lead2UpdateOwnTask.status === 200 && lead2UpdateOwnTask.body.data.title.includes('Updated'));

    // 4. Team Lead assignee -> update task status -> 200
    const lead2UpdateAssigneeStatus = await request('PUT', `/api/tasks/${taskAId}`, {
      headers: { Authorization: `Bearer ${lead2Token}` },
      body: { status: 'in_progress' },
    });
    assert('4. Team Lead assignee updates task status -> 200', lead2UpdateAssigneeStatus.status === 200 && lead2UpdateAssigneeStatus.body.data.status === 'in_progress');

    // Reset status of Task A to pending for dependency test
    await db.query("UPDATE tasks SET status = 'pending' WHERE id = $1", [taskAId]);

    // Team Lead cannot assign standalone task to another user
    const leadStandaloneAssign = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${lead1Token}` },
      body: { title: 'Standalone Task', assigned_to: empAId },
    });
    assert('Team Lead cannot assign standalone task to another user -> 403 Forbidden', leadStandaloneAssign.status === 403);

    // Team Lead cannot access global user management
    const leadUsersRes = await request('GET', '/api/users', {
      headers: { Authorization: `Bearer ${lead1Token}` },
    });
    assert('Team Lead cannot access GET /api/users -> 403 Forbidden', leadUsersRes.status === 403);

    // -------------------------------------------------------------
    // 4. TASK DEPENDENCIES & DAG CYCLE DETECTION
    // -------------------------------------------------------------
    console.log('\n--- 4. TASK DEPENDENCIES & DAG CYCLE TESTS ---');

    // 5. Employee project member -> add dependency -> 403
    const empAddDep = await request('POST', `/api/tasks/${taskBId}/dependencies`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      body: { depends_on_task_id: taskAId },
    });
    assert('5. Employee project member adds dependency on another user task -> 403 Forbidden', empAddDep.status === 403);

    // 6. Team Lead project member -> add dependency -> 403
    const lead2AddDep = await request('POST', `/api/tasks/${taskBId}/dependencies`, {
      headers: { Authorization: `Bearer ${lead2Token}` },
      body: { depends_on_task_id: taskAId },
    });
    assert('6. Team Lead project member adds dependency on another user task -> 403 Forbidden', lead2AddDep.status === 403);

    // 7. Team Lead project lead -> add dependency -> 201
    const lead1AddDep = await request('POST', `/api/tasks/${taskBId}/dependencies`, {
      headers: { Authorization: `Bearer ${lead1Token}` },
      body: { depends_on_task_id: taskAId },
    });
    dependencyId = lead1AddDep.body.data?.id;
    assert('7. Team Lead project lead adds dependency -> 201', lead1AddDep.status === 201 && dependencyId);

    // 8. Task creator -> add dependency -> 201 (Task D created by Lead 2)
    const creatorAddDep = await request('POST', `/api/tasks/${taskDId}/dependencies`, {
      headers: { Authorization: `Bearer ${lead2Token}` },
      body: { depends_on_task_id: taskAId },
    });
    assert('8. Task creator adds dependency to own task -> 201', creatorAddDep.status === 201);

    // Duplicate dependency -> 409 Conflict
    const addDepDup = await request('POST', `/api/tasks/${taskBId}/dependencies`, {
      headers: { Authorization: `Bearer ${lead1Token}` },
      body: { depends_on_task_id: taskAId },
    });
    assert('Duplicate dependency -> 409 Conflict', addDepDup.status === 409);

    // Self dependency -> 400 Bad Request
    const addDepSelf = await request('POST', `/api/tasks/${taskBId}/dependencies`, {
      headers: { Authorization: `Bearer ${lead1Token}` },
      body: { depends_on_task_id: taskBId },
    });
    assert('Self dependency -> 400 Bad Request', addDepSelf.status === 400);

    // Task C depends on Task B
    const addDep2 = await request('POST', `/api/tasks/${taskCId}/dependencies`, {
      headers: { Authorization: `Bearer ${lead1Token}` },
      body: { depends_on_task_id: taskBId },
    });
    assert('Add dependency (Task C depends on Task B) -> 201', addDep2.status === 201);

    // DAG Cycle Detection: Attempt Task A depends on Task C (A -> B -> C -> A cycle)
    const addCycle = await request('POST', `/api/tasks/${taskAId}/dependencies`, {
      headers: { Authorization: `Bearer ${lead1Token}` },
      body: { depends_on_task_id: taskCId },
    });
    assert('Cycle detection prevents cyclic dependency (A -> B -> C -> A) -> 409 Conflict', addCycle.status === 409);

    // List dependencies for Task B
    const listDeps = await request('GET', `/api/tasks/${taskBId}/dependencies`, {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    assert('GET /api/tasks/:id/dependencies -> 200 with depends_on and blocking', listDeps.status === 200 && listDeps.body.data.depends_on.length === 1 && listDeps.body.data.blocking.length === 1);

    // Task completion blocking: Task B cannot be completed while Task A is pending
    const completeBlockedTask = await request('PUT', `/api/tasks/${taskBId}`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      body: { status: 'completed' },
    });
    assert('Completing task with pending dependency is blocked -> 409 Conflict', completeBlockedTask.status === 409 && completeBlockedTask.body.blocking_tasks?.length > 0);

    // Complete Task A first
    const completeTaskA = await request('PUT', `/api/tasks/${taskAId}`, {
      headers: { Authorization: `Bearer ${lead1Token}` },
      body: { status: 'completed' },
    });
    assert('Complete prerequisite Task A -> 200 OK', completeTaskA.status === 200 && completeTaskA.body.data.status === 'completed');

    // Now Task B can be completed
    const completeTaskB = await request('PUT', `/api/tasks/${taskBId}`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      body: { status: 'completed' },
    });
    assert('Complete Task B after prerequisite is resolved -> 200 OK', completeTaskB.status === 200 && completeTaskB.body.data.status === 'completed');

    // Delete dependency on Task C
    const getDepsC = await request('GET', `/api/tasks/${taskCId}/dependencies`, { headers: { Authorization: `Bearer ${lead1Token}` } });
    const depCId = getDepsC.body.data.depends_on[0].dependency_id;
    const deleteDepRes = await request('DELETE', `/api/tasks/${taskCId}/dependencies/${depCId}`, {
      headers: { Authorization: `Bearer ${lead1Token}` },
    });
    assert('Delete dependency -> 200 OK', deleteDepRes.status === 200);

    // -------------------------------------------------------------
    // 5. RECURRING TASKS
    // -------------------------------------------------------------
    console.log('\n--- 5. RECURRING TASKS TESTS ---');

    // 9. Employee project member -> create recurrence -> 403
    const empRecur = await request('POST', `/api/tasks/${taskBId}/recurrence`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      body: { frequency: 'daily', interval_count: 1 },
    });
    assert('9. Employee project member creates recurrence on another user task -> 403 Forbidden', empRecur.status === 403);

    // 10. Team Lead project member -> create recurrence -> 403
    const lead2Recur = await request('POST', `/api/tasks/${taskBId}/recurrence`, {
      headers: { Authorization: `Bearer ${lead2Token}` },
      body: { frequency: 'daily', interval_count: 1 },
    });
    assert('10. Team Lead project member creates recurrence on another user task -> 403 Forbidden', lead2Recur.status === 403);

    // 11. Team Lead project lead -> create recurrence -> 200
    const lead1Recur = await request('POST', `/api/tasks/${taskBId}/recurrence`, {
      headers: { Authorization: `Bearer ${lead1Token}` },
      body: { frequency: 'daily', interval_count: 1, is_active: true },
    });
    assert('11. Team Lead project lead creates task recurrence -> 200 OK', lead1Recur.status === 200 && lead1Recur.body.data.frequency === 'daily');

    // 12. Task creator -> create recurrence -> 200 (Task D created by Lead 2)
    const creatorRecur = await request('POST', `/api/tasks/${taskDId}/recurrence`, {
      headers: { Authorization: `Bearer ${lead2Token}` },
      body: { frequency: 'weekly', interval_count: 1, is_active: true },
    });
    assert('12. Task creator creates recurrence on own task -> 200 OK', creatorRecur.status === 200);

    // Get Recurrence
    const getRecurRes = await request('GET', `/api/tasks/${taskBId}/recurrence`, {
      headers: { Authorization: `Bearer ${lead1Token}` },
    });
    assert('GET task recurrence -> 200 OK', getRecurRes.status === 200 && getRecurRes.body.data.task_id === taskBId);

    // Update Recurrence to Weekly
    const updateRecurRes = await request('PUT', `/api/tasks/${taskBId}/recurrence`, {
      headers: { Authorization: `Bearer ${lead1Token}` },
      body: {
        frequency: 'weekly',
        interval_count: 2,
        day_of_week: 1,
      },
    });
    assert('Update task recurrence to weekly -> 200 OK', updateRecurRes.status === 200 && updateRecurRes.body.data.frequency === 'weekly');

    // Test processRecurringTasks runner
    // Set next_run_date to yesterday so it triggers
    await db.query("UPDATE task_recurrence_rules SET next_run_date = '2020-01-01' WHERE task_id = $1", [taskBId]);
    const genResult = await processRecurringTasks();
    assert('processRecurringTasks generates new task instance', genResult.success === true && genResult.generatedCount >= 1);

    // Delete recurrence
    const delRecurRes = await request('DELETE', `/api/tasks/${taskBId}/recurrence`, {
      headers: { Authorization: `Bearer ${lead1Token}` },
    });
    assert('Delete task recurrence -> 200 OK', delRecurRes.status === 200);

    // -------------------------------------------------------------
    // 6. NOTIFICATIONS FOUNDATION
    // -------------------------------------------------------------
    console.log('\n--- 6. NOTIFICATIONS TESTS ---');

    // Employee A checks notifications (should have notifications from project addition, task assignments, dependency resolution)
    const empNotifsRes = await request('GET', '/api/notifications', {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    assert('GET /api/notifications -> 200 with notifications array', empNotifsRes.status === 200 && Array.isArray(empNotifsRes.body.data) && empNotifsRes.body.data.length >= 1);

    const firstNotifId = empNotifsRes.body.data[0]?.id;

    // Get unread count
    const unreadCountRes = await request('GET', '/api/notifications/unread-count', {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    assert('GET /api/notifications/unread-count -> 200 with unread count', unreadCountRes.status === 200 && unreadCountRes.body.data.unread_count > 0);

    // Mark single notification as read
    const markReadRes = await request('PUT', `/api/notifications/${firstNotifId}/read`, {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    assert('PUT /api/notifications/:id/read -> 200 OK', markReadRes.status === 200 && markReadRes.body.data.is_read === true);

    // Employee B cannot access Employee A's notification -> 403 Forbidden
    const unauthNotif = await request('PUT', `/api/notifications/${firstNotifId}/read`, {
      headers: { Authorization: `Bearer ${empBToken}` },
    });
    assert('User cannot read another user notification -> 403 Forbidden', unauthNotif.status === 403);

    // Mark all as read
    const markAllRes = await request('PUT', '/api/notifications/read-all', {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    assert('PUT /api/notifications/read-all -> 200 OK', markAllRes.status === 200);

    // Delete notification
    const delNotifRes = await request('DELETE', `/api/notifications/${firstNotifId}`, {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    assert('DELETE /api/notifications/:id -> 200 OK', delNotifRes.status === 200);

    // -------------------------------------------------------------
    // 7. TASK ACTIVITY TIMELINE
    // -------------------------------------------------------------
    console.log('\n--- 7. TASK ACTIVITY TIMELINE TESTS ---');

    // Add comment to Task A to generate comment activity
    await request('POST', `/api/tasks/${taskAId}/comments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      body: { comment: 'Architecture approved and finalized.' },
    });

    // Get activity history for Task A
    const activityRes = await request('GET', `/api/tasks/${taskAId}/activity`, {
      headers: { Authorization: `Bearer ${lead1Token}` },
    });
    assert('GET /api/tasks/:id/activity -> 200 with chronological activity timeline', activityRes.status === 200 && Array.isArray(activityRes.body.data) && activityRes.body.data.length >= 2);

    const actions = activityRes.body.data.map(a => a.action);
    assert('Activity timeline records created action', actions.includes('created'));
    assert('Activity timeline records status_changed or completion action', actions.includes('status_changed') || actions.includes('completion'));
    assert('Activity timeline records comment_added action', actions.includes('comment_added'));

    // Unrelated user cannot view task activity
    const unauthActivity = await request('GET', `/api/tasks/${taskAId}/activity`, {
      headers: { Authorization: `Bearer ${empBToken}` },
    });
    assert('Unrelated user cannot view task activity -> 403 Forbidden', unauthActivity.status === 403);

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n============================================================');
    console.log(`PHASE 3 PART 1 SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================\n');

  } catch (error) {
    console.error('Fatal test error:', error);
  } finally {
    try {
      await db.query("DELETE FROM users WHERE email IN ($1, $2, $3, $4, $5)", [mgrEmail, lead1Email, lead2Email, empAEmail, empBEmail]);
    } catch (e) {}
    server.close();
    await db.pool.end();
  }
}

runPhase3Part1Tests();
