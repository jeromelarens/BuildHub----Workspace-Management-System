import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, ModalFooter } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useUpdateTask } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import { Task, TaskPriority, TaskStatus } from '../../types';

const editTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Task title is required')
    .max(255, 'Title must not exceed 255 characters'),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  due_date: z.string().optional(),
  project_id: z.string().optional(),
  assigned_to: z.string().optional(),
});

type EditTaskFormValues = z.infer<typeof editTaskSchema>;

export interface EditTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, isOpen, onClose }) => {
  const updateTaskMutation = useUpdateTask();
  const { data: projectsData } = useProjects({ limit: 50 });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditTaskFormValues>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      due_date: '',
      project_id: '',
      assigned_to: '',
    },
  });

  const selectedProjectId = watch('project_id');
  const { data: members = [] } = useProjectMembers(selectedProjectId || undefined);

  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: (task.status as 'pending' | 'in_progress' | 'completed' | 'cancelled') || 'pending',
        due_date: task.due_date ? task.due_date.slice(0, 10) : '',
        project_id: task.project_id ? String(task.project_id) : '',
        assigned_to: task.assigned_to ? String(task.assigned_to) : '',
      });
    }
  }, [task, reset]);

  if (!task) return null;

  const onSubmit = async (values: EditTaskFormValues) => {
    try {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        payload: {
          title: values.title.trim(),
          description: values.description?.trim() || null,
          priority: values.priority as TaskPriority,
          status: values.status as TaskStatus,
          due_date: values.due_date ? values.due_date : null,
          project_id: values.project_id ? parseInt(values.project_id, 10) : null,
          assigned_to: values.assigned_to ? parseInt(values.assigned_to, 10) : null,
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
      title={`Edit Task #${task.id}`}
      description="Update task parameters and progress status."
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Task Title"
          error={errors.title?.message}
          {...register('title')}
          required
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Associated Project"
            options={[
              { value: '', label: 'None (Standalone Task)' },
              ...(projectsData?.projects || []).map((p) => ({
                value: String(p.id),
                label: p.name,
              })),
            ]}
            {...register('project_id')}
          />

          <Select
            label="Assignee"
            options={[
              { value: '', label: 'Unassigned' },
              ...members.map((m) => ({
                value: String(m.id),
                label: `${m.name} (${m.project_role})`,
              })),
            ]}
            disabled={!selectedProjectId}
            helperText={!selectedProjectId ? 'Assignees are members of the selected project' : undefined}
            {...register('assigned_to')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Priority"
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
            {...register('priority')}
          />

          <Select
            label="Status"
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
            {...register('status')}
          />

          <Input
            type="date"
            label="Due Date"
            error={errors.due_date?.message}
            {...register('due_date')}
          />
        </div>

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
            isLoading={isSubmitting || updateTaskMutation.isPending}
          >
            Save Changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
