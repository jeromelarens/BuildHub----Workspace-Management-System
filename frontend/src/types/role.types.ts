export type UserRole = 'admin' | 'manager' | 'team_lead' | 'employee';

export type SystemPermission =
  // User permissions
  | 'user:create'
  | 'user:view'
  | 'user:update'
  | 'user:delete'
  // Role permissions
  | 'role:view'
  | 'role:update'
  // Project permissions
  | 'project:create'
  | 'project:view'
  | 'project:update'
  | 'project:delete'
  | 'project:manage_members'
  // Task permissions
  | 'task:create'
  | 'task:view'
  | 'task:view_all'
  | 'task:update'
  | 'task:delete'
  | 'task:assign'
  | 'task:dependency'
  | 'task:recurrence'
  | 'task:bulk_update'
  // Comments
  | 'comment:create'
  | 'comment:update'
  | 'comment:delete'
  | 'comment:moderate'
  // Notifications
  | 'notification:view'
  | 'notification:update'
  // Attachments
  | 'attachment:create'
  | 'attachment:view'
  | 'attachment:delete'
  // Reports & Audits
  | 'report:view'
  | 'audit:view';

/**
 * Standard backend role-to-permission mapping for frontend UX checks
 */
export const ROLE_PERMISSIONS: Record<UserRole, SystemPermission[]> = {
  admin: [
    'user:create',
    'user:view',
    'user:update',
    'user:delete',
    'role:view',
    'role:update',
    'project:create',
    'project:view',
    'project:update',
    'project:delete',
    'project:manage_members',
    'task:create',
    'task:view',
    'task:view_all',
    'task:update',
    'task:delete',
    'task:assign',
    'task:dependency',
    'task:recurrence',
    'task:bulk_update',
    'comment:create',
    'comment:update',
    'comment:delete',
    'comment:moderate',
    'notification:view',
    'notification:update',
    'attachment:create',
    'attachment:view',
    'attachment:delete',
    'report:view',
    'audit:view',
  ],
  manager: [
    'project:create',
    'project:view',
    'project:update',
    'project:delete',
    'project:manage_members',
    'task:create',
    'task:view',
    'task:update',
    'task:delete',
    'task:assign',
    'task:dependency',
    'task:recurrence',
    'task:bulk_update',
    'comment:create',
    'comment:update',
    'comment:delete',
    'notification:view',
    'notification:update',
    'attachment:create',
    'attachment:view',
    'attachment:delete',
    'report:view',
  ],
  team_lead: [
    'project:view',
    'task:create',
    'task:view',
    'task:update',
    'task:assign',
    'task:dependency',
    'task:recurrence',
    'comment:create',
    'comment:update',
    'comment:delete',
    'notification:view',
    'notification:update',
    'attachment:create',
    'attachment:view',
    'attachment:delete',
    'report:view',
  ],
  employee: [
    'project:view',
    'task:create',
    'task:view',
    'task:update',
    'comment:create',
    'comment:update',
    'comment:delete',
    'notification:view',
    'notification:update',
    'attachment:create',
    'attachment:view',
  ],
};
