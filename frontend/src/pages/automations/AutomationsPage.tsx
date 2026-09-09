import React, { useState } from 'react';
import { useTasks } from '../../hooks/useTasks';
import {
  useTaskRecurrence,
  useSetRecurrence,
  useDeleteRecurrence,
} from '../../hooks/useTaskRecurrence';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatDate } from '../../utils/date';
import {
  Repeat,
  Sparkles,
  Trash2,
  CheckCircle2,
  Zap,
  Bell,
  ShieldAlert,
  FolderKanban,
} from 'lucide-react';

export const AutomationsPage: React.FC = () => {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [intervalCount, setIntervalCount] = useState<number>(1);
  const [nextRunDate, setNextRunDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data: tasksData, isLoading: isLoadingTasks } = useTasks({ limit: 50 });
  const tasks = tasksData?.tasks || [];

  const activeTaskId = selectedTaskId ?? (tasks.length > 0 ? tasks[0].id : null);
  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;

  const {
    data: recurrenceRule,
    isLoading: isLoadingRecurrence,
  } = useTaskRecurrence(activeTaskId || undefined);

  const setRecurrenceMutation = useSetRecurrence(activeTaskId || undefined);
  const deleteRecurrenceMutation = useDeleteRecurrence(activeTaskId || undefined);

  const handleSaveRecurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTaskId || !nextRunDate) return;

    try {
      await setRecurrenceMutation.mutateAsync({
        frequency,
        interval_count: Number(intervalCount) || 1,
        next_run_date: nextRunDate,
        end_date: endDate || undefined,
      });
      setIsModalOpen(false);
    } catch {
      // Handled in mutation hook
    }
  };

  const handleDeleteRecurrence = async () => {
    if (!activeTaskId) return;
    try {
      await deleteRecurrenceMutation.mutateAsync();
    } catch {
      // Handled in mutation hook
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Zap className="w-6 h-6 text-brand" />
            <span>Automations & Recurrence Engine</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Configure automated cron recurrence schedules, event-driven triggers, and workflow automations.
          </p>
        </div>

        {activeTask && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (recurrenceRule) {
                setFrequency(recurrenceRule.frequency as 'daily' | 'weekly' | 'monthly');
                setIntervalCount(recurrenceRule.interval_count);
                setNextRunDate(recurrenceRule.next_run_date ? recurrenceRule.next_run_date.split('T')[0] : '');
                setEndDate(recurrenceRule.end_date ? recurrenceRule.end_date.split('T')[0] : '');
              } else {
                setFrequency('weekly');
                setIntervalCount(1);
                setNextRunDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
                setEndDate('');
              }
              setIsModalOpen(true);
            }}
            leftIcon={<Repeat className="w-4 h-4" />}
            className="shadow-lemon-sm self-start sm:self-auto"
          >
            {recurrenceRule ? 'Edit Recurrence' : 'Set Recurrence'}
          </Button>
        )}
      </div>

      {/* System Automation Triggers Directory */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-text-muted px-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand" />
          <span>Active System Workflow Automations</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-dark-surface border-dark-borderSubtle space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-brand/10 text-brand">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-text-primary">Assignment Dispatcher</h3>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Automatically triggers an in-app notification and email alert whenever a task is assigned to a workspace member.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[10px] font-mono text-brand">
              <Badge variant="brand" size="sm">Active Event Trigger</Badge>
            </div>
          </Card>

          <Card className="p-4 bg-dark-surface border-dark-borderSubtle space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-status-success/10 text-status-success">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-text-primary">Recurrence Generator</h3>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Nightly cron worker scans active recurrence rules and automatically instantiates the next sprint task with inherited metadata.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[10px] font-mono text-status-success">
              <Badge variant="success" size="sm">Active Cron Worker</Badge>
            </div>
          </Card>

          <Card className="p-4 bg-dark-surface border-dark-borderSubtle space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-status-danger/10 text-status-danger">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-text-primary">Audit Trail Logger</h3>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Captures all lifecycle mutations, role assignments, attachments, and deletions into immutable enterprise audit logs.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[10px] font-mono text-status-danger">
              <Badge variant="danger" size="sm">Active Audit Hook</Badge>
            </div>
          </Card>
        </div>
      </div>

      {/* Task Recurrence Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Task Selector */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
            Select Task to Schedule ({tasks.length})
          </div>

          {isLoadingTasks ? (
            <div className="space-y-2">
              <Skeleton variant="rectangular" className="h-16 w-full" />
              <Skeleton variant="rectangular" className="h-16 w-full" />
              <Skeleton variant="rectangular" className="h-16 w-full" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {tasks.map((t) => {
                const isCurrentActive = activeTaskId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      isCurrentActive
                        ? 'bg-dark-surface border-brand shadow-sm ring-1 ring-brand/30'
                        : 'bg-dark-surface/60 border-dark-borderSubtle hover:border-dark-border hover:bg-dark-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-text-muted">#{t.id}</span>
                      <Badge variant={t.status === 'completed' ? 'success' : 'default'} size="sm" className="text-[9px] uppercase">
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-xs font-semibold text-text-primary truncate">
                      {t.title}
                    </div>
                    {t.project && (
                      <div className="flex items-center gap-1 text-[11px] text-text-muted truncate">
                        <FolderKanban className="w-3 h-3 text-brand shrink-0" />
                        <span className="truncate">{t.project.name}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recurrence Rule Card */}
        <div className="lg:col-span-2 space-y-6">
          {activeTask ? (
            <Card className="p-6 bg-dark-surface border-dark-borderSubtle space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-dark-borderSubtle">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-text-muted">TASK #{activeTask.id}</span>
                    <Badge variant={recurrenceRule ? 'brand' : 'default'} size="sm">
                      {recurrenceRule ? 'Recurring Schedule Active' : 'One-off Task'}
                    </Badge>
                  </div>
                  <h2 className="text-base font-bold text-text-primary mt-1">{activeTask.title}</h2>
                </div>

                {recurrenceRule && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDeleteRecurrence}
                    isLoading={deleteRecurrenceMutation.isPending}
                    leftIcon={<Trash2 className="w-4 h-4" />}
                  >
                    Disable Recurrence
                  </Button>
                )}
              </div>

              {isLoadingRecurrence ? (
                <Skeleton variant="rectangular" className="h-40 w-full" />
              ) : recurrenceRule ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-dark-elevated border border-dark-borderSubtle space-y-1">
                      <span className="text-[10px] text-text-muted uppercase font-bold">Frequency</span>
                      <div className="text-sm font-bold text-text-primary capitalize">
                        Every {recurrenceRule.interval_count > 1 ? `${recurrenceRule.interval_count} ` : ''}
                        {recurrenceRule.frequency}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-dark-elevated border border-dark-borderSubtle space-y-1">
                      <span className="text-[10px] text-text-muted uppercase font-bold">Next Generation Date</span>
                      <div className="text-sm font-bold text-brand">
                        {recurrenceRule.next_run_date ? formatDate(recurrenceRule.next_run_date) : 'Pending'}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-dark-elevated border border-dark-borderSubtle space-y-1">
                      <span className="text-[10px] text-text-muted uppercase font-bold">End Date</span>
                      <div className="text-sm font-bold text-text-secondary">
                        {recurrenceRule.end_date ? formatDate(recurrenceRule.end_date) : 'No end date'}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-dark-surface border border-dark-borderSubtle text-xs text-text-muted flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                    <span>
                      When the current task is completed or the next run date is reached, the backend recurrence worker automatically generates a fresh task instance.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-3 bg-dark-surface/40 rounded-xl border border-dashed border-dark-borderSubtle">
                  <div className="w-12 h-12 rounded-full bg-dark-elevated flex items-center justify-center mx-auto text-brand">
                    <Repeat className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-text-primary">No recurrence rule configured</p>
                  <p className="text-xs text-text-muted max-w-sm mx-auto">
                    Configure a recurring schedule to automatically spawn repeat instances for sprints, reviews, or standups.
                  </p>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-12 text-center text-xs text-text-muted">
              Select a task from the list to manage its recurrence schedule.
            </Card>
          )}
        </div>
      </div>

      {/* Recurrence Setup Modal */}
      {isModalOpen && activeTask && (
        <Modal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title={`Configure Recurrence for Task #${activeTask.id}`}
          description="Set up automatic recurrence intervals and next execution dates."
          size="md"
        >
          <form onSubmit={handleSaveRecurrence} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="w-full rounded-xl bg-dark-bg border border-dark-borderSubtle focus:border-brand px-3.5 py-2.5 text-xs text-text-primary focus:outline-none transition-colors"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <Input
              label="Interval Count (e.g. Every N Weeks/Days)"
              type="number"
              min={1}
              max={30}
              value={intervalCount}
              onChange={(e) => setIntervalCount(parseInt(e.target.value, 10) || 1)}
              required
            />

            <Input
              label="Next Run Date"
              type="date"
              value={nextRunDate}
              onChange={(e) => setNextRunDate(e.target.value)}
              required
            />

            <Input
              label="End Date (Optional)"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

            <ModalFooter>
              <Button variant="ghost" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={setRecurrenceMutation.isPending}
                className="shadow-lemon-sm"
              >
                Save Schedule
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AutomationsPage;
