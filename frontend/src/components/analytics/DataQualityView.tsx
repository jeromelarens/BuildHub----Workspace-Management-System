import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import {
  CheckCircle2,
  Calendar,
  UserX,
  Clock,
  FolderMinus,
  ArrowUpRight,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/LoadingState';
import { EmptyState } from '../ui/EmptyState';

export const DataQualityView: React.FC = () => {
  const navigate = useNavigate();
  const { data: tasksData, isLoading: isTasksLoading } = useTasks({ limit: 1000 });
  const { data: projectsData, isLoading: isProjectsLoading } = useProjects();

  const tasks = useMemo(() => tasksData?.tasks || [], [tasksData]);
  const projects = useMemo(() => projectsData?.projects || [], [projectsData]);

  const unassignedTasks = useMemo(() => tasks.filter((t) => !t.assigned_to && t.status !== 'completed'), [tasks]);
  const noDueDateTasks = useMemo(() => tasks.filter((t) => !t.due_date && t.status !== 'completed'), [tasks]);
  
  const staleTasks = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return tasks.filter((t) => t.status === 'pending' && new Date(t.created_at) < thirtyDaysAgo);
  }, [tasks]);

  const emptyProjects = useMemo(() => {
    const projectTaskCount = new Map<number, number>();
    tasks.forEach((t) => {
      if (t.project_id) projectTaskCount.set(t.project_id, (projectTaskCount.get(t.project_id) || 0) + 1);
    });
    return projects.filter((p) => !projectTaskCount.has(p.id) || projectTaskCount.get(p.id) === 0);
  }, [tasks, projects]);

  const isLoading = isTasksLoading || isProjectsLoading;

  if (isLoading) {
    return <LoadingState message="Evaluating workspace data hygiene and completeness..." />;
  }

  const totalIssues = unassignedTasks.length + noDueDateTasks.length + staleTasks.length + emptyProjects.length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Unassigned Tasks</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">{unassignedTasks.length}</p>
          </div>
        </Card>

        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Missing Due Dates</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">{noDueDateTasks.length}</p>
          </div>
        </Card>

        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Stale Pending Tasks</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">{staleTasks.length}</p>
          </div>
        </Card>

        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <FolderMinus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Empty Projects</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">{emptyProjects.length}</p>
          </div>
        </Card>
      </div>

      {/* Issues Breakdown List */}
      {totalIssues === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-8 h-8 text-emerald-400" />}
          title="Optimal Data Hygiene"
          description="All tasks have assignees and target due dates, and all projects contain active work."
        />
      ) : (
        <div className="space-y-4">
          {unassignedTasks.length > 0 && (
            <Card className="p-5 bg-dark-surface border-dark-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                    Unassigned Tasks ({unassignedTasks.length})
                  </h4>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
                  View All Tasks
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {unassignedTasks.slice(0, 6).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/tasks/${t.id}`)}
                    className="p-2.5 rounded-lg bg-dark-elevated border border-dark-borderSubtle hover:border-brand/40 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <span className="text-xs font-medium text-text-primary truncate max-w-[160px]">
                      {t.title}
                    </span>
                    <Badge variant="default" className="text-[10px] capitalize">
                      {t.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {emptyProjects.length > 0 && (
            <Card className="p-5 bg-dark-surface border-dark-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderMinus className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                    Projects with No Tasks ({emptyProjects.length})
                  </h4>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
                  View Projects
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {emptyProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="p-2.5 rounded-lg bg-dark-elevated border border-dark-borderSubtle hover:border-brand/40 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <span className="text-xs font-medium text-text-primary truncate max-w-[160px]">
                      {p.name}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-text-muted" />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
