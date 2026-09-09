import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { useToast } from '../../hooks/useToast';
import {
  Shield,
  LogOut,
  Laptop,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

export const SecurityPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { success } = useToast();
  const { data: auditData } = useAuditLogs({ limit: 10 });

  const auditLogs = auditData?.logs || [];

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Enterprise Security Center</h1>
            <Badge variant="brand">Zero Trust</Badge>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Active session governance, cryptographic safeguards, and authentication security telemetry.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            logout();
            success('Active session terminated successfully.');
          }}
          leftIcon={<LogOut className="w-3.5 h-3.5 text-rose-400" />}
        >
          Terminate Session
        </Button>
      </div>

      {/* Security Status Alert */}
      <Alert
        variant="info"
        title="Authoritative Authentication Boundary"
      >
        All authentication decisions, token lifecycle validations, and RBAC matrix permissions are authoritatively enforced by the backend database and middleware.
      </Alert>

      {/* Active Session & Device Identity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 bg-dark-surface border-dark-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-text-primary">Current Authenticated Session</h3>
                <Badge variant="success" className="text-[10px]">
                  Active
                </Badge>
              </div>
              <p className="text-xs text-text-muted mt-0.5">JWT HMAC-SHA256 Bearer Token</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-dark-elevated/50 border border-dark-borderSubtle">
              <span className="text-text-muted">Authenticated User</span>
              <span className="font-semibold text-text-primary">{user?.name} ({user?.email})</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-dark-elevated/50 border border-dark-borderSubtle">
              <span className="text-text-muted">Assigned System Role</span>
              <span className="font-semibold text-brand capitalize">{user?.role?.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-dark-elevated/50 border border-dark-borderSubtle">
              <span className="text-text-muted">Token Lifespan</span>
              <span className="font-semibold text-text-primary">24 Hours (Rolling Expiry)</span>
            </div>
          </div>
        </Card>

        {/* Cryptographic Standards */}
        <Card className="p-5 bg-dark-surface border-dark-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Cryptographic Controls</h3>
              <p className="text-xs text-text-muted mt-0.5">Backend Password & Data Security</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 text-xs">
            <div className="p-2.5 rounded-lg bg-dark-elevated/50 border border-dark-borderSubtle flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-text-primary block">Bcrypt Password Hashing</strong>
                <span className="text-text-muted text-[11px]">Enforced 10 salt rounds with zero plaintext storage.</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-dark-elevated/50 border border-dark-borderSubtle flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-text-primary block">Header Security & Protection</strong>
                <span className="text-text-muted text-[11px]">Helmet security middleware enforcing XSS and frameguard protection.</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Security Activity Stream */}
      <Card className="p-5 bg-dark-surface border-dark-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Recent Security & Mutation Telemetry
            </h3>
          </div>
          <span className="text-[11px] text-text-muted">PostgreSQL Immutable Log</span>
        </div>

        <div className="divide-y divide-dark-borderSubtle border border-dark-borderSubtle rounded-xl overflow-hidden">
          {auditLogs.slice(0, 5).map((log) => (
            <div key={log.id} className="p-3 bg-dark-elevated/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Badge variant="default" className="text-[10px] font-mono">
                  {log.action}
                </Badge>
                <span className="text-text-secondary">
                  Target: <strong className="text-text-primary">{log.entity_type} #{log.entity_id}</strong>
                </span>
              </div>
              <span className="text-text-muted font-mono text-[11px]">
                {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
