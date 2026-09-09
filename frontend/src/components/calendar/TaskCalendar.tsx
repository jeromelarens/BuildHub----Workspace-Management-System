import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task } from '../../types';
import { useUpdateTask } from '../../hooks/useTasks';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  getDaysInMonth,
  getFirstDayOfMonth,
  formatDateToISO,
  isToday,
  isOverdue,
} from '../../utils/date';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
} from 'lucide-react';

export type CalendarViewType = 'month' | 'week' | 'day';

export interface TaskCalendarProps {
  tasks: Task[];
  onQuickCreate?: (defaultDate?: string) => void;
}

export const TaskCalendar: React.FC<TaskCalendarProps> = ({
  tasks,
  onQuickCreate,
}) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarViewType>('month');
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const updateTaskMutation = useUpdateTask();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Month navigation
  const handlePrev = () => {
    if (viewType === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewType === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewType === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewType === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Drag to reschedule handler
  const handleTaskDrop = async (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    setDragOverDate(null);

    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;

    try {
      const { taskId } = JSON.parse(rawData);
      await updateTaskMutation.mutateAsync({
        id: taskId,
        payload: { due_date: targetDateStr },
      });
    } catch {
      // Handled by mutation
    }
  };

  // Build month calendar grid cells
  const renderMonthView = () => {
    const cells = [];

    // Empty cells for days before start of month
    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <div
          key={`empty-${i}`}
          className="min-h-[110px] sm:min-h-[130px] p-2 bg-dark-surface/40 border border-dark-borderSubtle/50 opacity-40"
        />
      );
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const dateStr = formatDateToISO(cellDate);
      const cellTasks = tasks.filter((t) => t.due_date && t.due_date.startsWith(dateStr));
      const isDayToday = isToday(cellDate);
      const isDraggingOver = dragOverDate === dateStr;

      cells.push(
        <div
          key={`day-${day}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverDate(dateStr);
          }}
          onDragLeave={() => setDragOverDate(null)}
          onDrop={(e) => handleTaskDrop(e, dateStr)}
          className={`min-h-[110px] sm:min-h-[130px] p-2 bg-dark-surface border flex flex-col transition-all duration-150 group relative ${
            isDraggingOver
              ? 'border-brand ring-1 ring-brand bg-dark-surface/90'
              : 'border-dark-borderSubtle hover:border-dark-border'
          }`}
        >
          {/* Day number header */}
          <div className="flex items-center justify-between mb-1.5">
            <span
              className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                isDayToday
                  ? 'bg-brand text-dark-bg'
                  : 'text-text-secondary group-hover:text-text-primary'
              }`}
            >
              {day}
            </span>

            {onQuickCreate && (
              <button
                type="button"
                onClick={() => onQuickCreate(dateStr)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-muted hover:text-brand hover:bg-dark-elevated transition-all"
                title={`Schedule task for ${dateStr}`}
                aria-label={`Schedule task for ${dateStr}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Task chips list */}
          <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px] no-scrollbar">
            {cellTasks.map((t) => {
              const isTaskCompleted = t.status === 'completed';
              const overdue = isOverdue(t.due_date, isTaskCompleted);

              const priorityDot =
                t.priority === 'urgent'
                  ? 'bg-status-danger'
                  : t.priority === 'high'
                  ? 'bg-status-warning'
                  : t.priority === 'medium'
                  ? 'bg-status-info'
                  : 'bg-brand';

              return (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ taskId: t.id }));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onClick={() => navigate(`/tasks/${t.id}`)}
                  className={`p-1.5 rounded-md text-[11px] font-medium truncate flex items-center gap-1.5 cursor-pointer transition-all ${
                    isTaskCompleted
                      ? 'bg-dark-elevated/60 text-text-muted line-through hover:text-text-secondary'
                      : overdue
                      ? 'bg-status-danger/10 text-status-danger border border-status-danger/30 hover:bg-status-danger/20'
                      : 'bg-dark-elevated text-text-primary hover:border-brand/50 border border-dark-borderSubtle'
                  }`}
                  title={`${t.title} (Priority: ${t.priority}, Status: ${t.status})`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot}`} />
                  <span className="truncate">{t.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return cells;
  };

  return (
    <Card className="p-0 overflow-hidden bg-dark-surface border-dark-borderSubtle">
      {/* Calendar Header Controls */}
      <div className="p-4 border-b border-dark-borderSubtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-dark-elevated border border-dark-borderSubtle">
            <CalendarIcon className="w-4 h-4 text-brand" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary tracking-tight">
              {monthNames[month]} {year}
            </h3>
            <p className="text-xs text-text-muted">
              {tasks.filter((t) => t.due_date).length} scheduled items in view
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-dark-elevated border border-dark-borderSubtle p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              className="px-2 h-7 text-text-muted hover:text-text-primary"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="text-xs h-7 px-3 font-semibold text-text-secondary hover:text-brand"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              className="px-2 h-7 text-text-muted hover:text-text-primary"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center p-0.5 rounded-lg bg-dark-elevated border border-dark-borderSubtle text-xs">
            <button
              type="button"
              onClick={() => setViewType('month')}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                viewType === 'month' ? 'bg-brand text-dark-bg' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewType('week')}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                viewType === 'week' ? 'bg-brand text-dark-bg' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Header & Month Days Grid with Internal Scroll Container */}
      <div className="overflow-x-auto w-full scrollbar-thin">
        <div className="min-w-[540px]">
          <div className="grid grid-cols-7 border-b border-dark-borderSubtle bg-dark-elevated/40 text-center py-2 text-[11px] font-bold text-text-muted uppercase tracking-wider">
            {daysOfWeek.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-[1px] bg-dark-borderSubtle/50">
            {renderMonthView()}
          </div>
        </div>
      </div>

      {/* Calendar Legend */}
      <div className="p-3 border-t border-dark-borderSubtle bg-dark-surface flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
        <span className="text-[11px]">Tip: Drag task chips onto dates to reschedule.</span>
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-danger" />
            <span>Urgent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-warning" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-info" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand" />
            <span>Low</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
