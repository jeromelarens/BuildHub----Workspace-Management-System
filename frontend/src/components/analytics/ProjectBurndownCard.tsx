import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { useProjects } from '../../hooks/useProjects';
import { useProjectBurndown } from '../../hooks/useAnalytics';
import { BarChart3, Flame } from 'lucide-react';

export const ProjectBurndownCard: React.FC = () => {
  const { data: projectsData } = useProjects({ limit: 50 });
  const projects = projectsData?.projects || [];

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects.length > 0 ? String(projects[0].id) : ''
  );

  const activeProjectId = selectedProjectId || (projects.length > 0 ? String(projects[0].id) : '');

  const { data: burndownData, isLoading } = useProjectBurndown(activeProjectId);

  const timeline = burndownData?.burndown_timeline || [];
  const project = burndownData?.project;
  const maxRemaining = project ? project.total_scope_tasks : 1;

  return (
    <Card className="p-6 space-y-5 bg-dark-surface border-dark-borderSubtle">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-dark-borderSubtle pb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Flame className="w-4 h-4 text-status-warning" />
            Project Burndown Analytics
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Sprint burn rate tracking remaining scope tasks against deliveries.
          </p>
        </div>

        {projects.length > 0 && (
          <Select
            options={projects.map((p) => ({ value: String(p.id), label: p.name }))}
            value={activeProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-48 text-xs"
          />
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-text-muted">Loading burndown data...</div>
      ) : !project || timeline.length === 0 ? (
        <div className="py-12 text-center text-xs text-text-muted flex flex-col items-center gap-2">
          <BarChart3 className="w-6 h-6 text-text-muted opacity-40" />
          <span>No task completion history recorded for this project yet.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick Metrics Header */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-dark-elevated border border-dark-borderSubtle text-center">
              <span className="text-[10px] uppercase font-semibold text-text-muted block">Total Scope</span>
              <span className="text-lg font-bold text-text-primary">{project.total_scope_tasks}</span>
            </div>
            <div className="p-3 rounded-lg bg-dark-elevated border border-dark-borderSubtle text-center">
              <span className="text-[10px] uppercase font-semibold text-status-success block">Completed</span>
              <span className="text-lg font-bold text-status-success">{project.currently_completed}</span>
            </div>
            <div className="p-3 rounded-lg bg-dark-elevated border border-dark-borderSubtle text-center">
              <span className="text-[10px] uppercase font-semibold text-status-warning block">Remaining</span>
              <span className="text-lg font-bold text-status-warning">{project.currently_remaining}</span>
            </div>
          </div>

          {/* Burndown Step Bars */}
          <div className="h-44 flex items-end gap-2 pt-6 pb-2 overflow-x-auto">
            {timeline.map((item, idx) => {
              const heightPercent = Math.max(10, (item.remaining_tasks / maxRemaining) * 100);
              return (
                <div
                  key={idx}
                  className="flex-1 min-w-[32px] max-w-[56px] flex flex-col items-center gap-2 group relative"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-dark-elevated border border-dark-border text-[10px] font-semibold text-text-primary px-2.5 py-1 rounded shadow-lg whitespace-nowrap z-20">
                    Remaining: {item.remaining_tasks} • Finished: {item.cumulative_completed}
                  </div>

                  {/* Remaining Bar */}
                  <div className="w-full bg-dark-elevated rounded-t-md relative flex items-end justify-center overflow-hidden h-32">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-status-warning/80 group-hover:bg-status-warning transition-all duration-300 rounded-t-sm"
                    />
                  </div>

                  <span className="text-[10px] text-text-muted font-mono truncate w-full text-center">
                    {item.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-dark-borderSubtle">
            <span>Progressive Burndown Timeline</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm bg-status-warning inline-block" />
              <span>Remaining Tasks</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
