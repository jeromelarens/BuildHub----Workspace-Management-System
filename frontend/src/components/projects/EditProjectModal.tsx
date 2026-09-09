import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, ModalFooter } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Project, ProjectStatus } from '../../types';
import { useUpdateProject } from '../../hooks/useProjects';

const editProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must not exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  status: z.enum(['active', 'on_hold', 'completed', 'archived']),
});

type EditProjectFormValues = z.infer<typeof editProjectSchema>;

export interface EditProjectModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({ project, isOpen, onClose }) => {
  const updateProjectMutation = useUpdateProject();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditProjectFormValues>({
    resolver: zodResolver(editProjectSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description || '',
        status: project.status,
      });
    }
  }, [project, reset]);

  if (!project) return null;

  const onSubmit = async (values: EditProjectFormValues) => {
    try {
      await updateProjectMutation.mutateAsync({
        id: project.id,
        payload: {
          name: values.name.trim(),
          description: values.description?.trim() || undefined,
          status: values.status as ProjectStatus,
        },
      });
      onClose();
    } catch {
      // Handled by toast
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Project"
      description={`Update settings and status for ${project.name}.`}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Project Name"
          error={errors.name?.message}
          {...register('name')}
          required
          autoFocus
        />

        <Select
          label="Status"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'on_hold', label: 'On Hold' },
            { value: 'completed', label: 'Completed' },
            { value: 'archived', label: 'Archived' },
          ]}
          {...register('status')}
        />

        <Textarea
          label="Description"
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
            isLoading={isSubmitting || updateProjectMutation.isPending}
          >
            Save Changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
