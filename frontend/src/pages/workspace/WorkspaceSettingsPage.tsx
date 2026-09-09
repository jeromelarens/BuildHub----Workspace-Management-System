import React, { useState } from 'react';
import {
  Building2,
  Shield,
  Users,
  FolderKanban,
  CheckSquare,
  Plus,
  Trash2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  useWorkspaces,
  useCreateWorkspace,
  useWorkspaceMembers,
  useAddWorkspaceMember,
  useRemoveWorkspaceMember,
} from '../../hooks/useWorkspaces';
import { useUsers } from '../../hooks/useUsers';
import { useProjects } from '../../hooks/useProjects';
import { useTasks } from '../../hooks/useTasks';

export const WorkspaceSettingsPage: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [memberRole, setMemberRole] = useState<'admin' | 'member'>('member');

  // Workspaces hooks
  const { data: workspaces = [], isLoading: isLoadingWs, isError: isErrorWs, refetch: refetchWs } =
    useWorkspaces();
  const createWsMutation = useCreateWorkspace();

  const activeWorkspace = workspaces[0];
  const { data: members = [], isLoading: isLoadingMembers } = useWorkspaceMembers(
    activeWorkspace?.id ?? 0
  );
  const addMemberMutation = useAddWorkspaceMember();
  const removeMemberMutation = useRemoveWorkspaceMember();

  // Organization metrics
  const { data: usersData } = useUsers();
  const { data: projectsData } = useProjects();
  const { data: tasksData } = useTasks({ limit: 1000 });

  const allUsers = usersData?.users || [];
  const projects = projectsData?.projects || [];
  const tasks = tasksData?.tasks || [];

  const handleCreateWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName) return;

    await createWsMutation.mutateAsync({
      name: newWsName.trim(),
      description: newWsDesc.trim() || undefined,
    });

    setIsCreateModalOpen(false);
    setNewWsName('');
    setNewWsDesc('');
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !selectedUserId) return;

    await addMemberMutation.mutateAsync({
      workspaceId: activeWorkspace.id,
      data: {
        user_id: Number(selectedUserId),
        role: memberRole,
      },
    });

    setIsAddMemberModalOpen(false);
    setSelectedUserId('');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Workspace Overview & Administration
            </h1>
            <Badge variant="brand">Multi-Tenant</Badge>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Manage multi-tenant organization settings, workspace memberships, and operational boundaries.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          className="shadow-lemon-sm font-semibold"
        >
          Create Workspace
        </Button>
      </div>

      {/* Workspace Identity Card */}
      {isLoadingWs ? (
        <Skeleton variant="rectangular" className="h-44 w-full" />
      ) : isErrorWs ? (
        <ErrorState
          title="Could not load workspace configuration"
          message="Failed to fetch workspace metadata from server."
          onRetry={() => refetchWs()}
        />
      ) : (
        <Card className="p-6 bg-dark-surface border-dark-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-text-primary">
                    {activeWorkspace?.name || 'BUILDHUB Organization'}
                  </h2>
                  <Badge variant="success">Active Workspace</Badge>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {activeWorkspace?.description || 'Primary production work environment'}
                </p>
                <p className="text-[11px] text-text-muted mt-1 font-mono">
                  Slug: {activeWorkspace?.slug || 'default-workspace'} &bull; Role: Owner &bull; Schema: Multi-Tenant PostgreSQL
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-dark-borderSubtle">
            <div className="p-3 bg-dark-elevated/40 rounded-xl border border-dark-borderSubtle">
              <span className="text-[10px] text-text-muted uppercase font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brand" />
                Workspace Members
              </span>
              <p className="text-lg font-bold text-text-primary mt-1">{members.length || allUsers.length}</p>
            </div>

            <div className="p-3 bg-dark-elevated/40 rounded-xl border border-dark-borderSubtle">
              <span className="text-[10px] text-text-muted uppercase font-semibold flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-status-info" />
                Active Projects
              </span>
              <p className="text-lg font-bold text-text-primary mt-1">{projects.length}</p>
            </div>

            <div className="p-3 bg-dark-elevated/40 rounded-xl border border-dark-borderSubtle">
              <span className="text-[10px] text-text-muted uppercase font-semibold flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-status-success" />
                Total Tasks
              </span>
              <p className="text-lg font-bold text-text-primary mt-1">{tasks.length}</p>
            </div>

            <div className="p-3 bg-dark-elevated/40 rounded-xl border border-dark-borderSubtle">
              <span className="text-[10px] text-text-muted uppercase font-semibold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-brand" />
                Security Boundary
              </span>
              <p className="text-lg font-bold text-status-success mt-1">Enforced</p>
            </div>
          </div>
        </Card>
      )}

      {/* Workspace Members Management Table */}
      <Card className="p-0 overflow-hidden bg-dark-surface border-dark-border">
        <div className="p-4 border-b border-dark-borderSubtle flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary">Workspace Members & Access Roles</h3>
            <p className="text-xs text-text-muted">Users assigned to this workspace tenant</p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAddMemberModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Member
          </Button>
        </div>

        {isLoadingMembers ? (
          <div className="p-6 space-y-3">
            <Skeleton variant="rectangular" className="h-10 w-full" />
            <Skeleton variant="rectangular" className="h-10 w-full" />
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-muted">
            No additional members explicitly assigned yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-dark-borderSubtle bg-dark-elevated/40 text-text-muted uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Workspace Role</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-borderSubtle/60">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-dark-elevated/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-text-primary">
                      {m.user?.name || `User #${m.user_id}`}
                    </td>
                    <td className="py-3 px-4 font-mono text-text-muted text-[11px]">
                      {m.user?.email || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={m.role === 'owner' ? 'brand' : m.role === 'admin' ? 'warning' : 'default'}
                        className="capitalize text-[10px]"
                      >
                        {m.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-text-muted text-[11px]">
                      {new Date(m.joined_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {m.role !== 'owner' && (
                        <button
                          type="button"
                          onClick={() =>
                            activeWorkspace &&
                            removeMemberMutation.mutate({
                              workspaceId: activeWorkspace.id,
                              userId: m.user_id,
                            })
                          }
                          disabled={removeMemberMutation.isPending}
                          className="p-1 text-text-muted hover:text-status-danger rounded transition-colors"
                          title="Remove from workspace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Workspace Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Organization Workspace"
        description="Initialize an isolated workspace container for projects and teams."
        size="md"
      >
        <form onSubmit={handleCreateWorkspaceSubmit} className="space-y-4">
          <Input
            label="Workspace Name"
            placeholder="e.g. Acme Corp, Engineering Hub"
            value={newWsName}
            onChange={(e) => setNewWsName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Description"
            placeholder="Outline workspace purpose..."
            value={newWsDesc}
            onChange={(e) => setNewWsDesc(e.target.value)}
          />

          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={createWsMutation.isPending}
            >
              Create Workspace
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        title="Assign Member to Workspace"
        size="md"
      >
        <form onSubmit={handleAddMemberSubmit} className="space-y-4">
          <Select
            label="Select User"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
            required
          >
            <option value="">Choose registered user...</option>
            {allUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email}) - {u.role}
              </option>
            ))}
          </Select>

          <Select
            label="Workspace Role"
            value={memberRole}
            onChange={(e) => setMemberRole(e.target.value as 'admin' | 'member')}
            required
          >
            <option value="member">Member</option>
            <option value="admin">Workspace Admin</option>
          </Select>

          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddMemberModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={addMemberMutation.isPending}
            >
              Add to Workspace
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
};

export default WorkspaceSettingsPage;
