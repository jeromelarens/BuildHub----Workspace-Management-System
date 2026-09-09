import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Notification } from '../../types';
import {
  useMarkNotificationRead,
  useDeleteNotification,
} from '../../hooks/useNotifications';
import { formatRelativeTime } from '../../utils/date';
import {
  Bell,
  AtSign,
  CheckCircle2,
  FolderGit2,
  Trash2,
  GitBranch,
} from 'lucide-react';

export interface NotificationItemProps {
  notification: Notification;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const navigate = useNavigate();
  const markReadMutation = useMarkNotificationRead();
  const deleteMutation = useDeleteNotification();

  const handleClick = async () => {
    if (!notification.is_read) {
      await markReadMutation.mutateAsync(notification.id);
    }

    // Navigate to target resource
    if (
      notification.entity_type === 'task' ||
      notification.entity_type === 'task_comment'
    ) {
      if (notification.entity_id) {
        navigate(`/tasks/${notification.entity_id}`);
      }
    } else if (notification.entity_type === 'project') {
      if (notification.entity_id) {
        navigate(`/projects/${notification.entity_id}`);
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteMutation.mutateAsync(notification.id);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'mention':
        return <AtSign className="w-4 h-4 text-brand shrink-0" />;
      case 'task_assigned':
        return <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />;
      case 'dependency_resolved':
        return <GitBranch className="w-4 h-4 text-status-warning shrink-0" />;
      case 'project_added':
        return <FolderGit2 className="w-4 h-4 text-status-info shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-text-muted shrink-0" />;
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`p-3.5 rounded-xl border transition-colors cursor-pointer flex items-start justify-between gap-3 group ${
        notification.is_read
          ? 'bg-dark-surface/40 border-dark-borderSubtle hover:bg-dark-surface'
          : 'bg-dark-elevated border-brand/25 hover:border-brand/40 shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5">{getIcon()}</div>

        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <h4
              className={`text-xs font-semibold truncate ${
                notification.is_read ? 'text-text-secondary' : 'text-text-primary'
              }`}
            >
              {notification.title}
            </h4>
            {!notification.is_read && (
              <span className="w-2 h-2 rounded-full bg-brand shrink-0 inline-block" />
            )}
          </div>

          <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
            {notification.message}
          </p>

          <span className="text-[10px] text-text-muted block pt-1">
            {formatRelativeTime(notification.created_at)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-status-danger transition-opacity shrink-0"
        title="Dismiss notification"
        aria-label="Dismiss notification"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
