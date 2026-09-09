import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { Menu, Search, Plus, Bell, Clock, Square } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { useUnreadNotifications } from '../../hooks/useNotifications';
import { useActiveTimer, useStopTimer } from '../../hooks/useTimeEntries';
import { CreateTaskModal } from '../tasks/CreateTaskModal';
import { GlobalSearchModal } from '../search/GlobalSearchModal';

export interface TopbarProps {
  onMenuClick: () => void;
  sidebarCollapsed?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick, sidebarCollapsed }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: unreadCount = 0 } = useUnreadNotifications(!!user);
  const { data: activeTimer } = useActiveTimer();
  const stopTimerMutation = useStopTimer();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Live timer tick calculation
  useEffect(() => {
    if (!activeTimer?.start_time) {
      setElapsedSeconds(0);
      return;
    }

    const calculateElapsed = () => {
      const startMs = new Date(activeTimer.start_time).getTime();
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsedSeconds(diffSec);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-20 h-14 bg-dark-bg/85 backdrop-blur-md border-b border-dark-border px-4 lg:px-8 flex items-center justify-between transition-all duration-200',
          sidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72'
        )}
      >
        {/* Left Side: Mobile Menu Button & Search Prompt */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md">
          <div className="lg:hidden">
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Open sidebar menu"
              onClick={onMenuClick}
            >
              <Menu className="w-5 h-5 text-text-secondary" />
            </IconButton>
          </div>

          {/* Mobile Search Trigger */}
          <div className="sm:hidden">
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Search"
              onClick={() => setIsSearchOpen(true)}
              className="text-text-muted hover:text-brand"
            >
              <Search className="w-4 h-4" />
            </IconButton>
          </div>

          {/* Global Search Input Prompt */}
          <div
            onClick={() => setIsSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 w-full max-w-sm px-3 py-1.5 rounded-lg bg-dark-surface border border-dark-border text-xs text-text-muted hover:border-dark-borderHover hover:text-text-secondary cursor-pointer transition-colors select-none group"
          >
            <Search className="w-3.5 h-3.5 text-text-muted group-hover:text-brand transition-colors" />
            <span className="flex-1 truncate">Search tasks, projects, team...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono rounded bg-dark-elevated border border-dark-border text-text-muted">
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* Right Side: Active Timer, Quick Actions, Notification & User Profile */}
        <div className="flex items-center gap-2.5">
          {/* Active Punch-Clock Timer Widget */}
          {activeTimer && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-dark-elevated border border-brand/40 shadow-lemon-sm animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
              </span>
              <Clock className="w-3.5 h-3.5 text-brand" />
              <div
                onClick={() => navigate('/timesheets')}
                className="flex items-center gap-1.5 cursor-pointer hover:underline text-xs"
              >
                <span className="hidden md:inline text-text-muted truncate max-w-[120px]">
                  {activeTimer.task?.title || 'Active Task'}
                </span>
                <span className="font-mono font-bold text-text-primary">
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => stopTimerMutation.mutate(activeTimer.id)}
                disabled={stopTimerMutation.isPending}
                className="p-1 text-status-danger hover:bg-status-danger/20 rounded transition-colors"
                title="Stop Timer"
              >
                <Square className="w-3 h-3 fill-status-danger" />
              </button>
            </div>
          )}

          {/* Quick Create Task */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsTaskModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="hidden md:inline-flex font-semibold shadow-lemon-sm"
          >
            Create Task
          </Button>

          {/* Notification Button with Live Badge */}
          <div className="relative">
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="View notifications"
              onClick={() => navigate('/notifications')}
              className="relative text-text-secondary hover:text-text-primary"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 px-1 min-w-[14px] h-[14px] text-[9px] font-bold rounded-full bg-brand text-dark-bg flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </IconButton>
          </div>

          <div className="h-4 w-[1px] bg-dark-borderSubtle mx-1 hidden sm:block" />

          {/* User Profile Trigger */}
          {user && (
            <div
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 select-none cursor-pointer group"
            >
              <Avatar name={user.name} size="sm" status="online" />
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-semibold text-text-primary group-hover:text-brand transition-colors leading-tight">
                  {user.name}
                </span>
                <span className="text-[10px] text-text-muted capitalize">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Global Quick-Find (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      />
    </>
  );
};
