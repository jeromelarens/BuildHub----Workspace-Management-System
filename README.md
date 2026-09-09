# BuildHub — Enterprise Workspace & Work Management Platform

BuildHub is a high-performance, secure, enterprise-grade Workspace & Work Management Platform. It delivers multi-tenant team governance, dynamic role-based access controls (RBAC), agile project workflows, interactive task views (Kanban, List, Calendar, Timeline), DAG-based dependency chains with cycle prevention, recurring task automation, in-app notifications, rich file attachments, outbound webhooks, customizable metadata fields, multi-level approval workflows, and granular time tracking.

---

## 🌟 Key Features

### 🏢 Multi-Tenant Workspaces & Identity Governance
- **Multi-Tenant Isolation:** Workspace boundaries ensure tenant-level data segregation and scoped role management.
- **Dynamic RBAC:** Granular permission system with support for `admin`, `manager`, `team_lead`, and `employee` roles, verified on every database transaction.
- **System Admin Bootstrap:** Automated, idempotent administrative account provisioning on first startup.
- **Audit Trails:** Append-only security audit log recording authentication events, permissions mutations, and data lifecycle actions.

### 📋 Project & Task Management
- **Project Portfolios:** Organize work across multiple projects with dedicated leads, assigned members, and status tracking.
- **Interactive Task Views:** Switch between **List**, **Kanban Board**, **Calendar**, and **Workload Capacity** views.
- **Directed Acyclic Graph (DAG) Dependencies:** Strict task dependency management with recursive cycle detection and completion-blocking rules.
- **Automated Task Recurrence:** Flexible recurrence schedules (`daily`, `weekly`, `monthly`, `custom`) with automatic next-run calculation.
- **Transactional Bulk Operations:** Atomic batch updates and bulk deletions with dependency blocker enforcement.
- **Soft Delete & Trash Bin:** Multi-stage deletion lifecycle with trash inspection, one-click restoration, and permanent purge.

### 💬 Collaboration & Notifications
- **Task Comments & Activity History:** Real-time discussion thread per task with automated changelog tracking.
- **Mentions Engine:** Smart `@username` parsing in descriptions and comments with personalized notifications.
- **Secure File Attachments:** Multipart file upload pipeline with strict MIME validation, filename sanitization, and size limits.
- **In-App Notification Dispatcher:** Real-time event notifications for task assignments, approvals, dependency resolutions, and mentions.

### ⚡ Enterprise Extensibility & Automation
- **Outbound Webhooks:** Real-time event streaming with HMAC-SHA256 signature verification, retry backoff, and delivery logs.
- **Typed Custom Fields:** Dynamic schema metadata extensions supporting `text`, `number`, `boolean`, `date`, and `select` field definitions.
- **Multi-Step Approval Workflows:** Configurable sequential approval chains with self-approval guards and reviewer routing.
- **Punch-Clock Time Tracking:** Real-time stopwatch timer and manual time logging with timesheet analytics.

---

## 🛠 Tech Stack

### Frontend
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + Vanilla CSS Design Tokens
- **State & Server Cache:** TanStack Query (React Query v5)
- **Forms & Validation:** React Hook Form + Zod
- **Icons:** Lucide React
- **Routing:** React Router v7

### Backend
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js (v4.21+)
- **Database:** PostgreSQL (v12+) with connection pooling (`pg`)
- **Authentication:** JSON Web Tokens (JWT) & bcrypt password hashing
- **File Uploads:** Multer with MIME allowlisting
- **Security:** Helmet, CORS, and Express Rate Limiting

---

## 📂 Project Structure

```text
BuildHub/
├── backend/
│   ├── src/
│   │   ├── config/              # PostgreSQL pool & connection configuration
│   │   ├── controllers/         # REST API route controllers
│   │   ├── middleware/          # JWT auth, RBAC authorization, rate limiting, upload handlers
│   │   ├── routes/              # Express route definitions
│   │   ├── services/            # Business logic, migrations, webhooks, audit logger
│   │   ├── utils/               # Cryptographic tokens, HMAC signatures, pagination helpers
│   │   ├── validators/          # Input schema and payload validators
│   │   ├── app.js               # Express application configuration & middleware stack
│   │   └── server.js            # Server entrypoint & lifecycle bootstrap
│   ├── uploads/                 # Local storage directory for secure file attachments
│   ├── database.sql             # Consolidated PostgreSQL schema & seed script
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── public/                  # Static assets & brand media
│   ├── src/
│   │   ├── api/                 # Axios clients & typed API endpoints
│   │   ├── components/          # Reusable UI components, layout, task cards, modals
│   │   ├── contexts/            # React Auth, Theme, and Toast contexts
│   │   ├── hooks/               # Custom React Query hooks & state utilities
│   │   ├── layouts/             # AppLayout, AuthLayout, and navigation wrappers
│   │   ├── pages/               # Top-level route views (Dashboard, Tasks, Projects, etc.)
│   │   ├── routes/              # App routing table & protected route guards
│   │   ├── types/               # TypeScript interfaces & domain types
│   │   ├── utils/               # Formatting, styling helpers, and class merging
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.ts
│
├── .env.example                 # Root environment template
├── .gitignore                   # Production gitignore rules
└── README.md                    # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **PostgreSQL:** v12 or higher

---

### 1. Database Setup
Create a PostgreSQL database for BuildHub:

```bash
createdb task_management_db
```

---

### 2. Backend Setup & Configuration

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your PostgreSQL credentials:
   ```env
   PORT=5000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=task_management_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_jwt_secret_key_at_least_32_chars
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=AdminSecret@2026!
   FRONTEND_URL=http://localhost:5173
   BACKEND_URL=http://localhost:5000
   ```

4. Run the server (migrations will execute automatically on startup):
   ```bash
   npm run dev
   ```
   The backend API will be available at `http://localhost:5000/api`.

---

### 3. Frontend Setup & Configuration

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Verify `VITE_API_BASE_URL` points to your backend:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🧪 Testing & Verification

### Backend Test Suite
Run the comprehensive regression and integration tests:

```bash
cd backend
npm test
```

Or run specific test modules:
```bash
npm run test:enterprise     # Multi-tenant, webhooks, approvals, custom fields, timesheets
npm run test:bootstrap      # System administrator automated bootstrap
npm run test:attachments    # File upload validation and security checks
```

### Frontend Type Check & Build
Run TypeScript type checks and produce an optimized production bundle:

```bash
cd frontend
npx tsc -b
npm run build
```

---

## 🔒 Security Architecture
- **OWASP Compliance:** HTTP headers managed via Helmet; strict CORS controls.
- **Password Security:** Multi-round bcrypt hashing with rate-limited authentication endpoints.
- **Live DB Verification:** Access tokens validated against live user status and active database permissions on each request.
- **Webhook Signatures:** Outbound webhooks signed with cryptographic HMAC-SHA256 signatures with timestamp anti-replay verification.
- **Payload Safety:** Strict size limits and sanitized multipart upload validation preventing path traversal.

---

## 📄 License
This project is licensed under the ISC License.
