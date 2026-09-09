const http = require('http');
const app = require('./src/app');
const db = require('./src/config/database');

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

async function runTests() {
  console.log('Starting test server on random port...');
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
      console.error(`[FAIL] ${name} - Details:`, details);
      failed++;
    }
  }

  const timestamp = Date.now();
  const userAEmail = `user_a_${timestamp}@example.com`;
  const userBEmail = `user_b_${timestamp}@example.com`;
  let userAToken = '';
  let userBToken = '';
  let userATaskId = null;

  try {
    // ==========================================
    // 1. REGISTER VALIDATION MATRIX
    // ==========================================
    console.log('\n--- 1. REGISTER VALIDATION MATRIX ---');

    // Valid registration
    {
      const res = await request('POST', '/api/auth/register', {
        body: { name: 'User A', email: userAEmail, password: 'password123' },
      });
      assert('Valid registration -> 201', res.status === 201 && res.body.success === true && res.body.data.id);
    }

    // Register User B
    {
      const res = await request('POST', '/api/auth/register', {
        body: { name: 'User B', email: userBEmail, password: 'password123' },
      });
      assert('Valid registration User B -> 201', res.status === 201 && res.body.success === true);
    }

    // Duplicate email -> 409
    {
      const res = await request('POST', '/api/auth/register', {
        body: { name: 'User A Duplicate', email: userAEmail, password: 'password123' },
      });
      assert('Duplicate email -> 409 Conflict', res.status === 409 && res.body.success === false);
    }

    // Missing name -> 400
    {
      const res = await request('POST', '/api/auth/register', {
        body: { email: `missing_name_${timestamp}@example.com`, password: 'password123' },
      });
      assert('Missing name -> 400', res.status === 400 && res.body.errors.name);
    }

    // Missing email -> 400
    {
      const res = await request('POST', '/api/auth/register', {
        body: { name: 'No Email', password: 'password123' },
      });
      assert('Missing email -> 400', res.status === 400 && res.body.errors.email);
    }

    // Missing password -> 400
    {
      const res = await request('POST', '/api/auth/register', {
        body: { name: 'No Pass', email: `nopass_${timestamp}@example.com` },
      });
      assert('Missing password -> 400', res.status === 400 && res.body.errors.password);
    }

    // Empty name -> 400
    {
      const res = await request('POST', '/api/auth/register', {
        body: { name: '', email: `emptyname_${timestamp}@example.com`, password: 'password123' },
      });
      assert('Empty name -> 400', res.status === 400 && res.body.errors.name);
    }

    // Whitespace-only name -> 400
    {
      const res = await request('POST', '/api/auth/register', {
        body: { name: '    ', email: `spacename_${timestamp}@example.com`, password: 'password123' },
      });
      assert('Whitespace-only name -> 400', res.status === 400 && res.body.errors.name);
    }

    // Invalid email formats -> 400
    const invalidEmails = ['abc', 'abc@', '@google.com', 'john@', 'john@.', 'john@gmail', 'john gmail@gmail.com', 'john@@gmail.com'];
    for (const badEmail of invalidEmails) {
      const res = await request('POST', '/api/auth/register', {
        body: { name: 'Bad Email', email: badEmail, password: 'password123' },
      });
      assert(`Invalid email '${badEmail}' -> 400`, res.status === 400 && res.body.errors.email);
    }

    // Password shorter than 6 -> 400
    {
      const res = await request('POST', '/api/auth/register', {
        body: { name: 'Short Pass', email: `short_${timestamp}@example.com`, password: '12345' },
      });
      assert('Password shorter than 6 -> 400', res.status === 400 && res.body.errors.password);
    }

    // Password wrong type (number) -> 400
    {
      const res = await request('POST', '/api/auth/register', {
        body: { name: 'Num Pass', email: `numpass_${timestamp}@example.com`, password: 123456 },
      });
      assert('Password number type -> 400', res.status === 400 && res.body.errors.password);
    }

    // Name wrong type (number) -> 400
    {
      const res = await request('POST', '/api/auth/register', {
        body: { name: 12345, email: `numname_${timestamp}@example.com`, password: 'password123' },
      });
      assert('Name number type -> 400', res.status === 400 && res.body.errors.name);
    }

    // Unknown field (mass assignment attempt) -> 400
    {
      const res = await request('POST', '/api/auth/register', {
        body: { name: 'Hacker', email: `hacker_${timestamp}@example.com`, password: 'password123', role: 'admin', user_id: 1 },
      });
      assert('Unknown fields rejected -> 400', res.status === 400 && res.body.errors.role);
    }

    // Body is array -> 400
    {
      const res = await request('POST', '/api/auth/register', {
        body: [{ name: 'Array Body' }],
      });
      assert('Body is array -> 400', res.status === 400 && res.body.errors.body);
    }

    // Body is null -> 400
    {
      const res = await request('POST', '/api/auth/register', {
        body: 'null',
        headers: { 'Content-Type': 'application/json' },
      });
      assert('Body is null -> 400', res.status === 400);
    }

    // ==========================================
    // 2. LOGIN VALIDATION MATRIX
    // ==========================================
    console.log('\n--- 2. LOGIN VALIDATION MATRIX ---');

    // Valid login User A -> 200
    {
      const res = await request('POST', '/api/auth/login', {
        body: { email: userAEmail, password: 'password123' },
      });
      assert('Valid login User A -> 200', res.status === 200 && res.body.data.token);
      userAToken = res.body.data.token;
    }

    // Valid login User B -> 200
    {
      const res = await request('POST', '/api/auth/login', {
        body: { email: userBEmail, password: 'password123' },
      });
      assert('Valid login User B -> 200', res.status === 200 && res.body.data.token);
      userBToken = res.body.data.token;
    }

    // Missing email -> 400
    {
      const res = await request('POST', '/api/auth/login', {
        body: { password: 'password123' },
      });
      assert('Login missing email -> 400', res.status === 400 && res.body.errors.email);
    }

    // Missing password -> 400
    {
      const res = await request('POST', '/api/auth/login', {
        body: { email: userAEmail },
      });
      assert('Login missing password -> 400', res.status === 400 && res.body.errors.password);
    }

    // Invalid email format -> 400
    {
      const res = await request('POST', '/api/auth/login', {
        body: { email: 'notanemail', password: 'password123' },
      });
      assert('Login invalid email format -> 400', res.status === 400 && res.body.errors.email);
    }

    // Empty password -> 400
    {
      const res = await request('POST', '/api/auth/login', {
        body: { email: userAEmail, password: '' },
      });
      assert('Login empty password -> 400', res.status === 400 && res.body.errors.password);
    }

    // Password wrong type -> 400
    {
      const res = await request('POST', '/api/auth/login', {
        body: { email: userAEmail, password: 123456 },
      });
      assert('Login password wrong type -> 400', res.status === 400 && res.body.errors.password);
    }

    // Unknown field in login -> 400
    {
      const res = await request('POST', '/api/auth/login', {
        body: { email: userAEmail, password: 'password123', role: 'admin' },
      });
      assert('Login unknown field -> 400', res.status === 400 && res.body.errors.role);
    }

    // Invalid credentials (wrong password) -> 401
    {
      const res = await request('POST', '/api/auth/login', {
        body: { email: userAEmail, password: 'wrongpassword' },
      });
      assert('Login wrong password -> 401', res.status === 401 && res.body.message === 'Invalid email or password');
    }

    // Invalid credentials (non-existent email) -> 401
    {
      const res = await request('POST', '/api/auth/login', {
        body: { email: 'nonexistent@example.com', password: 'password123' },
      });
      assert('Login nonexistent email -> 401', res.status === 401 && res.body.message === 'Invalid email or password');
    }

    // ==========================================
    // 3. CREATE TASK VALIDATION MATRIX
    // ==========================================
    console.log('\n--- 3. CREATE TASK VALIDATION MATRIX ---');

    // Valid task creation -> 201
    {
      const res = await request('POST', '/api/tasks', {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: {
          title: 'Master Node.js Validation',
          description: 'Strict production validation implementation',
          status: 'pending',
        },
      });
      assert('Valid task creation -> 201', res.status === 201 && res.body.success === true && res.body.data.id);
      userATaskId = res.body.data.id;
    }

    // Missing title -> 400
    {
      const res = await request('POST', '/api/tasks', {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: { description: 'No title' },
      });
      assert('Create task missing title -> 400', res.status === 400 && res.body.errors.title);
    }

    // Empty title -> 400
    {
      const res = await request('POST', '/api/tasks', {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: { title: '' },
      });
      assert('Create task empty title -> 400', res.status === 400 && res.body.errors.title);
    }

    // Whitespace-only title -> 400
    {
      const res = await request('POST', '/api/tasks', {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: { title: '      ' },
      });
      assert('Create task whitespace title -> 400', res.status === 400 && res.body.errors.title);
    }

    // Title wrong type -> 400
    {
      const res = await request('POST', '/api/tasks', {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: { title: 12345 },
      });
      assert('Create task title number type -> 400', res.status === 400 && res.body.errors.title);
    }

    // Title > 200 chars -> 400
    {
      const res = await request('POST', '/api/tasks', {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: { title: 'a'.repeat(201) },
      });
      assert('Create task title > 200 chars -> 400', res.status === 400 && res.body.errors.title);
    }

    // Invalid status -> 400
    {
      const res = await request('POST', '/api/tasks', {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: { title: 'Invalid Status Task', status: 'done' },
      });
      assert('Create task invalid status -> 400', res.status === 400 && res.body.errors.status);
    }

    // Status wrong type -> 400
    {
      const res = await request('POST', '/api/tasks', {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: { title: 'Num Status Task', status: 123 },
      });
      assert('Create task status number type -> 400', res.status === 400 && res.body.errors.status);
    }

    // Description wrong type -> 400
    {
      const res = await request('POST', '/api/tasks', {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: { title: 'Bad Desc Task', description: { text: 'object desc' } },
      });
      assert('Create task description object type -> 400', res.status === 400 && res.body.errors.description);
    }

    // Unknown field / user_id injection attempt -> 400
    {
      const res = await request('POST', '/api/tasks', {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: { title: 'Injected User Task', user_id: 999 },
      });
      assert('Create task client user_id rejected -> 400', res.status === 400 && res.body.errors.user_id);
    }

    // No JWT -> 401
    {
      const res = await request('POST', '/api/tasks', {
        body: { title: 'Unauth Task' },
      });
      assert('Create task no JWT -> 401', res.status === 401);
    }

    // ==========================================
    // 4. GET TASKS VALIDATION & OWNERSHIP
    // ==========================================
    console.log('\n--- 4. GET TASKS VALIDATION & OWNERSHIP ---');

    // Valid get all tasks User A -> 200
    {
      const res = await request('GET', '/api/tasks', {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert('Get tasks User A -> 200', res.status === 200 && Array.isArray(res.body.data) && res.body.data.length >= 1);
    }

    // Valid filter by status -> 200
    {
      const res = await request('GET', '/api/tasks?status=pending', {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert('Get tasks status=pending -> 200', res.status === 200 && Array.isArray(res.body.data));
    }

    // Invalid status filter -> 400
    {
      const res = await request('GET', '/api/tasks?status=done', {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert('Get tasks status=done -> 400', res.status === 400 && res.body.errors.status);
    }

    // Unexpected query parameter -> 400
    {
      const res = await request('GET', '/api/tasks?admin=true', {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert('Get tasks unexpected query param -> 400', res.status === 400 && res.body.errors.admin);
    }

    // Get task by ID - User A (owner) -> 200
    {
      const res = await request('GET', `/api/tasks/${userATaskId}`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert('Get task by ID owner -> 200', res.status === 200 && res.body.data.id === userATaskId);
    }

    // Get task by ID - User B (not owner) -> 403
    {
      const res = await request('GET', `/api/tasks/${userATaskId}`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      assert("Get task by ID User B (non-owner) -> 403 Forbidden", res.status === 403);
    }

    // Get non-existent task -> 404
    {
      const res = await request('GET', '/api/tasks/999999', {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert('Get non-existent task -> 404', res.status === 404);
    }

    // Invalid task IDs (0, -1, 1.5, abc, 1abc) -> 400
    const invalidIds = ['0', '-1', '1.5', 'abc', '1abc', 'undefined'];
    for (const badId of invalidIds) {
      const res = await request('GET', `/api/tasks/${badId}`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert(`Get task invalid ID '${badId}' -> 400`, res.status === 400);
    }

    // ==========================================
    // 5. UPDATE TASK VALIDATION MATRIX
    // ==========================================
    console.log('\n--- 5. UPDATE TASK VALIDATION MATRIX ---');

    // Valid title update -> 200
    {
      const res = await request('PUT', `/api/tasks/${userATaskId}`, {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: { title: 'Updated Title' },
      });
      assert('Update task title -> 200', res.status === 200 && res.body.data.title === 'Updated Title');
    }

    // Valid description update -> 200
    {
      const res = await request('PUT', `/api/tasks/${userATaskId}`, {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: { description: 'Updated Description' },
      });
      assert('Update task description -> 200', res.status === 200 && res.body.data.description === 'Updated Description');
    }

    // Valid status update -> 200
    {
      const res = await request('PUT', `/api/tasks/${userATaskId}`, {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: { status: 'in_progress' },
      });
      assert('Update task status -> 200', res.status === 200 && res.body.data.status === 'in_progress');
    }

    // Clear description with null -> 200
    {
      const res = await request('PUT', `/api/tasks/${userATaskId}`, {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: { description: null },
      });
      assert('Clear description with null -> 200', res.status === 200 && res.body.data.description === null);
    }

    // Empty body -> 400
    {
      const res = await request('PUT', `/api/tasks/${userATaskId}`, {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: {},
      });
      assert('Update task empty body -> 400', res.status === 400 && res.body.errors.body);
    }

    // Unknown field / attempt to modify user_id -> 400
    {
      const res = await request('PUT', `/api/tasks/${userATaskId}`, {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: { title: 'Hack', user_id: 99 },
      });
      assert('Update task modify user_id rejected -> 400', res.status === 400 && res.body.errors.user_id);
    }

    // Attempt to modify id -> 400
    {
      const res = await request('PUT', `/api/tasks/${userATaskId}`, {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: { id: 99 },
      });
      assert('Update task modify id rejected -> 400', res.status === 400 && res.body.errors.id);
    }

    // Invalid status -> 400
    {
      const res = await request('PUT', `/api/tasks/${userATaskId}`, {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: { status: 'complete' },
      });
      assert('Update task invalid status -> 400', res.status === 400 && res.body.errors.status);
    }

    // User B updating User A's task -> 403
    {
      const res = await request('PUT', `/api/tasks/${userATaskId}`, {
        headers: { Authorization: `Bearer ${userBToken}` },
        body: { title: 'Unauthorized update' },
      });
      assert("Update task User B (non-owner) -> 403 Forbidden", res.status === 403);
    }

    // Update non-existent task -> 404
    {
      const res = await request('PUT', '/api/tasks/999999', {
        headers: { Authorization: `Bearer ${userAToken}` },
        body: { title: 'Non-existent task update' },
      });
      assert('Update non-existent task -> 404', res.status === 404);
    }

    // ==========================================
    // 6. DELETE TASK VALIDATION MATRIX
    // ==========================================
    console.log('\n--- 6. DELETE TASK VALIDATION MATRIX ---');

    // User B deleting User A's task -> 403
    {
      const res = await request('DELETE', `/api/tasks/${userATaskId}`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      assert("Delete task User B (non-owner) -> 403 Forbidden", res.status === 403);
    }

    // Delete non-existent task -> 404
    {
      const res = await request('DELETE', '/api/tasks/999999', {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert('Delete non-existent task -> 404', res.status === 404);
    }

    // Delete with invalid task ID -> 400
    {
      const res = await request('DELETE', '/api/tasks/invalid_id', {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert('Delete task invalid ID -> 400', res.status === 400);
    }

    // User A deletes own task -> 200
    {
      const res = await request('DELETE', `/api/tasks/${userATaskId}`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert('Delete own task User A -> 200', res.status === 200 && res.body.success === true);
    }

    // Task should no longer exist -> 404
    {
      const res = await request('GET', `/api/tasks/${userATaskId}`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert('Get deleted task -> 404', res.status === 404);
    }

    console.log('\n=========================================');
    console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('=========================================');

  } finally {
    server.close();
    await db.pool.end();
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  if (server) server.close();
  process.exit(1);
});
