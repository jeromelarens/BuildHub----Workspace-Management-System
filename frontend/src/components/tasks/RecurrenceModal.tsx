import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, ModalFooter } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useSetRecurrence } from '../../hooks/useTaskRecurrence';
import { TaskRecurrenceRule, RecurrenceFrequency } from '../../types';
import { Repeat } from 'lucide-react';

const recurrenceSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly', 'custom']),
  interval_count: z.coerce.number().min(1, 'Interval must be at least 1').max(365),
  end_date: z.string().optional(),
});

type RecurrenceFormValues = z.infer<typeof recurrenceSchema>;

export interface RecurrenceModalProps {
  taskId: number;
  existingRule: TaskRecurrenceRule | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RecurrenceModal: React.FC<RecurrenceModalProps> = ({
  taskId,
  existingRule,
  isOpen,
  onClose,
}) => {
  const setRecurrenceMutation = useSetRecurrence(taskId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecurrenceFormValues>({
    resolver: zodResolver(recurrenceSchema),
    defaultValues: {
      frequency: 'weekly',
      interval_count: 1,
      end_date: '',
    },
  });

  useEffect(() => {
    if (existingRule) {
      reset({
        frequency: existingRule.frequency,
        interval_count: existingRule.interval_count,
        end_date: existingRule.end_date ? existingRule.end_date.slice(0, 10) : '',
      });
    } else {
      reset({
        frequency: 'weekly',
        interval_count: 1,
        end_date: '',
      });
    }
  }, [existingRule, reset]);

  const onSubmit = async (values: RecurrenceFormValues) => {
    try {
      await setRecurrenceMutation.mutateAsync({
        frequency: values.frequency as RecurrenceFrequency,
        interval_count: values.interval_count,
        end_date: values.end_date ? values.end_date : null,
        is_active: true,
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
      title="Configure Task Recurrence"
      description={`Set an automated recurring schedule for TASK-${taskId}.`}
      size="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Repeat Frequency"
          options={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'custom', label: 'Custom Interval' },
          ]}
          {...register('frequency')}
        />

        <Input
          type="number"
          label="Repeat Interval"
          min={1}
          max={365}
          helperText="Repeat every N days/weeks/months"
          error={errors.interval_count?.message}
          {...register('interval_count')}
        />

        <Input
          type="date"
          label="End Date (Optional)"
          helperText="Schedule stops after this date"
          error={errors.end_date?.message}
          {...register('end_date')}
        />

        <ModalFooter>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting || setRecurrenceMutation.isPending}
            leftIcon={<Repeat className="w-4 h-4" />}
          >
            Save Schedule
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
