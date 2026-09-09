import { User, Task, Project } from '../types';

export const mockCurrentUser: User = {
  id: 1,
  name: 'Jerome Larens',
  email: 'jerome@taskflow.io',
  role: 'admin',
  created_at: '2026-01-15T08:00:00Z',
};

export const mockTeamMembers: User[] = [
  mockCurrentUser,
  { id: 2, name: 'Sarah Chen', email: 'sarah.chen@taskflow.io', role: 'manager' },
  { id: 3, name: 'Alex Rivera', email: 'alex.rivera@taskflow.io', role: 'team_lead' },
  { id: 4, name: 'Devon Vance', email: 'devon.v@taskflow.io', role: 'employee' },
  { id: 5, name: 'Elena Rostova', email: 'elena.r@taskflow.io', role: 'employee' },
];

export const mockKpiMetrics = {
  totalTasks: {
    value: 48,
    change: '+12%',
    trend: 'up' as const,
    label: 'Total Tasks',
    description: 'Active sprint scope',
  },
  completedTasks: {
    value: 32,
    change: '+18%',
    trend: 'up' as const,
    label: 'Completed Tasks',
    description: '66.7% completion rate',
  },
  inProgressTasks: {
    value: 11,
    change: '-3%',
    trend: 'neutral' as const,
    label: 'In Progress',
    description: 'Velocity 4.2 tasks/day',
  },
  overdueTasks: {
    value: 2,
    change: '-1',
    trend: 'down' as const,
    label: 'Overdue Tasks',
    description: 'Requires attention',
  },
};

export const mockProjects: Project[] = [
  {
    id: 101,
    name: 'Quantum Platform Core',
    description: 'Cloud microservices orchestration & authentication upgrade to OAuth 2.1.',
    status: 'active',
    created_by: 1,
    member_count: 5,
    task_count: 24,
    task_stats: {
      total: 24,
      completed: 18,
      in_progress: 4,
      pending: 2,
      overdue: 0,
    },
    progress: {
      completion_percentage: 75,
      health_status: 'ON_TRACK',
    },
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-09-01T14:30:00Z',
  },
  {
    id: 102,
    name: 'Mobile Client v3.0',
    description: 'React Native & Web unified component system with offline-first sync.',
    status: 'active',
    created_by: 2,
    member_count: 4,
    task_count: 16,
    task_stats: {
      total: 16,
      completed: 9,
      in_progress: 5,
      pending: 2,
      overdue: 2,
    },
    progress: {
      completion_percentage: 56,
      health_status: 'AT_RISK',
    },
    created_at: '2026-02-10T11:00:00Z',
    updated_at: '2026-09-02T09:15:00Z',
  },
  {
    id: 103,
    name: 'Security & Compliance Audit',
    description: 'SOC2 Type II telemetry hardening, automated secret rotations, and audit logging.',
    status: 'active',
    created_by: 1,
    member_count: 3,
    task_count: 8,
    task_stats: {
      total: 8,
      completed: 5,
      in_progress: 2,
      pending: 1,
      overdue: 0,
    },
    progress: {
      completion_percentage: 62.5,
      health_status: 'ON_TRACK',
    },
    created_at: '2026-02-18T16:00:00Z',
    updated_at: '2026-09-02T11:45:00Z',
  },
];

export const mockTasks: Task[] = [
  {
    id: 401,
    title: 'Migrate PostgreSQL connection pool to SSL mode verify-full',
    description: 'Ensure all managed database endpoints reject unencrypted connections.',
    status: 'in_progress',
    priority: 'urgent',
    due_date: '2026-09-05',
    project_id: 101,
    project_name: 'Quantum Platform Core',
    assigned_to: 1,
    assignee: mockCurrentUser,
    user_id: 1,
    is_overdue: false,
    created_at: '2026-08-28T09:00:00Z',
    updated_at: '2026-09-02T10:00:00Z',
  },
  {
    id: 402,
    title: 'Implement deep MIME magic byte validation for attachments',
    description: 'Reject files when extension does not match true binary content header.',
    status: 'completed',
    priority: 'high',
    due_date: '2026-09-01',
    project_id: 103,
    project_name: 'Security & Compliance Audit',
    assigned_to: 3,
    assignee: mockTeamMembers[2],
    user_id: 1,
    is_overdue: false,
    created_at: '2026-08-25T11:30:00Z',
    updated_at: '2026-09-01T17:00:00Z',
  },
  {
    id: 403,
    title: 'Implement DAG cycle detection for task dependency resolver',
    description: 'Ensure topological sort rejects self and cyclic blockers (A -> B -> C -> A).',
    status: 'completed',
    priority: 'high',
    due_date: '2026-08-30',
    project_id: 101,
    project_name: 'Quantum Platform Core',
    assigned_to: 2,
    assignee: mockTeamMembers[1],
    user_id: 1,
    is_overdue: false,
    created_at: '2026-08-26T14:15:00Z',
    updated_at: '2026-08-30T16:20:00Z',
  },
  {
    id: 404,
    title: 'Integrate offline SQLite synchronization engine into mobile client',
    description: 'Allow offline task edits with optimistic local timestamps and reconciliation.',
    status: 'blocked',
    priority: 'urgent',
    due_date: '2026-08-31',
    project_id: 102,
    project_name: 'Mobile Client v3.0',
    assigned_to: 4,
    assignee: mockTeamMembers[3],
    user_id: 2,
    is_overdue: true,
    created_at: '2026-08-20T08:45:00Z',
    updated_at: '2026-09-01T12:00:00Z',
  },
  {
    id: 405,
    title: 'Create dark theme design system with Electric Lemon Green accent',
    description: 'Produce high-contrast SaaS interface with accessible focus rings and tokens.',
    status: 'in_progress',
    priority: 'high',
    due_date: '2026-09-04',
    project_id: 101,
    project_name: 'Quantum Platform Core',
    assigned_to: 1,
    assignee: mockCurrentUser,
    user_id: 1,
    is_overdue: false,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-02T13:00:00Z',
  },
  {
    id: 406,
    title: 'Configure automated cron runner for recurring sprint tasks',
    description: 'Nightly recurrence service evaluation using Postgres FOR UPDATE row locks.',
    status: 'pending',
    priority: 'medium',
    due_date: '2026-09-08',
    project_id: 101,
    project_name: 'Quantum Platform Core',
    assigned_to: 5,
    assignee: mockTeamMembers[4],
    user_id: 3,
    is_overdue: false,
    created_at: '2026-09-02T09:30:00Z',
    updated_at: '2026-09-02T09:30:00Z',
  },
];

export interface ActivityItem {
  id: string;
  user: User;
  action: string;
  target: string;
  timeAgo: string;
  iconType: 'check' | 'plus' | 'edit' | 'alert';
}

export const mockRecentActivity: ActivityItem[] = [
  {
    id: 'act-1',
    user: mockTeamMembers[2],
    action: 'completed prerequisite task',
    target: 'Attachment MIME Verification #402',
    timeAgo: '12m ago',
    iconType: 'check',
  },
  {
    id: 'act-2',
    user: mockCurrentUser,
    action: 'updated status to In Progress',
    target: 'Dark theme design system #405',
    timeAgo: '45m ago',
    iconType: 'edit',
  },
  {
    id: 'act-3',
    user: mockTeamMembers[3],
    action: 'flagged dependency blocker on',
    target: 'Offline SQLite sync #404',
    timeAgo: '2h ago',
    iconType: 'alert',
  },
  {
    id: 'act-4',
    user: mockTeamMembers[1],
    action: 'created new project sprint',
    target: 'Security & Compliance Audit',
    timeAgo: '4h ago',
    iconType: 'plus',
  },
];

export const mockVelocityData = [
  { day: 'Mon', completed: 6, created: 4 },
  { day: 'Tue', completed: 8, created: 5 },
  { day: 'Wed', completed: 5, created: 7 },
  { day: 'Thu', completed: 9, created: 3 },
  { day: 'Fri', completed: 7, created: 4 },
  { day: 'Sat', completed: 2, created: 1 },
  { day: 'Sun', completed: 3, created: 2 },
];
