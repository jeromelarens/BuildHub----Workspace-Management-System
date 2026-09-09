import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { WorkloadAssignee } from '../../types';
import { Users, Download } from 'lucide-react';

export interface WorkloadTableProps {
  workload: WorkloadAssignee[];
}

export const WorkloadTable: React.FC<WorkloadTableProps> = ({ workload }) => {
  const handleExportCSV = () => {
    if (workload.length === 0) return;

    const headers = ['Assignee Name', 'Email', 'Total Assigned', 'Active Tasks', 'Completed Tasks', 'Overdue Tasks', 'Completion Rate'];
    const rows = workload.map((w) => {
      const rate = w.total_assigned > 0 ? Math.round((w.completed / w.total_assigned) * 100) : 0;
      return [
        `"${w.name}"`,
        `"${w.email || ''}"`,
        w.total_assigned,
        w.active,
        w.completed,
        w.overdue,
        `"${rate}%"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `buildhub_team_workload_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-0 overflow-hidden bg-dark-surface border-dark-borderSubtle">
      <div className="p-5 border-b border-dark-borderSubtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Users className="w-4 h-4 text-brand" />
            Team Workload & Output
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Distribution of assigned, completed, and overdue items across team members.
          </p>
        </div>

        {workload.length > 0 && (
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

      {workload.length === 0 ? (
        <div className="py-12 text-center text-xs text-text-muted">
          No team workload records available.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-dark-borderSubtle bg-dark-elevated/40 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4 text-center">Total Assigned</th>
                <th className="py-3 px-4 text-center">Active</th>
                <th className="py-3 px-4 text-center">Completed</th>
                <th className="py-3 px-4 text-center">Overdue</th>
                <th className="py-3 px-4">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-borderSubtle">
              {workload.map((w, idx) => {
                const rate = w.total_assigned > 0 ? Math.round((w.completed / w.total_assigned) * 100) : 0;
                return (
                  <tr key={w.user_id || idx} className="hover:bg-dark-elevated/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={w.name} size="xs" />
                        <div className="min-w-0">
                          <span className="font-semibold text-text-primary block truncate">
                            {w.name}
                          </span>
                          {w.email && (
                            <span className="text-[10px] text-text-muted block truncate">
                              {w.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-text-primary">
                      {w.total_assigned}
                    </td>

                    <td className="py-3 px-4 text-center text-brand font-medium">
                      {w.active}
                    </td>

                    <td className="py-3 px-4 text-center text-status-success font-medium">
                      {w.completed}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {w.overdue > 0 ? (
                        <Badge variant="danger" size="sm">
                          {w.overdue}
                        </Badge>
                      ) : (
                        <span className="text-text-muted">0</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 rounded-full bg-dark-elevated overflow-hidden">
                          <div
                            style={{ width: `${rate}%` }}
                            className="h-full bg-brand rounded-full transition-all duration-300"
                          />
                        </div>
                        <span className="text-xs font-semibold text-text-primary">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
