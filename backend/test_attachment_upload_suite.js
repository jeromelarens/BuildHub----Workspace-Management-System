const http = require('http');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

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
    const boundary = '----WebKitFormBoundaryTest' + Math.random().toString(36).substring(2);
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
      } else if (value !== undefined) {
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

async function runAttachmentUploadSuite() {
  console.log('\n============================================================');
  console.log('ATTACHMENT UPLOAD & MIME VALIDATION COMPREHENSIVE TEST SUITE');
  console.log('============================================================\n');

  await runAllMigrations();
  await bootstrapAdmin();

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  console.log(`Test server active at: ${baseUrl}\n`);

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

  try {
    // 0. Setup Users & Roles
    const adminLoginRes = await request('POST', '/api/auth/login', {
      body: { email: adminEmail, password: adminPassword },
    });
    const adminToken = adminLoginRes.body.data.token;
    const adminId = adminLoginRes.body.data.user.id;

    // Register Manager
    const mgrEmail = `mgr_att_${timestamp}@example.com`;
    const mgrReg = await request('POST', '/api/auth/register', {
      body: { name: 'Manager Att', email: mgrEmail, password: 'Password@123', role: 'manager' },
    });
    const mgrId = mgrReg.body.data?.id;
    const mgrLogin = await request('POST', '/api/auth/login', {
      body: { email: mgrEmail, password: 'Password@123' },
    });
    const mgrToken = mgrLogin.body.data?.token;

    // Register Employee A
    const empAEmail = `empa_att_${timestamp}@example.com`;
    const empAReg = await request('POST', '/api/auth/register', {
      body: { name: 'Employee A', email: empAEmail, password: 'Password@123', role: 'employee' },
    });
    const empAId = empAReg.body.data?.id;
    const empALogin = await request('POST', '/api/auth/login', {
      body: { email: empAEmail, password: 'Password@123' },
    });
    const empAToken = empALogin.body.data?.token;

    // Register Employee B (not in project)
    const empBEmail = `empb_att_${timestamp}@example.com`;
    const empBReg = await request('POST', '/api/auth/register', {
      body: { name: 'Employee B', email: empBEmail, password: 'Password@123', role: 'employee' },
    });
    const empBId = empBReg.body.data?.id;
    const empBLogin = await request('POST', '/api/auth/login', {
      body: { email: empBEmail, password: 'Password@123' },
    });
    const empBToken = empBLogin.body.data?.token;

    // Create Project
    const projectRes = await request('POST', '/api/projects', {
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: { name: `Attachment Test Project ${timestamp}`, description: 'Testing file uploads' },
    });
    const projectId = projectRes.body.data.id;

    // Add Employee A to Project
    await request('POST', `/api/projects/${projectId}/members`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: { user_id: empAId, role: 'member' },
    });

    // Create Task
    const taskRes = await request('POST', '/api/tasks', {
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: {
        title: `Upload Test Task ${timestamp}`,
        project_id: projectId,
        assigned_to: empAId,
      },
    });
    const taskId = taskRes.body.data.id;

    console.log('--- EXHAUSTIVE 24-CASE ATTACHMENT VALIDATION TESTS ---\n');

    // 1. TXT with text/plain -> 201 Created
    const txt1Res = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: Buffer.from('Plain text content with explicit text/plain MIME.'),
          filename: 'notes.txt',
          contentType: 'text/plain',
        },
      },
    });
    assert('1. TXT with text/plain -> 201 Created', txt1Res.status === 201 && txt1Res.body.data?.mime_type === 'text/plain');

    // 2. TXT arriving as application/octet-stream -> 201 Created with normalized text/plain
    const txtOctetRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: Buffer.from('Plain text content arriving as application/octet-stream.'),
          filename: 'task-attachment-test.txt',
          contentType: 'application/octet-stream',
        },
      },
    });
    const txtOctetAttId = txtOctetRes.body.data?.id;
    assert('2. TXT arriving as application/octet-stream -> 201 with normalized text/plain',
      txtOctetRes.status === 201 &&
      txtOctetRes.body.data?.mime_type === 'text/plain' &&
      txtOctetRes.body.data?.original_name === 'task-attachment-test.txt'
    );

    // 3. CSV -> 201 Created (with application/octet-stream or text/csv)
    const csvRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: Buffer.from('id,name,department\n1,Alice,Eng\n2,Bob,Design\n'),
          filename: 'data.csv',
          contentType: 'application/octet-stream',
        },
      },
    });
    assert('3. CSV with application/octet-stream -> 201 with normalized text/csv', csvRes.status === 201 && csvRes.body.data?.mime_type === 'text/csv');

    // 4. PDF -> 201 Created (%PDF- signature)
    const pdfRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: Buffer.from('%PDF-1.7\nSample PDF payload content for tests.\n%%EOF'),
          filename: 'document.pdf',
          contentType: 'application/octet-stream',
        },
      },
    });
    assert('4. PDF with %PDF- signature -> 201 with normalized application/pdf', pdfRes.status === 201 && pdfRes.body.data?.mime_type === 'application/pdf');

    // 5. PNG -> 201 Created (PNG signature)
    const pngBuffer = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
      Buffer.from('PNG image binary content data chunk')
    ]);
    const pngRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: pngBuffer,
          filename: 'screenshot.png',
          contentType: 'application/octet-stream',
        },
      },
    });
    assert('5. PNG with magic bytes -> 201 with normalized image/png', pngRes.status === 201 && pngRes.body.data?.mime_type === 'image/png');

    // 6. JPEG -> 201 Created (JPEG signature FF D8 FF)
    const jpegBuffer = Buffer.concat([
      Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]),
      Buffer.from('JPEG image binary data')
    ]);
    const jpegRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: jpegBuffer,
          filename: 'photo.jpg',
          contentType: 'application/octet-stream',
        },
      },
    });
    assert('6. JPEG with magic bytes -> 201 with normalized image/jpeg', jpegRes.status === 201 && jpegRes.body.data?.mime_type === 'image/jpeg');

    // 7. GIF -> 201 Created (GIF89a signature)
    const gifBuffer = Buffer.concat([
      Buffer.from('GIF89a'),
      Buffer.from([0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00])
    ]);
    const gifRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: gifBuffer,
          filename: 'animation.gif',
          contentType: 'application/octet-stream',
        },
      },
    });
    assert('7. GIF with GIF89a signature -> 201 with normalized image/gif', gifRes.status === 201 && gifRes.body.data?.mime_type === 'image/gif');

    // 8. WebP -> 201 Created (RIFF....WEBP signature)
    const webpBuffer = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0x20, 0x00, 0x00, 0x00]),
      Buffer.from('WEBPVP8 ')
    ]);
    const webpRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: webpBuffer,
          filename: 'banner.webp',
          contentType: 'application/octet-stream',
        },
      },
    });
    assert('8. WebP with RIFF/WEBP signature -> 201 with normalized image/webp', webpRes.status === 201 && webpRes.body.data?.mime_type === 'image/webp');

    // 9. DOC -> 201 Created (OLE CFB D0 CF 11 E0 A1 B1 1A E1)
    const docBuffer = Buffer.concat([
      Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]),
      Buffer.from('Legacy Word Document binary data')
    ]);
    const docRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: docBuffer,
          filename: 'resume.doc',
          contentType: 'application/octet-stream',
        },
      },
    });
    assert('9. DOC with OLE CFB signature -> 201 with normalized application/msword', docRes.status === 201 && docRes.body.data?.mime_type === 'application/msword');

    // 10. DOCX -> 201 Created (PK ZIP package)
    const docxBuffer = Buffer.concat([
      Buffer.from([0x50, 0x4B, 0x03, 0x04]),
      Buffer.from('word/[Content_Types].xml Office XML data')
    ]);
    const docxRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: docxBuffer,
          filename: 'proposal.docx',
          contentType: 'application/octet-stream',
        },
      },
    });
    assert('10. DOCX with PK signature -> 201 with normalized docx MIME', docxRes.status === 201 && docxRes.body.data?.mime_type.includes('wordprocessingml'));

    // 11. XLS -> 201 Created (OLE CFB)
    const xlsBuffer = Buffer.concat([
      Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]),
      Buffer.from('Legacy Excel Spreadsheet binary data')
    ]);
    const xlsRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: xlsBuffer,
          filename: 'sheet.xls',
          contentType: 'application/octet-stream',
        },
      },
    });
    assert('11. XLS with OLE CFB signature -> 201 with normalized application/vnd.ms-excel', xlsRes.status === 201 && xlsRes.body.data?.mime_type === 'application/vnd.ms-excel');

    // 12. XLSX -> 201 Created (PK ZIP package)
    const xlsxBuffer = Buffer.concat([
      Buffer.from([0x50, 0x4B, 0x03, 0x04]),
      Buffer.from('xl/[Content_Types].xml Office Excel package')
    ]);
    const xlsxRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: xlsxBuffer,
          filename: 'report.xlsx',
          contentType: 'application/octet-stream',
        },
      },
    });
    assert('12. XLSX with PK signature -> 201 with normalized spreadsheetml MIME', xlsxRes.status === 201 && xlsxRes.body.data?.mime_type.includes('spreadsheetml'));

    // 13. ZIP -> 201 Created (PK signature)
    const zipBuffer = Buffer.concat([
      Buffer.from([0x50, 0x4B, 0x03, 0x04]),
      Buffer.from('ZIP archive payload test content')
    ]);
    const zipRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: zipBuffer,
          filename: 'bundle.zip',
          contentType: 'application/zip',
        },
      },
    });
    const zipAttId = zipRes.body.data?.id;
    assert('13. ZIP with PK signature -> 201 with application/zip', zipRes.status === 201 && zipRes.body.data?.mime_type === 'application/zip');

    // 14. EXE -> 400 Bad Request
    const exeBuffer = Buffer.concat([
      Buffer.from([0x4D, 0x5A]), // MZ header
      Buffer.from('DOS / Windows Executable binary')
    ]);
    const exeRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: exeBuffer,
          filename: 'malware.exe',
          contentType: 'application/x-msdownload',
        },
      },
    });
    assert('14. EXE file rejected -> 400 Bad Request', exeRes.status === 400);

    // 15. Unsupported extension (.sh / .bin) -> 400 Bad Request
    const shRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: Buffer.from('#!/bin/bash\necho "test"'),
          filename: 'script.sh',
          contentType: 'application/x-sh',
        },
      },
    });
    assert('15. Unsupported extension (.sh) rejected -> 400 Bad Request', shRes.status === 400);

    // 16. Fake PDF (text or MZ header renamed to .pdf) -> 400 Bad Request (signature mismatch)
    const fakePdfRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: Buffer.from('This is completely fake PDF without magic header.'),
          filename: 'fake_document.pdf',
          contentType: 'application/pdf',
        },
      },
    });
    assert('16. Fake PDF (signature mismatch) rejected -> 400 Bad Request', fakePdfRes.status === 400);

    // 17. Fake Image (renamed text file as .png) -> 400 Bad Request
    const fakePngRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: Buffer.from('Not a PNG image content at all.'),
          filename: 'fake_image.png',
          contentType: 'image/png',
        },
      },
    });
    assert('17. Fake Image (.png with invalid signature) rejected -> 400 Bad Request', fakePngRes.status === 400);

    // 18. File > 10MB -> 400 Bad Request
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 'a');
    const largeRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {
        file: {
          buffer: largeBuffer,
          filename: 'giant.txt',
          contentType: 'text/plain',
        },
      },
    });
    assert('18. File > 10MB rejected -> 400 Bad Request', largeRes.status === 400);

    // 19. Missing file in request -> 400 Bad Request
    const missingRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
      formData: {},
    });
    assert('19. Missing file rejected -> 400 Bad Request', missingRes.status === 400);

    // 20. Unauthorized user (missing token) -> 401 Unauthorized
    const unauthRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      formData: {
        file: {
          buffer: Buffer.from('Valid text content'),
          filename: 'notes.txt',
          contentType: 'text/plain',
        },
      },
    });
    assert('20. Missing auth token rejected -> 401 Unauthorized', unauthRes.status === 401);

    // 21. Non-project member (Employee B) -> 403 Forbidden
    const nonMemberRes = await request('POST', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empBToken}` },
      formData: {
        file: {
          buffer: Buffer.from('Employee B trying to attach file'),
          filename: 'unauth.txt',
          contentType: 'text/plain',
        },
      },
    });
    assert('21. Non-project member upload rejected -> 403 Forbidden', nonMemberRes.status === 403);

    // 22. Valid uploader (Employee A) -> 201 Created and listed in task attachments
    const listAttRes = await request('GET', `/api/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    assert('22. Valid uploader attachments listed -> 200 OK with records', listAttRes.status === 200 && listAttRes.body.data?.length >= 5);

    // Download test for normalized txt
    const downloadTxt = await request('GET', `/api/attachments/${txtOctetAttId}/download`, {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    assert('Download normalized TXT -> 200 OK with exact plain text body', downloadTxt.status === 200 && downloadTxt.rawText.includes('Plain text content arriving as application/octet-stream.'));

    // 23. Admin deletion -> 200 OK
    const adminDelRes = await request('DELETE', `/api/attachments/${zipAttId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('23. Admin deletes attachment -> 200 OK', adminDelRes.status === 200);

    // 24. Unauthorized deletion (Employee B tries to delete Emp A's attachment) -> 403 Forbidden
    const unauthDelRes = await request('DELETE', `/api/attachments/${txtOctetAttId}`, {
      headers: { Authorization: `Bearer ${empBToken}` },
    });
    assert('24. Unauthorized attachment deletion -> 403 Forbidden', unauthDelRes.status === 403);

    console.log(`\n============================================================`);
    console.log(`ATTACHMENT TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`============================================================\n`);

    if (failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    try {
      await db.query("DELETE FROM users WHERE email LIKE '%_att_%@example.com'");
    } catch (e) {}
    server.close();
    await db.pool.end();
  }
}

runAttachmentUploadSuite().catch((err) => {
  console.error('Fatal error running attachment test suite:', err);
  process.exit(1);
});
