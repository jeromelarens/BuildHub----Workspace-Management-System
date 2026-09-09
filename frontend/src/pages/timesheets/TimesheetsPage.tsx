import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  Clock,
  Play,
  Square,
  Plus,
  TrendingUp,
  Calendar,
  Trash2,
  BarChart2,
  List,
} from 'lucide-react';
import {
  useActiveTimer,
  useStartTimer,
  useStopTimer,
  useTimeEntries,
  useCreateManualTimeEntry,
  useDeleteTimeEntry,
  useTimesheetReport,
} from '../../hooks/useTimeEntries';
import { useTasks } from '../../hooks/useTasks';
import { useTeamVelocity } from '../../hooks/useAnalytics';

export const TimesheetsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'log' | 'report' | 'velocity'>('log');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | ''>('');
  const [timerDescription, setTimerDescription] = useState('');
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  // Punch clock hooks
  const { data: activeTimer } = useActiveTimer();
  const startTimerMutation = useStartTimer();
  const stopTimerMutation = useStopTimer();
  const { data: timeEntries = [], isLoading: isLoadingEntries, isError: isErrorEntries, refetch: refetchEntries } =
    useTimeEntries();
  const manualEntryMutation = useCreateManualTimeEntry();
  const deleteEntryMutation = useDeleteTimeEntry();
  const { data: reportData, isLoading: isLoadingReport } = useTimesheetReport({ group_by: 'day' });

  // Tasks hook for task picker dropdown
  const { data: tasksData } = useTasks();
  const tasks = tasksData?.tasks || [];

  // Team velocity analytics
  const { data: velocityData } = useTeamVelocity();

  // Elapsed timer computation
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!activeTimer?.start_time) {
      setElapsedSeconds(0);
      return;
    }
    const calc = () => {
      const startMs = new Date(activeTimer.start_time).getTime();
      const diffSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedSeconds(diffSec);
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const formatDuration = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const handleStartTimerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId) return;
    startTimerMutation.mutate({
      task_id: Number(selectedTaskId),
      description: timerDescription.trim() || undefined,
    });
    setTimerDescription('');
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !manualStart || !manualEnd) return;
    await manualEntryMutation.mutateAsync({
      task_id: Number(selectedTaskId),
      start_time: new Date(manualStart).toISOString(),
      end_time: new Date(manualEnd).toISOString(),
      description: manualDesc.trim() || undefined,
    });
    setIsManualModalOpen(false);
    setManualStart('');
    setManualEnd('');
    setManualDesc('');
  };

  const totalLoggedSeconds = timeEntries.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Punch-Clock Time Tracking & Timesheets
            </h1>
            <Badge variant="brand">Authoritative</Badge>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Real-time punch-clock logging with authoritative PostgreSQL duration calculation and timesheet reporting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsManualModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Manual Entry
          </Button>
        </div>
      </div>

      {/* Active Punch-Clock Widget */}
      <Card className="bg-dark-surface border-brand/30 shadow-lemon-sm p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/30 flex items-center justify-center text-brand shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Active Punch Clock
                </span>
                {activeTimer ? (
                  <span className="flex items-center gap-1.5 text-xs text-brand font-semibold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-brand" />
                    Recording Live
                  </span>
                ) : (
                  <span className="text-xs text-text-muted">Idle</span>
                )}
              </div>
              <div className="text-xl sm:text-2xl font-bold text-text-primary font-mono mt-0.5">
                {activeTimer ? formatDuration(elapsedSeconds) : '00:00:00'}
              </div>
              {activeTimer?.task && (
                <p className="text-xs text-text-secondary mt-0.5">
                  Working on: <span className="text-brand font-medium">{activeTimer.task.title}</span>
                </p>
              )}
            </div>
          </div>

          {/* Timer Controls Form */}
          {activeTimer ? (
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <Button
                variant="danger"
                size="md"
                className="w-full sm:w-auto font-semibold"
                isLoading={stopTimerMutation.isPending}
                onClick={() => stopTimerMutation.mutate(activeTimer.id)}
                leftIcon={<Square className="w-4 h-4 fill-current" />}
              >
                Punch Out & Save Duration
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleStartTimerSubmit}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto"
            >
              <Select
                className="w-full sm:w-56"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="">Select Task to track...</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.id} - {t.title}
                  </option>
                ))}
              </Select>

              <Input
                placeholder="What are you working on?"
                value={timerDescription}
                onChange={(e) => setTimerDescription(e.target.value)}
                className="w-full sm:w-60"
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="shrink-0 font-semibold shadow-lemon-sm"
                isLoading={startTimerMutation.isPending}
                disabled={!selectedTaskId}
                leftIcon={<Play className="w-4 h-4 fill-dark-bg" />}
              >
                Punch In
              </Button>
            </form>
          )}
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Total Logged Duration
          </span>
          <div className="text-2xl font-bold text-text-primary">
            {formatDuration(totalLoggedSeconds)}
          </div>
          <p className="text-[11px] text-text-secondary">{timeEntries.length} completed time logs</p>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Avg Turnaround Hours
          </span>
          <div className="text-2xl font-bold text-status-info">
            {velocityData?.summary.average_completion_hours ?? 0} hrs
          </div>
          <p className="text-[11px] text-text-secondary">Task completion velocity baseline</p>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Throughput Volume
          </span>
          <div className="text-2xl font-bold text-status-success">
            {velocityData?.velocity_timeline.reduce((acc, t) => acc + t.completed_tasks, 0) ?? 0} tasks
          </div>
          <p className="text-[11px] text-text-secondary">Delivered in monitored period</p>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-dark-borderSubtle pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('log')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'log'
              ? 'bg-brand/15 text-brand border border-brand/30'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>Punch-Clock Log</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'report'
              ? 'bg-brand/15 text-brand border border-brand/30'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Timesheet Report</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('velocity')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'velocity'
              ? 'bg-brand/15 text-brand border border-brand/30'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Completion Velocity</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'log' && (
        <Card className="p-0 overflow-hidden bg-dark-surface border-dark-border">
          <div className="p-4 border-b border-dark-borderSubtle flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary">Recorded Time Entries</h3>
            <span className="text-xs text-text-muted">{timeEntries.length} entries</span>
          </div>

          {isLoadingEntries ? (
            <div className="p-6 space-y-3">
              <Skeleton variant="rectangular" className="h-10 w-full" />
              <Skeleton variant="rectangular" className="h-10 w-full" />
              <Skeleton variant="rectangular" className="h-10 w-full" />
            </div>
          ) : isErrorEntries ? (
            <div className="p-8">
              <ErrorState
                title="Could not load time entries"
                message="Failed to retrieve punch-clock log from backend."
                onRetry={() => refetchEntries()}
              />
            </div>
          ) : timeEntries.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="No time entries recorded"
                description="Use the punch-clock widget above to start tracking time on your tasks."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-dark-borderSubtle bg-dark-elevated/40 text-text-muted uppercase tracking-wider font-semibold text-[10px]">
                    <th className="py-3 px-4">Task</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Start Time</th>
                    <th className="py-3 px-4">End Time</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-borderSubtle/60">
                  {timeEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-dark-elevated/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-text-primary">
                        {entry.task ? `#${entry.task_id} ${entry.task.title}` : `Task #${entry.task_id}`}
                      </td>
                      <td className="py-3 px-4 text-text-secondary">
                        {entry.description || <span className="text-text-muted italic">—</span>}
                      </td>
                      <td className="py-3 px-4 font-mono text-text-muted text-[11px]">
                        {new Date(entry.start_time).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-text-muted text-[11px]">
                        {entry.end_time ? new Date(entry.end_time).toLocaleString() : 'In Progress'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-brand">
                        {formatDuration(entry.duration_seconds)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => deleteEntryMutation.mutate(entry.id)}
                          disabled={deleteEntryMutation.isPending}
                          className="p-1 text-text-muted hover:text-status-danger rounded transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'report' && (
        <Card className="p-5 bg-dark-surface border-dark-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary">Timesheet Aggregation Summary</h3>
            <span className="text-xs text-brand font-mono font-bold">
              Total Hours: {reportData?.summary.total_hours.toFixed(2) ?? 0} hrs
            </span>
          </div>

          {isLoadingReport ? (
            <Skeleton variant="rectangular" className="h-32 w-full" />
          ) : !reportData || reportData.grouped_data.length === 0 ? (
            <EmptyState
              title="No aggregated timesheet records"
              description="Log time entries to view aggregated timesheet reports."
            />
          ) : (
            <div className="space-y-4">
              {reportData.grouped_data.map((group) => (
                <div
                  key={group.group_key}
                  className="p-4 rounded-xl bg-dark-elevated border border-dark-borderSubtle flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-brand" />
                    <div>
                      <span className="text-xs font-bold text-text-primary">{group.group_key}</span>
                      <p className="text-[11px] text-text-muted">{group.entries.length} logged sessions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-brand font-mono">
                      {group.total_hours.toFixed(2)} hrs
                    </span>
                    <p className="text-[10px] text-text-muted font-mono">
                      {formatDuration(group.total_seconds)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'velocity' && (
        <Card className="p-0 overflow-hidden bg-dark-surface border-dark-border">
          <div className="p-4 border-b border-dark-borderSubtle flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary">Task Completion Velocity Timeline</h3>
            <span className="text-xs text-text-muted">
              {velocityData?.velocity_timeline.length ?? 0} recorded intervals
            </span>
          </div>

          {!velocityData || velocityData.velocity_timeline.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="No completion velocity records"
                description="Completed tasks will appear in this throughput timeline."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-dark-borderSubtle bg-dark-elevated/40 text-text-muted uppercase tracking-wider font-semibold text-[10px]">
                    <th className="py-3 px-4">Completion Date</th>
                    <th className="py-3 px-4">Tasks Completed</th>
                    <th className="py-3 px-4 text-right">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-borderSubtle/60">
                  {velocityData.velocity_timeline.map((item, idx) => (
                    <tr key={idx} className="hover:bg-dark-elevated/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-text-secondary">{item.date}</td>
                      <td className="py-3 px-4 font-bold text-text-primary">{item.completed_tasks} completed</td>
                      <td className="py-3 px-4 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand/15 text-brand border border-brand/30">
                          Verified Delivery
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Manual Time Entry Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Log Manual Time Entry"
        size="md"
      >
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <Select
            label="Associated Task"
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value ? Number(e.target.value) : '')}
            required
          >
            <option value="">Select Task...</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.id} - {t.title}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Start Time"
              type="datetime-local"
              value={manualStart}
              onChange={(e) => setManualStart(e.target.value)}
              required
            />
            <Input
              label="End Time"
              type="datetime-local"
              value={manualEnd}
              onChange={(e) => setManualEnd(e.target.value)}
              required
            />
          </div>

          <Input
            label="Description / Work Notes"
            placeholder="Summary of deliverables..."
            value={manualDesc}
            onChange={(e) => setManualDesc(e.target.value)}
          />

          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsManualModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={manualEntryMutation.isPending}
            >
              Save Time Entry
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
};

export default TimesheetsPage;
