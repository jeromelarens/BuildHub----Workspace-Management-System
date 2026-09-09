import React, { useState } from 'react';
import { useTaskRecurrence, useDeleteRecurrence } from '../../hooks/useTaskRecurrence';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ConfirmModal } from '../common/ConfirmModal';
import { RecurrenceModal } from './RecurrenceModal';
import { formatDate } from '../../utils/date';
import { Repeat, Calendar, Trash2, Edit2, Clock } from 'lucide-react';

export interface RecurrenceSectionProps {
  taskId: number;
  canManageRecurrence?: boolean;
}

export const RecurrenceSection: React.FC<RecurrenceSectionProps> = ({
  taskId,
  canManageRecurrence = true,
}) => {
  const { data: recurrenceRule, isLoading } = useTaskRecurrence(taskId);
  const deleteRecurrenceMutation = useDeleteRecurrence(taskId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const handleDeleteConfirm = async () => {
    await deleteRecurrenceMutation.mutateAsync();
    setIsDeleteConfirmOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-brand" />
          <h3 className="text-sm font-semibold text-text-primary">Recurrence Engine</h3>
        </div>

        {canManageRecurrence && recurrenceRule && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="text-text-secondary hover:text-brand"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="text-text-secondary hover:text-status-danger"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-text-muted">Loading recurrence schedule...</p>
      ) : !recurrenceRule ? (
        <div className="p-4 text-center rounded-lg border border-dashed border-dark-borderSubtle bg-dark-surface/30 space-y-2">
          <p className="text-xs text-text-muted">This task does not repeat automatically.</p>
          {canManageRecurrence && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Repeat className="w-3.5 h-3.5" />}
            >
              Set Schedule
            </Button>
          )}
        </div>
      ) : (
        <div className="p-3.5 rounded-lg bg-dark-surface border border-dark-borderSubtle space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="brand" size="sm" className="capitalize">
                {recurrenceRule.frequency}
              </Badge>
              <span className="text-xs text-text-primary font-medium">
                Every {recurrenceRule.interval_count > 1 ? `${recurrenceRule.interval_count} ` : ''}
                {recurrenceRule.frequency.replace('ly', '')}
                {recurrenceRule.interval_count > 1 ? 's' : ''}
              </span>
            </div>
            <span className="text-[11px] text-status-success font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success inline-block"></span>
              Active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-text-muted pt-1 border-t border-dark-borderSubtle">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand" />
              <span>Next: {formatDate(recurrenceRule.next_run_date)}</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {recurrenceRule.end_date ? `Until ${formatDate(recurrenceRule.end_date)}` : 'No end date'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recurrence Configuration Modal */}
      <RecurrenceModal
        taskId={taskId}
        existingRule={recurrenceRule || null}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Remove Recurrence Confirmation */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Remove Recurrence"
        message="Are you sure you want to stop automated recurrence for this task? The task itself will not be deleted."
        confirmText="Remove Rule"
        isDestructive
        isLoading={deleteRecurrenceMutation.isPending}
      />
    </div>
  );
};
