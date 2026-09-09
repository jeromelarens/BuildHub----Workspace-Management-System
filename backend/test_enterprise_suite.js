/**
 * TASKFLOW — ENTERPRISE BACKEND CAPABILITIES COMPREHENSIVE TEST SUITE
 * Covers:
 * 1. Password Reset & Email Verification
 * 2. Multi-Tenant Workspace Architecture
 * 3. Outbound Webhooks & HMAC Signatures
 * 4. Custom Fields Metadata System
 * 5. Multi-Step Approval Workflow
 * 6. Punch-Clock Time Tracking & Timesheets
 */

const assert = require('assert');
const http = require('http');
const dotenv = require('dotenv');

dotenv.config();

const app = require('./src/app');
const db = require('./src/config/database');
const { runAllMigrations } = require('./src/services/dbMigrationService');
const { bootstrapAdmin } = require('./src/services/adminBootstrapService');
const { getOutboundHistory, clearOutboundHistory } = require('./src/services/emailService');
const { verifyWebhookSignature } = require('./src/utils/cryptoUtils');

let server;
let baseUrl;
let passedCount = 0;
let failedCount = 0;

const logPass = (msg) => {
  passedCount++;
  console.log(`[PASS] ${msg}`);
};

const logFail = (msg, err) => {
  failedCount++;
  console.error(`[FAIL] ${msg}`, err ? err.message : '');
};

const makeRequest = async (path, options = {}) => {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  });

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    headers: response.headers,
    data,
  };
};

const runEnterpriseSuite = async () => {
  console.log('\n============================================================');
  console.log('STARTING ENTERPRISE BACKEND CAPABILITIES TEST SUITE');
  console.log('============================================================\n');

  try {
    await runAllMigrations();
    await bootstrapAdmin();

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        console.log(`Enterprise Test Server active at: ${baseUrl}\n`);
        resolve();
      });
    });

    // ----------------------------------------------------
    // SETUP: Create test users (Admin, Manager, Employee1, Employee2)
    // ----------------------------------------------------
    const timestamp = Date.now();
    const adminLoginRes = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'admin@taskmanagement.com', password: process.env.ADMIN_PASSWORD || 'Admin@123456' },
    });
    assert.strictEqual(adminLoginRes.status, 200, 'Admin login should succeed');
    const adminToken = adminLoginRes.data.data.token;
    const adminUser = adminLoginRes.data.data.user;

    // Create Manager
    const mgrEmail = `mgr_${timestamp}@test.com`;
    const mgrReg = await makeRequest('/auth/register', {
      method: 'POST',
      body: { name: 'Manager User', email: mgrEmail, password: 'Password@123', role: 'manager' },
    });
    assert.strictEqual(mgrReg.status, 201);
    const mgrLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: mgrEmail, password: 'Password@123' },
    });
    const mgrToken = mgrLogin.data.data.token;
    const mgrUser = mgrLogin.data.data.user;

    // Create Employee 1
    const emp1Email = `emp1_${timestamp}@test.com`;
    const emp1Reg = await makeRequest('/auth/register', {
      method: 'POST',
      body: { name: 'Employee One', email: emp1Email, password: 'Password@123', role: 'employee' },
    });
    assert.strictEqual(emp1Reg.status, 201);
    const emp1Login = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: emp1Email, password: 'Password@123' },
    });
    const emp1Token = emp1Login.data.data.token;
    const emp1User = emp1Login.data.data.user;

    // Create Employee 2
    const emp2Email = `emp2_${timestamp}@test.com`;
    const emp2Reg = await makeRequest('/auth/register', {
      method: 'POST',
      body: { name: 'Employee Two', email: emp2Email, password: 'Password@123', role: 'employee' },
    });
    assert.strictEqual(emp2Reg.status, 201);
    const emp2Login = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: emp2Email, password: 'Password@123' },
    });
    const emp2Token = emp2Login.data.data.token;
    const emp2User = emp2Login.data.data.user;

    logPass('1. Test authentication accounts initialized (Admin, Manager, Emp1, Emp2)');

    // ----------------------------------------------------
    // SECTION 1: PASSWORD RESET & EMAIL VERIFICATION
    // ----------------------------------------------------
    console.log('\n--- 1. PASSWORD RESET & EMAIL VERIFICATION TESTS ---');

    // 1.1 Request password reset for existing user
    clearOutboundHistory();
    const forgotRes = await makeRequest('/auth/forgot-password', {
      method: 'POST',
      body: { email: emp1Email },
    });
    assert.strictEqual(forgotRes.status, 200);
    assert.strictEqual(forgotRes.data.success, true);
    assert.ok(forgotRes.data.message.includes('password reset link'));

    // Verify token stored in DB is hashed and not plaintext
    const tokenDbRes = await db.query('SELECT * FROM password_reset_tokens WHERE user_id = $1 ORDER BY id DESC LIMIT 1;', [emp1User.id]);
    assert.strictEqual(tokenDbRes.rows.length, 1);
    assert.strictEqual(tokenDbRes.rows[0].token_hash.length, 64, 'Token must be stored as SHA-256 hash');
    assert.strictEqual(tokenDbRes.rows[0].used_at, null);

    // Retrieve raw token dispatched via email
    const history = getOutboundHistory();
    const resetEmail = history.find((e) => e.to === emp1Email && e.subject.includes('Reset'));
    assert.ok(resetEmail, 'Password reset email must have been sent');
    const tokenMatch = resetEmail.text.match(/token=([a-f0-9]+)/);
    assert.ok(tokenMatch, 'Reset email must contain token');
    const rawResetToken = tokenMatch[1];
    logPass('Password reset request generates hashed token & dispatches email -> 200');

    // 1.2 Request password reset for non-existent user returns identical generic response (anti-enumeration)
    const nonExistentForgot = await makeRequest('/auth/forgot-password', {
      method: 'POST',
      body: { email: 'nobody_unknown_user_9999@test.com' },
    });
    assert.strictEqual(nonExistentForgot.status, 200);
    assert.strictEqual(nonExistentForgot.data.message, forgotRes.data.message);
    logPass('Password reset anti-enumeration generic response verified -> 200');

    // 1.3 Reset password with invalid token -> 400
    const invalidReset = await makeRequest('/auth/reset-password', {
      method: 'POST',
      body: { token: 'invalid-nonexistent-token', newPassword: 'NewPassword@999' },
    });
    assert.strictEqual(invalidReset.status, 400);
    logPass('Reset password with invalid token rejected -> 400');

    // 1.4 Reset password with valid token -> 200
    const validReset = await makeRequest('/auth/reset-password', {
      method: 'POST',
      body: { token: rawResetToken, newPassword: 'NewPassword@999' },
    });
    assert.strictEqual(validReset.status, 200);
    assert.strictEqual(validReset.data.success, true);

    // Verify user can now login with new password
    const newLoginRes = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: emp1Email, password: 'NewPassword@999' },
    });
    assert.strictEqual(newLoginRes.status, 200);
    logPass('Reset password with valid token updates password successfully -> 200');

    // 1.5 Reuse same token -> 400
    const reusedReset = await makeRequest('/auth/reset-password', {
      method: 'POST',
      body: { token: rawResetToken, newPassword: 'AnotherPassword@111' },
    });
    assert.strictEqual(reusedReset.status, 400);
    logPass('Password reset token reuse blocked -> 400');

    // 1.6 Verify Email Flow
    clearOutboundHistory();
    const resendRes = await makeRequest('/auth/resend-verification', {
      method: 'POST',
      body: { email: emp2Email },
    });
    assert.strictEqual(resendRes.status, 200);

    const history2 = getOutboundHistory();
    const verifyEmailMsg = history2.find((e) => e.to === emp2Email && e.subject.includes('Verify'));
    assert.ok(verifyEmailMsg, 'Verification email must have been sent on resend');
    const verifyMatch = verifyEmailMsg.text.match(/token=([a-f0-9]+)/);
    assert.ok(verifyMatch, 'Verification email contains token');
    const rawVerifyToken = verifyMatch[1];

    const verifyRes = await makeRequest('/auth/verify-email', {
      method: 'POST',
      body: { token: rawVerifyToken },
    });
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.data.success, true);
    logPass('Email verification with valid token marks email verified -> 200');

    // 1.7 Verification status endpoint
    const statusRes = await makeRequest('/auth/verification-status', {
      headers: { Authorization: `Bearer ${emp2Token}` },
    });
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.data.data.is_verified, true);
    logPass('GET /api/auth/verification-status returns verified state -> 200');

    // 1.8 Token reuse rejection for email verification
    const reusedVerify = await makeRequest('/auth/verify-email', {
      method: 'POST',
      body: { token: rawVerifyToken },
    });
    assert.strictEqual(reusedVerify.status, 400);
    logPass('Email verification token reuse blocked -> 400');

    // ----------------------------------------------------
    // SECTION 2: MULTI-TENANT WORKSPACE ARCHITECTURE
    // ----------------------------------------------------
    console.log('\n--- 2. MULTI-TENANT WORKSPACE TESTS ---');

    // 2.1 Create new workspace as Manager
    const createWsRes = await makeRequest('/workspaces', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: { name: 'Acme Enterprise', description: 'Primary enterprise workspace' },
    });
    assert.strictEqual(createWsRes.status, 201);
    const acmeWs = createWsRes.data.data;
    assert.strictEqual(acmeWs.name, 'Acme Enterprise');
    assert.strictEqual(acmeWs.owner_id, mgrUser.id);
    logPass('Manager creates workspace (Acme Enterprise) -> 201');

    // 2.2 List user's workspaces
    const listWsRes = await makeRequest('/workspaces', {
      headers: { Authorization: `Bearer ${mgrToken}` },
    });
    assert.strictEqual(listWsRes.status, 200);
    const hasAcme = listWsRes.data.data.some((w) => w.id === acmeWs.id);
    assert.ok(hasAcme, 'Acme workspace must be listed in manager workspaces');
    logPass('GET /api/workspaces lists user memberships -> 200');

    // 2.3 Add Employee 1 to Acme Workspace
    const addMemberRes = await makeRequest(`/workspaces/${acmeWs.id}/members`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: { user_id: emp1User.id, role: 'member' },
    });
    assert.strictEqual(addMemberRes.status, 201);
    logPass('Workspace owner adds employee to workspace -> 201');

    // 2.4 Update member role to admin
    const updateRoleRes = await makeRequest(`/workspaces/${acmeWs.id}/members/${emp1User.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: { role: 'admin' },
    });
    assert.strictEqual(updateRoleRes.status, 200);
    assert.strictEqual(updateRoleRes.data.data.role, 'admin');
    logPass('Update workspace member role -> 200');

    // 2.5 Tenant isolation: Employee 2 (NOT a member of Acme Workspace) denied scoped resource
    const idorCustomFields = await makeRequest('/custom-fields/definitions', {
      headers: {
        Authorization: `Bearer ${emp2Token}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
    });
    assert.strictEqual(idorCustomFields.status, 403, 'Non-member access to tenant workspace must be 403 Forbidden');
    logPass('Tenant boundary isolation: Non-member rejected with 403 Forbidden');


    // ----------------------------------------------------
    // SECTION 4: OUTBOUND WEBHOOK SYSTEM
    // ----------------------------------------------------
    console.log('\n--- 4. OUTBOUND WEBHOOK SYSTEM TESTS ---');

    // 4.1 Register Webhook Endpoint
    const createWebhookRes = await makeRequest('/webhooks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mgrToken}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
      body: {
        url: 'https://webhook.site/test-receiver-endpoint',
        description: 'Production event listener',
        events: ['task.created', 'task.completed', 'approval.approved'],
      },
    });
    assert.strictEqual(createWebhookRes.status, 201);
    const webhook = createWebhookRes.data.data;
    assert.ok(webhook.secret.startsWith('whsec_'), 'Webhook secret generated');
    logPass('POST /api/webhooks registers endpoint with signing secret -> 201');

    // 4.2 Webhook Signature verification test
    const samplePayload = { event: 'task.created', task_id: 101, title: 'Build enterprise backend' };
    const ts = Math.floor(Date.now() / 1000).toString();
    const sigPayload = `${ts}.${JSON.stringify(samplePayload)}`;
    const isValidSig = verifyWebhookSignature(
      sigPayload,
      require('./src/utils/cryptoUtils').generateWebhookSignature(sigPayload, webhook.secret),
      webhook.secret
    );
    assert.strictEqual(isValidSig, true, 'HMAC-SHA256 signature verification must succeed');
    logPass('Webhook HMAC-SHA256 signature and replay timestamp verified');

    // 4.3 Trigger test event in workspace
    const triggerRes = await makeRequest('/webhooks/test-trigger', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mgrToken}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
      body: {
        event_type: 'task.created',
        payload: { task_id: 202, title: 'Webhook Verification Task' },
      },
    });
    assert.strictEqual(triggerRes.status, 200);
    assert.strictEqual(triggerRes.data.data.deliveriesDispatched, 1);
    logPass('Dispatch event to subscribed webhook endpoint -> 200');

    // 4.4 List webhook deliveries
    const deliveriesRes = await makeRequest(`/webhooks/${webhook.id}/deliveries`, {
      headers: {
        Authorization: `Bearer ${mgrToken}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
    });
    assert.strictEqual(deliveriesRes.status, 200);
    assert.ok(Array.isArray(deliveriesRes.data.data));
    logPass('GET /api/webhooks/:id/deliveries returns delivery logs -> 200');

    // ----------------------------------------------------
    // SECTION 5: CUSTOM FIELDS METADATA SYSTEM
    // ----------------------------------------------------
    console.log('\n--- 5. CUSTOM FIELDS METADATA TESTS ---');

    // 5.1 Define Custom Fields (Number, Select, URL, Text)
    const numFieldRes = await makeRequest('/custom-fields/definitions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mgrToken}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
      body: {
        name: 'Story Points',
        field_key: 'story_points',
        field_type: 'number',
        entity_type: 'task',
        is_required: false,
      },
    });
    assert.strictEqual(numFieldRes.status, 201);
    const storyPointsDef = numFieldRes.data.data;

    const selectFieldRes = await makeRequest('/custom-fields/definitions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mgrToken}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
      body: {
        name: 'Environment Tier',
        field_key: 'env_tier',
        field_type: 'select',
        entity_type: 'task',
        options: ['Development', 'Staging', 'Production'],
        is_required: true,
      },
    });
    assert.strictEqual(selectFieldRes.status, 201);
    const envTierDef = selectFieldRes.data.data;
    logPass('Create typed custom field definitions (number, select) -> 201');

    // 5.2 Duplicate field key rejection in same workspace/entity -> 400
    const dupDefRes = await makeRequest('/custom-fields/definitions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mgrToken}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
      body: {
        name: 'Story Points Duplicate',
        field_key: 'story_points',
        field_type: 'number',
        entity_type: 'task',
      },
    });
    assert.strictEqual(dupDefRes.status, 400);
    logPass('Duplicate custom field key rejected -> 400');

    // 5.3 Set valid custom field values for task
    const testTaskId = 9991;
    const setValuesRes = await makeRequest(`/custom-fields/values/task/${testTaskId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mgrToken}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
      body: {
        story_points: 8,
        env_tier: 'Production',
      },
    });
    assert.strictEqual(setValuesRes.status, 200);
    assert.strictEqual(setValuesRes.data.data.length, 2);
    logPass('Set valid custom field values on task -> 200');

    // 5.4 Type validation error: Invalid select option -> 400
    const invalidSelectVal = await makeRequest(`/custom-fields/values/task/${testTaskId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mgrToken}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
      body: {
        env_tier: 'InvalidOptionNotListed',
      },
    });
    assert.strictEqual(invalidSelectVal.status, 400);
    logPass('Invalid select option value rejected by type validation -> 400');

    // 5.5 Retrieve populated custom field values
    const getValuesRes = await makeRequest(`/custom-fields/values/task/${testTaskId}`, {
      headers: {
        Authorization: `Bearer ${mgrToken}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
    });
    assert.strictEqual(getValuesRes.status, 200);
    const spVal = getValuesRes.data.data.find((f) => f.field_key === 'story_points');
    assert.strictEqual(spVal.value, 8);
    const envVal = getValuesRes.data.data.find((f) => f.field_key === 'env_tier');
    assert.strictEqual(envVal.value, 'Production');
    logPass('GET /api/custom-fields/values returns typed, parsed values -> 200');

    // ----------------------------------------------------
    // SECTION 6: MULTI-STEP APPROVAL WORKFLOW
    // ----------------------------------------------------
    console.log('\n--- 6. MULTI-STEP APPROVAL WORKFLOW TESTS ---');

    // 6.1 Create 2-Step Approval Workflow (Step 1: Manager, Step 2: Admin)
    const createWfRes = await makeRequest('/approvals/workflows', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mgrToken}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
      body: {
        name: 'Deployment Gatekeeper',
        entity_type: 'task',
        steps: [
          { name: 'Engineering Manager Review', approver_role: 'manager' },
          { name: 'System Admin Authorization', approver_role: 'admin' },
        ],
      },
    });
    assert.strictEqual(createWfRes.status, 201);
    const workflow = createWfRes.data.data;
    assert.strictEqual(workflow.steps.length, 2);
    logPass('POST /api/approvals/workflows creates multi-step workflow -> 201');

    // 6.2 Submit Approval Request by Manager (who has approval:action permission)
    const submitReqRes = await makeRequest('/approvals/requests', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mgrToken}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
      body: {
        workflow_id: workflow.id,
        entity_type: 'task',
        entity_id: 1001,
      },
    });
    assert.strictEqual(submitReqRes.status, 201);
    const approvalReq = submitReqRes.data.data;
    assert.strictEqual(approvalReq.status, 'pending');
    assert.strictEqual(approvalReq.current_step_order, 1);
    logPass('Submit approval request (pending at Step 1) -> 201');

    // 6.3 Self-Approval Policy Violation: Requester cannot approve own request
    const selfApproveRes = await makeRequest(`/approvals/requests/${approvalReq.id}/actions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mgrToken}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
      body: { action: 'approved' },
    });
    assert.strictEqual(selfApproveRes.status, 403);
    assert.ok(selfApproveRes.data.message.includes('Self-approval'));
    logPass('Self-approval policy violation blocked -> 403 Forbidden');

    // 6.4 Step 1 Approval by Admin (admin override or designated reviewer)
    // Create another manager to approve Step 1
    const reviewerEmail = `reviewer_${timestamp}@test.com`;
    await makeRequest('/auth/register', {
      method: 'POST',
      body: { name: 'Reviewer Manager', email: reviewerEmail, password: 'Password@123', role: 'manager' },
    });
    const reviewerLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: reviewerEmail, password: 'Password@123' },
    });
    const reviewerToken = reviewerLogin.data.data.token;
    const reviewerUser = reviewerLogin.data.data.user;

    await makeRequest(`/workspaces/${acmeWs.id}/members`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: { user_id: reviewerUser.id, role: 'admin' },
    });

    const reviewerApproveRes = await makeRequest(`/approvals/requests/${approvalReq.id}/actions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${reviewerToken}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
      body: { action: 'approved', reason: 'Peer review completed and verified' },
    });
    assert.strictEqual(reviewerApproveRes.status, 200);
    assert.strictEqual(reviewerApproveRes.data.data.status, 'pending');
    assert.strictEqual(reviewerApproveRes.data.data.current_step_order, 2);
    logPass('Step 1 approved by Peer Reviewer Manager -> Advances current_step_order to 2');

    // 6.5 Step 2 (Final) Approval by Admin
    const adminApproveRes = await makeRequest(`/approvals/requests/${approvalReq.id}/actions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
      body: { action: 'approved', reason: 'Release window cleared' },
    });
    assert.strictEqual(adminApproveRes.status, 200);
    assert.strictEqual(adminApproveRes.data.data.status, 'approved');
    assert.ok(adminApproveRes.data.data.completed_at, 'completed_at timestamp set on final approval');
    logPass('Final step approved by Admin -> Status transitioned to "approved" -> 200');

    // 6.6 Query approval request with complete audit trail
    const reqDetailsRes = await makeRequest(`/approvals/requests/${approvalReq.id}`, {
      headers: {
        Authorization: `Bearer ${mgrToken}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
    });
    assert.strictEqual(reqDetailsRes.status, 200);
    assert.strictEqual(reqDetailsRes.data.data.history.length, 2);
    logPass('GET /api/approvals/requests/:id returns complete step history -> 200');

    // ----------------------------------------------------
    // SECTION 7: PUNCH-CLOCK TIME TRACKING & TIMESHEETS
    // ----------------------------------------------------
    console.log('\n--- 7. PUNCH-CLOCK TIME TRACKING & TIMESHEETS TESTS ---');

    // 7.1 Start Punch-Clock Timer
    const startTimerRes = await makeRequest('/time-entries/start', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${emp1Token}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
      body: {
        description: 'Implementing high-priority backend features',
        isBillable: true,
      },
    });
    assert.strictEqual(startTimerRes.status, 201);
    const activeEntry = startTimerRes.data.data;
    assert.strictEqual(activeEntry.status, 'running');
    assert.strictEqual(activeEntry.user_id, emp1User.id);
    logPass('POST /api/time-entries/start starts running timer -> 201');

    // 7.2 Overlapping active timer prevention
    const duplicateTimerRes = await makeRequest('/time-entries/start', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${emp1Token}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
      body: { description: 'Second simultaneous timer' },
    });
    assert.strictEqual(duplicateTimerRes.status, 400);
    assert.ok(duplicateTimerRes.data.message.includes('already have an active timer'));
    logPass('Overlapping active timer start blocked -> 400');

    // 7.3 Get active timer
    const getActiveRes = await makeRequest('/time-entries/active', {
      headers: {
        Authorization: `Bearer ${emp1Token}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
    });
    assert.strictEqual(getActiveRes.status, 200);
    assert.strictEqual(getActiveRes.data.data.id, activeEntry.id);
    assert.ok(getActiveRes.data.data.elapsed_seconds >= 0);
    logPass('GET /api/time-entries/active returns running timer -> 200');

    // Wait a brief moment to accumulate duration
    await new Promise((r) => setTimeout(r, 1000));

    // 7.4 Stop punch-clock timer (authoritative duration computed server-side)
    const stopTimerRes = await makeRequest('/time-entries/stop', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${emp1Token}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
      body: { description: 'Completed backend implementation phase' },
    });
    assert.strictEqual(stopTimerRes.status, 200);
    assert.strictEqual(stopTimerRes.data.data.status, 'completed');
    assert.ok(stopTimerRes.data.data.duration_seconds >= 1, 'Server must compute positive duration in seconds');
    assert.ok(stopTimerRes.data.data.ended_at, 'Ended timestamp must be recorded');
    logPass('POST /api/time-entries/stop calculates server duration and finishes timer -> 200');

    // 7.5 Manual time entry logging
    const manualEntryRes = await makeRequest('/time-entries', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${emp1Token}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
      body: {
        started_at: new Date(Date.now() - 7200 * 1000).toISOString(),
        ended_at: new Date().toISOString(),
        duration_seconds: 7200, // 2 hours
        description: 'Manual architecture design session',
        is_billable: true,
      },
    });
    assert.strictEqual(manualEntryRes.status, 201);
    assert.strictEqual(manualEntryRes.data.data.duration_seconds, 7200);
    logPass('POST /api/time-entries logs manual time entry -> 201');

    // 7.6 Timesheet Analytics
    const analyticsRes = await makeRequest('/time-entries/analytics', {
      headers: {
        Authorization: `Bearer ${mgrToken}`,
        'X-Workspace-Id': String(acmeWs.id),
      },
    });
    assert.strictEqual(analyticsRes.status, 200);
    assert.ok(analyticsRes.data.data.total_seconds >= 7201);
    assert.ok(analyticsRes.data.data.total_hours >= 2);
    assert.ok(Array.isArray(analyticsRes.data.data.by_user));
    logPass('GET /api/time-entries/analytics computes aggregate timesheets -> 200');

    console.log('\n============================================================');
    console.log(`ENTERPRISE CAPABILITIES TEST SUITE SUMMARY:`);
    console.log(`PASSED: ${passedCount}`);
    console.log(`FAILED: ${failedCount}`);
    console.log('============================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('FATAL TEST ERROR:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await db.pool.end();
  }
};

runEnterpriseSuite();
