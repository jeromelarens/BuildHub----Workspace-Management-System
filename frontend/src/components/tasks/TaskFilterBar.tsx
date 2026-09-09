import React from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Project } from '../../types';
import { Search, X, Filter } from 'lucide-react';

export interface TaskFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  priorityFilter: string;
  onPriorityChange: (value: string) => void;
  projectIdFilter: string;
  onProjectChange: (value: string) => void;
  projects: Project[];
  onClearAllFilters: () => void;
}

export const TaskFilterBar: React.FC<TaskFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  projectIdFilter,
  onProjectChange,
  projects,
  onClearAllFilters,
}) => {
  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(statusFilter) ||
    Boolean(priorityFilter) ||
    Boolean(projectIdFilter);

  const selectedProject = projects.find((p) => String(p.id) === projectIdFilter);

  return (
    <div className="space-y-3">
      {/* Control row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="grow">
          <Input
            placeholder="Search tasks by title..."
            leftIcon={<Search className="w-4 h-4 text-text-muted" />}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Select
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'blocked', label: 'Blocked' },
            ]}
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-36"
          />

          <Select
            options={[
              { value: '', label: 'All Priorities' },
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
            value={priorityFilter}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="w-36"
          />

          <Select
            options={[
              { value: '', label: 'All Projects' },
              ...projects.map((p) => ({ value: String(p.id), label: p.name })),
            ]}
            value={projectIdFilter}
            onChange={(e) => onProjectChange(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* Filter Chips row */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-text-muted flex items-center gap-1 font-medium">
            <Filter className="w-3 h-3" />
            Filters:
          </span>

          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-dark-elevated border border-dark-border text-text-primary">
              <span>Query: <b>{searchQuery}</b></span>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="text-text-muted hover:text-text-primary p-0.5"
                title="Remove search filter"
                aria-label="Remove search filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {statusFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-dark-elevated border border-dark-border text-text-primary">
              <span>Status: <b className="capitalize">{statusFilter.replace('_', ' ')}</b></span>
              <button
                type="button"
                onClick={() => onStatusChange('')}
                className="text-text-muted hover:text-text-primary p-0.5"
                title="Remove status filter"
                aria-label="Remove status filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {priorityFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-dark-elevated border border-dark-border text-text-primary">
              <span>Priority: <b className="capitalize">{priorityFilter}</b></span>
              <button
                type="button"
                onClick={() => onPriorityChange('')}
                className="text-text-muted hover:text-text-primary p-0.5"
                title="Remove priority filter"
                aria-label="Remove priority filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {projectIdFilter && selectedProject && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-dark-elevated border border-dark-border text-text-primary">
              <span>Project: <b>{selectedProject.name}</b></span>
              <button
                type="button"
                onClick={() => onProjectChange('')}
                className="text-text-muted hover:text-text-primary p-0.5"
                title="Remove project filter"
                aria-label="Remove project filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onClearAllFilters}
            className="text-xs text-brand hover:underline font-medium ml-1"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};
