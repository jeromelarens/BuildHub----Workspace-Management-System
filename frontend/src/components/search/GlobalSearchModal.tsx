import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { useDebounce } from '../../hooks/useAdvancedSearch';
import { Badge } from '../ui/Badge';
import { Search, CheckSquare, FolderGit2, ArrowRight } from 'lucide-react';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  // Search tasks
  const { data: tasksData, isLoading: isTasksLoading } = useTasks(
    debouncedQuery ? { search: debouncedQuery, limit: 6 } : undefined
  );

  // Search projects
  const { data: projectsData, isLoading: isProjectsLoading } = useProjects(
    debouncedQuery ? { search: debouncedQuery, limit: 4 } : undefined
  );

  const tasks = debouncedQuery ? tasksData?.tasks || [] : [];
  const projects = debouncedQuery ? projectsData?.projects || [] : [];
  const isSearching = (isTasksLoading || isProjectsLoading) && Boolean(debouncedQuery);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectTask = (taskId: number) => {
    navigate(`/tasks/${taskId}`);
    onClose();
  };

  const handleSelectProject = (projectId: number) => {
    navigate(`/projects/${projectId}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl rounded-xl bg-dark-elevated border border-dark-border shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-dark-borderSubtle flex items-center gap-3 bg-dark-surface">
          <Search className="w-5 h-5 text-brand shrink-0" />
          <input
            type="text"
            placeholder="Search tasks, projects... (e.g. auth, api, UI)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-text-muted bg-dark-elevated border border-dark-border rounded">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="p-3 overflow-y-auto space-y-4 grow">
          {isSearching && (
            <div className="py-6 text-center text-xs text-text-muted">
              Searching BUILDHUB workspace...
            </div>
          )}

          {!isSearching && !debouncedQuery && (
            <div className="py-8 text-center text-xs text-text-muted space-y-1">
              <p className="text-text-secondary font-medium">Quick Find</p>
              <p>Type to search across tasks and projects instantly.</p>
            </div>
          )}

          {!isSearching && debouncedQuery && tasks.length === 0 && projects.length === 0 && (
            <div className="py-8 text-center text-xs text-text-muted">
              No matching results found for "{debouncedQuery}".
            </div>
          )}

          {/* Tasks Results */}
          {!isSearching && tasks.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted px-2 block">
                Tasks ({tasks.length})
              </span>
              <div className="space-y-1">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTask(t.id)}
                    className="p-2.5 rounded-lg hover:bg-dark-surface cursor-pointer flex items-center justify-between gap-3 group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckSquare className="w-4 h-4 text-brand shrink-0" />
                      <span className="text-[11px] font-mono text-text-muted shrink-0">
                        TASK-{t.id}
                      </span>
                      <p className="text-xs font-semibold text-text-primary group-hover:text-brand transition-colors truncate">
                        {t.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={t.status === 'completed' ? 'success' : 'default'} size="sm">
                        {t.status.replace('_', ' ')}
                      </Badge>
                      <ArrowRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects Results */}
          {!isSearching && projects.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted px-2 block">
                Projects ({projects.length})
              </span>
              <div className="space-y-1">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProject(p.id)}
                    className="p-2.5 rounded-lg hover:bg-dark-surface cursor-pointer flex items-center justify-between gap-3 group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FolderGit2 className="w-4 h-4 text-status-info shrink-0" />
                      <p className="text-xs font-semibold text-text-primary group-hover:text-status-info transition-colors truncate">
                        {p.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="info" size="sm">
                        {p.status}
                      </Badge>
                      <ArrowRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 border-t border-dark-borderSubtle bg-dark-surface/50 flex items-center justify-between text-[11px] text-text-muted">
          <span>Navigate with mouse or keyboard</span>
          <span>BUILDHUB Search</span>
        </div>
      </div>
    </div>
  );
};
