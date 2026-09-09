import React, { useState } from 'react';
import { Modal, ModalFooter } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useAddProjectMember } from '../../hooks/useProjectMembers';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';
import { Search, UserPlus } from 'lucide-react';

export interface AddMemberModalProps {
  projectId: number | string;
  isOpen: boolean;
  onClose: () => void;
  existingMemberUserIds?: number[];
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  projectId,
  isOpen,
  onClose,
  existingMemberUserIds = [],
}) => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const addMemberMutation = useAddProjectMember(projectId);

  // Fetch users (if admin, useUsers fetches all users; for non-admin, input user ID directly or select)
  const { data: usersData, isLoading: isLoadingUsers } = useUsers(undefined, isAdmin);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [manualUserId, setManualUserId] = useState('');
  const [projectRole, setProjectRole] = useState<'lead' | 'member'>('member');

  const availableUsers = (usersData?.users || []).filter(
    (u) =>
      !existingMemberUserIds.includes(u.id) &&
      (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalUserId = isAdmin ? selectedUserId : parseInt(manualUserId, 10);
    if (!finalUserId || isNaN(finalUserId)) return;

    try {
      await addMemberMutation.mutateAsync({
        user_id: finalUserId,
        role: projectRole,
      });
      setSelectedUserId(null);
      setManualUserId('');
      setSearchQuery('');
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Project Member"
      description="Assign a teammate to collaborate on this project."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {isAdmin ? (
          <div className="space-y-3">
            <Input
              placeholder="Search users by name or email..."
              leftIcon={<Search className="w-4 h-4 text-text-muted" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="border border-dark-border rounded-lg max-h-48 overflow-y-auto divide-y divide-dark-borderSubtle bg-dark-surface/50">
              {isLoadingUsers ? (
                <p className="p-3 text-xs text-text-muted text-center">Loading users...</p>
              ) : availableUsers.length === 0 ? (
                <p className="p-3 text-xs text-text-muted text-center">No matching users available.</p>
              ) : (
                availableUsers.map((u) => {
                  const isSelected = selectedUserId === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-brand/10 border-l-2 border-brand text-brand'
                          : 'hover:bg-dark-elevated text-text-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} size="xs" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-text-primary truncate">{u.name}</p>
                          <p className="text-[11px] text-text-muted truncate">{u.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-text-muted capitalize">
                        {u.role.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <Input
            label="User ID to Add"
            type="number"
            placeholder="e.g. 5"
            value={manualUserId}
            onChange={(e) => setManualUserId(e.target.value)}
            required
            helperText="Enter the User ID of the team member to add."
          />
        )}

        <Select
          label="Project Assignment Role"
          value={projectRole}
          onChange={(e) => setProjectRole(e.target.value as 'lead' | 'member')}
          options={[
            { value: 'member', label: 'Member (Standard Contributor)' },
            { value: 'lead', label: 'Lead (Project & Sprint Coordinator)' },
          ]}
        />

        <ModalFooter>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isAdmin ? !selectedUserId : !manualUserId}
            isLoading={addMemberMutation.isPending}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Add Member
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
