import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';
import { useUnreadNotifications } from '../../hooks/useNotifications';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  BarChart3,
  Bell,
  Settings,
  ShieldCheck,
  FileText,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
  GitBranch,
  Trash2,
  Briefcase,
  Layers,
  Clock,
  Workflow,
  FileCode,
  CheckSquare2,
  Building2,
  Lock,
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { IconButton } from '../ui/IconButton';
import { UserMenu } from './UserMenu';
import { UserRole } from '../../types/role.types';

export interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface NavItemConfig {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  roles: UserRole[];
}

interface NavGroupConfig {
  groupName: string;
  items: NavItemConfig[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { user } = useAuth();
  const userRole = (user?.role as UserRole) || 'employee';

  // Live unread notifications count
  const { data: unreadCount = 0 } = useUnreadNotifications(!!user);

  // Categorized Navigation Information Architecture for BUILDHUB
  const navGroups: NavGroupConfig[] = [
    {
      groupName: 'Workspace',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'team_lead', 'employee'] },
        { label: 'Users Directory', path: '/users', icon: Users, roles: ['admin'] },
        { label: userRole === 'team_lead' ? 'My Projects' : 'Projects', path: '/projects', icon: FolderKanban, roles: ['admin', 'manager', 'team_lead', 'employee'] },
        { label: userRole === 'employee' ? 'My Tasks' : 'Tasks', path: '/tasks', icon: CheckSquare, roles: ['admin', 'manager', 'team_lead', 'employee'] },
        { label: 'Team Directory', path: '/team', icon: Users, roles: ['admin', 'manager', 'team_lead'] },
      ],
    },
    {
      groupName: 'Work Management',
      items: [
        { label: 'Approvals', path: '/approvals', icon: CheckSquare2, roles: ['admin', 'manager', 'team_lead'] },
        { label: 'Timesheets & Delivery', path: '/timesheets', icon: Clock, roles: ['admin', 'manager', 'team_lead', 'employee'] },
        { label: 'Workload Capacity', path: '/workload', icon: Briefcase, roles: ['admin', 'manager', 'team_lead'] },
        { label: 'Task Dependencies', path: '/tasks/dependencies', icon: GitBranch, roles: ['admin', 'manager', 'team_lead', 'employee'] },
        { label: 'Automations', path: '/automations', icon: Zap, roles: ['admin', 'manager', 'team_lead'] },
        { label: 'Workflow Editor', path: '/workflow', icon: Workflow, roles: ['admin', 'manager', 'team_lead'] },
        { label: 'Custom Fields', path: '/custom-fields', icon: FileCode, roles: ['admin', 'manager'] },
        { label: 'Project Templates', path: '/templates', icon: Layers, roles: ['admin', 'manager'] },
      ],
    },
    {
      groupName: 'Insights',
      items: [
        { label: 'Analytics & KPIs', path: '/analytics', icon: BarChart3, roles: ['admin', 'manager', 'team_lead', 'employee'] },
        { label: 'Compliance Posture', path: '/compliance', icon: ShieldCheck, roles: ['admin'] },
        { label: 'Audit Telemetry', path: '/audit-logs', icon: FileText, roles: ['admin'] },
        {
          label: 'Notifications',
          path: '/notifications',
          icon: Bell,
          badge: unreadCount > 0 ? unreadCount : undefined,
          roles: ['admin', 'manager', 'team_lead', 'employee'],
        },
      ],
    },
    {
      groupName: 'Administration & System',
      items: [
        { label: 'Enterprise Admin', path: '/admin/enterprise', icon: ShieldCheck, roles: ['admin'] },
        { label: 'Roles & Permissions', path: '/roles-permissions', icon: Lock, roles: ['admin'] },
        { label: 'Workspace Settings', path: '/settings/workspace', icon: Building2, roles: ['admin', 'manager', 'team_lead', 'employee'] },
        { label: 'Outbound Webhooks', path: '/settings/webhooks', icon: Zap, roles: ['admin', 'manager'] },
        { label: 'Import / Export', path: '/settings/import-export', icon: FileText, roles: ['admin', 'manager', 'team_lead', 'employee'] },
        { label: 'Security Center', path: '/settings/security', icon: ShieldCheck, roles: ['admin', 'manager', 'team_lead', 'employee'] },
        { label: 'Governance Policies', path: '/settings/policies', icon: ShieldCheck, roles: ['admin', 'manager', 'team_lead', 'employee'] },
        { label: 'Account Profile', path: '/settings', icon: Settings, roles: ['admin', 'manager', 'team_lead', 'employee'] },
        { label: 'Trash Bin', path: '/trash', icon: Trash2, roles: ['admin', 'manager', 'team_lead', 'employee'] },
      ],
    },
  ];

  const renderNavItem = (item: NavItemConfig) => {
    const Icon = item.icon;

    const navContent = (
      <NavLink
        to={item.path}
        onClick={() => setIsMobileOpen(false)}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2.5 px-3 py-2.5 lg:py-1.5 rounded-lg text-sm lg:text-xs font-medium transition-all duration-150 select-none group min-h-[42px] lg:min-h-[32px]',
            isCollapsed ? 'justify-center px-2' : '',
            isActive
              ? 'bg-brand/15 text-brand border border-brand/30 shadow-sm font-semibold'
              : 'text-text-secondary hover:text-text-primary hover:bg-dark-hover border border-transparent'
          )
        }
      >
        <Icon className={cn('w-4 h-4 shrink-0 transition-transform group-hover:scale-105')} />
        {!isCollapsed && (
          <>
            <span className="truncate flex-1">{item.label}</span>
            {item.badge !== undefined && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-brand/20 border border-brand/30 text-brand">
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.label + item.path} content={item.label} placement="right">
          {navContent}
        </Tooltip>
      );
    }

    return <div key={item.label + item.path}>{navContent}</div>;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-3 select-none overflow-y-auto">
      {/* Top Brand Header */}
      <div>
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-dark-borderSubtle">
          <div className={cn('flex items-center gap-2.5', isCollapsed && 'justify-center w-full')}>
            <img
              src="/Buildhub--Logo.png"
              alt="BuildHub"
              className="w-8 h-8 rounded-full object-cover shrink-0 drop-shadow-[0_0_8px_rgba(199,255,0,0.35)]"
            />

            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-text-primary flex items-center gap-1.5">
                  BUILDHUB
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand/15 text-brand font-semibold border border-brand/20 capitalize">
                    {userRole.replace('_', ' ')}
                  </span>
                </span>
                <span className="text-[10px] text-text-muted">Enterprise Work Management</span>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <div className="lg:hidden">
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Close sidebar"
              onClick={() => setIsMobileOpen(false)}
            >
              <X className="w-4 h-4" />
            </IconButton>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-4">
          {navGroups.map((group) => {
            const filteredItems = group.items.filter((item) => item.roles.includes(userRole));
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.groupName} className="space-y-1">
                {!isCollapsed && (
                  <p className="px-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    {group.groupName}
                  </p>
                )}
                <nav className="space-y-0.5">{filteredItems.map(renderNavItem)}</nav>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Profile & Collapse Trigger */}
      <div className="pt-3 border-t border-dark-borderSubtle flex flex-col gap-2 mt-4">
        <UserMenu collapsed={isCollapsed} />

        {/* Desktop Collapse Toggle */}
        <div className="hidden lg:flex justify-end pt-1">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-2 text-xs font-medium text-text-muted hover:text-text-primary hover:bg-dark-hover rounded-md transition-colors border border-transparent hover:border-dark-borderSubtle"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-brand" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[11px]">Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-30 bg-dark-surface border-r border-dark-border transition-all duration-200 ease-in-out',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 w-72 bg-dark-surface border-r border-dark-border lg:hidden transition-transform duration-200 ease-in-out shadow-2xl',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
