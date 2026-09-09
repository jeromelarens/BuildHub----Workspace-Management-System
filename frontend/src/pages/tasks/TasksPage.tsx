import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTasks, useUpdateTask, useDeleteTask } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Avatar } from '../../components/ui/Avatar';
import { Pagination } from '../../components/ui/Pagination';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { CreateTaskModal } from '../../components/tasks/CreateTaskModal';
import { EditTaskModal } from '../../components/tasks/EditTaskModal';
import { Dropdown, DropdownItem } from '../../components/ui/Dropdown';
import { TaskFilterBar } from '../../components/tasks/TaskFilterBar';
import { BulkActionBar } from '../../components/tasks/BulkActionBar';
import { TaskViewSwitcher, TaskViewMode } from '../../components/tasks/TaskViewSwitcher';
import { KanbanBoard } from '../../components/kanban/KanbanBoard';
import { TaskCalendar } from '../../components/calendar/TaskCalendar';
import { formatDate } from '../../utils/date';
import {
  CheckSquare,
  Plus,
  CheckCircle2,
  Circle,
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
} from 'lucide-react';

export const TasksPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query parameters
  const currentView = (searchParams.get('view') as TaskViewMode) || 'list';
  const searchQuery = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const priorityFilter = searchParams.get('priority') || '';
  const projectFilter = searchParams.get('project_id') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Selection state for bulk operations
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const { data: projectsData } = useProjects({ limit: 50 });

  // If in board or calendar view, fetch full active scope without narrow pagination
  const isBoardOrCalendar = currentView === 'board' || currentView === 'calendar';
  const { data, isLoading, isError, refetch } = useTasks({
    status: (statusFilter as TaskStatus) || undefined,
    priority: (priorityFilter as TaskPriority) || undefined,
    project_id: projectFilter || undefined,
    search: searchQuery || undefined,
    page: isBoardOrCalendar ? 1 : currentPage,
    limit: isBoardOrCalendar ? 100 : 10,
  });

  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const tasks = data?.tasks || [];
  const pagination = data?.pagination;

  // Clear selection on page/filter change
  useEffect(() => {
    setSelectedTaskIds([]);
  }, [searchQuery, statusFilter, priorityFilter, projectFilter, currentPage]);

  const updateFilterParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      next.delete('page'); // Reset to page 1 on filter changes
      return next;
    });
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (page > 1) {
        next.set('page', String(page));
      } else {
        next.delete('page');
      }
      return next;
    });
  };

  const handleClearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTaskIds(tasks.map((t) => t.id));
    } else {
      setSelectedTaskIds([]);
    }
  };

  const handleToggleSelectTask = (taskId: number) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleToggleStatus = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    await updateTaskMutation.mutateAsync({
      id: task.id,
      payload: { status: newStatus },
    });
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    await deleteTaskMutation.mutateAsync(taskToDelete.id);
    setTaskToDelete(null);
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

  const allSelected = tasks.length > 0 && selectedTaskIds.length === tasks.length;
  const isIndeterminate =
    selectedTaskIds.length > 0 && selectedTaskIds.length < tasks.length;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-brand" />
            <span>Tasks</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Manage, prioritize, and track all work across your projects.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <TaskViewSwitcher
            currentView={currentView}
            onViewChange={(newView) => updateFilterParam('view', newView === 'list' ? '' : newView)}
          />

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-lemon-sm"
          >
            New Task
          </Button>
        </div>
      </div>

      {/* Task Filters & Filter Chips */}
      <TaskFilterBar
        searchQuery={searchQuery}
        onSearchChange={(val) => updateFilterParam('search', val)}
        statusFilter={statusFilter}
        onStatusChange={(val) => updateFilterParam('status', val)}
        priorityFilter={priorityFilter}
        onPriorityChange={(val) => updateFilterParam('priority', val)}
        projectIdFilter={projectFilter}
        onProjectChange={(val) => updateFilterParam('project_id', val)}
        projects={projectsData?.projects || []}
        onClearAllFilters={handleClearAllFilters}
      />

      {/* Main View Area */}
      {isLoading ? (
        <div className="p-6 space-y-3 bg-dark-surface rounded-2xl border border-dark-borderSubtle">
          <Skeleton variant="rectangular" className="h-10 w-full" />
          <Skeleton variant="rectangular" className="h-10 w-full" />
          <Skeleton variant="rectangular" className="h-10 w-full" />
          <Skeleton variant="rectangular" className="h-48 w-full" />
        </div>
      ) : isError ? (
        <div className="p-8 bg-dark-surface rounded-2xl border border-dark-borderSubtle">
          <ErrorState
            title="Could not load tasks"
            message="Failed to fetch tasks from the server."
            onRetry={() => refetch()}
          />
        </div>
      ) : currentView === 'board' ? (
        <KanbanBoard
          tasks={tasks}
          onQuickCreate={() => setIsCreateModalOpen(true)}
          onEditTask={setTaskToEdit}
          onDeleteTask={setTaskToDelete}
        />
      ) : currentView === 'calendar' ? (
        <TaskCalendar
          tasks={tasks}
          onQuickCreate={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <>
          {/* Task List Table */}
          <Card className="overflow-hidden p-0">
            {tasks.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<CheckSquare className="w-8 h-8 text-brand" />}
                  title="No tasks found"
                  description="No tasks match the active filters. Create a new task or adjust filters."
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsCreateModalOpen(true)}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Create Task
                    </Button>
                  }
                />
              </div>
            ) : (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isIndeterminate;
                          }}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="w-4 h-4 rounded border-dark-borderSubtle bg-dark-bg text-brand focus:ring-brand cursor-pointer"
                          aria-label="Select all tasks"
                        />
                      </TableHead>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead>Task Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => {
                      const isSelected = selectedTaskIds.includes(task.id);
                      const isTaskCompleted = task.status === 'completed';

                      return (
                        <TableRow
                          key={task.id}
                          className={isSelected ? 'bg-brand/5' : undefined}
                        >
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectTask(task.id)}
                              className="w-4 h-4 rounded border-dark-borderSubtle bg-dark-bg text-brand focus:ring-brand cursor-pointer"
                              aria-label={`Select task ${task.id}`}
                            />
                          </TableCell>

                          <TableCell className="font-mono text-xs text-text-muted">
                            #{task.id}
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2 max-w-md">
                              <button
                                type="button"
                                onClick={(e) => handleToggleStatus(task, e)}
                                className="text-text-muted hover:text-brand transition-colors shrink-0"
                                title={
                                  isTaskCompleted
                                    ? 'Mark as pending'
                                    : 'Mark as completed'
                                }
                              >
                                {isTaskCompleted ? (
                                  <CheckCircle2 className="w-4 h-4 text-status-success" />
                                ) : (
                                  <Circle className="w-4 h-4" />
                                )}
                              </button>

                              <Link
                                to={`/tasks/${task.id}`}
                                className={`text-sm font-medium hover:text-brand transition-colors truncate ${
                                  isTaskCompleted
                                    ? 'line-through text-text-muted'
                                    : 'text-text-primary'
                                }`}
                              >
                                {task.title}
                              </Link>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant={getStatusBadgeVariant(task.status)}
                              size="sm"
                            >
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant={getPriorityBadgeVariant(task.priority)}
                              size="sm"
                            >
                              {task.priority}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            {task.due_date ? (
                              <span className="text-xs text-text-secondary flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-text-muted" />
                                {formatDate(task.due_date)}
                              </span>
                            ) : (
                              <span className="text-xs text-text-muted">—</span>
                            )}
                          </TableCell>

                          <TableCell>
                            {task.assigned_user ? (
                              <div className="flex items-center gap-2">
                                <Avatar
                                  name={task.assigned_user.name}
                                  size="xs"
                                />
                                <span className="text-xs text-text-secondary truncate max-w-[120px]">
                                  {task.assigned_user.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-text-muted italic">
                                Unassigned
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <Dropdown
                              trigger={
                                <button
                                  type="button"
                                  className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-dark-elevated transition-colors"
                                  aria-label="Actions"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              }
                              align="right"
                            >
                              <DropdownItem
                                icon={<Edit2 className="w-3.5 h-3.5" />}
                                onClick={() => setTaskToEdit(task)}
                              >
                                Edit Task
                              </DropdownItem>
                              <DropdownItem
                                icon={<Trash2 className="w-3.5 h-3.5" />}
                                danger
                                onClick={() => setTaskToDelete(task)}
                              >
                                Delete Task
                              </DropdownItem>
                            </Dropdown>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="p-4 border-t border-dark-borderSubtle">
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      totalItems={pagination.total}
                      itemsPerPage={pagination.limit}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Floating Bulk Action Bar */}
          <BulkActionBar
            selectedTaskIds={selectedTaskIds}
            onClearSelection={() => setSelectedTaskIds([])}
          />
        </>
      )}

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <EditTaskModal
        task={taskToEdit}
        isOpen={taskToEdit !== null}
        onClose={() => setTaskToEdit(null)}
      />

      <ConfirmModal
        isOpen={taskToDelete !== null}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Move Task to Trash?"
        message={`Task #${taskToDelete?.id} "${taskToDelete?.title}" will be moved to trash. You can restore it anytime from the Trash bin.`}
        confirmText="Move to Trash"
        isDestructive
        isLoading={deleteTaskMutation.isPending}
      />
    </div>
  );
};

export default TasksPage;
