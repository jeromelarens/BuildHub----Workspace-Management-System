# BuildHub — Frontend Application

Modern, high-performance React 19 + TypeScript single-page application for the BuildHub Workspace Management System.

---

## 🛠 Tech Stack

- **Framework:** React 19
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + Vanilla CSS Tokens
- **Data Fetching & Caching:** TanStack Query (React Query v5)
- **Form Management & Validation:** React Hook Form + Zod
- **Routing:** React Router v7
- **Icons:** Lucide React

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file based on `.env.example`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=BuildHub
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npx tsc -b
npm run build
```

---

## 📂 Source Structure

```text
src/
├── api/             # Typed API clients (Axios)
├── components/      # UI components (Button, Modal, Table, Kanban, etc.)
├── contexts/        # Auth, Theme, and Notification contexts
├── hooks/           # Custom React Query query/mutation hooks
├── layouts/         # AppLayout, AuthLayout, Sidebar, Topbar
├── pages/           # Application views (Dashboard, Tasks, Projects, etc.)
├── routes/          # Route registry & ProtectedRoute guards
├── types/           # Domain TypeScript type definitions
└── utils/           # Helper utilities, styling, date formatters
```
