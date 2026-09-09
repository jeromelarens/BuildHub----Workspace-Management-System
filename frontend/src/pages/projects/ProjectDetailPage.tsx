import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProject, useDeleteProject } from '../../hooks/useProjects';
import { useProjectMembers, useRemoveProjectMember } from '../../hooks/useProjectMembers';
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Avatar } from '../../components/ui/Avatar';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { EditProjectModal } from '../../components/projects/EditProjectModal';
import { AddMemberModal } from '../../components/projects/AddMemberModal';
import { CreateTaskModal } from '../../components/tasks/CreateTaskModal';
import { ProjectTimeline } from '../../components/timeline/ProjectTimeline';
import { ProjectMilestones } from '../../components/milestones/ProjectMilestones';
import { formatDate } from '../../utils/date';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Calendar,
  UserMinus,
} from 'lucide-react';
import { ProjectMember } from '../../types';

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null);

  const { data: project, isLoading, isError, refetch } = useProject(projectId);
  const { data: members = [] } = useProjectMembers(projectId);
  const { data: tasksData, isLoading: isLoadingTasks } = useTasks({
    project_id: projectId,
    limit: 50,
  });

  const deleteProjectMutation = useDeleteProject();
  const removeMemberMutation = useRemoveProjectMember(projectId);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in p-6">
        <Skeleton variant="text" className="h-8 w-48" />
        <Skeleton variant="rectangular" className="h-40 w-full" />
        <Skeleton variant="rectangular" className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="p-8">
        <ErrorState
          title="Project Not Found"
          message="The requested project does not exist or you lack permission to view it."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';
  const isCreator = project.created_by === currentUser?.id;
  const isLead = members.some((m) => m.id === currentUser?.id && m.project_role === 'lead');
  const canManageProject = isAdmin || isCreator;
  const canManageMembers = isAdmin || isCreator || isLead;

  const handleDeleteProject = async () => {
    await deleteProjectMutation.mutateAsync(project.id);
    navigate('/projects');
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    await removeMemberMutation.mutateAsync(memberToRemove.id);
    setMemberToRemove(null);
  };

  const tasks = tasksData?.tasks || [];
  const taskStats = project.task_stats || {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    overdue: tasks.filter((t) => t.is_overdue).length,
  };

  const completionPercentage =
    project.progress?.completion_percentage ??
    (taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0);

  const getHealthBadge = (health?: string) => {
    switch (health) {
      case 'ON_TRACK':
        return <Badge variant="success">On Track</Badge>;
      case 'AT_RISK':
        return <Badge variant="warning">At Risk</Badge>;
      case 'DELAYED':
        return <Badge variant="danger">Delayed</Badge>;
      default:
        return <Badge variant="brand">Active</Badge>;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: `Tasks (${tasks.length})` },
    { id: 'timeline', label: 'Timeline' },
    { id: 'milestones', label: 'Milestones' },
    { id: 'members', label: `Members (${members.length})` },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-brand transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </Link>

        {canManageProject && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Project Hero Banner */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <FolderKanban className="w-7 h-7 text-brand" />
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                {project.name}
              </h1>
              <Badge variant="brand" size="sm" className="capitalize">
                {project.status.replace('_', ' ')}
              </Badge>
              {getHealthBadge(project.progress?.health_status)}
            </div>

            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed">
              {project.description || 'No detailed description specified.'}
            </p>

            <div className="flex items-center gap-4 text-xs text-text-muted pt-1">
              <span>Created by {project.creator?.name || 'Manager'}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(project.created_at)}
              </span>
            </div>
          </div>

          {/* Progress gauge card */}
          <div className="w-full lg:w-72 p-4 rounded-lg bg-dark-surface border border-dark-borderSubtle space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-text-secondary">Sprint Completion</span>
              <span className="text-brand font-mono">{completionPercentage}%</span>
            </div>
            <ProgressBar value={completionPercentage} />
            <div className="flex justify-between text-[11px] text-text-muted pt-1">
              <span>{taskStats.completed} completed</span>
              <span>{taskStats.total} total tasks</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-text-muted font-medium">Completed</p>
              <p className="text-lg font-bold text-text-primary font-mono">
                {taskStats.completed}
              </p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-status-info/10 border border-status-info/20 flex items-center justify-center text-status-info">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-text-muted font-medium">In Progress</p>
              <p className="text-lg font-bold text-text-primary font-mono">
                {taskStats.in_progress}
              </p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-status-warning/10 border border-status-warning/20 flex items-center justify-center text-status-warning">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-text-muted font-medium">Pending</p>
              <p className="text-lg font-bold text-text-primary font-mono">
                {taskStats.pending}
              </p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-status-danger/10 border border-status-danger/20 flex items-center justify-center text-status-danger">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-text-muted font-medium">Overdue</p>
              <p className="text-lg font-bold text-text-primary font-mono">
                {taskStats.overdue}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-text-primary">
              Project Tasks ({tasks.length})
            </h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateTaskModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Task
            </Button>
          </div>

          <Card className="overflow-hidden p-0">
            {isLoadingTasks ? (
              <div className="p-6 space-y-3">
                <Skeleton variant="rectangular" className="h-10 w-full" />
                <Skeleton variant="rectangular" className="h-10 w-full" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<CheckCircle2 className="w-8 h-8 text-brand" />}
                  title="No tasks in this project"
                  description="Add tasks to assign responsibilities and track deliverables."
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsCreateTaskModalOpen(true)}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Add First Task
                    </Button>
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Link
                          to={`/tasks/${t.id}`}
                          className="font-semibold text-text-primary hover:text-brand text-xs transition-colors"
                        >
                          {t.title}
                        </Link>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={t.status === 'completed' ? 'success' : 'default'}
                          size="sm"
                        >
                          {t.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            t.priority === 'urgent'
                              ? 'danger'
                              : t.priority === 'high'
                              ? 'warning'
                              : 'default'
                          }
                          size="sm"
                        >
                          {t.priority}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {t.assigned_user ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={t.assigned_user.name} size="xs" />
                            <span className="text-xs text-text-secondary truncate">
                              {t.assigned_user.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted italic">Unassigned</span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-text-muted">
                        {formatDate(t.due_date)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: Timeline */}
      {activeTab === 'timeline' && (
        <ProjectTimeline tasks={tasks} />
      )}

      {/* Tab 4: Milestones */}
      {activeTab === 'milestones' && (
        <ProjectMilestones tasks={tasks} projectName={project.name} />
      )}

      {/* Tab 5: Members */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-text-primary">
              Project Members ({members.length})
            </h3>
            {canManageMembers && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddMemberModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Member
              </Button>
            )}
          </div>

          <Card className="overflow-hidden p-0">
            {members.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<Users className="w-8 h-8 text-brand" />}
                  title="No members assigned"
                  description="Assign project leads and team contributors."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Workspace Role</TableHead>
                    <TableHead>Project Role</TableHead>
                    {canManageMembers && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={member.name} size="sm" />
                          <span className="text-xs font-semibold text-text-primary">
                            {member.name}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-text-secondary">
                        {member.email}
                      </TableCell>

                      <TableCell className="text-xs text-text-muted capitalize">
                        {member.role?.replace('_', ' ')}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={member.project_role === 'lead' ? 'brand' : 'default'}
                          size="sm"
                        >
                          {member.project_role}
                        </Badge>
                      </TableCell>

                      {canManageMembers && (
                        <TableCell className="text-right">
                          {member.id !== project.created_by && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setMemberToRemove(member)}
                              className="text-text-muted hover:text-status-danger"
                              aria-label="Remove member"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* Edit Project Modal */}
      <EditProjectModal
        project={project}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* Delete Project Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to permanently delete "${project.name}"? This action will remove all tasks and member assignments.`}
        confirmText="Delete Project"
        isDestructive
        isLoading={deleteProjectMutation.isPending}
      />

      {/* Add Member Modal */}
      <AddMemberModal
        projectId={project.id}
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        existingMemberUserIds={members.map((m) => m.id)}
      />

      {/* Create Task Modal for this project */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        defaultProjectId={project.id}
      />

      {/* Remove Member Confirmation Modal */}
      <ConfirmModal
        isOpen={memberToRemove !== null}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
        title="Remove Project Member"
        message={`Are you sure you want to remove ${memberToRemove?.name || 'this member'} from the project?`}
        confirmText="Remove Member"
        isDestructive
        isLoading={removeMemberMutation.isPending}
      />
    </div>
  );
};
