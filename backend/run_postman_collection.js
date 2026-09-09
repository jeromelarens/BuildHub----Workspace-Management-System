const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = require('./src/app');
const db = require('./src/config/database');
const { bootstrapAdmin } = require('./src/services/adminBootstrapService');
const { runAllMigrations } = require('./src/services/dbMigrationService');

function createExpect(val) {
  return {
    to: {
      eql: (expected) => {
        if (JSON.stringify(val) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(val)}`);
        }
      },
      equal: (expected) => {
        if (val !== expected) {
          throw new Error(`Expected ${expected} but got ${val}`);
        }
      },
      have: {
        property: (prop) => {
          if (!val || typeof val !== 'object' || !(prop in val)) {
            throw new Error(`Expected object to have property '${prop}'`);
          }
        }
      },
      not: {
        have: {
          property: (prop) => {
            if (val && typeof val === 'object' && prop in val) {
              throw new Error(`Expected object to not have property '${prop}'`);
            }
          }
        },
        include: (substr) => {
          if (typeof val === 'string' && val.includes(substr)) {
            throw new Error(`Expected '${val}' to not include '${substr}'`);
          }
          if (Array.isArray(val) && val.includes(substr)) {
            throw new Error(`Expected array to not include '${substr}'`);
          }
        }
      },
      include: (substr) => {
        if (typeof val === 'string' && !val.includes(substr)) {
          throw new Error(`Expected '${val}' to include '${substr}'`);
        }
        if (Array.isArray(val) && !val.includes(substr)) {
          throw new Error(`Expected array to include '${substr}'`);
        }
      },
      get true() {
        if (val !== true) throw new Error(`Expected true but got ${val}`);
      },
      get false() {
        if (val !== false) throw new Error(`Expected false but got ${val}`);
      },
      get null() {
        if (val !== null) throw new Error(`Expected null but got ${val}`);
      },
      get undefined() {
        if (val !== undefined) throw new Error(`Expected undefined but got ${val}`);
      },
      be: {
        get true() {
          if (val !== true) throw new Error(`Expected true but got ${val}`);
        },
        get false() {
          if (val !== false) throw new Error(`Expected false but got ${val}`);
        },
        get null() {
          if (val !== null) throw new Error(`Expected null but got ${val}`);
        },
        get undefined() {
          if (val !== undefined) throw new Error(`Expected undefined but got ${val}`);
        },
        a: (type) => {
          if (typeof val !== type) {
            throw new Error(`Expected ${val} to be a ${type}`);
          }
        },
        an: (type) => {
          if (type === 'array' && !Array.isArray(val)) {
            throw new Error(`Expected ${val} to be an array`);
          }
          if (type === 'object' && (typeof val !== 'object' || Array.isArray(val) || val === null)) {
            throw new Error(`Expected ${val} to be an object`);
          }
        },
        greaterThan: (n) => {
          if (typeof val !== 'number' || val <= n) {
            throw new Error(`Expected ${val} to be greater than ${n}`);
          }
        },
        above: (n) => {
          if (typeof val !== 'number' || val <= n) {
            throw new Error(`Expected ${val} to be above ${n}`);
          }
        }
      }
    }
  };
}

async function runPostmanCollection() {
  const collectionPath = path.join(__dirname, 'Task_Management_API.postman_collection.json');
  const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

  console.log(`\n======================================================`);
  console.log(`RUNNING POSTMAN COLLECTION: ${collection.info.name}`);
  console.log(`======================================================\n`);

  // Non-destructive migrations & admin bootstrap
  await runAllMigrations();
  await bootstrapAdmin();

  // Clean up postman-specific test users for a clean, deterministic run
  await db.query("DELETE FROM users WHERE email IN ('alice_postman@example.com', 'manager_postman@example.com', 'lead_postman@example.com', 'bob_postman@example.com', 'fakeadmin_postman@example.com')");

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@taskmanagement.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecret@2026!';

  const collectionVariables = {
    baseUrl: baseUrl,
    adminEmail: adminEmail,
    adminPassword: adminPassword,
    adminToken: '',
    adminId: '',
    managerToken: '',
    managerId: '',
    teamLeadToken: '',
    teamLeadId: '',
    employeeToken: '',
    employeeId: '',
    empBToken: '',
    empBId: '',
    projectId: '',
    taskId: '',
    taskPrereqId: '',
    taskToDeleteId: '',
    commentId: '',
    commentToDeleteId: '',
    dependencyId: '',
    recurrenceId: '',
    notificationId: '',
    attachmentId: '',
    customRoleId: '',
  };

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;

  function interpolate(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, p1) => {
      return collectionVariables[p1] !== undefined ? collectionVariables[p1] : match;
    });
  }

  // Extract all request items recursively
  const allItems = [];
  function extractItems(items, folderName = '') {
    for (const item of items) {
      if (item.item && Array.isArray(item.item)) {
        extractItems(item.item, folderName ? `${folderName} -> ${item.name}` : item.name);
      } else if (item.request) {
        allItems.push({ item, folderName });
      }
    }
  }
  extractItems(collection.item);

  console.log(`Found ${allItems.length} requests in collection.\n`);

  try {
    for (const { item, folderName } of allItems) {
      const req = item.request;
      const method = req.method;
      let url = interpolate(req.url.raw || req.url);

      const headers = {};
      if (req.header && Array.isArray(req.header)) {
        for (const h of req.header) {
          headers[h.key] = interpolate(h.value);
        }
      }

      // Handle bearer auth if defined on request
      if (req.auth && req.auth.type === 'bearer' && req.auth.bearer) {
        const tokenVal = req.auth.bearer.find(b => b.key === 'token')?.value;
        const resolvedToken = interpolate(tokenVal);
        if (resolvedToken) {
          headers['Authorization'] = `Bearer ${resolvedToken}`;
        }
      }

      let body = undefined;
      if (req.body) {
        if (req.body.mode === 'formdata' && Array.isArray(req.body.formdata)) {
          const boundary = '----WebKitFormBoundaryPostman' + Math.random().toString(36).substring(2);
          headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
          const parts = [];

          for (const field of req.body.formdata) {
            if (field.type === 'file') {
              const filename = field.src || 'task-attachment-test.txt';
              const isTxt = filename.endsWith('.txt');
              const fileContent = isTxt
                ? Buffer.from('Task attachment test plain text content for Postman automated testing.')
                : Buffer.from('%PDF-1.4\nPDF specification document content for Postman automated testing.');
              const partContentType = isTxt ? 'application/octet-stream' : 'application/pdf';
              parts.push(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="${field.key}"; filename="${filename}"\r\n` +
                `Content-Type: ${partContentType}\r\n\r\n`
              );
              parts.push(fileContent);
              parts.push('\r\n');
            } else {
              const val = interpolate(field.value);
              parts.push(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="${field.key}"\r\n\r\n` +
                `${val}\r\n`
              );
            }
          }
          parts.push(`--${boundary}--\r\n`);

          const buffers = parts.map(p => typeof p === 'string' ? Buffer.from(p) : p);
          body = Buffer.concat(buffers);
        } else if (req.body.raw && method !== 'GET' && method !== 'HEAD') {
          body = interpolate(req.body.raw);
        }
      }

      const res = await fetch(url, {
        method,
        headers,
        body,
      });

      const resStatus = res.status;
      const resText = await res.text();
      let resJson = null;
      try {
        resJson = JSON.parse(resText);
      } catch (e) {
        resJson = null;
      }

      console.log(`[REQUEST] ${folderName} -> ${item.name} (${method} ${url}) -> Status: ${resStatus}`);

      // Evaluate tests if any
      const testEvents = (item.event || []).filter(e => e.listen === 'test');
      for (const evt of testEvents) {
        if (evt.script && evt.script.exec) {
          const scriptText = evt.script.exec.join('\n');

          // Custom sandbox for pm
          const pm = {
            response: {
              code: resStatus,
              status: res.statusText,
              to: {
                have: {
                  status: (expectedStatus) => {
                    if (resStatus !== expectedStatus) {
                      throw new Error(`Expected status ${expectedStatus} but got ${resStatus}`);
                    }
                  }
                }
              },
              json: () => resJson,
              text: () => resText,
            },
            expect: createExpect,
            collectionVariables: {
              set: (key, val) => {
                collectionVariables[key] = String(val);
              },
              get: (key) => collectionVariables[key],
            },
            environment: {
              set: (key, val) => {
                collectionVariables[key] = String(val);
              },
              get: (key) => collectionVariables[key],
            },
            test: (testName, testFn) => {
              totalTests++;
              try {
                testFn();
                console.log(`   ✓ [PASS] ${testName}`);
                passedTests++;
              } catch (err) {
                console.error(`   ✗ [FAIL] ${testName}: ${err.message}`);
                failedTests++;
              }
            }
          };

          try {
            const runScript = new Function('pm', scriptText);
            runScript(pm);
          } catch (scriptErr) {
            console.error(`   ✗ [ERROR executing test script in ${item.name}]:`, scriptErr.message);
            failedTests++;
          }
        }
      }
    }

    console.log(`\n======================================================`);
    console.log(`POSTMAN RUNNER RESULTS:`);
    console.log(`Total tests:  ${totalTests}`);
    console.log(`Passed:       ${passedTests}`);
    console.log(`Failed:       ${failedTests}`);
    console.log(`Skipped:      ${skippedTests}`);
    console.log(`======================================================\n`);

    if (failedTests > 0) {
      process.exitCode = 1;
    }

  } finally {
    try {
      await db.query("DELETE FROM users WHERE email IN ('alice_postman@example.com', 'manager_postman@example.com', 'lead_postman@example.com', 'bob_postman@example.com', 'fakeadmin_postman@example.com')");
    } catch (e) {}
    server.close();
    await db.pool.end();
  }
}

runPostmanCollection().catch(err => {
  console.error('Fatal postman runner error:', err);
  process.exit(1);
});
