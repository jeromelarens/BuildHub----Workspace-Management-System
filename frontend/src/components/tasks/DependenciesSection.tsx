import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTaskDependencies, useRemoveDependency } from '../../hooks/useTaskDependencies';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ConfirmModal } from '../common/ConfirmModal';
import { AddDependencyModal } from './AddDependencyModal';
import {
  GitBranch,
  Plus,
  Unlink,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { DependencyItem } from '../../types';

export interface DependenciesSectionProps {
  taskId: number;
  projectId?: number | null;
  canManageDependencies?: boolean;
}

export const DependenciesSection: React.FC<DependenciesSectionProps> = ({
  taskId,
  projectId,
  canManageDependencies = true,
}) => {
  const { data, isLoading } = useTaskDependencies(taskId);
  const removeDependencyMutation = useRemoveDependency(taskId);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [dependencyToRemove, setDependencyToRemove] = useState<DependencyItem | null>(null);

  const dependsOn = data?.depends_on || [];
  const blocking = data?.blocking || [];

  const incompletePrerequisites = dependsOn.filter((d) => d.task.status !== 'completed');
  const isBlocked = incompletePrerequisites.length > 0;

  const handleRemoveConfirm = async () => {
    if (!dependencyToRemove) return;
    await removeDependencyMutation.mutateAsync(dependencyToRemove.dependency_id);
    setDependencyToRemove(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-brand" />
          <h3 className="text-sm font-semibold text-text-primary">
            Dependencies ({dependsOn.length + blocking.length})
          </h3>
        </div>

        {canManageDependencies && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Dependency
          </Button>
        )}
      </div>

      {/* Blocker Alert Banner */}
      {isBlocked && (
        <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/25 text-xs text-status-danger flex items-start gap-2.5">
          <Lock className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold">Task is Blocked</span>
            <p className="text-[11px] text-text-secondary">
              This task cannot be marked as completed until {incompletePrerequisites.length} prerequisite{' '}
              {incompletePrerequisites.length === 1 ? 'task is' : 'tasks are'} completed.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-text-muted">Loading dependencies...</p>
      ) : dependsOn.length === 0 && blocking.length === 0 ? (
        <div className="p-5 text-center rounded-lg border border-dashed border-dark-borderSubtle bg-dark-surface/30">
          <p className="text-xs text-text-muted">No dependencies linked to this task.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Blocked By (Prerequisites) */}
          {dependsOn.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                Blocked By ({dependsOn.length})
              </span>
              <div className="space-y-2">
                {dependsOn.map((dep) => {
                  const isDone = dep.task.status === 'completed';
                  return (
                    <div
                      key={dep.dependency_id}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                        isDone
                          ? 'bg-dark-surface border-dark-borderSubtle'
                          : 'bg-status-danger/5 border-status-danger/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-status-danger shrink-0" />
                        )}
                        <span className="text-[11px] font-mono text-text-muted shrink-0">
                          TASK-{dep.task.id}
                        </span>
                        <Link
                          to={`/tasks/${dep.task.id}`}
                          className={`text-xs font-medium hover:text-brand transition-colors truncate ${
                            isDone ? 'line-through text-text-muted' : 'text-text-primary'
                          }`}
                        >
                          {dep.task.title}
                        </Link>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={isDone ? 'success' : 'danger'} size="sm">
                          {dep.task.status.replace('_', ' ')}
                        </Badge>
                        {canManageDependencies && (
                          <button
                            type="button"
                            onClick={() => setDependencyToRemove(dep)}
                            className="text-text-muted hover:text-status-danger p-1 transition-colors"
                            title="Unlink dependency"
                            aria-label="Unlink dependency"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Blocking (Dependents) */}
          {blocking.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                Blocking ({blocking.length})
              </span>
              <div className="space-y-2">
                {blocking.map((dep) => (
                  <div
                    key={dep.dependency_id}
                    className="p-3 rounded-lg border border-dark-borderSubtle bg-dark-surface flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-mono text-text-muted shrink-0">
                        TASK-{dep.task.id}
                      </span>
                      <Link
                        to={`/tasks/${dep.task.id}`}
                        className="text-xs font-medium text-text-primary hover:text-brand transition-colors truncate"
                      >
                        {dep.task.title}
                      </Link>
                    </div>

                    <Badge variant="default" size="sm">
                      {dep.task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Dependency Modal */}
      <AddDependencyModal
        currentTaskId={taskId}
        currentTaskProjectId={projectId}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        existingDependencyTaskIds={dependsOn.map((d) => d.task.id)}
      />

      {/* Unlink Confirmation Dialog */}
      <ConfirmModal
        isOpen={dependencyToRemove !== null}
        onClose={() => setDependencyToRemove(null)}
        onConfirm={handleRemoveConfirm}
        title="Unlink Dependency"
        message={`Are you sure you want to remove the dependency on TASK-${dependencyToRemove?.task.id}?`}
        confirmText="Unlink"
        isDestructive
        isLoading={removeDependencyMutation.isPending}
      />
    </div>
  );
};
