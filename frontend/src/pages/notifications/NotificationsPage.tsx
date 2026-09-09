import React, { useState } from 'react';
import {
  useNotifications,
  useMarkAllNotificationsRead,
} from '../../hooks/useNotifications';
import { NotificationItem } from '../../components/notifications/NotificationItem';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Bell,
  CheckCheck,
  Search,
  AtSign,
  CheckCircle2,
  GitBranch,
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useNotifications(
    filter === 'unread' ? { is_read: false } : undefined
  );
  const markAllReadMutation = useMarkAllNotificationsRead();

  const allNotifications = data?.notifications || [];
  const unreadCount = allNotifications.filter((n) => !n.is_read).length;

  const filteredNotifications = allNotifications.filter((n) => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        (n.entity_type && n.entity_type.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand" />
            <span>Notification Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Real-time activity dispatch, task assignments, @mentions, and workflow notifications.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            isLoading={markAllReadMutation.isPending}
            leftIcon={<CheckCheck className="w-4 h-4 text-brand" />}
            className="shadow-lemon-sm self-start sm:self-auto"
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-dark-surface border border-dark-borderSubtle w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-brand text-dark-bg shadow-sm font-bold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            All ({allNotifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              filter === 'unread'
                ? 'bg-brand text-dark-bg shadow-sm font-bold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                  filter === 'unread'
                    ? 'bg-dark-bg text-brand'
                    : 'bg-brand text-dark-bg'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-dark-bg border border-dark-borderSubtle text-xs text-text-primary focus:outline-none focus:border-brand transition-colors"
          />
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1 rounded-full border transition-all text-xs font-medium whitespace-nowrap ${
            typeFilter === 'all'
              ? 'bg-dark-elevated text-brand border-brand/50 font-bold'
              : 'border-dark-borderSubtle text-text-muted hover:border-dark-border'
          }`}
        >
          All Types
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter('mention')}
          className={`px-3 py-1 rounded-full border transition-all text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
            typeFilter === 'mention'
              ? 'bg-dark-elevated text-brand border-brand/50 font-bold'
              : 'border-dark-borderSubtle text-text-muted hover:border-dark-border'
          }`}
        >
          <AtSign className="w-3 h-3 text-brand" />
          <span>Mentions</span>
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter('task_assigned')}
          className={`px-3 py-1 rounded-full border transition-all text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
            typeFilter === 'task_assigned'
              ? 'bg-dark-elevated text-brand border-brand/50 font-bold'
              : 'border-dark-borderSubtle text-text-muted hover:border-dark-border'
          }`}
        >
          <CheckCircle2 className="w-3 h-3 text-status-success" />
          <span>Assignments</span>
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter('dependency_resolved')}
          className={`px-3 py-1 rounded-full border transition-all text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
            typeFilter === 'dependency_resolved'
              ? 'bg-dark-elevated text-brand border-brand/50 font-bold'
              : 'border-dark-borderSubtle text-text-muted hover:border-dark-border'
          }`}
        >
          <GitBranch className="w-3 h-3 text-status-warning" />
          <span>Dependencies</span>
        </button>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton variant="rectangular" className="h-16 w-full" />
          <Skeleton variant="rectangular" className="h-16 w-full" />
          <Skeleton variant="rectangular" className="h-16 w-full" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-dark-surface/40 rounded-xl border border-dashed border-dark-borderSubtle">
          <div className="w-12 h-12 rounded-full bg-dark-elevated flex items-center justify-center mx-auto text-brand">
            <Bell className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-text-primary">You're all caught up!</p>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            No {filter === 'unread' ? 'unread ' : ''}notifications matching your active filters.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
