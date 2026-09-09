import React, { useState } from 'react';
import { useTasks, useUpdateTask } from '../../hooks/useTasks';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import { Modal, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Skeleton } from '../ui/Skeleton';
import { formatDate, isOverdue } from '../../utils/date';
import { useToast } from '../../contexts/ToastContext';
import {
  Clock,
  AlertTriangle,
  FolderKanban,
  UserCheck,
} from 'lucide-react';
import { Task } from '../../types';

export interface WorkloadUser {
  user_id: number | null;
  name: string;
  email: string | null;
  total_assigned: number;
  active: number;
  completed: number;
  overdue: number;
}

export interface WorkloadDetailModalProps {
  user: WorkloadUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export const WorkloadDetailModal: React.FC<WorkloadDetailModalProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const canReassign = ['admin', 'manager', 'team_lead'].includes(currentUser?.role || '');

  const [reassigningTaskId, setReassigningTaskId] = useState<number | null>(null);
  const [targetUserId, setTargetUserId] = useState<string>('');

  // Fetch tasks assigned to this user
  const { data: tasksData, isLoading, refetch } = useTasks({
    assigned_to: user?.user_id ?? undefined,
    limit: 50,
  });

  // Fetch users for reassignment
  const { data: usersData } = useUsers(undefined, canReassign);
  const allUsers = usersData?.users || [];

  const updateTaskMutation = useUpdateTask();

  if (!user) return null;

  const tasks = tasksData?.tasks || [];

  const handleReassignSubmit = async (task: Task) => {
    if (!targetUserId) return;
    const newAssigneeId = parseInt(targetUserId, 10);
    if (isNaN(newAssigneeId)) return;

    try {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        payload: { assigned_to: newAssigneeId },
      });
      showToast(`Task #${task.id} reassigned successfully!`, 'success');
      setReassigningTaskId(null);
      setTargetUserId('');
      refetch();
    } catch {
      showToast('Failed to reassign task. Please try again.', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Workload Detail & Task Distribution"
      description={`Active workload breakdown and task assignments for ${user.name}.`}
      size="xl"
    >
      <div className="space-y-5">
        {/* User Summary Card */}
        <div className="p-4 rounded-xl bg-dark-surface border border-dark-borderSubtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size="md" />
            <div>
              <div className="font-bold text-sm text-text-primary">{user.name}</div>
              <div className="text-xs text-text-muted">{user.email || 'No email provided'}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-dark-elevated text-center">
              <div className="text-[10px] text-text-muted font-bold uppercase">Assigned</div>
              <div className="font-mono font-bold text-text-primary">{user.total_assigned}</div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-dark-elevated text-center">
              <div className="text-[10px] text-text-muted font-bold uppercase">Active</div>
              <div className="font-mono font-bold text-brand">{user.active}</div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-dark-elevated text-center">
              <div className="text-[10px] text-text-muted font-bold uppercase">Completed</div>
              <div className="font-mono font-bold text-status-success">{user.completed}</div>
            </div>
            {user.overdue > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-status-danger/10 border border-status-danger/30 text-center">
                <div className="text-[10px] text-status-danger font-bold uppercase">Overdue</div>
                <div className="font-mono font-bold text-status-danger">{user.overdue}</div>
              </div>
            )}
          </div>
        </div>

        {/* Task List Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-text-secondary px-1">
            <span className="font-bold uppercase tracking-wider text-[11px] text-text-muted">
              Assigned Tasks ({tasks.length})
            </span>
            {canReassign && (
              <span className="text-[11px] text-text-muted">
                Authorized to reassign tasks
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton variant="rectangular" className="h-12 w-full" />
              <Skeleton variant="rectangular" className="h-12 w-full" />
              <Skeleton variant="rectangular" className="h-12 w-full" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted rounded-xl bg-dark-surface border border-dark-borderSubtle">
              No tasks currently assigned to this user.
            </div>
          ) : (
            <div className="border border-dark-borderSubtle rounded-xl overflow-hidden divide-y divide-dark-borderSubtle/60">
              {tasks.map((t) => {
                const isDone = t.status === 'completed';
                const overdue = isOverdue(t.due_date, isDone);
                const isReassigning = reassigningTaskId === t.id;

                return (
                  <div
                    key={t.id}
                    className="p-3.5 bg-dark-surface hover:bg-dark-elevated/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 truncate sm:max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-text-muted">#{t.id}</span>
                        <span className="font-semibold text-text-primary truncate">{t.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-text-muted">
                        {t.project && (
                          <span className="flex items-center gap-1">
                            <FolderKanban className="w-3 h-3 text-brand" />
                            {t.project.name}
                          </span>
                        )}
                        <span>•</span>
                        <span className={`flex items-center gap-1 ${overdue ? 'text-status-danger font-bold' : ''}`}>
                          {overdue ? <AlertTriangle className="w-3 h-3 text-status-danger" /> : <Clock className="w-3 h-3" />}
                          {t.due_date ? formatDate(t.due_date) : 'No due date'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={isDone ? 'success' : t.status === 'in_progress' ? 'brand' : 'default'} size="sm" className="text-[10px] uppercase">
                        {t.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant={t.priority === 'urgent' ? 'danger' : t.priority === 'high' ? 'warning' : 'default'} size="sm" className="text-[10px] uppercase">
                        {t.priority}
                      </Badge>

                      {/* Reassign Action */}
                      {canReassign && (
                        <div>
                          {isReassigning ? (
                            <div className="flex items-center gap-1.5">
                              <select
                                value={targetUserId}
                                onChange={(e) => setTargetUserId(e.target.value)}
                                className="px-2 py-1 rounded bg-dark-bg border border-dark-borderSubtle text-[11px] text-text-primary focus:outline-none focus:border-brand"
                              >
                                <option value="">Select User...</option>
                                {allUsers
                                  .filter((u) => u.id !== user.user_id)
                                  .map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.name}
                                    </option>
                                  ))}
                              </select>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleReassignSubmit(t)}
                                disabled={!targetUserId || updateTaskMutation.isPending}
                                className="text-[10px] py-0.5 px-2"
                              >
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReassigningTaskId(null)}
                                className="text-[10px] py-0.5 px-1.5"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setReassigningTaskId(t.id);
                                setTargetUserId('');
                              }}
                              leftIcon={<UserCheck className="w-3 h-3" />}
                              className="text-[11px] py-1"
                            >
                              Reassign
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
};
