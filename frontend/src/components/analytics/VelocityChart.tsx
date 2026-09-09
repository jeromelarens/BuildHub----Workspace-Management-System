import React from 'react';
import { Card } from '../ui/Card';
import { VelocityTimelineItem } from '../../types';
import { TrendingUp, Calendar } from 'lucide-react';

export interface VelocityChartProps {
  timeline: VelocityTimelineItem[];
  avgHours?: number;
  avgDays?: number;
}

export const VelocityChart: React.FC<VelocityChartProps> = ({
  timeline,
  avgHours = 0,
  avgDays = 0,
}) => {
  const maxCount = Math.max(...timeline.map((t) => t.completed_tasks), 1);

  return (
    <Card className="p-6 space-y-5 bg-dark-surface border-dark-borderSubtle">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dark-borderSubtle pb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand" />
            Task Completion Velocity
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Daily throughput of completed sprint items over the active period.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-dark-elevated border border-dark-borderSubtle">
            <span className="text-text-muted">Avg Speed: </span>
            <span className="font-bold text-brand">{avgHours}h</span>
            <span className="text-[10px] text-text-muted"> ({avgDays}d)</span>
          </div>
        </div>
      </div>

      {timeline.length === 0 ? (
        <div className="py-12 text-center text-xs text-text-muted flex flex-col items-center gap-2">
          <Calendar className="w-6 h-6 text-text-muted opacity-40" />
          <span>No task completion activity recorded in this period.</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="h-48 flex items-end gap-2 pt-6 pb-2 overflow-x-auto">
            {timeline.map((item, idx) => {
              const heightPercent = Math.max(8, (item.completed_tasks / maxCount) * 100);
              return (
                <div
                  key={idx}
                  className="flex-1 min-w-[28px] max-w-[48px] flex flex-col items-center gap-2 group relative"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-dark-elevated border border-dark-border text-[10px] font-semibold text-text-primary px-2 py-1 rounded shadow-lg whitespace-nowrap z-20">
                    {item.completed_tasks} completed on {item.date}
                  </div>

                  {/* Bar */}
                  <div className="w-full bg-dark-elevated rounded-t-md relative flex items-end justify-center overflow-hidden h-36">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-brand/80 group-hover:bg-brand transition-all duration-300 rounded-t-sm"
                    />
                  </div>

                  {/* Date label */}
                  <span className="text-[10px] text-text-muted font-mono truncate w-full text-center">
                    {item.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-dark-borderSubtle">
            <span>Historical completion dates</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-brand inline-block" />
              <span>Tasks Completed</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
