import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Task } from '../../types';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { formatDate, isOverdue } from '../../utils/date';
import {
  Calendar,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

export interface ProjectTimelineProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export const ProjectTimeline: React.FC<ProjectTimelineProps> = ({
  tasks,
  onTaskClick,
}) => {
  const navigate = useNavigate();

  if (tasks.length === 0) {
    return (
      <Card className="p-12 text-center text-xs text-text-muted bg-dark-surface border-dark-borderSubtle">
        No tasks scheduled in this project yet. Add tasks with due dates to visualize the timeline.
      </Card>
    );
  }

  // Calculate project timeframe
  const datesWithValues = tasks
    .map((t) => (t.due_date ? new Date(t.due_date).getTime() : null))
    .filter((d): d is number => d !== null);

  const minDateMs = datesWithValues.length > 0 ? Math.min(...datesWithValues) : Date.now();
  const maxDateMs = datesWithValues.length > 0 ? Math.max(...datesWithValues) : Date.now() + 30 * 86400000;
  const totalRangeDays = Math.max(Math.ceil((maxDateMs - minDateMs) / (1000 * 60 * 60 * 24)) + 7, 14);

  return (
    <Card className="p-0 overflow-hidden bg-dark-surface border-dark-borderSubtle">
      {/* Timeline Header */}
      <div className="p-4 border-b border-dark-borderSubtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand" />
          <h3 className="text-sm font-bold text-text-primary">Gantt & Project Delivery Timeline</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{tasks.length} total tasks</span>
          <span>•</span>
          <span>{datesWithValues.length} dated items</span>
        </div>
      </div>

      {/* Timeline Table + Visual Bars */}
      <div className="overflow-x-auto">
        <div className="min-w-[760px] divide-y divide-dark-borderSubtle/60">
          {/* Header row */}
          <div className="grid grid-cols-12 bg-dark-elevated/40 text-[10px] uppercase font-bold text-text-muted py-2.5 px-4 tracking-wider">
            <div className="col-span-5 sm:col-span-4">Task Details</div>
            <div className="col-span-2">Assignee</div>
            <div className="col-span-2">Due Date</div>
            <div className="col-span-3 sm:col-span-4">Timeline Schedule (0 – {totalRangeDays}d)</div>
          </div>

          {/* Task Rows */}
          {tasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const overdue = isOverdue(task.due_date, isCompleted);
            const taskDueMs = task.due_date ? new Date(task.due_date).getTime() : null;

            // Compute horizontal percentage offset for timeline bar
            let offsetPercent = 0;
            let barWidthPercent = 20;

            if (taskDueMs) {
              const diffDays = Math.max((taskDueMs - minDateMs) / (1000 * 60 * 60 * 24), 0);
              offsetPercent = Math.min(Math.round((diffDays / totalRangeDays) * 75), 80);
              barWidthPercent = Math.max(15, 25);
            }

            const getStatusColor = () => {
              if (isCompleted) return 'bg-status-success text-dark-bg';
              if (overdue) return 'bg-status-danger text-white';
              if (task.status === 'in_progress') return 'bg-brand text-dark-bg';
              return 'bg-dark-elevated text-text-secondary border border-dark-border';
            };

            return (
              <div
                key={task.id}
                onClick={() => (onTaskClick ? onTaskClick(task) : navigate(`/tasks/${task.id}`))}
                className="grid grid-cols-12 py-3 px-4 items-center hover:bg-dark-elevated/30 transition-colors cursor-pointer group text-xs"
              >
                {/* Task Details */}
                <div className="col-span-5 sm:col-span-4 pr-2 truncate">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-text-muted">#{task.id}</span>
                    <span className="font-semibold text-text-primary group-hover:text-brand transition-colors truncate">
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant={isCompleted ? 'success' : task.status === 'in_progress' ? 'brand' : 'default'} size="sm" className="text-[9px] uppercase">
                      {task.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant={task.priority === 'urgent' ? 'danger' : task.priority === 'high' ? 'warning' : 'default'} size="sm" className="text-[9px] uppercase">
                      {task.priority}
                    </Badge>
                  </div>
                </div>

                {/* Assignee */}
                <div className="col-span-2">
                  {task.assigned_user ? (
                    <div className="flex items-center gap-1.5 truncate">
                      <Avatar name={task.assigned_user.name} size="xs" />
                      <span className="text-[11px] text-text-secondary truncate">{task.assigned_user.name}</span>
                    </div>
                  ) : (
                    <span className="text-text-muted italic text-[11px]">Unassigned</span>
                  )}
                </div>

                {/* Due Date */}
                <div className="col-span-2 text-[11px]">
                  {task.due_date ? (
                    <span className={`flex items-center gap-1 ${overdue ? 'text-status-danger font-bold' : 'text-text-secondary'}`}>
                      {overdue ? <AlertCircle className="w-3 h-3 text-status-danger" /> : <Clock className="w-3 h-3 text-text-muted" />}
                      {formatDate(task.due_date)}
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </div>

                {/* Visual Gantt Bar */}
                <div className="col-span-3 sm:col-span-4 relative h-6 rounded-md bg-dark-elevated/30 border border-dark-borderSubtle/50 overflow-hidden flex items-center">
                  {task.due_date ? (
                    <div
                      className={`h-4 rounded px-2 text-[9px] font-bold flex items-center justify-between shadow-sm transition-all duration-200 ${getStatusColor()}`}
                      style={{
                        marginLeft: `${offsetPercent}%`,
                        width: `${barWidthPercent}%`,
                        minWidth: '70px',
                      }}
                    >
                      <span className="truncate">TASK-{task.id}</span>
                      <ArrowRight className="w-2.5 h-2.5 shrink-0 opacity-70" />
                    </div>
                  ) : (
                    <span className="text-[10px] text-text-muted italic px-2">No due date milestone</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend Footer */}
      <div className="p-3 border-t border-dark-borderSubtle bg-dark-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-text-muted">
        <span>Click any task to view full details and manage dependencies.</span>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-brand" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-status-success" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-status-danger" />
            <span>Overdue</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
