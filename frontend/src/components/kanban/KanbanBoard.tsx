import React, { useState } from 'react';
import { isAxiosError } from 'axios';
import { Task, TaskStatus, DependencyTask } from '../../types';
import { useUpdateTask } from '../../hooks/useTasks';
import { KanbanCard } from './KanbanCard';
import { Modal, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Clock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Plus,
  AlertTriangle,
} from 'lucide-react';

export interface KanbanBoardProps {
  tasks: Task[];
  onQuickCreate?: (defaultStatus?: TaskStatus) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
}

interface ColumnConfig {
  id: TaskStatus;
  title: string;
  icon: React.ReactNode;
  badgeClass: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'pending',
    title: 'Pending',
    icon: <Clock className="w-4 h-4 text-text-muted" />,
    badgeClass: 'bg-dark-elevated text-text-muted',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    icon: <PlayCircle className="w-4 h-4 text-brand" />,
    badgeClass: 'bg-brand/15 text-brand border-brand/30',
  },
  {
    id: 'completed',
    title: 'Completed',
    icon: <CheckCircle2 className="w-4 h-4 text-status-success" />,
    badgeClass: 'bg-status-success/15 text-status-success border-status-success/30',
  },
  {
    id: 'cancelled',
    title: 'Cancelled',
    icon: <XCircle className="w-4 h-4 text-status-danger" />,
    badgeClass: 'bg-status-danger/15 text-status-danger border-status-danger/30',
  },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onQuickCreate,
  onEditTask,
  onDeleteTask,
}) => {
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [blockerError, setBlockerError] = useState<{
    message: string;
    blockingTasks: DependencyTask[];
  } | null>(null);

  const updateTaskMutation = useUpdateTask();

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (task.status === newStatus) return;

    try {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        payload: { status: newStatus },
      });
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 409) {
        const resData = err.response.data as { message?: string; blocking_tasks?: DependencyTask[] };
        if (resData?.blocking_tasks) {
          setBlockerError({
            message: resData.message || 'Cannot complete task due to unresolved dependencies',
            blockingTasks: resData.blocking_tasks,
          });
        }
      }
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(null);

    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;

    try {
      const { taskId, currentStatus } = JSON.parse(rawData);
      if (currentStatus === targetStatus) return;

      const targetTask = tasks.find((t) => t.id === taskId);
      if (!targetTask) return;

      await handleStatusChange(targetTask, targetStatus);
    } catch {
      // Ignored malformed drag data
    }
  };

  return (
    <>
      <div className="flex xl:grid xl:grid-cols-4 gap-4 items-start overflow-x-auto pb-6 w-full scrollbar-thin">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const isDraggingOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(col.id);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col rounded-2xl bg-dark-surface border transition-all duration-200 min-h-[520px] w-[280px] sm:w-[320px] xl:w-auto shrink-0 xl:shrink ${
                isDraggingOver
                  ? 'border-brand ring-1 ring-brand/30 bg-dark-surface/90'
                  : 'border-dark-borderSubtle'
              }`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-dark-borderSubtle flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {col.icon}
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    {col.title}
                  </h3>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${col.badgeClass}`}
                  >
                    {colTasks.length}
                  </span>
                </div>

                {onQuickCreate && (
                  <button
                    type="button"
                    onClick={() => onQuickCreate(col.id)}
                    className="p-1 rounded-lg text-text-muted hover:text-brand hover:bg-dark-elevated transition-colors"
                    title={`Create task in ${col.title}`}
                    aria-label={`Create task in ${col.title}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Tasks List / Drop Zone */}
              <div className="p-3 space-y-3 flex-1 flex flex-col">
                {colTasks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-xs text-text-muted border-2 border-dashed border-dark-borderSubtle/60 rounded-xl">
                    <span>No tasks in {col.title}</span>
                    <span className="text-[10px] text-text-muted/60 mt-1">Drag items here</span>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dependency Blocker Modal */}
      {blockerError && (
        <Modal
          isOpen={true}
          onClose={() => setBlockerError(null)}
          title="Prerequisite Task Required"
          description="This task is blocked by incomplete prerequisite dependencies and cannot be marked completed."
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-status-danger/10 border border-status-danger/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
              <div className="text-xs text-text-primary">
                <p className="font-semibold">{blockerError.message}</p>
                <p className="text-text-secondary mt-1">
                  Resolve or complete the following prerequisite tasks first:
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {blockerError.blockingTasks.map((bt) => (
                <div
                  key={bt.id}
                  className="p-2.5 rounded-lg bg-dark-elevated border border-dark-borderSubtle flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-text-primary truncate">
                    TASK-{bt.id}: {bt.title}
                  </span>
                  <Badge variant="warning" size="sm">
                    {bt.status}
                  </Badge>
                </div>
              ))}
            </div>

            <ModalFooter>
              <Button variant="primary" size="sm" onClick={() => setBlockerError(null)}>
                Got it
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}
    </>
  );
};
