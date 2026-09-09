const db = require('../config/database');

/**
 * Execute Phase 3 Part 1 Non-Destructive Database Migration
 */
const runPhase3Part1Migration = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Roles Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed Core Roles
    const coreRoles = [
      ['admin', 'Full system access and user/role administration'],
      ['manager', 'Project creation, delegation, and management'],
      ['team_lead', 'Project sprint management, task assignment, and dependencies'],
      ['employee', 'Standard user for task execution, status updates, and comments'],
    ];

    for (const [name, desc] of coreRoles) {
      await client.query(`
        INSERT INTO roles (name, description)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;
      `, [name, desc]);
    }

    // 2. Permissions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed Core Permissions
    const corePermissions = [
      ['user:create', 'Create users'],
      ['user:view', 'View users'],
      ['user:update', 'Update users'],
      ['user:delete', 'Delete users'],
      ['role:view', 'View roles and permissions'],
      ['role:update', 'Manage role permissions'],
      ['project:create', 'Create projects'],
      ['project:view', 'View projects'],
      ['project:update', 'Update projects'],
      ['project:delete', 'Delete projects'],
      ['project:manage_members', 'Add/remove project members'],
      ['task:create', 'Create tasks'],
      ['task:view', 'View tasks'],
      ['task:view_all', 'View all tasks globally'],
      ['task:update', 'Update task details'],
      ['task:delete', 'Delete tasks'],
      ['task:assign', 'Assign and reassign tasks'],
      ['task:dependency', 'Manage task dependencies'],
      ['task:recurrence', 'Configure recurring tasks'],
      ['task:bulk_update', 'Perform bulk task operations'],
      ['comment:create', 'Add comments to tasks'],
      ['comment:update', 'Update own comments'],
      ['comment:delete', 'Delete own comments'],
      ['comment:moderate', 'Delete any comment'],
      ['notification:view', 'View personal notifications'],
      ['notification:update', 'Mark notifications as read/unread'],
      ['attachment:create', 'Upload task attachments'],
      ['attachment:view', 'Download task attachments'],
      ['attachment:delete', 'Delete task attachments'],
      ['report:view', 'View reporting dashboards'],
      ['audit:view', 'View system audit logs'],
    ];

    for (const [name, desc] of corePermissions) {
      await client.query(`
        INSERT INTO permissions (name, description)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;
      `, [name, desc]);
    }

    // 3. Role Permissions Join Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (role_id, permission_id)
      );
    `);

    // Seed Default Role Permissions
    const rolePermissionsMapping = {
      admin: [
        'user:create', 'user:view', 'user:update', 'user:delete',
        'role:view', 'role:update',
        'project:create', 'project:view', 'project:update', 'project:delete', 'project:manage_members',
        'task:create', 'task:view', 'task:view_all', 'task:update', 'task:delete', 'task:assign', 'task:dependency', 'task:recurrence', 'task:bulk_update',
        'comment:create', 'comment:update', 'comment:delete', 'comment:moderate',
        'notification:view', 'notification:update',
        'attachment:create', 'attachment:view', 'attachment:delete',
        'report:view', 'audit:view',
      ],
      manager: [
        'project:create', 'project:view', 'project:update', 'project:delete', 'project:manage_members',
        'task:create', 'task:view', 'task:update', 'task:delete', 'task:assign', 'task:dependency', 'task:recurrence', 'task:bulk_update',
        'comment:create', 'comment:update', 'comment:delete',
        'notification:view', 'notification:update',
        'attachment:create', 'attachment:view', 'attachment:delete',
        'report:view',
      ],
      team_lead: [
        'project:view',
        'task:create', 'task:view', 'task:update', 'task:assign', 'task:dependency', 'task:recurrence',
        'comment:create', 'comment:update', 'comment:delete',
        'notification:view', 'notification:update',
        'attachment:create', 'attachment:view', 'attachment:delete',
        'report:view',
      ],
      employee: [
        'project:view',
        'task:create', 'task:view', 'task:update',
        'comment:create', 'comment:update', 'comment:delete',
        'notification:view', 'notification:update',
        'attachment:create', 'attachment:view',
      ],
    };

    for (const [roleName, permNames] of Object.entries(rolePermissionsMapping)) {
      const roleRes = await client.query('SELECT id FROM roles WHERE name = $1', [roleName]);
      if (roleRes.rows.length > 0) {
        const roleId = roleRes.rows[0].id;
        for (const permName of permNames) {
          const permRes = await client.query('SELECT id FROM permissions WHERE name = $1', [permName]);
          if (permRes.rows.length > 0) {
            const permId = permRes.rows[0].id;
            await client.query(`
              INSERT INTO role_permissions (role_id, permission_id)
              VALUES ($1, $2)
              ON CONFLICT (role_id, permission_id) DO NOTHING;
            `, [roleId, permId]);
          }
        }
      }
    }

    // 4. Project Members Role Column
    await client.query(`
      ALTER TABLE project_members ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'member';
    `);

    // 5. Task Dependencies Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_no_self_dependency CHECK (task_id <> depends_on_task_id),
        CONSTRAINT uq_task_dependency UNIQUE (task_id, depends_on_task_id)
      );
    `);

    // 6. Task Recurrence Rules Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_recurrence_rules (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        frequency VARCHAR(20) NOT NULL,
        interval_count INTEGER DEFAULT 1,
        day_of_week INTEGER,
        day_of_month INTEGER,
        next_run_date DATE NOT NULL,
        end_date DATE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_task_recurrence_task_id UNIQUE (task_id)
      );
    `);

    // 7. Notifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Task Activities Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_activities (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        field_name VARCHAR(50),
        old_value TEXT,
        new_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Required Performance Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_task_dep_task_id ON task_dependencies(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_dep_depends_on ON task_dependencies(depends_on_task_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read ON notifications(user_id, is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON task_activities(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_activities_created_at ON task_activities(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_task_recurrence_next_run ON task_recurrence_rules(next_run_date) WHERE is_active = TRUE;
      CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
    `);

    await client.query('COMMIT');
    console.log('[Migration] Phase 3 Part 1 Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Part 1 Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Execute Phase 3 Part 2 Non-Destructive Database Migration
 */
const runPhase3Part2Migration = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Soft Delete columns for tasks and projects
    await client.query(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
    `);

    // 2. Task Attachments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_attachments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        uploader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        original_name VARCHAR(255) NOT NULL,
        storage_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Enterprise Audit Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER,
        ip_address VARCHAR(45),
        user_agent TEXT,
        details JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Performance & Soft-Delete Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_attachments_uploader_id ON task_attachments(uploader_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    `);

    await client.query('COMMIT');
    console.log('[Migration] Phase 3 Part 2 Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Part 2 Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Execute Enterprise Backend Capabilities Non-Destructive Database Migration
 */
const runEnterpriseCapabilitiesMigration = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add email_verified_at and updated_at to users if not exists
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP DEFAULT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    // 2. Workspaces & Workspace Members
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) UNIQUE NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS workspace_members (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (workspace_id, user_id)
      );
    `);

    // 3. Add workspace_id columns to existing entities for multi-tenancy
    await client.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;
    `);

    // 4. Default Workspace Backfill
    const adminUserRes = await client.query(`
      SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1
    `);
    let defaultAdminId = adminUserRes.rows.length > 0 ? adminUserRes.rows[0].id : null;

    // Check if default workspace exists
    const defaultWsRes = await client.query(`
      SELECT id FROM workspaces WHERE slug = 'default-workspace' LIMIT 1
    `);
    let defaultWsId;
    if (defaultWsRes.rows.length === 0) {
      const newWsRes = await client.query(`
        INSERT INTO workspaces (name, slug, description, status, owner_id)
        VALUES ('Default Organization', 'default-workspace', 'Default system organization workspace', 'active', $1)
        RETURNING id;
      `, [defaultAdminId]);
      defaultWsId = newWsRes.rows[0].id;
    } else {
      defaultWsId = defaultWsRes.rows[0].id;
    }

    // Backfill all existing users into default workspace members
    await client.query(`
      INSERT INTO workspace_members (workspace_id, user_id, role, status)
      SELECT $1, u.id, CASE WHEN u.role = 'admin' THEN 'owner' WHEN u.role = 'manager' THEN 'admin' ELSE 'member' END, 'active'
      FROM users u
      ON CONFLICT (workspace_id, user_id) DO NOTHING;
    `, [defaultWsId]);

    // Backfill projects, tasks, notifications, audit_logs without workspace_id
    await client.query('UPDATE projects SET workspace_id = $1 WHERE workspace_id IS NULL;', [defaultWsId]);
    await client.query('UPDATE tasks SET workspace_id = $1 WHERE workspace_id IS NULL;', [defaultWsId]);
    await client.query('UPDATE notifications SET workspace_id = $1 WHERE workspace_id IS NULL;', [defaultWsId]);
    await client.query('UPDATE audit_logs SET workspace_id = $1 WHERE workspace_id IS NULL;', [defaultWsId]);

    // 5. Password Reset & Email Verification Tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    // 7. Webhook Endpoints, Events & Deliveries
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_endpoints (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        url VARCHAR(1000) NOT NULL,
        secret VARCHAR(255) NOT NULL,
        description TEXT,
        events JSONB NOT NULL DEFAULT '[]',
        is_active BOOLEAN DEFAULT TRUE,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS webhook_events (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        idempotency_key VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id SERIAL PRIMARY KEY,
        webhook_endpoint_id INTEGER NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
        webhook_event_id INTEGER NOT NULL REFERENCES webhook_events(id) ON DELETE CASCADE,
        http_status INTEGER,
        response_body TEXT,
        response_time_ms INTEGER,
        attempt_count INTEGER DEFAULT 1,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        error_message TEXT,
        next_retry_at TIMESTAMP,
        delivered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Custom Fields (Definitions & Values)
    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_field_definitions (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        entity_type VARCHAR(50) NOT NULL DEFAULT 'task',
        name VARCHAR(100) NOT NULL,
        field_key VARCHAR(100) NOT NULL,
        field_type VARCHAR(50) NOT NULL,
        is_required BOOLEAN DEFAULT FALSE,
        options JSONB DEFAULT '[]',
        default_value JSONB DEFAULT NULL,
        position INTEGER DEFAULT 0,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (workspace_id, entity_type, field_key)
      );

      CREATE TABLE IF NOT EXISTS custom_field_values (
        id SERIAL PRIMARY KEY,
        field_definition_id INTEGER NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        string_value TEXT,
        number_value NUMERIC,
        boolean_value BOOLEAN,
        date_value TIMESTAMP,
        json_value JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (field_definition_id, entity_id)
      );
    `);

    // 9. Approval Workflow (Workflows, Steps, Requests, Actions)
    await client.query(`
      CREATE TABLE IF NOT EXISTS approval_workflows (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        entity_type VARCHAR(50) NOT NULL DEFAULT 'task',
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS approval_steps (
        id SERIAL PRIMARY KEY,
        workflow_id INTEGER NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
        step_order INTEGER NOT NULL,
        name VARCHAR(100) NOT NULL,
        approver_role VARCHAR(50),
        approver_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_required BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (workflow_id, step_order)
      );

      CREATE TABLE IF NOT EXISTS approval_requests (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        workflow_id INTEGER NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        current_step_order INTEGER DEFAULT 1,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS approval_actions (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
        step_id INTEGER REFERENCES approval_steps(id) ON DELETE SET NULL,
        actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. Punch-Clock Time Tracking (Time Entries)
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        started_at TIMESTAMP NOT NULL,
        ended_at TIMESTAMP,
        duration_seconds INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'running',
        description TEXT,
        is_billable BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. Seed Enterprise Permissions
    const enterprisePermissions = [
      ['workspace:create', 'Create new workspaces'],
      ['workspace:view', 'View workspaces and details'],
      ['workspace:update', 'Update workspace settings'],
      ['workspace:delete', 'Delete workspaces'],
      ['workspace:manage_members', 'Manage workspace members and roles'],
      ['custom_field:create', 'Create custom field definitions'],
      ['custom_field:view', 'View custom fields and values'],
      ['custom_field:update', 'Update custom field definitions and values'],
      ['custom_field:delete', 'Delete custom field definitions'],
      ['approval:create', 'Create approval workflows and submit requests'],
      ['approval:view', 'View approval workflows and requests'],
      ['approval:update', 'Update approval workflows'],
      ['approval:action', 'Approve or reject approval requests'],
      ['time:track', 'Start, stop, and log personal time entries'],
      ['time:view_own', 'View personal time entries and summary'],
      ['time:view_all', 'View all team members time entries and timesheets'],
      ['time:manage', 'Manage, edit, and delete any time entry'],
      ['webhook:create', 'Create outbound webhook endpoints'],
      ['webhook:view', 'View webhook endpoints and delivery logs'],
      ['webhook:update', 'Update webhook endpoints'],
      ['webhook:delete', 'Delete webhook endpoints'],
    ];

    for (const [name, desc] of enterprisePermissions) {
      await client.query(`
        INSERT INTO permissions (name, description)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;
      `, [name, desc]);
    }

    // Assign enterprise permissions to roles
    const enterpriseRolePermissions = {
      admin: [
        'workspace:create', 'workspace:view', 'workspace:update', 'workspace:delete', 'workspace:manage_members',
        'custom_field:create', 'custom_field:view', 'custom_field:update', 'custom_field:delete',
        'approval:create', 'approval:view', 'approval:update', 'approval:action',
        'time:track', 'time:view_own', 'time:view_all', 'time:manage',
        'webhook:create', 'webhook:view', 'webhook:update', 'webhook:delete',
      ],
      manager: [
        'workspace:create', 'workspace:view', 'workspace:manage_members',
        'custom_field:create', 'custom_field:view', 'custom_field:update',
        'approval:create', 'approval:view', 'approval:action',
        'time:track', 'time:view_own', 'time:view_all', 'time:manage',
        'webhook:create', 'webhook:view',
      ],
      team_lead: [
        'workspace:view',
        'custom_field:view', 'custom_field:update',
        'approval:create', 'approval:view', 'approval:action',
        'time:track', 'time:view_own', 'time:view_all',
      ],
      employee: [
        'workspace:view',
        'custom_field:view',
        'approval:create', 'approval:view',
        'time:track', 'time:view_own',
      ],
    };

    for (const [roleName, permNames] of Object.entries(enterpriseRolePermissions)) {
      const roleRes = await client.query('SELECT id FROM roles WHERE name = $1', [roleName]);
      if (roleRes.rows.length > 0) {
        const roleId = roleRes.rows[0].id;
        for (const permName of permNames) {
          const permRes = await client.query('SELECT id FROM permissions WHERE name = $1', [permName]);
          if (permRes.rows.length > 0) {
            const permId = permRes.rows[0].id;
            await client.query(`
              INSERT INTO role_permissions (role_id, permission_id)
              VALUES ($1, $2)
              ON CONFLICT (role_id, permission_id) DO NOTHING;
            `, [roleId, permId]);
          }
        }
      }
    }

    // 12. Enterprise Performance & Integrity Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
      CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
      CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON workspace_members(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON notifications(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_id ON audit_logs(workspace_id);

      CREATE INDEX IF NOT EXISTS idx_pwd_reset_hash ON password_reset_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_pwd_reset_user ON password_reset_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_verify_hash ON email_verification_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_email_verify_user ON email_verification_tokens(user_id);


      CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_ws ON webhook_endpoints(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_ws ON webhook_events(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries(webhook_endpoint_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE status = 'retrying';

      CREATE INDEX IF NOT EXISTS idx_custom_fields_ws ON custom_field_definitions(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_custom_fields_entity ON custom_field_definitions(workspace_id, entity_type);
      CREATE INDEX IF NOT EXISTS idx_custom_field_values_def ON custom_field_values(field_definition_id);
      CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);

      CREATE INDEX IF NOT EXISTS idx_approval_workflows_ws ON approval_workflows(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_approval_steps_wf ON approval_steps(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_approval_requests_ws ON approval_requests(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON approval_requests(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
      CREATE INDEX IF NOT EXISTS idx_approval_actions_req ON approval_actions(request_id);

      CREATE INDEX IF NOT EXISTS idx_time_entries_ws ON time_entries(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
      CREATE INDEX IF NOT EXISTS idx_time_entries_started ON time_entries(started_at DESC);
    `);

    await client.query('COMMIT');
    console.log('[Migration] Enterprise Backend Capabilities Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Enterprise Capabilities Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Execute all migrations
 */
const runAllMigrations = async () => {
  await runPhase3Part1Migration();
  await runPhase3Part2Migration();
  await runEnterpriseCapabilitiesMigration();
};

module.exports = {
  runPhase3Part1Migration,
  runPhase3Part2Migration,
  runEnterpriseCapabilitiesMigration,
  runAllMigrations,
};

