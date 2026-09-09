import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects, useDeleteProject } from '../../hooks/useProjects';
import { useAuth } from '../../hooks/useAuth';
import { Project, ProjectStatus } from '../../types';
import { Card, CardHeader, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { CreateProjectModal } from '../../components/projects/CreateProjectModal';
import { EditProjectModal } from '../../components/projects/EditProjectModal';
import { Dropdown, DropdownItem } from '../../components/ui/Dropdown';
import { formatDate } from '../../utils/date';
import {
  FolderKanban,
  Plus,
  Search,
  CheckSquare,
  Users,
  MoreVertical,
  Edit2,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const canCreateProject = user?.role === 'admin' || user?.role === 'manager';

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const { data, isLoading, isError, refetch } = useProjects({
    status: (statusFilter as ProjectStatus) || undefined,
    search: searchQuery || undefined,
    page: currentPage,
    limit: 9,
  });

  const deleteProjectMutation = useDeleteProject();

  const projects = data?.projects || [];
  const pagination = data?.pagination;

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    await deleteProjectMutation.mutateAsync(projectToDelete.id);
    setProjectToDelete(null);
  };

  const getStatusBadgeVariant = (status: ProjectStatus) => {
    switch (status) {
      case 'active':
        return 'brand';
      case 'completed':
        return 'success';
      case 'on_hold':
        return 'warning';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-brand" />
            <span>Projects</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Plan, organize, and track your team&apos;s work across sprint initiatives.
          </p>
        </div>

        {canCreateProject && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-lemon-sm"
          >
            New Project
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full sm:max-w-sm">
          <Input
            placeholder="Search projects..."
            leftIcon={<Search className="w-4 h-4 text-text-muted" />}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'on_hold', label: 'On Hold' },
              { value: 'completed', label: 'Completed' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Skeleton variant="rectangular" className="h-48 w-full" />
          <Skeleton variant="rectangular" className="h-48 w-full" />
          <Skeleton variant="rectangular" className="h-48 w-full" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Could not load projects"
          message="Failed to retrieve projects from the server. Please verify your connection."
          onRetry={() => refetch()}
        />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-8 h-8 text-brand" />}
          title="No projects found"
          description={
            canCreateProject
              ? 'Create your first project to start organizing sprints and work items.'
              : 'You are not currently assigned to any active projects.'
          }
          action={
            canCreateProject ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create First Project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => {
              const canModify =
                user?.role === 'admin' || project.created_by === user?.id;

              return (
                <Card
                  key={project.id}
                  hoverEffect
                  className="flex flex-col justify-between group relative"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/projects/${project.id}`}
                        className="text-base font-semibold text-text-primary group-hover:text-brand transition-colors flex items-center gap-1.5 truncate"
                      >
                        <span className="truncate">{project.name}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </Link>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={getStatusBadgeVariant(project.status)} size="sm">
                          {project.status.replace('_', ' ')}
                        </Badge>

                        {canModify && (
                          <Dropdown
                            trigger={
                              <button
                                type="button"
                                className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-dark-elevated"
                                aria-label="Project actions"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            }
                            align="right"
                          >
                            <DropdownItem
                              icon={<Edit2 className="w-3.5 h-3.5" />}
                              onClick={() => setProjectToEdit(project)}
                            >
                              Edit Details
                            </DropdownItem>
                            <DropdownItem
                              icon={<Trash2 className="w-3.5 h-3.5" />}
                              danger
                              onClick={() => setProjectToDelete(project)}
                            >
                              Delete Project
                            </DropdownItem>
                          </Dropdown>
                        )}
                      </div>
                    </div>

                    <CardDescription className="line-clamp-2 mt-1 min-h-[32px]">
                      {project.description || 'No description provided.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-3 border-t border-dark-borderSubtle mt-2">
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <div className="flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-brand" />
                        <span>{project.task_count || 0} Tasks</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-text-muted" />
                        <span>{project.member_count || 0} Members</span>
                      </div>

                      <span className="text-[11px] text-text-muted">
                        {formatDate(project.created_at)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="pt-4 border-t border-dark-borderSubtle">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        project={projectToEdit}
        isOpen={projectToEdit !== null}
        onClose={() => setProjectToEdit(null)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={projectToDelete !== null}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        message={`Are you sure you want to delete "${projectToDelete?.name}"? All associated tasks, dependencies, and member assignments will be permanently removed.`}
        confirmText="Delete Project"
        isDestructive
        isLoading={deleteProjectMutation.isPending}
      />
    </div>
  );
};
