import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../../hooks/useTasks';
import { useUsers } from '../../hooks/useUsers';
import {
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/LoadingState';
import { EmptyState } from '../ui/EmptyState';

export interface OperationalRisk {
  id: string;
  category: 'Schedule' | 'Resource' | 'Hygiene';
  title: string;
  severity: 'High' | 'Medium' | 'Low';
  entity: string;
  reason: string;
  actionLabel: string;
  actionPath: string;
}

export const RiskIntelligenceView: React.FC = () => {
  const navigate = useNavigate();
  const { data: tasksData, isLoading: isTasksLoading } = useTasks({ limit: 1000 });
  const { data: usersData, isLoading: isUsersLoading } = useUsers();

  const tasks = useMemo(() => tasksData?.tasks || [], [tasksData]);
  const users = useMemo(() => usersData?.users || [], [usersData]);

  // Analyze all operational risks from database records
  const risks = useMemo(() => {
    const riskList: OperationalRisk[] = [];
    const now = new Date();

    // 1. Detect Overdue Tasks (Schedule Risk)
    tasks.forEach((t) => {
      if (t.status !== 'completed' && t.due_date && new Date(t.due_date) < now) {
        const isUrgent = t.priority === 'urgent' || t.priority === 'high';
        riskList.push({
          id: `overdue_${t.id}`,
          category: 'Schedule',
          title: `Overdue Task: ${t.title}`,
          severity: isUrgent ? 'High' : 'Medium',
          entity: `Task #${t.id} (${t.priority} priority)`,
          reason: `Target due date (${t.due_date}) has passed while in "${t.status}" status.`,
          actionLabel: 'Update Task',
          actionPath: `/tasks/${t.id}`,
        });
      }
    });

    // 2. Detect Overloaded Members (Resource Risk)
    const userActiveTaskCount = new Map<number, number>();
    tasks.forEach((t) => {
      if (t.assigned_to && t.status !== 'completed') {
        userActiveTaskCount.set(t.assigned_to, (userActiveTaskCount.get(t.assigned_to) || 0) + 1);
      }
    });

    userActiveTaskCount.forEach((count, userId) => {
      if (count >= 5) {
        const member = users.find((u) => u.id === userId);
        riskList.push({
          id: `overload_${userId}`,
          category: 'Resource',
          title: `Resource Overload: ${member ? member.name : `User #${userId}`}`,
          severity: count >= 8 ? 'High' : 'Medium',
          entity: `${count} active assigned tasks`,
          reason: `High concurrent task volume exceeds optimal threshold (>5 tasks).`,
          actionLabel: 'Rebalance Workload',
          actionPath: '/workload',
        });
      }
    });

    // 3. Detect Unassigned High-Priority Tasks (Hygiene Risk)
    tasks.forEach((t) => {
      if (!t.assigned_to && t.status !== 'completed' && (t.priority === 'urgent' || t.priority === 'high')) {
        riskList.push({
          id: `unassigned_${t.id}`,
          category: 'Hygiene',
          title: `Unassigned Urgent Task: "${t.title}"`,
          severity: 'High',
          entity: `Priority: ${t.priority}`,
          reason: 'High priority task lacks a designated owner.',
          actionLabel: 'Assign Task',
          actionPath: `/tasks/${t.id}`,
        });
      }
    });

    return riskList;
  }, [tasks, users]);

  const isLoading = isTasksLoading || isUsersLoading;

  if (isLoading) {
    return <LoadingState message="Scanning workspace for operational bottlenecks..." />;
  }

  const highSeverityCount = risks.filter((r) => r.severity === 'High').length;
  const mediumSeverityCount = risks.filter((r) => r.severity === 'Medium').length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Critical/High Risks</p>
            <p className="text-xl font-bold text-rose-400 mt-0.5">{highSeverityCount}</p>
          </div>
        </Card>

        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Medium Risks</p>
            <p className="text-xl font-bold text-amber-400 mt-0.5">{mediumSeverityCount}</p>
          </div>
        </Card>

        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Total Bottlenecks</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">{risks.length}</p>
          </div>
        </Card>
      </div>

      {/* Risk List */}
      {risks.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-8 h-8 text-emerald-400" />}
          title="Zero Operational Bottlenecks Detected"
          description="All tasks are on schedule, dependencies are clear, and workload is balanced."
        />
      ) : (
        <div className="space-y-3">
          {risks.map((risk) => (
            <Card
              key={risk.id}
              className="p-4 bg-dark-surface border-dark-border hover:border-dark-borderHover transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={risk.severity === 'High' ? 'danger' : 'warning'}
                    className="text-[10px] font-bold"
                  >
                    {risk.severity} Severity
                  </Badge>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-dark-elevated text-text-muted border border-dark-borderSubtle">
                    {risk.category}
                  </span>
                  <h4 className="text-xs font-bold text-text-primary">{risk.title}</h4>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">{risk.entity}:</strong> {risk.reason}
                </p>
              </div>

              <div className="shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(risk.actionPath)}
                  rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
                >
                  {risk.actionLabel}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
