import React from 'react';
import { List, LayoutGrid, Calendar as CalendarIcon } from 'lucide-react';

export type TaskViewMode = 'list' | 'board' | 'calendar';

export interface TaskViewSwitcherProps {
  currentView: TaskViewMode;
  onViewChange: (view: TaskViewMode) => void;
}

export const TaskViewSwitcher: React.FC<TaskViewSwitcherProps> = ({
  currentView,
  onViewChange,
}) => {
  const views: { id: TaskViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'list', label: 'List', icon: <List className="w-3.5 h-3.5" /> },
    { id: 'board', label: 'Board', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'calendar', label: 'Calendar', icon: <CalendarIcon className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex items-center p-1 rounded-xl bg-dark-surface border border-dark-borderSubtle">
      {views.map((v) => {
        const isActive = currentView === v.id;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onViewChange(v.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 ${
              isActive
                ? 'bg-brand text-dark-bg shadow-sm'
                : 'text-text-muted hover:text-text-primary hover:bg-dark-elevated/60'
            }`}
            aria-pressed={isActive}
          >
            {v.icon}
            <span>{v.label}</span>
          </button>
        );
      })}
    </div>
  );
};
