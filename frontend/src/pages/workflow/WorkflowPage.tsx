import React, { useState } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { useBulkUpdateTasks } from '../../hooks/useBulkTasks';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Workflow,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { TaskStatus } from '../../types';

export const WorkflowPage: React.FC = () => {
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [targetStatus, setTargetStatus] = useState<TaskStatus>('in_progress');

  const { data: tasksData, isLoading, refetch } = useTasks({ limit: 50 });
  const tasks = tasksData?.tasks || [];

  const bulkStatusMutation = useBulkUpdateTasks();

  const handleToggleSelect = (taskId: number) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTaskIds.length === tasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(tasks.map((t) => t.id));
    }
  };

  const handleApplyBulkTransition = async () => {
    if (selectedTaskIds.length === 0) return;

    try {
      await bulkStatusMutation.mutateAsync({
        task_ids: selectedTaskIds,
        status: targetStatus,
      });
      setSelectedTaskIds([]);
      refetch();
    } catch {
      // Handled in mutation hook
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-dark-borderSubtle pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
          <Workflow className="w-6 h-6 text-brand" />
          <span>Workflow & State Lifecycle Engine</span>
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Inspect enterprise task state transitions, dependency blocker gates, and execute batch lifecycle mutations.
        </p>
      </div>

      {/* State Machine Transition Flow Blueprint */}
      <Card className="p-6 bg-dark-surface border-dark-borderSubtle space-y-6">
        <div className="flex items-center justify-between border-b border-dark-borderSubtle pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Authoritative Task State Transitions
            </h3>
          </div>
          <Badge variant="brand" size="sm">Deterministic State Machine</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          {/* State 1: Pending */}
          <div className="p-4 rounded-xl bg-dark-elevated border border-dark-borderSubtle space-y-2 text-center">
            <div className="w-8 h-8 rounded-full bg-dark-border/60 text-text-muted flex items-center justify-center mx-auto">
              <Clock className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-text-primary uppercase tracking-wider">1. Pending</div>
            <p className="text-[11px] text-text-muted">Initial task intake & assignment stage</p>
          </div>

          {/* State 2: In Progress */}
          <div className="p-4 rounded-xl bg-brand/10 border border-brand/40 space-y-2 text-center shadow-lemon-sm">
            <div className="w-8 h-8 rounded-full bg-brand text-dark-bg flex items-center justify-center mx-auto font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-brand uppercase tracking-wider">2. In Progress</div>
            <p className="text-[11px] text-text-secondary">Active engineering & sprint focus</p>
          </div>

          {/* State 3: Completed */}
          <div className="p-4 rounded-xl bg-status-success/10 border border-status-success/30 space-y-2 text-center">
            <div className="w-8 h-8 rounded-full bg-status-success text-dark-bg flex items-center justify-center mx-auto font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-status-success uppercase tracking-wider">3. Completed</div>
            <p className="text-[11px] text-text-secondary">Prerequisites resolved & delivered</p>
          </div>

          {/* State 4: Cancelled */}
          <div className="p-4 rounded-xl bg-dark-elevated/40 border border-dark-borderSubtle space-y-2 text-center">
            <div className="w-8 h-8 rounded-full bg-status-danger/20 text-status-danger flex items-center justify-center mx-auto">
              <XCircle className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-text-muted uppercase tracking-wider">4. Cancelled</div>
            <p className="text-[11px] text-text-muted">Archived or deprecated deliverables</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-dark-elevated border border-dark-borderSubtle text-xs text-text-muted flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          <span>
            <strong>Blocker Enforcement Gate:</strong> Transitioning any task to <code className="text-brand">completed</code> is blocked if unfinished prerequisite tasks exist in its dependency DAG.
          </span>
        </div>
      </Card>

      {/* Batch Workflow Transition Console */}
      <Card className="p-0 overflow-hidden bg-dark-surface border-dark-borderSubtle">
        <div className="p-4 border-b border-dark-borderSubtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Workflow className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-bold text-text-primary">Batch Workflow Transition Console</h3>
            <span className="text-xs text-text-muted font-normal">({selectedTaskIds.length} selected)</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as TaskStatus)}
              className="px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-borderSubtle text-xs text-text-primary focus:outline-none focus:border-brand"
            >
              <option value="pending">Set Pending</option>
              <option value="in_progress">Set In Progress</option>
              <option value="completed">Set Completed</option>
              <option value="cancelled">Set Cancelled</option>
            </select>

            <Button
              variant="primary"
              size="sm"
              onClick={handleApplyBulkTransition}
              disabled={selectedTaskIds.length === 0 || bulkStatusMutation.isPending}
              isLoading={bulkStatusMutation.isPending}
              className="shadow-lemon-sm"
            >
              Apply Transition
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton variant="rectangular" className="h-10 w-full" />
            <Skeleton variant="rectangular" className="h-10 w-full" />
            <Skeleton variant="rectangular" className="h-10 w-full" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-muted">
            No active tasks available in workspace.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-dark-borderSubtle bg-dark-elevated/40 text-text-muted uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.length === tasks.length && tasks.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-dark-border bg-dark-bg text-brand focus:ring-brand"
                    />
                  </th>
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Project</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-borderSubtle/60">
                {tasks.map((task) => {
                  const isSelected = selectedTaskIds.includes(task.id);
                  return (
                    <tr
                      key={task.id}
                      onClick={() => handleToggleSelect(task.id)}
                      className={`hover:bg-dark-elevated/40 transition-colors cursor-pointer ${
                        isSelected ? 'bg-brand/5' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(task.id)}
                          className="rounded border-dark-border bg-dark-bg text-brand focus:ring-brand"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-text-primary">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-[10px] text-text-muted">#{task.id}</span>
                          <span className="truncate">{task.title}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'brand' : 'default'}
                          size="sm"
                          className="text-[10px] uppercase"
                        >
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={task.priority === 'urgent' ? 'danger' : task.priority === 'high' ? 'warning' : 'default'}
                          size="sm"
                          className="text-[10px] uppercase"
                        >
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary">
                        {task.project ? task.project.name : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default WorkflowPage;
