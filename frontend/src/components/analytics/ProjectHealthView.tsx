import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../../hooks/useProjects';
import { useTasks } from '../../hooks/useTasks';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FolderKanban,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { LoadingState } from '../ui/LoadingState';
import { EmptyState } from '../ui/EmptyState';

export interface ProjectHealthMetric {
  projectId: number;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionPercentage: number;
  healthScore: number;
  status: 'Healthy' | 'At Risk' | 'Critical';
  reasons: string[];
}

export const ProjectHealthView: React.FC = () => {
  const navigate = useNavigate();
  const { data: projectsData, isLoading: isProjectsLoading } = useProjects();
  const { data: tasksData, isLoading: isTasksLoading } = useTasks({ limit: 1000 });

  const projects = useMemo(() => projectsData?.projects || [], [projectsData]);
  const tasks = useMemo(() => tasksData?.tasks || [], [tasksData]);

  // Compute objective mathematical health metrics for each project
  const projectHealthList = useMemo(() => {
    const now = new Date();

    return projects.map((p): ProjectHealthMetric => {
      const projectTasks = tasks.filter((t) => t.project_id === p.id);
      const total = projectTasks.length;
      const completed = projectTasks.filter((t) => t.status === 'completed').length;
      const pending = total - completed;

      const overdue = projectTasks.filter(
        (t) => t.status !== 'completed' && t.due_date && new Date(t.due_date) < now
      ).length;

      const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Deterministic Health Score Formula (0 - 100):
      // Base: Completion Rate % * 0.4 + 60
      // Penalties: -15 per overdue task
      let score = total === 0 ? 85 : Math.round(completionPercentage * 0.4 + 60);
      score -= overdue * 15;
      if (score < 0) score = 0;
      if (score > 100) score = 100;

      const reasons: string[] = [];
      if (overdue > 0) reasons.push(`${overdue} overdue task${overdue > 1 ? 's' : ''}`);
      if (total === 0) reasons.push('No tasks scheduled yet');
      if (reasons.length === 0) reasons.push('On schedule, zero overdue pressure');

      let status: 'Healthy' | 'At Risk' | 'Critical' = 'Healthy';
      if (score < 50 || overdue >= 3) {
        status = 'Critical';
      } else if (score < 80 || overdue > 0) {
        status = 'At Risk';
      }

      return {
        projectId: p.id,
        projectName: p.name,
        totalTasks: total,
        completedTasks: completed,
        pendingTasks: pending,
        overdueTasks: overdue,
        completionPercentage,
        healthScore: score,
        status,
        reasons,
      };
    });
  }, [projects, tasks]);

  if (isProjectsLoading || isTasksLoading) {
    return <LoadingState message="Calculating objective project health indices..." />;
  }

  if (projectHealthList.length === 0) {
    return (
      <EmptyState
        icon={<FolderKanban className="w-8 h-8 text-text-muted" />}
        title="No active projects"
        description="Create projects and assign tasks to inspect real-time project health scores."
      />
    );
  }

  const healthyCount = projectHealthList.filter((p) => p.status === 'Healthy').length;
  const atRiskCount = projectHealthList.filter((p) => p.status === 'At Risk').length;
  const criticalCount = projectHealthList.filter((p) => p.status === 'Critical').length;

  return (
    <div className="space-y-6">
      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Healthy Projects</p>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{healthyCount}</p>
          </div>
        </Card>

        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">At Risk</p>
            <p className="text-xl font-bold text-amber-400 mt-0.5">{atRiskCount}</p>
          </div>
        </Card>

        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Critical Attention</p>
            <p className="text-xl font-bold text-rose-400 mt-0.5">{criticalCount}</p>
          </div>
        </Card>
      </div>

      {/* Health Scoring Formula Explanation */}
      <div className="p-3.5 rounded-xl bg-dark-surface/40 border border-dark-borderSubtle text-xs text-text-secondary flex items-start gap-2.5">
        <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-text-primary">Objective Health Formula:</strong> Health scores are mathematically derived from actual database records (Completion Velocity &bull; Overdue Task Penalties). Zero synthetic or simulated scores.
        </p>
      </div>

      {/* Projects Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectHealthList.map((p) => (
          <Card
            key={p.projectId}
            className="p-5 bg-dark-surface border-dark-border hover:border-dark-borderHover transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-text-primary truncate max-w-[180px]">
                    {p.projectName}
                  </h3>
                  <span className="text-[11px] text-text-muted">
                    {p.totalTasks} total tasks &bull; {p.completedTasks} completed
                  </span>
                </div>

                <Badge
                  variant={
                    p.status === 'Healthy'
                      ? 'success'
                      : p.status === 'At Risk'
                      ? 'warning'
                      : 'danger'
                  }
                  className="text-[10px]"
                >
                  {p.status} ({p.healthScore}%)
                </Badge>
              </div>

              {/* Progress */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs text-text-muted">
                  <span>Scope Progress</span>
                  <span className="font-semibold text-text-primary">{p.completionPercentage}%</span>
                </div>
                <ProgressBar
                  value={p.completionPercentage}
                  variant={p.status === 'Healthy' ? 'success' : p.status === 'At Risk' ? 'warning' : 'danger'}
                />
              </div>

              {/* Bottleneck reasons */}
              <div className="mt-4 pt-3 border-t border-dark-borderSubtle space-y-1.5">
                <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider block">
                  Signals & Reasons:
                </span>
                <div className="space-y-1">
                  {p.reasons.map((r, idx) => (
                    <p key={idx} className="text-xs text-text-secondary flex items-center gap-1.5">
                      {p.status === 'Healthy' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="truncate">{r}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-dark-borderSubtle flex items-center justify-between">
              <span className="text-[11px] text-text-muted">
                {p.pendingTasks} Pending Tasks
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/projects/${p.projectId}`)}
                rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
              >
                Inspect Project
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
