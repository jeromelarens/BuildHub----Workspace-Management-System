import React from 'react';
import {
  Shield,
  FileCheck,
  CheckCircle2,
  Clock,
  HardDrive,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';

export const PoliciesPage: React.FC = () => {
  const policies = [
    {
      id: 'attachments',
      title: 'File Upload & Attachment Security Policy',
      category: 'Storage & Security',
      status: 'Enforced by Backend',
      description:
        'Limits file uploads to 10MB per attachment. Enforces signature and MIME validation for PDF, PNG, JPEG, DOCX, XLSX, and ZIP files. Rejects executable and script payloads.',
      icon: <HardDrive className="w-5 h-5 text-brand" />,
      details: [
        'Max File Size: 10 MB per file',
        'Whitelisted MIME: application/pdf, image/png, image/jpeg, application/zip, Office docs',
        'Storage: Secure localized storage with collision-safe UUID hashing',
      ],
    },
    {
      id: 'session',
      title: 'Authentication & Session Lifecycle Policy',
      category: 'Identity',
      status: 'Enforced by Backend',
      description:
        'JWT tokens signed with HMAC-SHA256 with 24-hour expiration. Passwords hashed using Bcrypt (10 salt rounds).',
      icon: <Clock className="w-5 h-5 text-blue-400" />,
      details: [
        'Token Lifetime: 24 hours',
        'Algorithm: HS256',
        'Auto-Logout on 401 Unauthorized API response',
      ],
    },
    {
      id: 'rbac',
      title: 'Role-Based Access Control (RBAC) Governance',
      category: 'Access Control',
      status: 'Enforced by Backend',
      description:
        'Granular matrix dividing Admin, Manager, Team Lead, and Employee roles. Team Lead role is strictly scoped to project leads and cannot administer system users.',
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
      details: [
        'Team Lead != Manager boundary strictly verified',
        'Project Leads can delegate tasks only to project members',
        'Audit Logs query restricted exclusively to Admin role',
      ],
    },
    {
      id: 'audit',
      title: 'Compliance & Mutation Audit Logging',
      category: 'Compliance',
      status: 'Enforced by Backend',
      description:
        'All task, project, role, attachment, and comment mutations write immutable audit trail records with IP address, user agent, and before/after metadata.',
      icon: <FileCheck className="w-5 h-5 text-purple-400" />,
      details: [
        'Sensitive passwords and private JWTs stripped from audit details',
        'Indexed on action, user_id, and entity timestamp',
      ],
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Enterprise Workspace Policies</h1>
            <Badge variant="brand">Security & Governance</Badge>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Active security policies, resource constraints, and operational compliance rules enforced by the backend engine.
          </p>
        </div>
      </div>

      <Alert
        variant="info"
        title="Authoritative Backend Enforcement"
      >
        All policies documented here are strictly enforced by the backend API middleware and database constraints. Frontend UI does not act as a security boundary.
      </Alert>

      {/* Policies List */}
      <div className="space-y-4">
        {policies.map((pol) => (
          <Card key={pol.id} className="p-5 bg-dark-surface border-dark-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-dark-elevated border border-dark-borderSubtle flex items-center justify-center shrink-0">
                  {pol.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-text-primary">{pol.title}</h3>
                    <Badge variant="success" className="text-[10px]">
                      {pol.status}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-text-muted">{pol.category}</span>
                  <p className="text-xs text-text-secondary mt-2 leading-relaxed">{pol.description}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-dark-borderSubtle">
              <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider block mb-2">
                Active Enforcements:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {pol.details.map((detail, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-dark-elevated/60 border border-dark-borderSubtle text-xs text-text-secondary flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
