import React from 'react';
import { useTaskActivity } from '../../hooks/useActivity';
import { formatRelativeTime } from '../../utils/date';
import {
  Activity,
  CheckCircle2,
  PlusCircle,
  UserCheck,
  Tag,
  MessageSquare,
  Clock,
} from 'lucide-react';

export interface ActivityTimelineProps {
  taskId: number | string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ taskId }) => {
  const { data: activities = [], isLoading } = useTaskActivity(taskId);

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return <PlusCircle className="w-3.5 h-3.5 text-brand" />;
      case 'completed':
      case 'status_changed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />;
      case 'assigned':
      case 'reassigned':
        return <UserCheck className="w-3.5 h-3.5 text-status-info" />;
      case 'priority_changed':
        return <Tag className="w-3.5 h-3.5 text-status-warning" />;
      case 'comment_added':
        return <MessageSquare className="w-3.5 h-3.5 text-text-secondary" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-text-muted" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-brand" />
        <h3 className="text-sm font-semibold text-text-primary">
          Activity History ({activities.length})
        </h3>
      </div>

      {isLoading ? (
        <p className="text-xs text-text-muted">Loading activity...</p>
      ) : activities.length === 0 ? (
        <p className="text-xs text-text-muted">No activity recorded for this task.</p>
      ) : (
        <div className="relative pl-6 border-l border-dark-borderSubtle space-y-4 my-2">
          {activities.map((act) => (
            <div key={act.id} className="relative group text-xs">
              {/* Dot indicator with action icon */}
              <div className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-dark-surface border border-dark-borderSubtle flex items-center justify-center">
                {getActionIcon(act.action)}
              </div>

              <div className="min-w-0">
                <p className="text-text-secondary leading-relaxed">
                  <span className="font-semibold text-text-primary">
                    {act.user_name || 'System'}{' '}
                  </span>
                  <span>{act.action.replace('_', ' ')}</span>
                  {act.new_value && (
                    <span className="font-medium text-text-primary">
                      {' '}
                      to &quot;{act.new_value}&quot;
                    </span>
                  )}
                </p>
                <span className="text-[10px] text-text-muted mt-0.5 block">
                  {formatRelativeTime(act.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
