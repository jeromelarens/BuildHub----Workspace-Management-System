const bcrypt = require('bcrypt');
const app = require('./src/app');
const db = require('./src/config/database');
const { bootstrapAdmin, validateAdminConfig } = require('./src/services/adminBootstrapService');

let server;
let baseUrl;

const request = async (method, path, options = {}) => {
  const url = `${baseUrl}${path}`;
  const headers = { ...options.headers };
  let body = options.body;

  if (body !== undefined && typeof body === 'object' && !headers['Content-Type']) {
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

async function runAdminBootstrapTests() {
  console.log('\n============================================================');
  console.log('STARTING FINAL ROLE ARCHITECTURE & ADMIN BOOTSTRAP SUITE');
  console.log('============================================================\n');

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

  const testAdminEmail = `bootstrap_admin_${Date.now()}@taskmanagement.com`;
  const testAdminPassword = 'StrongAdminPass@2026!';
  let secondAdminEmail = `second_admin_${Date.now()}@example.com`;
  let regEmpRes, regMgrRes, regOmitRes;

  try {
    // -------------------------------------------------------------
    // 1. CONFIG VALIDATION TESTS
    // -------------------------------------------------------------
    console.log('\n--- 1. CONFIG VALIDATION UNIT TESTS ---');

    let threw = false;
    try {
      validateAdminConfig('', 'password123');
    } catch (e) {
      threw = true;
    }
    assert('Missing ADMIN_EMAIL throws configuration error', threw);

    threw = false;
    try {
      validateAdminConfig('admin@test.com', '');
    } catch (e) {
      threw = true;
    }
    assert('Missing ADMIN_PASSWORD throws configuration error', threw);

    threw = false;
    try {
      validateAdminConfig('invalid-email-format', 'password123');
    } catch (e) {
      threw = true;
    }
    assert('Invalid ADMIN_EMAIL format throws configuration error', threw);

    threw = false;
    try {
      validateAdminConfig('admin@test.com', 'short1');
    } catch (e) {
      threw = true;
    }
    assert('Short ADMIN_PASSWORD (< 8 chars) throws configuration error', threw);

    // -------------------------------------------------------------
    // 2. ADMIN BOOTSTRAP CREATION & IDEMPOTENCY
    // -------------------------------------------------------------
    console.log('\n--- 2. ADMIN BOOTSTRAP & IDEMPOTENCY TESTS ---');

    process.env.ADMIN_EMAIL = testAdminEmail;
    process.env.ADMIN_PASSWORD = testAdminPassword;

    const firstRun = await bootstrapAdmin();
    assert('First bootstrap run creates Admin account', firstRun.created === true && firstRun.email === testAdminEmail.toLowerCase());

    const dbAdminRes = await db.query('SELECT id, name, email, password, role FROM users WHERE email = $1', [testAdminEmail.toLowerCase()]);
    assert('Admin exists in PostgreSQL with role = "admin"', dbAdminRes.rows.length === 1 && dbAdminRes.rows[0].role === 'admin');
    const adminUserId = dbAdminRes.rows[0].id;
    const initialHash = dbAdminRes.rows[0].password;
    assert('Password is stored as bcrypt hash', initialHash.startsWith('$2b$') || initialHash.startsWith('$2a$'));

    const secondRun = await bootstrapAdmin();
    assert('Second bootstrap run verifies existing Admin without recreation', secondRun.created === false && secondRun.verified === true);

    const dbCountRes = await db.query('SELECT COUNT(*) FROM users WHERE email = $1', [testAdminEmail.toLowerCase()]);
    assert('Exactly one database record exists for ADMIN_EMAIL (count = 1)', parseInt(dbCountRes.rows[0].count, 10) === 1);

    const dbAdminCheck = await db.query('SELECT password FROM users WHERE email = $1', [testAdminEmail.toLowerCase()]);
    assert('Existing Admin password hash was preserved across restarts', dbAdminCheck.rows[0].password === initialHash);

    // -------------------------------------------------------------
    // 3. PUBLIC REGISTRATION ROLE CREATION RULES
    // -------------------------------------------------------------
    console.log('\n--- 3. PUBLIC REGISTRATION ROLE CREATION TESTS ---');

    // Register Employee explicitly
    regEmpRes = await request('POST', '/api/auth/register', {
      body: { name: 'Emp User', email: `emp_${Date.now()}@example.com`, password: 'Password@123', role: 'employee' },
    });
    assert('Public registration with role=employee succeeds -> 201', regEmpRes.status === 201 && regEmpRes.body.data.role === 'employee');
    const empUserId = regEmpRes.body.data.id;

    // Register Manager explicitly
    regMgrRes = await request('POST', '/api/auth/register', {
      body: { name: 'Manager User', email: `mgr_${Date.now()}@example.com`, password: 'Password@123', role: 'manager' },
    });
    assert('Public registration with role=manager succeeds -> 201', regMgrRes.status === 201 && regMgrRes.body.data.role === 'manager');
    const mgrUserId = regMgrRes.body.data.id;

    // Register with omitted role (backward compatibility defaults to employee)
    regOmitRes = await request('POST', '/api/auth/register', {
      body: { name: 'Omit User', email: `omit_${Date.now()}@example.com`, password: 'Password@123' },
    });
    assert('Public registration with omitted role defaults to employee -> 201', regOmitRes.status === 201 && regOmitRes.body.data.role === 'employee');

    // Attempt Admin registration -> MUST be rejected with 400
    const regAdminInject = await request('POST', '/api/auth/register', {
      body: { name: 'Fake Admin', email: `fakeadmin_${Date.now()}@example.com`, password: 'Password@123', role: 'admin' },
    });
    assert('Public registration with role=admin is rejected -> 400 Bad Request', regAdminInject.status === 400);

    // Attempt invalid role values -> rejected with 400
    const regInvalidRole = await request('POST', '/api/auth/register', {
      body: { name: 'Bad Role', email: `badrole_${Date.now()}@example.com`, password: 'Password@123', role: 'superadmin' },
    });
    assert('Public registration with invalid role is rejected -> 400 Bad Request', regInvalidRole.status === 400);

    // -------------------------------------------------------------
    // 4. ADMIN ROLE MANAGEMENT (EMPLOYEE <-> MANAGER)
    // -------------------------------------------------------------
    console.log('\n--- 4. ADMIN ROLE MANAGEMENT TESTS ---');

    // Login Admin
    const adminLogin = await request('POST', '/api/auth/login', {
      body: { email: testAdminEmail, password: testAdminPassword },
    });
    const adminToken = adminLogin.body.data.token;

    // Admin promotes Employee to Manager
    const promoteRes = await request('PUT', `/api/users/${empUserId}/role`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { role: 'manager' },
    });
    assert('Admin can promote employee to manager -> 200 OK', promoteRes.status === 200 && promoteRes.body.data.role === 'manager');

    // Live DB verification: user now has role = 'manager'
    const empDbCheck1 = await db.query('SELECT role FROM users WHERE id = $1', [empUserId]);
    assert('Database role updated to manager in PostgreSQL', empDbCheck1.rows[0].role === 'manager');

    // Admin demotes Manager to Employee
    const demoteRes = await request('PUT', `/api/users/${empUserId}/role`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { role: 'employee' },
    });
    assert('Admin can demote manager to employee -> 200 OK', demoteRes.status === 200 && demoteRes.body.data.role === 'employee');

    const empDbCheck2 = await db.query('SELECT role FROM users WHERE id = $1', [empUserId]);
    assert('Database role updated back to employee in PostgreSQL', empDbCheck2.rows[0].role === 'employee');

    // -------------------------------------------------------------
    // 5. ROLE CHANGE NEGATIVE & PROTECTION TESTS
    // -------------------------------------------------------------
    console.log('\n--- 5. ROLE CHANGE NEGATIVE & PROTECTION TESTS ---');

    // Admin attempts to promote user to 'admin' -> 400 Bad Request
    const promoteToAdminRes = await request('PUT', `/api/users/${empUserId}/role`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { role: 'admin' },
    });
    assert('Admin cannot set target role to admin -> 400 Bad Request', promoteToAdminRes.status === 400);

    // Admin attempts to change their own role -> 403 Forbidden
    const selfRoleChangeRes = await request('PUT', `/api/users/${adminUserId}/role`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { role: 'manager' },
    });
    assert('Admin cannot change own role (self-role protection) -> 403 Forbidden', selfRoleChangeRes.status === 403);

    // Create a second admin in DB for testing admin-to-admin target protection
    const secondAdminInsert = await db.query("INSERT INTO users (name, email, password, role) VALUES ('Admin Two', $1, 'hashedpass', 'admin') RETURNING id", [secondAdminEmail]);
    const secondAdminId = secondAdminInsert.rows[0].id;

    // Admin attempts to change another Admin's role -> 403 Forbidden
    const changeOtherAdminRes = await request('PUT', `/api/users/${secondAdminId}/role`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { role: 'employee' },
    });
    assert('Admin cannot modify another Admin user role -> 403 Forbidden', changeOtherAdminRes.status === 403);

    // Manager login
    const mgrLogin = await request('POST', '/api/auth/login', {
      body: { email: regMgrRes.body.data.email, password: 'Password@123' },
    });
    const mgrToken = mgrLogin.body.data.token;

    // Manager attempts to change user role -> 403 Forbidden
    const mgrRoleChangeRes = await request('PUT', `/api/users/${empUserId}/role`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: { role: 'manager' },
    });
    assert('Manager cannot modify user roles -> 403 Forbidden', mgrRoleChangeRes.status === 403);

    // Employee login
    const empLogin = await request('POST', '/api/auth/login', {
      body: { email: regEmpRes.body.data.email, password: 'Password@123' },
    });
    const empToken = empLogin.body.data.token;

    // Employee attempts to change user role -> 403 Forbidden
    const empRoleChangeRes = await request('PUT', `/api/users/${mgrUserId}/role`, {
      headers: { Authorization: `Bearer ${empToken}` },
      body: { role: 'employee' },
    });
    assert('Employee cannot modify user roles -> 403 Forbidden', empRoleChangeRes.status === 403);

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n============================================================');
    console.log(`FINAL ROLE ARCHITECTURE SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================\n');

  } catch (error) {
    console.error('Fatal test runner error:', error);
  } finally {
    try {
      const emailsToClean = [
        testAdminEmail,
        secondAdminEmail,
        regEmpRes?.body?.data?.email,
        regMgrRes?.body?.data?.email,
        regOmitRes?.body?.data?.email,
      ].filter(Boolean);
      for (const email of emailsToClean) {
        await db.query("DELETE FROM users WHERE email = $1", [email]);
      }
    } catch (e) {}
    server.close();
    await db.pool.end();
  }
}

runAdminBootstrapTests();
