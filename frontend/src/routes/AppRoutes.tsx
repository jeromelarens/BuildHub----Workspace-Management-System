import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { RoleRoute } from './RoleRoute';
import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProjectsPage } from '../pages/projects/ProjectsPage';
import { TasksPage } from '../pages/tasks/TasksPage';
import { ForbiddenPage } from '../pages/errors/ForbiddenPage';
import { NotFoundPage } from '../pages/errors/NotFoundPage';

// Lazy-loaded heavy modules for optimal initial chunk size
const UsersPage = React.lazy(() => import('../pages/users/UsersPage').then(m => ({ default: m.UsersPage })));
const ProjectDetailPage = React.lazy(() => import('../pages/projects/ProjectDetailPage').then(m => ({ default: m.ProjectDetailPage })));
const TaskDetailPage = React.lazy(() => import('../pages/tasks/TaskDetailPage').then(m => ({ default: m.TaskDetailPage })));
const NotificationsPage = React.lazy(() => import('../pages/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const TrashPage = React.lazy(() => import('../pages/trash/TrashPage').then(m => ({ default: m.TrashPage })));
const AnalyticsPage = React.lazy(() => import('../pages/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const AuditLogsPage = React.lazy(() => import('../pages/audit/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));
const ProfilePage = React.lazy(() => import('../pages/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const ForgotPasswordPage = React.lazy(() => import('../pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = React.lazy(() => import('../pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = React.lazy(() => import('../pages/auth/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));
const WorkloadPage = React.lazy(() => import('../pages/workload/WorkloadPage').then(m => ({ default: m.WorkloadPage })));
const TemplatesPage = React.lazy(() => import('../pages/templates/TemplatesPage').then(m => ({ default: m.TemplatesPage })));
const TimesheetsPage = React.lazy(() => import('../pages/timesheets/TimesheetsPage').then(m => ({ default: m.TimesheetsPage })));
const RolesPermissionsPage = React.lazy(() => import('../pages/roles/RolesPermissionsPage').then(m => ({ default: m.RolesPermissionsPage })));
const TaskDependenciesPage = React.lazy(() => import('../pages/dependencies/TaskDependenciesPage').then(m => ({ default: m.TaskDependenciesPage })));
const AutomationsPage = React.lazy(() => import('../pages/automations/AutomationsPage').then(m => ({ default: m.AutomationsPage })));
const WorkflowPage = React.lazy(() => import('../pages/workflow/WorkflowPage').then(m => ({ default: m.WorkflowPage })));
const CustomFieldsPage = React.lazy(() => import('../pages/customfields/CustomFieldsPage').then(m => ({ default: m.CustomFieldsPage })));
const ApprovalsPage = React.lazy(() => import('../pages/approvals/ApprovalsPage').then(m => ({ default: m.ApprovalsPage })));
const TeamPage = React.lazy(() => import('../pages/team/TeamPage').then(m => ({ default: m.TeamPage })));
const WorkspaceSettingsPage = React.lazy(() => import('../pages/workspace/WorkspaceSettingsPage').then(m => ({ default: m.WorkspaceSettingsPage })));
const WebhooksPage = React.lazy(() => import('../pages/webhooks/WebhooksPage').then(m => ({ default: m.WebhooksPage })));
const ImportExportPage = React.lazy(() => import('../pages/import-export/ImportExportPage').then(m => ({ default: m.ImportExportPage })));
const EnterpriseAdminPage = React.lazy(() => import('../pages/admin/EnterpriseAdminPage').then(m => ({ default: m.EnterpriseAdminPage })));
const PoliciesPage = React.lazy(() => import('../pages/policies/PoliciesPage').then(m => ({ default: m.PoliciesPage })));
const SecurityPage = React.lazy(() => import('../pages/security/SecurityPage').then(m => ({ default: m.SecurityPage })));
const CompliancePage = React.lazy(() => import('../pages/compliance/CompliancePage').then(m => ({ default: m.CompliancePage })));

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public Auth Routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<AuthLayout />}>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Route>
      </Route>

      {/* 403 Forbidden Access Page */}
      <Route path="/403" element={<ForbiddenPage />} />

      {/* Protected App Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Dashboard */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* User Profile */}
          <Route path="/profile" element={<ProfilePage />} />

          {/* Core Phase 3 Modules: Projects */}
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />

          {/* Core Phase 3 Modules: Tasks */}
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/tasks/board" element={<Navigate to="/tasks?view=board" replace />} />
          <Route path="/tasks/calendar" element={<Navigate to="/tasks?view=calendar" replace />} />
          <Route path="/tasks/:taskId" element={<TaskDetailPage />} />

          {/* Admin-only Routes */}
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/roles-permissions" element={<RolesPermissionsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/admin/enterprise" element={<EnterpriseAdminPage />} />
            <Route path="/compliance" element={<CompliancePage />} />
          </Route>

          {/* Manager & Admin Routes */}
          <Route element={<RoleRoute allowedRoles={['admin', 'manager', 'team_lead', 'employee']} />}>
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/tasks/dependencies" element={<TaskDependenciesPage />} />
            <Route path="/settings/workspace" element={<WorkspaceSettingsPage />} />
            <Route path="/settings/policies" element={<PoliciesPage />} />
            <Route path="/settings/security" element={<SecurityPage />} />
            <Route path="/settings/import-export" element={<ImportExportPage />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['admin', 'manager', 'team_lead']} />}>
            <Route path="/team" element={<TeamPage />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['admin', 'manager']} />}>
            <Route path="/custom-fields" element={<CustomFieldsPage />} />
            <Route path="/settings/webhooks" element={<WebhooksPage />} />
          </Route>

          {/* Workflow, Automations & Recurrence Routes */}
          <Route element={<RoleRoute allowedRoles={['admin', 'manager', 'team_lead']} />}>
            <Route path="/automations" element={<AutomationsPage />} />
            <Route path="/tasks/recurrence" element={<AutomationsPage />} />
            <Route path="/workflow" element={<WorkflowPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
          </Route>

          {/* Notifications & Trash */}
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/trash" element={<TrashPage />} />

          {/* Release 2 Workload, Templates, Timesheets */}
          <Route path="/workload" element={<WorkloadPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/timesheets" element={<TimesheetsPage />} />

          {/* Account & Workspace Settings */}
          <Route path="/settings" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* 404 Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
