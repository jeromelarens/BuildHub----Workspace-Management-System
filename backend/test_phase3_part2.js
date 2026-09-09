const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('./src/app');
const db = require('./src/config/database');
const { bootstrapAdmin } = require('./src/services/adminBootstrapService');
const { runAllMigrations } = require('./src/services/dbMigrationService');

let server;
let baseUrl;

const request = async (method, pathUrl, options = {}) => {
  const url = `${baseUrl}${pathUrl}`;
  const headers = { ...options.headers };
  let body = options.body;

  if (options.formData) {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;

    const parts = [];
    for (const [key, value] of Object.entries(options.formData)) {
      if (value && value.buffer && value.filename) {
        parts.push(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${key}"; filename="${value.filename}"\r\n` +
          `Content-Type: ${value.contentType || 'application/octet-stream'}\r\n\r\n`
        );
        parts.push(value.buffer);
        parts.push('\r\n');
      } else {
        parts.push(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
          `${value}\r\n`
        );
      }
    }
    parts.push(`--${boundary}--\r\n`);

    const buffers = parts.map(p => typeof p === 'string' ? Buffer.from(p) : p);
    body = Buffer.concat(buffers);
  } else if (body && typeof body === 'object' && !headers['Content-Type']) {
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
  const rawText = await res.text();
  try {
    json = JSON.parse(rawText);
  } catch (e) {
    json = rawText;
  }

  return {
    status: res.status,
    headers: res.headers,
    body: json,
    rawText,
  };
};

async function runPhase3Part2Tests() {
  console.log('\n============================================================');
  console.log('STARTING PHASE 3 PART 2 COMPREHENSIVE TEST SUITE');
  console.log('============================================================\n');

  await runAllMigrations();
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
  const mgrEmail = `mgr_p3p2_${timestamp}@example.com`;
  const leadEmail = `lead_p3p2_${timestamp}@example.com`;
  const empAEmail = `empa_p3p2_${timestamp}@example.com`;
  const empBEmail = `empb_p3p2_${timestamp}@example.com`;

  let adminToken, mgrToken, leadToken, empAToken, empBToken;
  let adminId, mgrId, leadId, empAId, empBId;
  let projectId, task1Id, task2Id, task3Id, attachmentId;

  try {
    // -------------------------------------------------------------
    // SETUP USERS & BASELINE ENTITIES
    // -------------------------------------------------------------
    console.log('\n--- 1. AUTHENTICATION & SETUP ---');

    // Admin login
    const adminLogin = await request('POST', '/api/auth/login', {
      body: { email: adminEmail, password: adminPassword },
    });
    adminToken = adminLogin.body.data.token;
    adminId = adminLogin.body.data.user.id;
    assert('Admin login -> 200', adminLogin.status === 200 && adminToken);

    // Register Manager
    const regMgr = await request('POST', '/api/auth/register', {
      body: { name: 'Manager P2', email: mgrEmail, password: 'Password@123', role: 'manager' },
    });
    mgrId = regMgr.body.data?.id;

    // Register Team Lead candidate
    const regLead = await request('POST', '/api/auth/register', {
      body: { name: 'Lead User', email: leadEmail, password: 'Password@123', role: 'employee' },
    });
    leadId = regLead.body.data?.id;

    // Promote to team_lead
    await request('PUT', `/api/users/${leadId}/role`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { role: 'team_lead' },
    });

    // Register Employees
    const regEmpA = await request('POST', '/api/auth/register', {
      body: { name: 'Alice Walker', email: empAEmail, password: 'Password@123', role: 'employee' },
    });
    empAId = regEmpA.body.data?.id;

    const regEmpB = await request('POST', '/api/auth/register', {
      body: { name: 'Bob Dylan', email: empBEmail, password: 'Password@123', role: 'employee' },
    });
    empBId = regEmpB.body.data?.id;

    // Logins
    const loginMgr = await request('POST', '/api/auth/login', { body: { email: mgrEmail, password: 'Password@123' } });
    mgrToken = loginMgr.body.data.token;

    const loginLead = await request('POST', '/api/auth/login', { body: { email: leadEmail, password: 'Password@123' } });
    leadToken = loginLead.body.data.token;

    const loginEmpA = await request('POST', '/api/auth/login', { body: { email: empAEmail, password: 'Password@123' } });
    empAToken = loginEmpA.body.data.token;

    const loginEmpB = await request('POST', '/api/auth/login', { body: { email: empBEmail, password: 'Password@123' } });
    empBToken = loginEmpB.body.data.token;

    // Create Project
    const createProj = await request('POST', '/api/projects', {
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: { name: `Enterprise Apollo ${timestamp}`, description: 'Enterprise Apollo Project', status: 'active' },
    });
    projectId = createProj.body.data?.id;
    assert('Manager creates project -> 201', createProj.status === 201 && projectId);

    // Add Lead and Employee A to project
    await request('POST', `/api/projects/${projectId}/members`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: { user_id: leadId, role: 'lead' },
    });
    await request('POST', `/api/projects/${projectId}/members`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: { user_id: empAId, role: 'member' },
    });

    // Create Task 1 (Lead creates, assigned to Emp A)
    const createT1 = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${leadToken}` },
      body: {
        title: 'Core Engine Alpha',
        description: 'Engine alpha implementation details',
        status: 'pending',
        priority: 'high',
        due_date: '2030-12-31',
        project_id: projectId,
        assigned_to: empAId,
      },
    });
    task1Id = createT1.body.data?.id;

    // Create Task 2 (Overdue task)
    const createT2 = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${leadToken}` },
      body: {
        title: 'Legacy Migration Beta',
        description: 'Legacy migration Beta task',
        status: 'in_progress',
        priority: 'urgent',
        due_date: '2020-01-01',
        project_id: projectId,
        assigned_to: empAId,
      },
    });
    task2Id = createT2.body.data?.id;

    // Create Task 3 (Completed task)
    const createT3 = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${leadToken}` },
      body: {
        title: 'Requirement Documentation Gamma',
        description: 'Gamma documentation task',
        status: 'completed',
        priority: 'low',
        due_date: '2030-01-01',
        project_id: projectId,
        assigned_to: empAId,
      },
    });
    task3Id = createT3.body.data?.id;
    assert('Setup tasks created -> 201', task1Id && task2Id && task3Id);

    // -------------------------------------------------------------
    // 2. FILE ATTACHMENTS
    // -------------------------------------------------------------
    console.log('\n--- 2. FILE ATTACHMENTS TESTS ---');

    // 1. Valid attachment upload (PDF / Text)
    const sampleBuffer = Buffer.from('%PDF-1.4\nPDF specification document content for Apollo.');
    const uploadRes = await request('POST', `/api/tasks/${task1Id}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: sampleBuffer,
          filename: 'specifications.pdf',
          contentType: 'application/pdf',
        },
      },
    });
    attachmentId = uploadRes.body.data?.id;
    assert('Upload valid attachment -> 201', uploadRes.status === 201 && attachmentId && !uploadRes.body.data.storage_name);

    // 2. Get task attachments
    const listAttRes = await request('GET', `/api/tasks/${task1Id}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    assert('GET task attachments -> 200 with attachment metadata', listAttRes.status === 200 && listAttRes.body.data.length >= 1);

    // 3. Download attachment
    const downloadRes = await request('GET', `/api/attachments/${attachmentId}/download`, {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    assert('Download attachment -> 200 OK with binary stream', downloadRes.status === 200 && downloadRes.rawText.includes('PDF specification document'));

    // 4. Unauthorized download (Employee B not in project)
    const unauthDownload = await request('GET', `/api/attachments/${attachmentId}/download`, {
      headers: { Authorization: `Bearer ${empBToken}` },
    });
    assert('Unauthorized user attachment download -> 403 Forbidden', unauthDownload.status === 403);

    // 5. Invalid MIME type upload (e.g. .exe / audio)
    const invalidMimeUpload = await request('POST', `/api/tasks/${task1Id}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: Buffer.from('malicious payload'),
          filename: 'script.exe',
          contentType: 'application/x-msdownload',
        },
      },
    });
    assert('Invalid MIME type rejected -> 400 Bad Request', invalidMimeUpload.status === 400);

    // 6. Missing file upload
    const missingFileUpload = await request('POST', `/api/tasks/${task1Id}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {},
    });
    assert('Missing file in upload -> 400 Bad Request', missingFileUpload.status === 400);

    // 7. Unauthorized upload to inaccessible task
    const unauthUpload = await request('POST', `/api/tasks/${task1Id}/attachments`, {
      headers: { Authorization: `Bearer ${empBToken}` },
      formData: {
        file: {
          buffer: Buffer.from('test'),
          filename: 'test.txt',
          contentType: 'text/plain',
        },
      },
    });
    assert('Unauthorized file upload -> 403 Forbidden', unauthUpload.status === 403);

    // 8. Unauthorized delete (Employee B cannot delete Emp A's attachment)
    const unauthDeleteAtt = await request('DELETE', `/api/attachments/${attachmentId}`, {
      headers: { Authorization: `Bearer ${empBToken}` },
    });
    assert('Unauthorized attachment delete -> 403 Forbidden', unauthDeleteAtt.status === 403);

    // 9. Admin delete attachment
    const adminDeleteAtt = await request('DELETE', `/api/attachments/${attachmentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Admin deletes attachment -> 200 OK', adminDeleteAtt.status === 200);

    // -------------------------------------------------------------
    // 3. TASK MENTIONS
    // -------------------------------------------------------------
    console.log('\n--- 3. TASK MENTIONS TESTS ---');

    // 10. Mention user in task description
    const mentionTask = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: {
        title: 'Mention Test Task',
        description: `Please review this @${empAEmail} and implement.`,
        project_id: projectId,
        assigned_to: mgrId,
      },
    });
    const mentionTaskId = mentionTask.body.data?.id;

    // Check Employee A's notifications for mention
    const empANotifs = await request('GET', '/api/notifications', {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    const mentionNotif = empANotifs.body.data.find(n => n.type === 'mention' && n.entity_id === mentionTaskId);
    assert('Mention in task description creates notification -> 200', mentionNotif !== undefined);

    // 11. Mention in task comment
    const commentWithMention = await request('POST', `/api/tasks/${mentionTaskId}/comments`, {
      headers: { Authorization: `Bearer ${leadToken}` },
      body: { comment: `Hey @Alice Walker and @${empAEmail}, check the logs.` },
    });
    assert('Comment with mention created -> 201', commentWithMention.status === 201);

    // 12. Self-mention prevention (User mentioning themselves)
    const selfMentionTask = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${leadToken}` },
      body: {
        title: 'Self Mention Task',
        description: `Working on my own task @${leadEmail}`,
        project_id: projectId,
      },
    });
    const leadNotifs = await request('GET', '/api/notifications', { headers: { Authorization: `Bearer ${leadToken}` } });
    const selfMentionNotif = leadNotifs.body.data.find(n => n.type === 'mention' && n.entity_id === selfMentionTask.body.data?.id);
    assert('Self-mention does NOT generate notification', selfMentionNotif === undefined);

    // 13. Mention user without project access (Employee B is not in project)
    await request('POST', `/api/tasks/${mentionTaskId}/comments`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: { comment: `Hey @Bob Dylan please join.` },
    });
    const empBNotifs = await request('GET', '/api/notifications', { headers: { Authorization: `Bearer ${empBToken}` } });
    const unauthMentionNotif = empBNotifs.body.data.find(n => n.type === 'mention' && n.entity_id === mentionTaskId);
    assert('Mentioning inaccessible user does NOT create notification', unauthMentionNotif === undefined);

    // -------------------------------------------------------------
    // 4. ADVANCED TASK SEARCH
    // -------------------------------------------------------------
    console.log('\n--- 4. ADVANCED TASK SEARCH TESTS ---');

    // 14. Full-text search
    const searchAlpha = await request('GET', '/api/tasks/search/advanced?search=Alpha', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Advanced search by keyword -> 200 with results', searchAlpha.status === 200 && searchAlpha.body.data.length >= 1 && searchAlpha.body.data[0].title.includes('Alpha'));

    // 15. Filter by isOverdue=true
    const searchOverdue = await request('GET', '/api/tasks/search/advanced?isOverdue=true', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Advanced search isOverdue=true -> 200', searchOverdue.status === 200 && searchOverdue.body.data.some(t => t.id === task2Id));

    // 16. Multi-field filter (priority + status + project_id)
    const searchMulti = await request('GET', `/api/tasks/search/advanced?priority=high&status=pending&project_id=${projectId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Advanced search multi-field filter -> 200', searchMulti.status === 200 && searchMulti.body.data.length >= 1);

    // 17. Pagination & Sorting
    const searchSort = await request('GET', '/api/tasks/search/advanced?sortBy=priority&sortOrder=asc&page=1&limit=2', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Advanced search pagination & sorting metadata present', searchSort.status === 200 && searchSort.body.pagination.limit === 2 && searchSort.body.pagination.total >= 3);

    // 18. RBAC Visibility: Employee B cannot find tasks in Apollo project
    const searchEmpB = await request('GET', `/api/tasks/search/advanced?project_id=${projectId}`, {
      headers: { Authorization: `Bearer ${empBToken}` },
    });
    assert('RBAC visibility prevents unrelated user from discovering project tasks -> 0 results', searchEmpB.status === 200 && searchEmpB.body.data.length === 0);

    // -------------------------------------------------------------
    // 5. BULK TASK OPERATIONS
    // -------------------------------------------------------------
    console.log('\n--- 5. BULK TASK OPERATIONS TESTS ---');

    // 19. Bulk update valid batch
    const bulkUpdateRes = await request('POST', '/api/tasks/bulk-update', {
      headers: { Authorization: `Bearer ${leadToken}` },
      body: {
        task_ids: [task1Id, task2Id],
        priority: 'urgent',
      },
    });
    assert('Bulk update valid batch -> 200 OK', bulkUpdateRes.status === 200 && bulkUpdateRes.body.data.updated_tasks.length === 2);

    // 20. Bulk update with duplicate IDs in batch -> 400 Bad Request
    const bulkDup = await request('POST', '/api/tasks/bulk-update', {
      headers: { Authorization: `Bearer ${leadToken}` },
      body: {
        task_ids: [task1Id, task1Id],
        priority: 'low',
      },
    });
    assert('Bulk update with duplicate task IDs rejected -> 400 Bad Request', bulkDup.status === 400);

    // 21. Bulk update with unauthorized task (Employee A cannot update Task in unauthorized scope or modify unauthorized details)
    const bulkUnauth = await request('POST', '/api/tasks/bulk-update', {
      headers: { Authorization: `Bearer ${empBToken}` },
      body: {
        task_ids: [task1Id, task2Id],
        priority: 'low',
      },
    });
    assert('Bulk update unauthorized task rejected -> 403 Forbidden', bulkUnauth.status === 403);

    // 22. Bulk update dependency completion blocker rollback
    // Add dependency: Task 1 depends on Task 2 (Task 2 is in_progress)
    await request('POST', `/api/tasks/${task1Id}/dependencies`, {
      headers: { Authorization: `Bearer ${leadToken}` },
      body: { depends_on_task_id: task2Id },
    });
    const bulkBlocker = await request('POST', '/api/tasks/bulk-update', {
      headers: { Authorization: `Bearer ${leadToken}` },
      body: {
        task_ids: [task1Id],
        status: 'completed',
      },
    });
    assert('Bulk update blocked by unresolved dependency -> 409 Conflict', bulkBlocker.status === 409);

    // 23. Bulk delete tasks (soft delete)
    const bulkDelTask1 = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${leadToken}` },
      body: { title: 'Bulk Del 1', project_id: projectId },
    });
    const bulkDelTask2 = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${leadToken}` },
      body: { title: 'Bulk Del 2', project_id: projectId },
    });
    const bd1Id = bulkDelTask1.body.data.id;
    const bd2Id = bulkDelTask2.body.data.id;

    const bulkDelRes = await request('POST', '/api/tasks/bulk-delete', {
      headers: { Authorization: `Bearer ${leadToken}` },
      body: {
        task_ids: [bd1Id, bd2Id],
      },
    });
    assert('Bulk delete tasks -> 200 OK', bulkDelRes.status === 200);

    // Verify tasks are soft deleted (cannot be fetched via GET /api/tasks/:id)
    const getBd1 = await request('GET', `/api/tasks/${bd1Id}`, { headers: { Authorization: `Bearer ${leadToken}` } });
    assert('Bulk deleted tasks excluded from normal GET -> 404 Not Found', getBd1.status === 404);

    // -------------------------------------------------------------
    // 6. SOFT DELETE & RESTORE LIFECYCLE
    // -------------------------------------------------------------
    console.log('\n--- 6. SOFT DELETE & RESTORE TESTS ---');

    // Create task to test lifecycle
    const lifeTask = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${leadToken}` },
      body: { title: 'Lifecycle Task', project_id: projectId },
    });
    const ltId = lifeTask.body.data.id;

    // 24. Soft delete single task
    const softDelRes = await request('DELETE', `/api/tasks/${ltId}`, {
      headers: { Authorization: `Bearer ${leadToken}` },
    });
    assert('Soft delete task -> 200 OK (moves to trash)', softDelRes.status === 200);

    // 25. Normal GET /api/tasks/:id returns 404
    const getSoftDel = await request('GET', `/api/tasks/${ltId}`, {
      headers: { Authorization: `Bearer ${leadToken}` },
    });
    assert('Soft-deleted task returns 404 on normal GET', getSoftDel.status === 404);

    // 26. Trash listing GET /api/tasks/trash returns task
    const trashRes = await request('GET', '/api/tasks/trash', {
      headers: { Authorization: `Bearer ${leadToken}` },
    });
    assert('GET /api/tasks/trash lists soft-deleted tasks', trashRes.status === 200 && trashRes.body.data.some(t => t.id === ltId));

    // 27. Restore task POST /api/tasks/:id/restore
    const restoreRes = await request('POST', `/api/tasks/${ltId}/restore`, {
      headers: { Authorization: `Bearer ${leadToken}` },
    });
    assert('Restore task -> 200 OK', restoreRes.status === 200);

    // 28. Task accessible again after restore
    const getRestored = await request('GET', `/api/tasks/${ltId}`, {
      headers: { Authorization: `Bearer ${leadToken}` },
    });
    assert('Restored task accessible again via GET -> 200 OK', getRestored.status === 200 && getRestored.body.data.id === ltId);

    // 29. Unauthorized restore attempt
    await request('DELETE', `/api/tasks/${ltId}`, { headers: { Authorization: `Bearer ${leadToken}` } });
    const unauthRestore = await request('POST', `/api/tasks/${ltId}/restore`, {
      headers: { Authorization: `Bearer ${empBToken}` },
    });
    assert('Unauthorized user cannot restore task -> 403/404', unauthRestore.status === 403 || unauthRestore.status === 404);

    // 30. Permanent delete (Admin only)
    const nonAdminPerm = await request('DELETE', `/api/tasks/${ltId}/permanent`, {
      headers: { Authorization: `Bearer ${leadToken}` },
    });
    assert('Non-admin permanent delete rejected -> 403 Forbidden', nonAdminPerm.status === 403);

    const adminPerm = await request('DELETE', `/api/tasks/${ltId}/permanent`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Admin permanent delete -> 200 OK', adminPerm.status === 200);

    // -------------------------------------------------------------
    // 7. ADVANCED ANALYTICS & PROJECT HEALTH
    // -------------------------------------------------------------
    console.log('\n--- 7. ANALYTICS & PROJECT HEALTH TESTS ---');

    // 31. Overview Analytics
    const overviewRes = await request('GET', '/api/analytics/overview', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('GET /api/analytics/overview -> 200 with metrics', overviewRes.status === 200 && overviewRes.body.data.tasks.total_tasks >= 3);

    // 32. Team Velocity
    const velocityRes = await request('GET', '/api/analytics/team-velocity', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('GET /api/analytics/team-velocity -> 200 with workload by assignee', velocityRes.status === 200 && Array.isArray(velocityRes.body.data.workload_by_assignee));

    // 33. Project Burndown
    const burndownRes = await request('GET', `/api/analytics/burndown/${projectId}`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
    });
    assert('GET /api/analytics/burndown/:projectId -> 200', burndownRes.status === 200 && burndownRes.body.data.project.id === projectId);

    // 34. Project Progress & Health in GET /api/projects/:id
    const projDetailRes = await request('GET', `/api/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
    });
    assert('Project detail includes progress completion_percentage and health_status', projDetailRes.status === 200 && projDetailRes.body.data.progress && ['ON_TRACK', 'AT_RISK', 'DELAYED'].includes(projDetailRes.body.data.progress.health_status));

    // -------------------------------------------------------------
    // 8. ENTERPRISE AUDIT LOGS
    // -------------------------------------------------------------
    console.log('\n--- 8. ENTERPRISE AUDIT LOGS TESTS ---');

    // 35. Admin accesses audit logs
    const auditRes = await request('GET', '/api/audit-logs?limit=10', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Admin GET /api/audit-logs -> 200 with structured audit trail', auditRes.status === 200 && Array.isArray(auditRes.body.data) && auditRes.body.data.length >= 5);

    // 36. Non-admin forbidden from audit logs
    const nonAdminAudit = await request('GET', '/api/audit-logs', {
      headers: { Authorization: `Bearer ${leadToken}` },
    });
    assert('Non-admin accessing audit logs -> 403 Forbidden', nonAdminAudit.status === 403);

    // 37. Filter audit logs by action
    const filterAudit = await request('GET', '/api/audit-logs?action=TASK_CREATED', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Audit logs filter by action -> 200 with matched records', filterAudit.status === 200 && filterAudit.body.data.every(l => l.action === 'TASK_CREATED'));

    // 38. Verify audit logs contain no sensitive passwords
    const allLogsText = JSON.stringify(auditRes.body.data);
    assert('Audit logs contain zero sensitive password/token credentials', !allLogsText.includes('AdminSecret') && !allLogsText.includes('Password@123'));

    // -------------------------------------------------------------
    // 9. SECURITY HARDENING & API VERSIONING
    // -------------------------------------------------------------
    console.log('\n--- 9. SECURITY & API VERSIONING TESTS ---');

    // 39. Security headers check (Helmet)
    const healthRes = await request('GET', '/api/health');
    assert('Response contains helmet security headers', healthRes.headers.get('x-content-type-options') === 'nosniff');

    // 40. API v1 Versioning parity check
    const v1Health = await request('GET', '/api/v1/health');
    assert('GET /api/v1/health -> 200 matching /api/health', v1Health.status === 200 && v1Health.body.version === '3.0.0');

    const v1Tasks = await request('GET', '/api/v1/tasks', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('GET /api/v1/tasks -> 200 matching /api/tasks behavior', v1Tasks.status === 200 && Array.isArray(v1Tasks.body.data));

    const v1Login = await request('POST', '/api/v1/auth/login', {
      body: { email: adminEmail, password: adminPassword },
    });
    assert('POST /api/v1/auth/login -> 200 matching /api/auth/login', v1Login.status === 200 && v1Login.body.data.token);

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n============================================================');
    console.log(`PHASE 3 PART 2 SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================\n');

  } catch (error) {
    console.error('Fatal test error:', error);
  } finally {
    try {
      await db.query("DELETE FROM users WHERE email IN ($1, $2, $3, $4)", [mgrEmail, leadEmail, empAEmail, empBEmail]);
    } catch (e) {}
    server.close();
    await db.pool.end();
  }
}

runPhase3Part2Tests();
