import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { AuditLogEntry } from '../../types';
import { formatDateTime } from '../../utils/date';
import { AuditDetailModal } from './AuditDetailModal';
import { Shield, Download, Eye } from 'lucide-react';

export interface AuditLogTableProps {
  logs: AuditLogEntry[];
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({ logs }) => {
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = ['Event ID', 'Timestamp', 'Actor Name', 'Actor Email', 'Action', 'Entity Type', 'Entity ID', 'IP Address'];
    const rows = logs.map((l) => [
      l.id,
      `"${formatDateTime(l.created_at)}"`,
      `"${l.actor?.name || 'System'}"`,
      `"${l.actor?.email || ''}"`,
      `"${l.action}"`,
      `"${l.entity_type || ''}"`,
      l.entity_id || '',
      `"${l.ip_address || ''}"`,
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `buildhub_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('DELETE') || action.includes('REMOVED')) return 'danger';
    if (action.includes('CREATE') || action.includes('ADDED') || action.includes('RESTORED')) return 'success';
    if (action.includes('UPDATE') || action.includes('ROLE')) return 'warning';
    return 'default';
  };

  return (
    <>
      <Card className="p-0 overflow-hidden bg-dark-surface border-dark-borderSubtle">
        <div className="p-5 border-b border-dark-borderSubtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand" />
              Security Audit Trail
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Append-only immutable record of all administrative, access, and data modification events.
            </p>
          </div>

          {logs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export CSV
            </Button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted">
            No audit log records match the current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-dark-borderSubtle bg-dark-elevated/40 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-borderSubtle">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-dark-elevated/30 transition-colors">
                    <td className="py-3 px-4 text-text-muted font-mono whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>

                    <td className="py-3 px-4">
                      {log.actor ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={log.actor.name} size="xs" />
                          <div className="min-w-0">
                            <span className="font-semibold text-text-primary block truncate">
                              {log.actor.name}
                            </span>
                            <span className="text-[10px] text-text-muted block truncate">
                              {log.actor.email}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-text-muted italic">System</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant={getActionBadgeVariant(log.action)} size="sm" className="font-mono text-[10px]">
                        {log.action}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-text-secondary font-mono">
                      {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                    </td>

                    <td className="py-3 px-4 text-text-muted font-mono">
                      {log.ip_address || '127.0.0.1'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEntry(log)}
                        className="text-text-secondary hover:text-brand"
                        title="View payload"
                        aria-label="View payload"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AuditDetailModal
        entry={selectedEntry}
        isOpen={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
      />
    </>
  );
};
