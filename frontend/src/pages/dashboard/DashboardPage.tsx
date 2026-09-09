import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  useAdminDashboard,
  useMyTasksDashboard,
  useDashboardTasks,
} from '../../hooks/useDashboardData';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, TaskStatusBadge, TaskPriorityBadge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import {
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  TrendingUp,
  FolderPlus,
  Calendar,
  MoreVertical,
  Activity,
  Check,
  Edit2,
  Users,
  ShieldCheck,
  FolderKanban,
} from 'lucide-react';
import { Dropdown, DropdownItem } from '../../components/ui/Dropdown';
import { UserRole } from '../../types/role.types';

import { useNavigate, Link } from 'react-router-dom';
import { useUpdateTask } from '../../hooks/useTasks';
import { useCreateProject } from '../../hooks/useProjects';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Real backend queries
  const adminQuery = useAdminDashboard(isAdmin);
  const myTasksQuery = useMyTasksDashboard(!isAdmin);
  const tasksQuery = useDashboardTasks(user?.role as UserRole);

  const updateTaskMutation = useUpdateTask();
  const createProjectMutation = useCreateProject();

  const [activeTaskTab, setActiveTaskTab] = useState<'all' | 'in_progress' | 'urgent'>('all');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Greeting based on current local hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleToggleComplete = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await updateTaskMutation.mutateAsync({
      id: taskId,
      payload: { status: newStatus },
    });
  };

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    await createProjectMutation.mutateAsync({
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || undefined,
      status: 'active',
    });
    setNewProjectName('');
    setNewProjectDesc('');
    setIsNewProjectModalOpen(false);
  };

  // Resolve metrics depending on user role
  const isLoading = isAdmin ? adminQuery.isLoading : myTasksQuery.isLoading;
  const isError = isAdmin ? adminQuery.isError : myTasksQuery.isError;
  const refetch = () => {
    if (isAdmin) adminQuery.refetch();
    else myTasksQuery.refetch();
    tasksQuery.refetch();
  };

  const totalTasks = isAdmin
    ? adminQuery.data?.tasks.total ?? 0
    : myTasksQuery.data?.assigned_tasks.total ?? 0;

  const completedTasks = isAdmin
    ? adminQuery.data?.tasks.completed ?? 0
    : myTasksQuery.data?.assigned_tasks.completed ?? 0;

  const inProgressTasks = isAdmin
    ? adminQuery.data?.tasks.in_progress ?? 0
    : myTasksQuery.data?.assigned_tasks.in_progress ?? 0;

  const overdueTasks = isAdmin
    ? adminQuery.data?.tasks.overdue ?? 0
    : myTasksQuery.data?.assigned_tasks.overdue ?? 0;

  // Filter tasks list
  const rawTasks = tasksQuery.data || [];
  const filteredTasks = rawTasks.filter((task) => {
    if (activeTaskTab === 'in_progress') return task.status === 'in_progress';
    if (activeTaskTab === 'urgent') return task.priority === 'urgent';
    return true;
  });

  return (
    <div className="space-y-8">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <span>{getGreeting()}, {user?.name.split(' ')[0] || 'User'}</span>
            <span className="text-brand">⚡</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            {isAdmin
              ? 'Workspace overview with system-wide real PostgreSQL metrics.'
              : `Personal workspace dashboard for ${user?.role.replace('_', ' ')}.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {user?.role !== 'employee' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsNewProjectModalOpen(true)}
              leftIcon={<FolderPlus className="w-4 h-4 text-text-secondary" />}
            >
              New Project
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/tasks')}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-lemon-sm"
          >
            Create Task
          </Button>
        </div>
      </div>

      {/* 2. Error State if metrics fail */}
      {isError && (
        <ErrorState
          title="Could not load dashboard metrics"
          message="We were unable to retrieve the latest workspace metrics from the backend. Please check your network and retry."
          onRetry={refetch}
        />
      )}

      {/* 3. KPI Metrics Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <Card hoverEffect className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                {isAdmin ? 'System Tasks' : 'Assigned Tasks'}
              </p>
              {isLoading ? (
                <Skeleton variant="rectangular" className="w-16 h-8 mt-2" />
              ) : (
                <h3 className="text-3xl font-bold text-text-primary mt-2">{totalTasks}</h3>
              )}
            </div>
            <div className="w-9 h-9 rounded-lg bg-dark-elevated border border-dark-border flex items-center justify-center text-text-secondary">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-0.5 text-brand font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              Live DB
            </span>
            <span className="text-text-muted">
              {isAdmin ? 'Total active tasks' : 'Assigned to your queue'}
            </span>
          </div>
        </Card>

        {/* Completed Tasks */}
        <Card hoverEffect className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Completed Tasks
              </p>
              {isLoading ? (
                <Skeleton variant="rectangular" className="w-16 h-8 mt-2" />
              ) : (
                <h3 className="text-3xl font-bold text-status-success mt-2">{completedTasks}</h3>
              )}
            </div>
            <div className="w-9 h-9 rounded-lg bg-status-success/10 border border-status-success/20 flex items-center justify-center text-status-success">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="text-text-muted">
              {totalTasks > 0
                ? `${Math.round((completedTasks / totalTasks) * 100)}% completion rate`
                : 'No tasks completed yet'}
            </span>
          </div>
        </Card>

        {/* In Progress */}
        <Card hoverEffect className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                In Progress
              </p>
              {isLoading ? (
                <Skeleton variant="rectangular" className="w-16 h-8 mt-2" />
              ) : (
                <h3 className="text-3xl font-bold text-status-info mt-2">{inProgressTasks}</h3>
              )}
            </div>
            <div className="w-9 h-9 rounded-lg bg-status-info/10 border border-status-info/20 flex items-center justify-center text-status-info">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="text-text-muted">Currently active work items</span>
          </div>
        </Card>

        {/* Overdue */}
        <Card hoverEffect className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Overdue Tasks
              </p>
              {isLoading ? (
                <Skeleton variant="rectangular" className="w-16 h-8 mt-2" />
              ) : (
                <h3 className="text-3xl font-bold text-status-danger mt-2">{overdueTasks}</h3>
              )}
            </div>
            <div className="w-9 h-9 rounded-lg bg-status-danger/10 border border-status-danger/20 flex items-center justify-center text-status-danger">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            {overdueTasks > 0 ? (
              <Badge variant="danger" size="sm">Action Required</Badge>
            ) : (
              <span className="text-status-success font-medium">All deadlines on schedule</span>
            )}
          </div>
        </Card>
      </div>

      {/* 4. Admin Overview Bar (Only displayed for Admin users) */}
      {isAdmin && adminQuery.data && (
        <Card className="bg-dark-surface border-brand/20">
          <div className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/25 flex items-center justify-center text-brand">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-text-primary">System Administrator Overview</h4>
                <p className="text-xs text-text-muted">
                  Organization totals: {adminQuery.data.users.total} registered users, {adminQuery.data.projects.total} projects, {adminQuery.data.tasks.total} tasks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="px-2.5 py-1 rounded bg-dark-elevated border border-dark-border text-text-secondary flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brand" />
                <span>{adminQuery.data.users.manager} Managers</span>
              </span>
              <span className="px-2.5 py-1 rounded bg-dark-elevated border border-dark-border text-text-secondary flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-brand" />
                <span>{adminQuery.data.projects.active} Active Projects</span>
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* 5. Main Dashboard Body (Left: Real Tasks, Right: Priority Breakdown & Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Real Tasks List */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Tasks Overview</CardTitle>
                <CardDescription>
                  {isAdmin ? 'System tasks from PostgreSQL backend' : 'Your workspace work items'}
                </CardDescription>
              </div>

              {/* Filter Tabs */}
              <div className="inline-flex p-1 bg-dark-elevated rounded-lg text-xs border border-dark-border select-none">
                <button
                  type="button"
                  onClick={() => setActiveTaskTab('all')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeTaskTab === 'all'
                      ? 'bg-brand text-dark-bg font-bold shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  All ({rawTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTaskTab('in_progress')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeTaskTab === 'in_progress'
                      ? 'bg-brand text-dark-bg font-bold shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  In Progress
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTaskTab('urgent')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeTaskTab === 'urgent'
                      ? 'bg-brand text-dark-bg font-bold shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Urgent
                </button>
              </div>
            </CardHeader>

            <CardContent>
              {tasksQuery.isLoading ? (
                <div className="space-y-4 py-2">
                  <Skeleton variant="rectangular" className="h-14 w-full" />
                  <Skeleton variant="rectangular" className="h-14 w-full" />
                  <Skeleton variant="rectangular" className="h-14 w-full" />
                </div>
              ) : tasksQuery.isError ? (
                <ErrorState
                  title="Failed to load tasks"
                  message="Could not retrieve task records from the backend API."
                  onRetry={() => tasksQuery.refetch()}
                />
              ) : filteredTasks.length === 0 ? (
                <EmptyState
                  title="No tasks found"
                  description="There are currently no tasks matching the selected filter in your workspace."
                />
              ) : (
                <div className="divide-y divide-dark-borderSubtle">
                  {filteredTasks.map((task) => {
                    const isDone = task.status === 'completed';
                    return (
                      <div
                        key={task.id}
                        className="py-3.5 first:pt-0 last:pb-0 flex items-start sm:items-center justify-between gap-3 group"
                      >
                        {/* Checkbox & Title */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(task.id, task.status)}
                            className={`mt-0.5 sm:mt-0 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              isDone
                                ? 'bg-status-success border-status-success text-dark-bg'
                                : 'border-dark-border bg-dark-elevated hover:border-brand text-transparent'
                            }`}
                            title={isDone ? 'Mark as incomplete' : 'Mark as completed'}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>

                          <div className="min-w-0">
                            <Link
                              to={`/tasks/${task.id}`}
                              className={`text-sm font-medium transition-colors truncate block ${
                                isDone
                                  ? 'line-through text-text-muted'
                                  : 'text-text-primary hover:text-brand'
                              }`}
                            >
                              {task.title}
                            </Link>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted flex-wrap">
                              {task.project_name && (
                                <>
                                  <span className="font-semibold text-text-secondary">
                                    {task.project_name}
                                  </span>
                                  <span>•</span>
                                </>
                              )}
                              {task.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {typeof task.due_date === 'string' ? task.due_date.slice(0, 10) : task.due_date}
                                </span>
                              )}
                              {task.is_overdue && (
                                <>
                                  <span>•</span>
                                  <span className="text-status-danger font-semibold">Overdue</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Meta (Badges, Assignee, Actions) */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="hidden sm:inline-flex">
                            <TaskPriorityBadge priority={task.priority} />
                          </div>
                          <TaskStatusBadge status={task.status} />

                          {task.assignee && (
                            <Avatar
                              name={task.assignee.name}
                              size="xs"
                              className="hidden md:inline-flex"
                            />
                          )}

                          <Dropdown
                            trigger={
                              <button
                                type="button"
                                className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-dark-elevated"
                                aria-label="Task options"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            }
                            align="right"
                          >
                            <DropdownItem
                              icon={<Check className="w-3.5 h-3.5" />}
                              onClick={() => handleToggleComplete(task.id, task.status)}
                            >
                              {isDone ? 'Reopen Task' : 'Mark Complete'}
                            </DropdownItem>
                            <DropdownItem
                              icon={<Edit2 className="w-3.5 h-3.5" />}
                              onClick={() => navigate(`/tasks/${task.id}`)}
                            >
                              View & Edit Task
                            </DropdownItem>
                          </Dropdown>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Priority Metrics & Recent Database Updates */}
        <div className="space-y-6">
          {/* Priority Distribution Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand" />
                <span>Priority Distribution</span>
              </CardTitle>
              <CardDescription>Live task priority breakdown</CardDescription>
            </CardHeader>

            <CardContent>
              {isAdmin && adminQuery.data?.tasks.by_priority ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-status-danger font-medium">
                      <span className="w-2 h-2 rounded-full bg-status-danger" />
                      Urgent
                    </span>
                    <span className="font-bold text-text-primary">
                      {adminQuery.data.tasks.by_priority.urgent}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-status-warning font-medium">
                      <span className="w-2 h-2 rounded-full bg-status-warning" />
                      High
                    </span>
                    <span className="font-bold text-text-primary">
                      {adminQuery.data.tasks.by_priority.high}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-brand font-medium">
                      <span className="w-2 h-2 rounded-full bg-brand" />
                      Medium
                    </span>
                    <span className="font-bold text-text-primary">
                      {adminQuery.data.tasks.by_priority.medium}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-text-secondary font-medium">
                      <span className="w-2 h-2 rounded-full bg-text-muted" />
                      Low
                    </span>
                    <span className="font-bold text-text-primary">
                      {adminQuery.data.tasks.by_priority.low}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs text-text-secondary">
                  <div className="flex justify-between py-1 border-b border-dark-borderSubtle">
                    <span>Pending Tasks</span>
                    <span className="font-semibold text-text-primary">
                      {myTasksQuery.data?.assigned_tasks.pending ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-dark-borderSubtle">
                    <span>In Progress</span>
                    <span className="font-semibold text-text-primary">
                      {myTasksQuery.data?.assigned_tasks.in_progress ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Overdue</span>
                    <span className="font-semibold text-status-danger">
                      {myTasksQuery.data?.assigned_tasks.overdue ?? 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Deadlines / Recent Projects Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {isAdmin ? 'Recent Projects' : 'Upcoming Deadlines'}
              </CardTitle>
              <CardDescription>
                {isAdmin ? 'Latest created projects in database' : 'Deadlines scheduled for this sprint'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isAdmin && adminQuery.data?.recent_activity.projects ? (
                adminQuery.data.recent_activity.projects.length === 0 ? (
                  <p className="text-xs text-text-muted">No projects created yet.</p>
                ) : (
                  <div className="space-y-3">
                    {adminQuery.data.recent_activity.projects.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-text-primary truncate max-w-[180px]">
                          {p.name}
                        </span>
                        <Badge variant="brand" size="sm">{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                )
              ) : myTasksQuery.data?.upcoming_deadlines ? (
                myTasksQuery.data.upcoming_deadlines.length === 0 ? (
                  <p className="text-xs text-text-muted">No upcoming deadlines.</p>
                ) : (
                  <div className="space-y-3">
                    {myTasksQuery.data.upcoming_deadlines.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-text-primary truncate max-w-[180px]">
                          {t.title}
                        </span>
                        <span className="text-[11px] text-text-muted">{t.due_date}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-xs text-text-muted">No records available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Project Modal (Phase 3 queue) */}
      <Modal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        title="Create New Project"
        description="Initialize a collaborative project workspace."
        size="md"
      >
        <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
          <Input
            label="Project Name"
            placeholder="e.g. Platform Modernization"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            required
            autoFocus
          />

          <Textarea
            label="Description"
            placeholder="Outline project deliverables, architecture goals, and sprint milestone..."
            value={newProjectDesc}
            onChange={(e) => setNewProjectDesc(e.target.value)}
            rows={3}
          />

          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsNewProjectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Create Project
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
};
