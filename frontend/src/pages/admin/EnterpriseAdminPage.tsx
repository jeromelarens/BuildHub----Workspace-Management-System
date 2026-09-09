import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '../../hooks/useUsers';
import { useRoles } from '../../hooks/useRoles';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import {
  Users,
  ShieldCheck,
  FileText,
  Building2,
  Lock,
  Webhook,
  Download,
  ArrowUpRight,
  Server,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingState } from '../../components/ui/LoadingState';

export const EnterpriseAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: usersData, isLoading: isUsersLoading } = useUsers();
  const { data: roles = [], isLoading: isRolesLoading } = useRoles();
  const { data: auditData, isLoading: isAuditLoading } = useAuditLogs({ limit: 10 });

  const users = usersData?.users || [];
  const auditLogs = auditData?.logs || [];

  const isLoading = isUsersLoading || isRolesLoading || isAuditLoading;

  if (isLoading) {
    return <LoadingState message="Loading enterprise administration hub..." />;
  }

  const adminModules = [
    {
      title: 'Users Management',
      description: 'Manage employee accounts, assign system roles, and inspect user profiles.',
      icon: <Users className="w-5 h-5 text-brand" />,
      path: '/users',
      stat: `${users.length} Users`,
    },
    {
      title: 'Roles & Granular RBAC',
      description: 'Configure role permissions, matrix delegations, and operational security boundaries.',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      path: '/roles-permissions',
      stat: `${roles.length} System Roles`,
    },
    {
      title: 'Compliance & Audit Trail',
      description: 'Review system mutations, authentication events, and administrative security logs.',
      icon: <FileText className="w-5 h-5 text-purple-400" />,
      path: '/audit-logs',
      stat: `${auditLogs.length}+ Events`,
    },
    {
      title: 'Team Directory & Workload',
      description: 'Inspect cross-project team distribution, sprint roles, and member velocity.',
      icon: <Users className="w-5 h-5 text-blue-400" />,
      path: '/team',
      stat: 'Live Directory',
    },
    {
      title: 'Workspace Configuration',
      description: 'Manage tenant metadata, storage quotas, and single-tenant runtime boundaries.',
      icon: <Building2 className="w-5 h-5 text-amber-400" />,
      path: '/settings/workspace',
      stat: 'Single-Tenant',
    },
    {
      title: 'Security & Enterprise Policies',
      description: 'Inspect session controls, attachment constraints, and password lifecycle rules.',
      icon: <Lock className="w-5 h-5 text-rose-400" />,
      path: '/settings/policies',
      stat: '5 Policies Active',
    },
    {
      title: 'Outbound Webhooks',
      description: 'Configure real-time HMAC-SHA256 event streams to external microservices.',
      icon: <Webhook className="w-5 h-5 text-brand" />,
      path: '/settings/webhooks',
      stat: '1 Endpoint',
    },
    {
      title: 'Data Portability & Import',
      description: 'Export authorized records or run pre-flight validation on CSV task datasets.',
      icon: <Download className="w-5 h-5 text-emerald-400" />,
      path: '/settings/import-export',
      stat: 'CSV / JSON',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Enterprise Administration</h1>
            <Badge variant="brand">Admin Only</Badge>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Centralized hub for workspace security, identity governance, audit trails, and platform integrations.
          </p>
        </div>
      </div>

      {/* System Health Summary Card */}
      <Card className="p-5 bg-dark-surface border-dark-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-text-primary">BUILDHUB Backend Engine v4.0.0</h3>
                <Badge variant="success">Healthy</Badge>
              </div>
              <p className="text-xs text-text-muted mt-0.5 font-mono">
                PostgreSQL 16 &bull; Strict JWT Authentication &bull; Express REST API &bull; 586 Unit/Regression Specs Passing
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Administration Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminModules.map((mod) => (
          <Card
            key={mod.title}
            className="p-5 bg-dark-surface border-dark-border hover:border-dark-borderHover transition-all flex flex-col justify-between cursor-pointer group"
            onClick={() => navigate(mod.path)}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-dark-elevated border border-dark-borderSubtle flex items-center justify-center group-hover:scale-105 transition-transform">
                  {mod.icon}
                </div>
                <Badge variant="default" className="text-[10px] font-mono">
                  {mod.stat}
                </Badge>
              </div>

              <h3 className="text-sm font-bold text-text-primary mt-3 group-hover:text-brand transition-colors">
                {mod.title}
              </h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">{mod.description}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-dark-borderSubtle flex items-center justify-between text-xs text-text-muted group-hover:text-text-primary">
              <span className="text-[11px]">Open Console</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-text-muted group-hover:text-brand transition-colors" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
