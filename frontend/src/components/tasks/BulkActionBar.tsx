import React, { useState } from 'react';
import { useBulkUpdateTasks, useBulkDeleteTasks } from '../../hooks/useBulkTasks';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { ConfirmModal } from '../common/ConfirmModal';
import { TaskPriority, TaskStatus } from '../../types';
import { CheckSquare, Trash2, X } from 'lucide-react';

export interface BulkActionBarProps {
  selectedTaskIds: number[];
  onClearSelection: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedTaskIds,
  onClearSelection,
}) => {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const bulkUpdateMutation = useBulkUpdateTasks();
  const bulkDeleteMutation = useBulkDeleteTasks();

  if (selectedTaskIds.length === 0) return null;

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value as TaskStatus;
    if (!status) return;

    await bulkUpdateMutation.mutateAsync({
      task_ids: selectedTaskIds,
      status,
    });
    onClearSelection();
  };

  const handlePriorityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const priority = e.target.value as TaskPriority;
    if (!priority) return;

    await bulkUpdateMutation.mutateAsync({
      task_ids: selectedTaskIds,
      priority,
    });
    onClearSelection();
  };

  const handleDeleteConfirm = async () => {
    await bulkDeleteMutation.mutateAsync({
      task_ids: selectedTaskIds,
    });
    setIsDeleteConfirmOpen(false);
    onClearSelection();
  };

  return (
    <>
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-dark-elevated border border-brand/40 shadow-2xl rounded-xl p-3 sm:px-4 sm:py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-4 max-w-2xl w-[94vw] sm:w-[92vw]">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-primary shrink-0">
          <CheckSquare className="w-4 h-4 text-brand" />
          <span>{selectedTaskIds.length} selected</span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-dark-borderSubtle shrink-0" />

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 grow min-w-0">
          <Select
            options={[
              { value: '', label: 'Change Status...' },
              { value: 'pending', label: 'Pending' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'blocked', label: 'Blocked' },
            ]}
            onChange={handleStatusChange}
            className="text-xs py-1 h-8"
            disabled={bulkUpdateMutation.isPending}
          />

          <Select
            options={[
              { value: '', label: 'Change Priority...' },
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
            onChange={handlePriorityChange}
            className="text-xs py-1 h-8"
            disabled={bulkUpdateMutation.isPending}
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="text-text-secondary hover:text-status-danger text-xs h-8 px-2.5 shrink-0"
            disabled={bulkDeleteMutation.isPending}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Trash
          </Button>
        </div>

        <button
          type="button"
          onClick={onClearSelection}
          className="p-1 rounded text-text-muted hover:text-text-primary transition-colors shrink-0"
          title="Clear Selection"
          aria-label="Clear Selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Move Selected Tasks to Trash?"
        message={`Are you sure you want to move ${selectedTaskIds.length} tasks to trash? You can restore them from the Trash page.`}
        confirmText="Move to Trash"
        isDestructive
        isLoading={bulkDeleteMutation.isPending}
      />
    </>
  );
};
