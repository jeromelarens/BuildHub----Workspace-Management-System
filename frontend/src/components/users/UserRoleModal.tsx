import React, { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { User } from '../../types';
import { UserRole } from '../../types/role.types';
import { useUpdateUserRole } from '../../hooks/useUsers';
import { ShieldCheck } from 'lucide-react';

export interface UserRoleModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserRoleModal: React.FC<UserRoleModalProps> = ({ user, isOpen, onClose }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee');
  const updateRoleMutation = useUpdateUserRole();

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role as UserRole);
    }
  }, [user]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === user.role) {
      onClose();
      return;
    }
    await updateRoleMutation.mutateAsync({
      userId: user.id,
      role: selectedRole,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Modify User Role"
      description={`Update workspace permissions for ${user.name} (${user.email}).`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-elevated border border-dark-borderSubtle">
          <ShieldCheck className="w-5 h-5 text-brand shrink-0" />
          <div className="text-xs">
            <span className="text-text-muted">Current Role: </span>
            <span className="font-semibold text-text-primary capitalize">
              {user.role.replace('_', ' ')}
            </span>
          </div>
        </div>

        <Select
          label="New Role"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as UserRole)}
          options={[
            { value: 'admin', label: 'Admin (Full Workspace Control)' },
            { value: 'manager', label: 'Manager (Projects & Team Leadership)' },
            { value: 'team_lead', label: 'Team Lead (Sprint & Task Lead)' },
            { value: 'employee', label: 'Employee (Individual Contributor)' },
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
            isLoading={updateRoleMutation.isPending}
          >
            Update Role
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
