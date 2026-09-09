import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTeamVelocity } from '../../hooks/useAnalytics';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { WorkloadDetailModal, WorkloadUser } from '../../components/workload/WorkloadDetailModal';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Briefcase,
  TrendingUp,
  Download,
  Search,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const WorkloadPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFilter = searchParams.get('search') || '';

  const [selectedUser, setSelectedUser] = useState<WorkloadUser | null>(null);

  const { data, isLoading, isError, refetch } = useTeamVelocity();
  const workload = data?.workload_by_assignee || [];

  // Authoritative calculations from backend data
  const totalAssignedTasks = workload.reduce((acc, u) => acc + u.total_assigned, 0);
  const totalActiveTasks = workload.reduce((acc, u) => acc + u.active, 0);
  const totalCompletedTasks = workload.reduce((acc, u) => acc + u.completed, 0);
  const totalOverdueTasks = workload.reduce((acc, u) => acc + u.overdue, 0);

  // Filter workload by search
  const filteredWorkload = workload.filter((u) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return u.name.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q));
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const newParams = new URLSearchParams(searchParams);
    if (val) {
      newParams.set('search', val);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  const exportCSV = () => {
    const headers = ['Assignee', 'Email', 'Assigned Tasks', 'Active Tasks', 'Completed Tasks', 'Overdue Tasks', 'Active Workload Share'];
    const rows = filteredWorkload.map((u) => {
      const share = totalActiveTasks > 0 ? Math.round((u.active / totalActiveTasks) * 100) : 0;
      return [
        `"${u.name}"`,
        `"${u.email || ''}"`,
        u.total_assigned,
        u.active,
        u.completed,
        u.overdue,
        `${share}%`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `buildhub-team-workload-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Users className="w-6 h-6 text-brand" />
            <span>Team Workload & Distribution</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Authoritative resource metrics, active task distribution, and individual workload breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            leftIcon={<Download className="w-4 h-4" />}
            disabled={filteredWorkload.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Authoritative Resource KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Assigned Tasks</span>
            <div className="p-2 rounded-lg bg-dark-elevated text-text-primary">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary">{totalAssignedTasks}</div>
          <p className="text-[11px] text-text-secondary">Total tasks assigned across team</p>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Active Tasks</span>
            <div className="p-2 rounded-lg bg-brand/10 text-brand">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-brand">{totalActiveTasks}</div>
          <p className="text-[11px] text-text-secondary">Currently pending or in progress</p>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Completed Tasks</span>
            <div className="p-2 rounded-lg bg-status-success/10 text-status-success">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary">{totalCompletedTasks}</div>
          <p className="text-[11px] text-text-secondary">Successfully delivered</p>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Overdue Pressure</span>
            <div className="p-2 rounded-lg bg-status-danger/10 text-status-danger">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-status-danger">{totalOverdueTasks}</div>
          <p className="text-[11px] text-text-secondary">Tasks past scheduled due date</p>
        </Card>
      </div>

      {/* Workload Distribution Table */}
      <Card className="p-0 overflow-hidden bg-dark-surface border-dark-borderSubtle">
        {/* Table Controls */}
        <div className="p-4 border-b border-dark-borderSubtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-bold text-text-primary">Assignee Workload Breakdown</h3>
            <span className="text-xs text-text-muted font-normal">({filteredWorkload.length} users)</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={handleSearchChange}
              placeholder="Filter by assignee name..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-dark-bg border border-dark-borderSubtle text-xs text-text-primary focus:outline-none focus:border-brand transition-colors"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton variant="rectangular" className="h-10 w-full" />
            <Skeleton variant="rectangular" className="h-10 w-full" />
            <Skeleton variant="rectangular" className="h-10 w-full" />
          </div>
        ) : isError ? (
          <div className="p-8">
            <ErrorState
              title="Could not load workload"
              message="Failed to retrieve team capacity metrics from server."
              onRetry={() => refetch()}
            />
          </div>
        ) : filteredWorkload.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-muted">
            No active task workload matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-dark-borderSubtle bg-dark-elevated/40 text-text-muted uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Assigned</th>
                  <th className="py-3 px-4">Active</th>
                  <th className="py-3 px-4">Completed</th>
                  <th className="py-3 px-4">Overdue</th>
                  <th className="py-3 px-4 w-48">Active Workload Share</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-borderSubtle/60">
                {filteredWorkload.map((u) => {
                  const share = totalActiveTasks > 0 ? Math.round((u.active / totalActiveTasks) * 100) : 0;
                  const isHigh = share > 40;
                  const isModerate = share >= 20 && !isHigh;

                  return (
                    <tr
                      key={u.user_id || u.name}
                      onClick={() => setSelectedUser(u)}
                      className="hover:bg-dark-elevated/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.name} size="sm" />
                          <div>
                            <div className="font-semibold text-text-primary group-hover:text-brand transition-colors">
                              {u.name}
                            </div>
                            {u.email && <div className="text-[11px] text-text-muted">{u.email}</div>}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-text-primary">
                        {u.total_assigned}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-brand">
                        {u.active}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-status-success font-medium">
                        {u.completed}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {u.overdue > 0 ? (
                          <span className="font-bold text-status-danger flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {u.overdue}
                          </span>
                        ) : (
                          <span className="text-text-muted">0</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-medium text-text-secondary">{share}%</span>
                            <span className="text-text-muted">{u.active} of {totalActiveTasks} active</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-dark-elevated overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isHigh
                                  ? 'bg-status-warning'
                                  : isModerate
                                  ? 'bg-brand'
                                  : 'bg-dark-border'
                              }`}
                              style={{ width: `${Math.min(share, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1 text-[11px] text-text-muted group-hover:text-brand font-medium">
                          <span>View Tasks</span>
                          <ChevronRight className="w-3.5 h-3.5" />
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

      {/* Workload Detail Modal */}
      <WorkloadDetailModal
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
};

export default WorkloadPage;
