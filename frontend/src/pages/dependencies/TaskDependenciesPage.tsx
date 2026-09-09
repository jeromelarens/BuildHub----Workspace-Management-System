import React, { useState } from 'react';
import { useTasks } from '../../hooks/useTasks';
import {
  useTaskDependencies,
  useAddDependency,
  useRemoveDependency,
} from '../../hooks/useTaskDependencies';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatDate } from '../../utils/date';
import {
  GitBranch,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  FolderKanban,
} from 'lucide-react';

export const TaskDependenciesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetPrereqId, setTargetPrereqId] = useState<string>('');

  const { data: tasksData, isLoading: isLoadingTasks } = useTasks({
    search: searchQuery || undefined,
    limit: 50,
  });
  const tasks = tasksData?.tasks || [];

  // Pick first task if none selected
  const activeTaskId = selectedTaskId ?? (tasks.length > 0 ? tasks[0].id : null);
  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;

  const {
    data: dependenciesData,
    isLoading: isLoadingDeps,
  } = useTaskDependencies(activeTaskId || undefined);

  const addDependencyMutation = useAddDependency(activeTaskId || undefined);
  const removeDependencyMutation = useRemoveDependency(activeTaskId || undefined);

  const dependsOn = dependenciesData?.depends_on || [];
  const blocking = dependenciesData?.blocking || [];

  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPrereqId || !activeTaskId) return;

    const prereqIdNum = parseInt(targetPrereqId, 10);
    if (isNaN(prereqIdNum) || prereqIdNum === activeTaskId) return;

    try {
      await addDependencyMutation.mutateAsync({
        dependsOnTaskId: prereqIdNum,
      });
      setTargetPrereqId('');
      setIsAddModalOpen(false);
    } catch {
      // Handled in mutation hook
    }
  };

  const handleRemoveDependency = async (depId: number) => {
    if (!activeTaskId) return;
    try {
      await removeDependencyMutation.mutateAsync(depId);
    } catch {
      // Handled in mutation hook
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-brand" />
            <span>Task Dependency Graph (DAG)</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Map prerequisite workflows, visualize blocking chains, and resolve execution deadlocks without cycles.
          </p>
        </div>

        {activeTask && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-lemon-sm self-start sm:self-auto"
          >
            Add Prerequisite
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Selection Sidebar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-dark-bg border border-dark-borderSubtle text-xs text-text-primary focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
            Select Task ({tasks.length})
          </div>

          {isLoadingTasks ? (
            <div className="space-y-2">
              <Skeleton variant="rectangular" className="h-16 w-full" />
              <Skeleton variant="rectangular" className="h-16 w-full" />
              <Skeleton variant="rectangular" className="h-16 w-full" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-muted bg-dark-surface rounded-xl border border-dark-borderSubtle">
              No tasks found.
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {tasks.map((t) => {
                const isCurrentActive = activeTaskId === t.id;
                const isCompleted = t.status === 'completed';

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      isCurrentActive
                        ? 'bg-dark-surface border-brand shadow-sm ring-1 ring-brand/30'
                        : 'bg-dark-surface/60 border-dark-borderSubtle hover:border-dark-border hover:bg-dark-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-text-muted">#{t.id}</span>
                      <Badge
                        variant={isCompleted ? 'success' : t.status === 'in_progress' ? 'brand' : 'default'}
                        size="sm"
                        className="text-[9px] uppercase"
                      >
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="text-xs font-semibold text-text-primary truncate">
                      {t.title}
                    </div>

                    {t.project && (
                      <div className="flex items-center gap-1 text-[11px] text-text-muted truncate">
                        <FolderKanban className="w-3 h-3 text-brand shrink-0" />
                        <span className="truncate">{t.project.name}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dependency DAG Visualization & Blocker Inspector */}
        <div className="lg:col-span-2 space-y-6">
          {activeTask ? (
            <>
              {/* Selected Task Overview */}
              <Card className="p-5 bg-dark-surface border-dark-borderSubtle space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-text-muted">TASK #{activeTask.id}</span>
                      <Badge
                        variant={activeTask.status === 'completed' ? 'success' : activeTask.status === 'in_progress' ? 'brand' : 'default'}
                        size="sm"
                      >
                        {activeTask.status.replace('_', ' ')}
                      </Badge>
                      <Badge
                        variant={activeTask.priority === 'urgent' ? 'danger' : activeTask.priority === 'high' ? 'warning' : 'default'}
                        size="sm"
                      >
                        {activeTask.priority}
                      </Badge>
                    </div>
                    <h2 className="text-base font-bold text-text-primary">{activeTask.title}</h2>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-text-muted shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Due: {activeTask.due_date ? formatDate(activeTask.due_date) : 'No due date'}</span>
                  </div>
                </div>

                {activeTask.description && (
                  <p className="text-xs text-text-secondary line-clamp-2">
                    {activeTask.description}
                  </p>
                )}
              </Card>

              {isLoadingDeps ? (
                <div className="space-y-4">
                  <Skeleton variant="rectangular" className="h-40 w-full" />
                  <Skeleton variant="rectangular" className="h-40 w-full" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Prerequisite Tasks (Must be completed before this task) */}
                  <Card className="p-5 bg-dark-surface border-dark-borderSubtle space-y-4">
                    <div className="flex items-center justify-between border-b border-dark-borderSubtle pb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-status-warning" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                          Prerequisites ({dependsOn.length})
                        </h3>
                      </div>
                      <span className="text-[10px] text-text-muted">Must complete first</span>
                    </div>

                    {dependsOn.length === 0 ? (
                      <div className="py-8 text-center text-xs text-text-muted">
                        No prerequisite dependencies. This task can be started immediately.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {dependsOn.map((dep) => {
                          const isDone = dep.task.status === 'completed';
                          return (
                            <div
                              key={dep.dependency_id}
                              className="p-3 rounded-xl bg-dark-elevated/50 border border-dark-borderSubtle flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="space-y-1 truncate">
                                <div className="flex items-center gap-1.5">
                                  {isDone ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-status-success shrink-0" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 text-status-warning shrink-0" />
                                  )}
                                  <span className="font-semibold text-text-primary truncate">
                                    {dep.task.title}
                                  </span>
                                </div>
                                <div className="text-[10px] text-text-muted flex items-center gap-2">
                                  <span className="font-mono">#{dep.task.id}</span>
                                  <span>•</span>
                                  <span className="capitalize">{dep.task.status.replace('_', ' ')}</span>
                                </div>
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveDependency(dep.dependency_id)}
                                className="text-text-muted hover:text-status-danger p-1 shrink-0"
                                aria-label="Remove prerequisite"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>

                  {/* Blocked Tasks (Waiting on this task) */}
                  <Card className="p-5 bg-dark-surface border-dark-borderSubtle space-y-4">
                    <div className="flex items-center justify-between border-b border-dark-borderSubtle pb-3">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-brand" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                          Dependent Tasks ({blocking.length})
                        </h3>
                      </div>
                      <span className="text-[10px] text-text-muted">Blocked by this task</span>
                    </div>

                    {blocking.length === 0 ? (
                      <div className="py-8 text-center text-xs text-text-muted">
                        No downstream tasks are waiting on this task.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {blocking.map((dep) => (
                          <div
                            key={dep.dependency_id}
                            className="p-3 rounded-xl bg-dark-elevated/50 border border-dark-borderSubtle flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="space-y-1 truncate">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-semibold text-text-primary truncate">
                                  {dep.task.title}
                                </span>
                              </div>
                              <div className="text-[10px] text-text-muted flex items-center gap-2">
                                <span className="font-mono">#{dep.task.id}</span>
                                <span>•</span>
                                <span className="capitalize">{dep.task.status.replace('_', ' ')}</span>
                              </div>
                            </div>

                            <Badge
                              variant={dep.task.status === 'completed' ? 'success' : 'default'}
                              size="sm"
                              className="text-[9px] uppercase shrink-0"
                            >
                              {dep.task.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </>
          ) : (
            <Card className="p-12 text-center text-xs text-text-muted">
              Select a task from the list to inspect and configure its dependency chain.
            </Card>
          )}
        </div>
      </div>

      {/* Add Dependency Modal */}
      {isAddModalOpen && activeTask && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddModalOpen(false)}
          title={`Add Prerequisite for Task #${activeTask.id}`}
          description="Select a prerequisite task that must be completed before this task can be unblocked."
          size="md"
        >
          <form onSubmit={handleAddDependency} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Prerequisite Task
              </label>
              <select
                value={targetPrereqId}
                onChange={(e) => setTargetPrereqId(e.target.value)}
                required
                className="w-full rounded-xl bg-dark-bg border border-dark-borderSubtle focus:border-brand px-3.5 py-2.5 text-xs text-text-primary focus:outline-none transition-colors"
              >
                <option value="">Select a prerequisite task...</option>
                {tasks
                  .filter((t) => t.id !== activeTask.id && !dependsOn.some((d) => d.task.id === t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.id} — {t.title} ({t.status})
                    </option>
                  ))}
              </select>
            </div>

            <div className="p-3 rounded-xl bg-dark-elevated border border-dark-borderSubtle text-xs text-text-muted flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <span>
                BUILDHUB's backend DAG resolver enforces topological acyclic sorting to prevent circular deadlocks.
              </span>
            </div>

            <ModalFooter>
              <Button variant="ghost" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={!targetPrereqId || addDependencyMutation.isPending}
                isLoading={addDependencyMutation.isPending}
                className="shadow-lemon-sm"
              >
                Link Prerequisite
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default TaskDependenciesPage;
