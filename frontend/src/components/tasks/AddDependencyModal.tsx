import React, { useState } from 'react';
import { Modal, ModalFooter } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useAddDependency } from '../../hooks/useTaskDependencies';
import { useTasks } from '../../hooks/useTasks';
import { normalizeApiError } from '../../api/apiError';
import { Search, Link as LinkIcon, AlertCircle } from 'lucide-react';

export interface AddDependencyModalProps {
  currentTaskId: number;
  currentTaskProjectId?: number | null;
  isOpen: boolean;
  onClose: () => void;
  existingDependencyTaskIds?: number[];
}

export const AddDependencyModal: React.FC<AddDependencyModalProps> = ({
  currentTaskId,
  currentTaskProjectId,
  isOpen,
  onClose,
  existingDependencyTaskIds = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addDependencyMutation = useAddDependency(currentTaskId);

  // Fetch tasks in same project if available, or workspace
  const { data: tasksData, isLoading } = useTasks({
    project_id: currentTaskProjectId || undefined,
    limit: 50,
  });

  const availableTasks = (tasksData?.tasks || []).filter(
    (t) =>
      t.id !== currentTaskId &&
      !existingDependencyTaskIds.includes(t.id) &&
      t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId) return;
    setErrorMsg(null);

    try {
      await addDependencyMutation.mutateAsync({
        dependsOnTaskId: selectedTaskId,
      });
      setSelectedTaskId(null);
      setSearchQuery('');
      onClose();
    } catch (err: unknown) {
      setErrorMsg(normalizeApiError(err).message || 'Failed to add dependency');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Task Dependency"
      description={`Select a prerequisite task that must be completed before TASK-${currentTaskId} can be finished.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/25 text-status-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <Input
          placeholder="Search prerequisite tasks by title..."
          leftIcon={<Search className="w-4 h-4 text-text-muted" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />

        <div className="border border-dark-border rounded-lg max-h-56 overflow-y-auto divide-y divide-dark-borderSubtle bg-dark-surface/50">
          {isLoading ? (
            <p className="p-4 text-xs text-text-muted text-center">Loading tasks...</p>
          ) : availableTasks.length === 0 ? (
            <p className="p-4 text-xs text-text-muted text-center">
              No eligible prerequisite tasks found.
            </p>
          ) : (
            availableTasks.map((t) => {
              const isSelected = selectedTaskId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTaskId(t.id)}
                  className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-brand/10 border-l-2 border-brand text-brand'
                      : 'hover:bg-dark-elevated text-text-secondary'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-text-muted">TASK-{t.id}</span>
                      <p className="text-xs font-semibold text-text-primary truncate">{t.title}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={t.status === 'completed' ? 'success' : 'default'} size="sm">
                      {t.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!selectedTaskId}
            isLoading={addDependencyMutation.isPending}
            leftIcon={<LinkIcon className="w-4 h-4" />}
          >
            Link Dependency
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
