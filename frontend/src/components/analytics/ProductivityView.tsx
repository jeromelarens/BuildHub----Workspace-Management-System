import React, { useMemo } from 'react';
import { useTeamVelocity } from '../../hooks/useAnalytics';
import { useTasks } from '../../hooks/useTasks';
import {
  Clock,
  CheckCircle2,
  Zap,
  Percent,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { LoadingState } from '../ui/LoadingState';
import { VelocityChart } from './VelocityChart';

export const ProductivityView: React.FC = () => {
  const { data: velocityData, isLoading: isVelocityLoading } = useTeamVelocity();
  const { data: tasksData, isLoading: isTasksLoading } = useTasks({ limit: 1000 });

  const tasks = useMemo(() => tasksData?.tasks || [], [tasksData]);

  const completedCount = useMemo(() => tasks.filter((t) => t.status === 'completed').length, [tasks]);
  const totalCount = tasks.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const avgHours = velocityData?.summary?.average_completion_hours ?? 0;
  const avgDays = velocityData?.summary?.average_completion_days ?? 0;

  const isLoading = isVelocityLoading || isTasksLoading;

  if (isLoading) {
    return <LoadingState message="Aggregating productivity metrics..." />;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Avg Turnaround Time</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">
              {avgDays > 0 ? `${avgDays} days` : `${avgHours} hours`}
            </p>
          </div>
        </Card>

        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Finished Deliverables</p>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{completedCount}</p>
          </div>
        </Card>

        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Throughput Ratio</p>
            <p className="text-xl font-bold text-blue-400 mt-0.5">{completionRate}%</p>
          </div>
        </Card>

        <Card className="p-4 bg-dark-surface/60 border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Total Task Volume</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">{totalCount}</p>
          </div>
        </Card>
      </div>

      {/* Velocity Timeline Chart */}
      <VelocityChart
        timeline={velocityData?.velocity_timeline || []}
        avgHours={avgHours}
        avgDays={avgDays}
      />
    </div>
  );
};
