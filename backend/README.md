# Task Management System Backend — Enterprise Edition (Phases 1, 2, 3 Part 1 & Part 2)

A production-quality, modular, highly secure, and enterprise-grade REST API backend for a collaborative Task Management System built with **Node.js**, **Express.js**, **PostgreSQL (`pg`)**, **Dynamic RBAC with Granular Permissions**, **Live Database Role Verification**, **System Admin Bootstrap Service**, **Task Dependencies & DAG Cycle Detection**, **Recurring Tasks Engine**, **In-App Notification Dispatcher**, **Task Activity Audit Trail**, **Secure File Attachments (Multer)**, **Task Mentions (`@username`) Engine**, **Advanced Multi-Filter Task Search**, **Transactional Bulk Operations**, **Soft Delete & Trash Lifecycle**, **Advanced Analytics & Project Health Engine**, **Enterprise Audit Trail Logging**, **Security Hardening (Helmet, CORS, Rate Limiting)**, and **Dual API Versioning (`/api` and `/api/v1`)**.

---

## 📌 Feature Highlights

### Core Foundation (Phase 1 & 2)
* **System Admin Bootstrap Service:** Automated, idempotent initialization of the default System Administrator account from environment variables upon server startup without public registration exposure or password overwriting.
* **Dynamic RBAC & Role Scoping:** Fine-grained permissions and role assignments (`admin`, `manager`, `team_lead`, `employee`, plus custom roles) with permission middleware and live PostgreSQL verification.
* **Projects & Team Lead Scoping:** Granular project leadership and member role management (`lead` vs `member` in `project_members`), scoped assignment, and update authorizations.
* **Dashboards & SQL Aggregations:** High-performance admin and personal metrics computed directly in PostgreSQL.

### Advanced Task Capabilities (Phase 3 Part 1)
* **Task Dependencies & DAG Cycle Detection:** Directed Acyclic Graph (DAG) dependency chains with recursive cycle prevention, self-dependency blocks, and completion blocking rules (`validateTaskCompletionDependencies(taskId)`).
* **Automated Recurring Tasks:** Configurable recurrence rules (`daily`, `weekly`, `monthly`, `custom`) with next-run date calculations and idempotent transaction-safe batch processing (`processRecurringTasks()`).
* **In-App Notifications:** Real-time event notifications triggered on task assignments, reassignments, project additions, task comments, and dependency resolutions with unread counts and read markers.
* **Task Activity History:** Comprehensive append-only audit trail logging task creation, field updates, comments, dependencies, and recurrence changes.

### Enterprise Task Extensions (Phase 3 Part 2)
* **File Attachments:** Multipart file upload engine (`multer`) with strict MIME validation (Images, PDFs, Documents, Text, JSON), 10MB size limits, sanitized filenames, and path traversal protection.
* **Task Mentions System:** Automatically parses `@username` and `@email` mentions in task descriptions and comments, dispatching personalized notifications while preventing self-mentions and duplicate alerts.
* **Advanced Task Search:** Multi-parameter querying with full-text search, date ranges (`startDate`, `endDate`), `hasAttachments`, `isOverdue`, `isBlocked`, sorting, pagination, and strict RBAC visibility scoping.
* **Transactional Bulk Operations:** Batch updates (`/api/tasks/bulk-update`) and batch deletes (`/api/tasks/bulk-delete`) executed within atomic database transactions with dependency blocker checks and rollback safety.
* **Soft Delete & Trash Lifecycle:** Soft-delete tasks (`deleted_at`), query trash (`/api/tasks/trash`), restore tasks (`/api/tasks/:id/restore`), and permanent deletion (`/api/tasks/:id/permanent` — Admin only).
* **Advanced Analytics & Project Health:** Overview KPI metrics, team velocity timeline, assignee workload distributions, project burndown charts, and dynamic project progress & health calculation (`ON_TRACK`, `AT_RISK`, `DELAYED`).
* **Enterprise Audit Logs:** Immutable append-only audit trail (`audit_logs`) recording authentication, role changes, project lifecycle, task mutations, and file operations with query filters and IP attribution (Admin only).
* **Security Hardening:** OWASP-compliant `helmet` security headers, CORS origin whitelist, strict payload size limits, and `express-rate-limit` protection.
* **API Versioning:** Full backward compatibility for `/api/...` endpoints alongside versioned `/api/v1/...` routes.

---

## 🛠 Tech Stack

* **Runtime:** Node.js (v18+)
* **Web Framework:** Express.js (v4.21+)
* **Database:** PostgreSQL (v12+)
* **Database Driver:** `pg` (node-postgres connection pool)
* **Authentication:** `jsonwebtoken` (JWT with live database verification)
* **Password Hashing:** `bcrypt` (10 salt rounds)
* **File Uploads:** `multer` (Disk storage with MIME allowlist & random hex filenames)
* **Security & Protection:** `helmet`, `cors`, `express-rate-limit`
* **Configuration:** `dotenv`

---

## 📂 Project Structure

```text
Task-Management-Phase1/
│
├── src/
│   ├── config/
│   │   └── database.js               # PostgreSQL connection pool configuration
│   │
│   ├── controllers/
│   │   ├── authController.js         # Register, Login & audit logging
│   │   ├── userController.js         # Admin user & role promotion/demotion logic
│   │   ├── roleController.js         # Dynamic RBAC roles & permissions endpoints
│   │   ├── projectController.js      # Projects & members with lead/member roles & health metrics
│   │   ├── taskController.js         # Task CRUD, search, bulk ops, soft delete, dependencies & recurrence
│   │   ├── commentController.js      # Task Comments CRUD, mentions & notifications
│   │   ├── notificationController.js # Notifications inbox, unread count & read markers
│   │   ├── attachmentController.js   # File upload, list, download & deletion
│   │   ├── analyticsController.js    # Overview, team velocity & project burndown analytics
│   │   ├── auditLogController.js     # Enterprise audit logs query endpoint (Admin only)
│   │   └── dashboardController.js    # SQL-aggregated Admin & Personal dashboards
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js         # JWT auth with live PostgreSQL user & role verification
│   │   ├── roleMiddleware.js         # Reusable RBAC role authorization factory
│   │   ├── permissionMiddleware.js   # Dynamic fine-grained permission authorization
│   │   ├── validationMiddleware.js   # Content-Type & request validation middleware
│   │   ├── uploadMiddleware.js       # Single file upload middleware with error handling
│   │   └── rateLimitMiddleware.js    # API, Auth & Bulk rate limiting middleware
│   │
│   ├── routes/
│   │   ├── authRoutes.js             # /api/auth & /api/v1/auth routes
│   │   ├── userRoutes.js             # /api/users routes (Admin only)
│   │   ├── roleRoutes.js             # /api/roles routes
│   │   ├── permissionRoutes.js       # /api/permissions routes
│   │   ├── projectRoutes.js          # /api/projects routes & member sub-endpoints
│   │   ├── taskRoutes.js             # /api/tasks routes (CRUD, search, bulk, attachments, deps)
│   │   ├── commentRoutes.js          # /api/comments routes (PUT/DELETE)
│   │   ├── notificationRoutes.js     # /api/notifications routes
│   │   ├── attachmentRoutes.js       # /api/attachments routes (download/delete)
│   │   ├── analyticsRoutes.js        # /api/analytics routes
│   │   ├── auditLogRoutes.js         # /api/audit-logs routes (Admin only)
│   │   └── dashboardRoutes.js        # /api/dashboard routes
│   │
│   ├── services/
│   │   ├── adminBootstrapService.js  # Idempotent System Admin Bootstrap Service
│   │   ├── dbMigrationService.js     # Non-destructive Phase 3 Part 1 & Part 2 schema migrations
│   │   ├── permissionService.js      # Granular permission verification helpers
│   │   ├── dependencyService.js      # DAG cycle detection & task completion dependency checker
│   │   ├── recurrenceService.js      # Recurrence rule calculator & automated instance generator
│   │   ├── notificationService.js    # Notification event dispatch & deduplication
│   │   ├── activityService.js        # Task audit trail & diff logging
│   │   ├── attachmentService.js      # Multer file storage & MIME verification service
│   │   ├── mentionService.js         # Task & comment mention parser and notification dispatcher
│   │   ├── analyticsService.js       # Velocity, burndown & project health metrics service
│   │   └── auditService.js           # Enterprise immutable audit logging service
│   │
│   ├── validators/
│   │   ├── authValidator.js          # Registration & login schemas
│   │   ├── userValidator.js          # User management schemas (including team_lead)
│   │   ├── roleValidator.js          # Roles & permissions payloads and ID checks
│   │   ├── projectValidator.js       # Project & member schemas (including lead/member roles)
│   │   ├── taskValidator.js          # Task schemas, advanced search & bulk ops schemas
│   │   ├── dependencyValidator.js    # Task dependency payload & param validation
│   │   ├── recurrenceValidator.js    # Recurrence rule payload validation
│   │   ├── notificationValidator.js  # Notifications query & ID validation
│   │   ├── attachmentValidator.js    # File attachment ID validation
│   │   └── commentValidator.js       # Comment body schemas
│   │
│   ├── app.js                        # Express application configuration, security headers & route mounts
│   └── server.js                     # Server entrypoint with DB connection, migration & bootstrap
│
├── database.sql                      # Complete Phase 1, Phase 2 & Phase 3 DDL schema
├── uploads/                          # Local directory for file attachment storage
├── package.json                      # Project dependencies and npm scripts
├── test_admin_bootstrap.js           # Admin Bootstrap automated test suite (10 assertions)
├── test_validation.js                # Phase 1 regression test suite (65 assertions)
├── test_phase2.js                    # Phase 2 automated test suite (49 assertions)
├── test_phase3_part1.js              # Phase 3 Part 1 comprehensive test suite (61 assertions)
├── test_phase3_part2.js              # Phase 3 Part 2 enterprise test suite (47 assertions)
├── run_postman_collection.js         # Automated Postman collection runner (72 assertions)
├── Task_Management_API.postman_collection.json # Complete Postman test collection (72 tests)
└── .env.example                      # Example environment variables template
```

---

## 🚀 Getting Started

### 1. Prerequisites
* Node.js (v18 or higher)
* PostgreSQL running locally or in Docker

### 2. Configure Environment Variables
Create a `.env` file from the provided `.env.example`:
```ini
PORT=5000
NODE_ENV=development

# PostgreSQL Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=task_management
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Security
JWT_SECRET=super_secret_enterprise_jwt_key_2026!
JWT_EXPIRES_IN=1d

# System Administrator Bootstrap
ADMIN_NAME=System Administrator
ADMIN_EMAIL=admin@taskmanagement.com
ADMIN_PASSWORD=AdminSecret@2026!

# Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10

# CORS & Security
CORS_ORIGIN=*
```

### 3. Run Non-Destructive Migrations & Start Server
```bash
npm install
npm start
```

---

## 🧪 Comprehensive Automated Testing

Execute the complete automated test suite (all 6 suites):
```bash
npm test
```

### Individual Test Suites
* **System Admin Bootstrap Suite:** `npm run test:bootstrap`
* **Phase 1 Validation & Auth Suite:** `npm run test:phase1`
* **Phase 2 RBAC, Projects & Tasks Suite:** `npm run test:phase2`
* **Phase 3 Part 1 Dependencies & Recurrence Suite:** `npm run test:phase3:part1`
* **Phase 3 Part 2 Enterprise Extensions Suite:** `npm run test:phase3:part2`
* **Attachment Upload & MIME Validation Suite:** `npm run test:attachments`
* **Full Postman Collection Runner:** `npm run test:postman`

---

## 📎 File Uploads & Security Specification

### Supported Formats & MIME Normalization

| Category | File Extensions | Canonical MIME Type | Validation Rules & File Signatures |
| :--- | :--- | :--- | :--- |
| **PDF** | `.pdf` | `application/pdf` | Validates `%PDF-` signature at byte 0 |
| **Images** | `.png` | `image/png` | Validates PNG magic bytes (`89 50 4E 47 0D 0A 1A 0A`) |
| | `.jpg`, `.jpeg` | `image/jpeg` | Validates JPEG SOI marker (`FF D8 FF`) |
| | `.gif` | `image/gif` | Validates `GIF87a` / `GIF89a` header |
| | `.webp` | `image/webp` | Validates `RIFF` (byte 0..3) and `WEBP` (byte 8..11) |
| **Documents** | `.txt` | `text/plain` | Validates UTF-8 text; strictly rejects null/binary bytes and executable headers |
| | `.csv` | `text/csv` | Validates text CSV data; rejects binary executables |
| | `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Validates ZIP package signature (`PK\x03\x04`) |
| | `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Validates ZIP package signature (`PK\x03\x04`) |
| | `.doc` | `application/msword` | Validates OLE Compound File Binary signature (`D0 CF 11 E0 A1 B1 1A E1`) |
| | `.xls` | `application/vnd.ms-excel` | Validates OLE Compound File Binary signature (`D0 CF 11 E0 A1 B1 1A E1`) |
| **Archives** | `.zip` | `application/zip` | Validates ZIP header (`PK\x03\x04`, `PK\x05\x06`, `PK\x07\x08`) |

### Upload Security Invariants
* **Safe `application/octet-stream` Normalization:** Files arriving with generic `application/octet-stream` (e.g. from Postman or HTTP clients) are safely resolved to their canonical MIME type based on supported extensions and validated binary signatures, and stored with their normalized MIME type in database records and audit logs.
* **Prohibited Executables:** Files containing Windows PE/DOS header (`MZ`), Linux ELF binary header (`\x7FELF`), or Mach-O / Java bytecode headers are immediately rejected regardless of extension.
* **Path Traversal & Execution Protection:** Uploaded files are saved to `uploads/task-attachments` with randomized cryptographically secure filenames (`att_<timestamp>_<randomHex><safeExt>`) and sanitized with `path.resolve` / `path.basename`. Physical files failing validation are immediately deleted.
* **Size Enforcement:** Strict 10 MB maximum limit enforced at the multipart stream layer.

---

## 📊 Summary of Test Results
| Test Suite | Total Assertions | Status |
| :--- | :--- | :--- |
| `test_admin_bootstrap.js` | 10 | **PASS (100%)** |
| `test_validation.js` | 65 | **PASS (100%)** |
| `test_phase2.js` | 49 | **PASS (100%)** |
| `test_phase3_part1.js` | 61 | **PASS (100%)** |
| `test_phase3_part2.js` | 47 | **PASS (100%)** |
| `test_attachment_upload_suite.js` | 25 | **PASS (100%)** |
| `run_postman_collection.js` | 219 | **PASS (100%)** |
| **Total Automated Assertions** | **476** | **ALL PASSED (100%)** |

---

## 🔒 Security & Authorization Invariants

1. **Exactly One System Admin:** Strictly enforced. Public registration as `admin` is blocked; existing admin role cannot be modified by self or others.
2. **Dynamic RBAC Matrix:**
   * `admin` -> Global authorization across all projects, tasks, comments, audit logs, and permanent deletion.
   * `manager` -> Full project management and task assignment in created or assigned projects.
   * `team_lead + lead` -> Manage task details, assign tasks, dependencies, recurrence in assigned projects.
   * `team_lead + member` -> Scoped to task status updates; forbidden from modifying task details, dependencies, or recurrence created by others.
   * `employee` -> Task status updates and comments on assigned or project tasks.
3. **File Safety:** Strict MIME allowlist, magic byte verification, random hex storage names to prevent collision/overwriting, path traversal sanitization, and 10MB limit.
4. **Audit Immutability:** Audit trail records are append-only. Sensitive credentials (passwords, tokens) are excluded.
