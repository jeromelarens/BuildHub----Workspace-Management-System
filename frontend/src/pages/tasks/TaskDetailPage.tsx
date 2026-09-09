import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useTask, useUpdateTask, useDeleteTask } from '../../hooks/useTasks';
import { useAuth } from '../../hooks/useAuth';
import { TaskPriority, TaskStatus, DependencyTask } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { EditTaskModal } from '../../components/tasks/EditTaskModal';
import { DependenciesSection } from '../../components/tasks/DependenciesSection';
import { RecurrenceSection } from '../../components/tasks/RecurrenceSection';
import { AttachmentsSection } from '../../components/tasks/AttachmentsSection';
import { CommentSection } from '../../components/comments/CommentSection';
import { ActivityTimeline } from '../../components/activity/ActivityTimeline';
import { TaskTimerCard } from '../../components/tasks/TaskTimerCard';
import { formatDate, formatDateTime } from '../../utils/date';
import {
  ArrowLeft,
  CheckCircle2,
  Calendar,
  FolderKanban,
  User as UserIcon,
  Edit2,
  Trash2,
  Tag,
  AlertTriangle,
  Lock,
} from 'lucide-react';

export const TaskDetailPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Dependency Blocker Conflict state
  const [blockerError, setBlockerError] = useState<{
    message: string;
    blockingTasks: Array<{ id: number; title: string; status: string }>;
  } | null>(null);

  const { data: task, isLoading, isError, refetch } = useTask(taskId);
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in p-6">
        <Skeleton variant="text" className="h-8 w-48" />
        <Skeleton variant="rectangular" className="h-36 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton variant="rectangular" className="lg:col-span-2 h-96 w-full" />
          <Skeleton variant="rectangular" className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="p-8">
        <ErrorState
          title="Task Not Found"
          message="The requested task does not exist or you do not have permission to access it."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';
  const isCreator = task.user_id === currentUser?.id;
  const isAssignee = task.assigned_to === currentUser?.id;
  const canUpdateStatus = isAdmin || isCreator || isAssignee;
  const canModifyDetails = isAdmin || isCreator;
  const canDeleteTask = isAdmin || isCreator;

  const handleQuickStatusChange = async (newStatus: TaskStatus) => {
    if (newStatus === task.status) return;

    try {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        payload: { status: newStatus },
      });
    } catch (err: unknown) {
      // Check for dependency blocker 409 response
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

  const handleQuickPriorityChange = async (newPriority: TaskPriority) => {
    if (newPriority === task.priority) return;
    await updateTaskMutation.mutateAsync({
      id: task.id,
      payload: { priority: newPriority },
    });
  };

  const handleDeleteConfirm = async () => {
    await deleteTaskMutation.mutateAsync(task.id);
    navigate('/tasks');
  };

  const getPriorityBadgeVariant = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return 'danger';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusBadgeVariant = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'brand';
      case 'blocked':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/tasks"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-brand transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Tasks</span>
        </Link>

        <div className="flex items-center gap-2">
          {canModifyDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
            >
              Edit Task
            </Button>
          )}

          {canDeleteTask && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Hero Header */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-text-muted font-mono">
              <span>TASK-{task.id}</span>
              {task.project && (
                <>
                  <span>/</span>
                  <Link
                    to={`/projects/${task.project_id}`}
                    className="hover:text-brand transition-colors font-sans"
                  >
                    {task.project.name}
                  </Link>
                </>
              )}
            </div>

            <h1
              className={`text-2xl font-bold tracking-tight ${
                task.status === 'completed'
                  ? 'text-text-muted line-through'
                  : 'text-text-primary'
              }`}
            >
              {task.title}
            </h1>
          </div>

          {/* Quick Selectors */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Status Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="task-status-select" className="text-xs text-text-muted">
                Status:
              </label>
              <select
                id="task-status-select"
                value={task.status}
                disabled={!canUpdateStatus || updateTaskMutation.isPending}
                onChange={(e) => handleQuickStatusChange(e.target.value as TaskStatus)}
                className="text-xs rounded-md bg-dark-surface border border-dark-borderSubtle px-2.5 py-1.5 text-text-primary font-medium focus:border-brand focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Priority Selector */}
            {canModifyDetails && (
              <div className="flex items-center gap-2">
                <label htmlFor="task-priority-select" className="text-xs text-text-muted">
                  Priority:
                </label>
                <select
                  id="task-priority-select"
                  value={task.priority}
                  disabled={updateTaskMutation.isPending}
                  onChange={(e) => handleQuickPriorityChange(e.target.value as TaskPriority)}
                  className="text-xs rounded-md bg-dark-surface border border-dark-borderSubtle px-2.5 py-1.5 text-text-primary font-medium focus:border-brand focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Main Grid: Left Workspace & Right Meta Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Description, Dependencies, Recurrence, Attachments, Comments, Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="p-6 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary">Description</h2>
            <div className="text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {task.description || (
                <span className="italic text-text-muted">No description provided.</span>
              )}
            </div>
          </Card>

          {/* Dependencies Section */}
          <Card className="p-6">
            <DependenciesSection
              taskId={task.id}
              projectId={task.project_id}
              canManageDependencies={canModifyDetails}
            />
          </Card>

          {/* Recurrence Section */}
          <Card className="p-6">
            <RecurrenceSection
              taskId={task.id}
              canManageRecurrence={canModifyDetails}
            />
          </Card>

          {/* Attachments Section */}
          <Card className="p-6">
            <AttachmentsSection
              taskId={task.id}
              canManageAttachments={canUpdateStatus}
            />
          </Card>

          {/* Comments Section */}
          <Card className="p-6">
            <CommentSection taskId={task.id} />
          </Card>

          {/* Activity Section */}
          <Card className="p-6">
            <ActivityTimeline taskId={task.id} />
          </Card>
        </div>

        {/* Right Column: Metadata Sidebar */}
        <div className="space-y-5">
          {/* Focus Session Timer */}
          <TaskTimerCard taskId={task.id} taskTitle={task.title} />

          <Card className="p-5 space-y-4">
            <h2 className="text-xs uppercase font-bold tracking-wider text-text-muted border-b border-dark-borderSubtle pb-2">
              Task Details
            </h2>

            {/* Status & Priority */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand" /> Status
              </span>
              <Badge variant={getStatusBadgeVariant(task.status)} size="sm">
                {task.status.replace('_', ' ')}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-brand" /> Priority
              </span>
              <Badge variant={getPriorityBadgeVariant(task.priority)} size="sm">
                {task.priority}
              </Badge>
            </div>

            {/* Project */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-text-muted flex items-center gap-1.5">
                <FolderKanban className="w-4 h-4 text-brand" /> Project
              </span>
              {task.project ? (
                <Link
                  to={`/projects/${task.project_id}`}
                  className="font-semibold text-brand hover:underline truncate max-w-[140px]"
                >
                  {task.project.name}
                </Link>
              ) : (
                <span className="text-text-muted italic">Standalone</span>
              )}
            </div>

            {/* Assignee */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-text-muted flex items-center gap-1.5">
                <UserIcon className="w-4 h-4 text-brand" /> Assignee
              </span>
              {task.assigned_user ? (
                <div className="flex items-center gap-2 truncate">
                  <Avatar name={task.assigned_user.name} size="xs" />
                  <span className="font-semibold text-text-primary truncate">
                    {task.assigned_user.name}
                  </span>
                </div>
              ) : (
                <span className="text-text-muted italic">Unassigned</span>
              )}
            </div>

            {/* Due Date */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-text-muted flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-brand" /> Due Date
              </span>
              {task.due_date ? (
                <div className="flex items-center gap-1">
                  <span
                    className={
                      task.is_overdue
                        ? 'text-status-danger font-semibold'
                        : 'text-text-primary'
                    }
                  >
                    {formatDate(task.due_date)}
                  </span>
                  {task.is_overdue && (
                    <Badge variant="danger" size="sm">
                      Overdue
                    </Badge>
                  )}
                </div>
              ) : (
                <span className="text-text-muted">None</span>
              )}
            </div>
          </Card>

          {/* Audit Info */}
          <Card className="p-5 space-y-3 text-xs text-text-muted">
            <h2 className="text-xs uppercase font-bold tracking-wider text-text-muted border-b border-dark-borderSubtle pb-2">
              Metadata
            </h2>
            <div className="flex justify-between">
              <span>Created By</span>
              <span className="text-text-primary font-medium">
                {task.creator?.name || 'Workspace User'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Created</span>
              <span className="text-text-secondary">{formatDateTime(task.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Modified</span>
              <span className="text-text-secondary">{formatDateTime(task.updated_at)}</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Dependency Blocker Error Dialog */}
      {blockerError && (
        <Modal
          isOpen={true}
          onClose={() => setBlockerError(null)}
          title="Task is Blocked"
          description="This task cannot be marked as completed because it has unresolved prerequisite dependencies."
          size="md"
        >
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/25 text-xs text-status-danger flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>{blockerError.message}</span>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                Incomplete Prerequisite Tasks ({blockerError.blockingTasks.length}):
              </span>
              <div className="space-y-1.5">
                {blockerError.blockingTasks.map((bt) => (
                  <div
                    key={bt.id}
                    className="p-2.5 rounded-lg bg-dark-surface border border-dark-borderSubtle flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-status-danger shrink-0" />
                      <span className="text-[11px] font-mono text-text-muted">TASK-{bt.id}</span>
                      <Link
                        to={`/tasks/${bt.id}`}
                        onClick={() => setBlockerError(null)}
                        className="text-xs font-semibold text-text-primary hover:text-brand truncate"
                      >
                        {bt.title}
                      </Link>
                    </div>
                    <Badge variant="danger" size="sm">
                      {bt.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <ModalFooter>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setBlockerError(null)}
              >
                Understood
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      <EditTaskModal
        task={task}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Move Task to Trash?"
        message={`Task #${task.id} "${task.title}" will be moved to trash. You can restore it anytime from the Trash bin.`}
        confirmText="Move to Trash"
        isDestructive
        isLoading={deleteTaskMutation.isPending}
      />
    </div>
  );
};

export default TaskDetailPage;
