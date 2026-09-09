import React, { useState } from 'react';
import { useTrashTasks, useRestoreTask, usePermanentDeleteTask } from '../../hooks/useTrash';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { formatDate } from '../../utils/date';
import { Task } from '../../types';
import { Trash2, RotateCcw, AlertOctagon, CheckSquare } from 'lucide-react';

export const TrashPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: trashTasks = [], isLoading } = useTrashTasks();
  const restoreMutation = useRestoreTask();
  const permanentDeleteMutation = usePermanentDeleteTask();

  const [taskToPermanentDelete, setTaskToPermanentDelete] = useState<Task | null>(null);

  const handleRestore = async (task: Task) => {
    await restoreMutation.mutateAsync(task.id);
  };

  const handlePermanentDeleteConfirm = async () => {
    if (!taskToPermanentDelete) return;
    await permanentDeleteMutation.mutateAsync(taskToPermanentDelete.id);
    setTaskToPermanentDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Trash Bin</h1>
        <p className="text-xs text-text-muted mt-1">
          Soft-deleted tasks can be restored here. {isAdmin ? 'Administrators can also permanently erase items.' : ''}
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-text-muted">Loading trash bin...</div>
      ) : trashTasks.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-dark-surface/40 rounded-xl border border-dashed border-dark-borderSubtle">
          <div className="w-12 h-12 rounded-full bg-dark-elevated flex items-center justify-center mx-auto text-text-muted">
            <Trash2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-text-primary">Trash is empty</p>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            Deleted tasks will appear here before being permanently expunged.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-dark-borderSubtle bg-dark-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-dark-borderSubtle bg-dark-elevated/40 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Deleted By / Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-borderSubtle">
                {trashTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-dark-elevated/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-text-muted shrink-0" />
                        <div>
                          <span className="text-[11px] font-mono text-text-muted block">
                            TASK-{t.id}
                          </span>
                          <span className="font-semibold text-text-primary line-through opacity-75">
                            {t.title}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-text-secondary">
                      {t.project_name || 'No Project'}
                    </td>

                    <td className="py-3 px-4 text-text-muted">
                      <div>{formatDate(t.deleted_at || t.updated_at)}</div>
                      <div className="text-[10px] text-text-muted truncate">
                        By {t.creator?.name || 'System'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant="default" size="sm">
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(t)}
                          isLoading={restoreMutation.isPending}
                          leftIcon={<RotateCcw className="w-3.5 h-3.5 text-status-success" />}
                        >
                          Restore
                        </Button>

                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTaskToPermanentDelete(t)}
                            className="text-text-muted hover:text-status-danger"
                            title="Permanently Delete"
                            aria-label="Permanently Delete"
                          >
                            <AlertOctagon className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={taskToPermanentDelete !== null}
        onClose={() => setTaskToPermanentDelete(null)}
        onConfirm={handlePermanentDeleteConfirm}
        title="Permanently Erase Task?"
        message={`WARNING: Task "${taskToPermanentDelete?.title}" (TASK-${taskToPermanentDelete?.id}) will be permanently erased from the database along with all comments, attachments, dependencies, and audit history. This action CANNOT be undone.`}
        confirmText="Erase Permanently"
        isDestructive
        isLoading={permanentDeleteMutation.isPending}
      />
    </div>
  );
};

export default TrashPage;
