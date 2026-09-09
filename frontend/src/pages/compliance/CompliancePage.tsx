import React from 'react';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { useRoles } from '../../hooks/useRoles';
import { useToast } from '../../hooks/useToast';
import {
  FileCheck,
  ShieldCheck,
  Download,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { LoadingState } from '../../components/ui/LoadingState';

export const CompliancePage: React.FC = () => {
  const { success, info } = useToast();
  const { data: auditData, isLoading: isAuditLoading } = useAuditLogs({ limit: 100 });
  const { data: roles = [], isLoading: isRolesLoading } = useRoles();

  const auditLogs = auditData?.logs || [];
  const totalAuditEvents = auditData?.pagination?.total ?? auditLogs.length;

  const handleExportComplianceReport = () => {
    if (auditLogs.length === 0) {
      info('No compliance records available for export.');
      return;
    }

    const report = {
      title: 'BUILDHUB Operational Security & Compliance Report',
      generated_at: new Date().toISOString(),
      operational_controls: {
        authentication: 'JWT HMAC-SHA256 (24-hour expiration)',
        password_hashing: 'Bcrypt with 10 salt rounds',
        rbac_governance: 'Strict 4-tier Role-Based Access Control',
        storage_policy: '10MB max upload with signature MIME whitelisting',
        audit_trail: 'PostgreSQL immutable mutation logging',
      },
      system_roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissionCount: r.permissions?.length ?? 0,
      })),
      recent_audit_events_sample: auditLogs.slice(0, 50),
    };

    const jsonString = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `buildhub-compliance-report-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Compliance report exported.');
  };

  const isLoading = isAuditLoading || isRolesLoading;

  if (isLoading) {
    return <LoadingState message="Aggregating compliance and security telemetry..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Compliance & Governance Controls</h1>
            <Badge variant="brand">Operational Audit</Badge>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Verification of backend security controls, immutable audit trails, and data isolation guarantees.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleExportComplianceReport}
          leftIcon={<Download className="w-3.5 h-3.5" />}
        >
          Export Compliance Report
        </Button>
      </div>

      <Alert
        variant="info"
        title="Operational Security Governance"
      >
        BUILDHUB enforces operational security and access controls at the database and API gateway tiers. System records are tamper-evident and tracked in PostgreSQL.
      </Alert>

      {/* Compliance Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Total Audit Events</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">{totalAuditEvents}</p>
          </div>
        </Card>

        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Active Roles & Matrix</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">{roles.length} System Roles</p>
          </div>
        </Card>

        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Upload Constraints</p>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">10 MB Strict</p>
          </div>
        </Card>
      </div>

      {/* Operational Control Matrix */}
      <Card className="p-5 bg-dark-surface border-dark-border space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-brand" />
          <h3 className="text-sm font-bold text-text-primary">Operational Control Specifications</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-dark-elevated/50 border border-dark-borderSubtle space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <strong className="text-text-primary">Data Retention & Cascade Safety</strong>
            </div>
            <p className="text-text-secondary pl-6">
              Projects and task deletions cascade cleanly with foreign key integrity. Soft-deleted tasks are archived in Trash before permanent administrative deletion.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-dark-elevated/50 border border-dark-borderSubtle space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <strong className="text-text-primary">Least Privilege Authorization</strong>
            </div>
            <p className="text-text-secondary pl-6">
              Employees can only access assigned tasks and assigned project workspaces. Team Leads cannot perform tenant-wide administrative operations.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-dark-elevated/50 border border-dark-borderSubtle space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <strong className="text-text-primary">MIME Signature Whitelist</strong>
            </div>
            <p className="text-text-secondary pl-6">
              Attachments are inspected for true file header magic bytes, rejecting executable files (.exe, .sh) and mismatched extensions.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-dark-elevated/50 border border-dark-borderSubtle space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <strong className="text-text-primary">Sanitized Audit Records</strong>
            </div>
            <p className="text-text-secondary pl-6">
              Audit log serialization strips passwords, hashes, private tokens, and internal keys before persisting to the database.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
