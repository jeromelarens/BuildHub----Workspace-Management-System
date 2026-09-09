import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, ModalFooter } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useCreateProject } from '../../hooks/useProjects';

const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must not exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  status: z.enum(['active', 'on_hold', 'completed', 'archived']),
});

type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

export interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose }) => {
  const createProjectMutation = useCreateProject();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'active',
    },
  });

  const onSubmit = async (values: CreateProjectFormValues) => {
    try {
      await createProjectMutation.mutateAsync({
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        status: values.status,
      });
      reset();
      onClose();
    } catch {
      // Error handled by mutation toast
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Project"
      description="Initialize a new collaborative project workspace."
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Project Name"
          placeholder="e.g. Core Infrastructure v2"
          error={errors.name?.message}
          {...register('name')}
          required
          autoFocus
        />

        <Select
          label="Initial Status"
          options={[
            { value: 'active', label: 'Active (In Progress)' },
            { value: 'on_hold', label: 'On Hold (Paused)' },
            { value: 'completed', label: 'Completed' },
            { value: 'archived', label: 'Archived' },
          ]}
          {...register('status')}
        />

        <Textarea
          label="Description (Optional)"
          placeholder="Summarize project scope, deliverables, and architecture milestones..."
          rows={3}
          error={errors.description?.message}
          {...register('description')}
        />

        <ModalFooter>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting || createProjectMutation.isPending}
          >
            Create Project
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
