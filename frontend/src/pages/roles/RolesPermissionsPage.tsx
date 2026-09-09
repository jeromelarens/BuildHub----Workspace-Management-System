import React, { useState } from 'react';
import {
  useRoles,
  usePermissions,
  useCreateRole,
  useAddPermissionToRole,
  useRemovePermissionFromRole,
  useDeleteRole,
} from '../../hooks/useRoles';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Lock,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { RoleWithPermissions } from '../../api/roles.api';

const SYSTEM_ROLES = ['admin', 'manager', 'team_lead', 'employee'];

export const RolesPermissionsPage: React.FC = () => {
  const { data: roles = [], isLoading: isLoadingRoles, isError: isErrorRoles, refetch: refetchRoles } = useRoles();
  const { data: permissions = [], isLoading: isLoadingPermissions } = usePermissions();

  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [roleNameToCreate, setRoleNameToCreate] = useState('');
  const [roleDescToCreate, setRoleDescToCreate] = useState('');
  const [roleToDelete, setRoleToDelete] = useState<RoleWithPermissions | null>(null);

  const createRoleMutation = useCreateRole();
  const addPermissionMutation = useAddPermissionToRole();
  const removePermissionMutation = useRemovePermissionFromRole();
  const deleteRoleMutation = useDeleteRole();

  // Pick first role if none selected
  const activeRole = selectedRole || roles[0] || null;

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleNameToCreate.trim()) return;

    try {
      await createRoleMutation.mutateAsync({
        name: roleNameToCreate.trim().toLowerCase().replace(/\s+/g, '_'),
        description: roleDescToCreate.trim(),
      });
      setRoleNameToCreate('');
      setRoleDescToCreate('');
      setIsCreateModalOpen(false);
    } catch {
      // Handled in mutation hook
    }
  };

  const handleTogglePermission = async (permId: number, hasPermission: boolean) => {
    if (!activeRole) return;
    if (SYSTEM_ROLES.includes(activeRole.name) && activeRole.name === 'admin') {
      return; // Admin permissions cannot be modified
    }

    if (hasPermission) {
      await removePermissionMutation.mutateAsync({
        roleId: activeRole.id,
        permissionId: permId,
      });
    } else {
      await addPermissionMutation.mutateAsync({
        roleId: activeRole.id,
        permissionId: permId,
      });
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      await deleteRoleMutation.mutateAsync(roleToDelete.id);
      if (selectedRole?.id === roleToDelete.id) {
        setSelectedRole(null);
      }
      setRoleToDelete(null);
    } catch {
      // Handled in mutation hook
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand" />
            <span>Roles & Permissions Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Configure system roles, configure granular permissions, and inspect access boundary matrices.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="shadow-lemon-sm self-start sm:self-auto"
        >
          Create Role
        </Button>
      </div>

      {isLoadingRoles || isLoadingPermissions ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton variant="rectangular" className="h-96 w-full" />
          <Skeleton variant="rectangular" className="h-96 lg:col-span-2 w-full" />
        </div>
      ) : isErrorRoles ? (
        <Card className="p-8">
          <ErrorState
            title="Failed to load roles"
            message="Could not retrieve security roles from server."
            onRetry={() => refetchRoles()}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List Navigation */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
              Configured Roles ({roles.length})
            </div>

            <div className="space-y-2">
              {roles.map((role) => {
                const isSystem = SYSTEM_ROLES.includes(role.name);
                const isCurrentActive = activeRole?.id === role.id;

                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isCurrentActive
                        ? 'bg-dark-surface border-brand shadow-sm ring-1 ring-brand/30'
                        : 'bg-dark-surface/60 border-dark-borderSubtle hover:border-dark-border hover:bg-dark-surface'
                    }`}
                  >
                    <div className="space-y-1 truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-primary capitalize">
                          {role.name.replace('_', ' ')}
                        </span>
                        {isSystem ? (
                          <Badge variant="brand" size="sm" className="text-[10px]">
                            System
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm" className="text-[10px]">
                            Custom
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-muted truncate">
                        {role.description || 'No description provided.'}
                      </p>
                      <div className="text-[11px] text-text-secondary font-mono">
                        {role.permissions.length} permissions assigned
                      </div>
                    </div>

                    {!isSystem && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoleToDelete(role);
                        }}
                        className="text-text-muted hover:text-status-danger p-1.5 shrink-0"
                        aria-label="Delete role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Permissions Matrix Detail */}
          {activeRole && (
            <Card className="lg:col-span-2 p-6 bg-dark-surface border-dark-borderSubtle space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-dark-borderSubtle">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-text-primary capitalize">
                      {activeRole.name.replace('_', ' ')} Permissions
                    </h3>
                    {SYSTEM_ROLES.includes(activeRole.name) && (
                      <Badge variant="brand" size="sm">
                        Protected System Role
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {activeRole.description || 'Manage access rights and operational boundaries for this role.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <KeyRound className="w-4 h-4 text-brand" />
                  <span>{activeRole.permissions.length} of {permissions.length} Active</span>
                </div>
              </div>

              {/* Notice for Admin role */}
              {activeRole.name === 'admin' && (
                <div className="p-3.5 rounded-xl bg-dark-elevated border border-dark-borderSubtle text-xs text-text-secondary flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <span>
                    The <strong>Administrator</strong> role has immutable superuser authorization across all system resources and security endpoints.
                  </span>
                </div>
              )}

              {/* Permissions Checklist Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {permissions.map((perm) => {
                  const isAssigned = activeRole.permissions.some((p) => p.id === perm.id);
                  const isMutating =
                    addPermissionMutation.isPending || removePermissionMutation.isPending;
                  const isImmutable = activeRole.name === 'admin';

                  return (
                    <div
                      key={perm.id}
                      onClick={() => !isImmutable && !isMutating && handleTogglePermission(perm.id, isAssigned)}
                      className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        isAssigned
                          ? 'bg-brand/5 border-brand/40 text-text-primary'
                          : 'bg-dark-elevated/40 border-dark-borderSubtle/70 text-text-muted hover:border-dark-border'
                      } ${!isImmutable ? 'cursor-pointer hover:bg-dark-elevated' : 'cursor-default'}`}
                    >
                      <div className="space-y-1 truncate pr-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isAssigned ? 'text-text-primary' : 'text-text-secondary'}`}>
                            {perm.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                          {perm.description || 'System permission boundary.'}
                        </p>
                      </div>

                      <div className="shrink-0 mt-0.5">
                        {isAssigned ? (
                          <CheckCircle2 className="w-4 h-4 text-brand" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-dark-border" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Create Custom Role Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create Custom Security Role"
          description="Define a new organizational role with customizable permission boundaries."
          size="md"
        >
          <form onSubmit={handleCreateRole} className="space-y-4">
            <Input
              label="Role Name"
              value={roleNameToCreate}
              onChange={(e) => setRoleNameToCreate(e.target.value)}
              placeholder="e.g. compliance_officer"
              required
              autoFocus
            />

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                value={roleDescToCreate}
                onChange={(e) => setRoleDescToCreate(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-dark-bg border border-dark-borderSubtle focus:border-brand px-3.5 py-2.5 text-xs text-text-primary focus:outline-none resize-none transition-colors"
                placeholder="Explain the scope and responsibilities of this role..."
              />
            </div>

            <ModalFooter>
              <Button variant="ghost" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={createRoleMutation.isPending}
                className="shadow-lemon-sm"
              >
                Create Role
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {/* Delete Role Confirmation Modal */}
      <ConfirmModal
        isOpen={!!roleToDelete}
        onClose={() => setRoleToDelete(null)}
        onConfirm={handleDeleteRole}
        title={`Delete Role "${roleToDelete?.name}"?`}
        message="This action will permanently delete this custom role. Any users assigned this role must be reassigned beforehand."
        confirmText="Delete Role"
        isDestructive={true}
        isLoading={deleteRoleMutation.isPending}
      />
    </div>
  );
};

export default RolesPermissionsPage;
