import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Task, TaskStatus } from '../../types';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Dropdown, DropdownItem } from '../ui/Dropdown';
import { formatDate, isOverdue } from '../../utils/date';
import {
  Calendar,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';

export interface KanbanCardProps {
  task: Task;
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  onStatusChange,
  onEdit,
  onDelete,
}) => {
  const navigate = useNavigate();
  const isTaskOverdue = isOverdue(task.due_date, task.status === 'completed');

  const getPriorityVariant = (p: string) => {
    switch (p) {
      case 'urgent':
        return 'danger';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, currentStatus: task.status }));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="p-3.5 rounded-xl bg-dark-elevated border border-dark-borderSubtle hover:border-brand/40 transition-all duration-150 cursor-grab active:cursor-grabbing space-y-3 group shadow-sm hover:shadow-md"
    >
      {/* Header: Task ID, Priority, Actions */}
      <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold text-text-muted">
            TASK-{task.id}
          </span>
          <Badge variant={getPriorityVariant(task.priority)} size="sm" className="text-[9px] uppercase px-1.5 py-0">
            {task.priority}
          </Badge>
        </div>

        <Dropdown
          trigger={
            <button
              type="button"
              className="p-1 text-text-muted hover:text-text-primary rounded hover:bg-dark-surface"
              aria-label="Task card options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          }
        >
          <div className="p-1.5 text-[10px] font-semibold text-text-muted uppercase border-b border-dark-borderSubtle">
            Change Status
          </div>
          {task.status !== 'pending' && (
            <DropdownItem onClick={() => onStatusChange(task, 'pending')}>
              Move to Pending
            </DropdownItem>
          )}
          {task.status !== 'in_progress' && (
            <DropdownItem onClick={() => onStatusChange(task, 'in_progress')}>
              Move to In Progress
            </DropdownItem>
          )}
          {task.status !== 'completed' && (
            <DropdownItem onClick={() => onStatusChange(task, 'completed')}>
              Mark as Completed
            </DropdownItem>
          )}
          {task.status !== 'cancelled' && (
            <DropdownItem onClick={() => onStatusChange(task, 'cancelled')}>
              Mark as Cancelled
            </DropdownItem>
          )}

          {(onEdit || onDelete) && (
            <div className="border-t border-dark-borderSubtle mt-1 pt-1">
              {onEdit && <DropdownItem onClick={() => onEdit(task)}>Edit Task</DropdownItem>}
              {onDelete && <DropdownItem onClick={() => onDelete(task)} className="text-status-danger">Delete Task</DropdownItem>}
            </div>
          )}
        </Dropdown>
      </div>

      {/* Task Title */}
      <h4 className="text-xs font-semibold text-text-primary group-hover:text-brand transition-colors line-clamp-2">
        {task.title}
      </h4>

      {/* Footer: Due date & Assignee */}
      <div className="flex items-center justify-between pt-1 border-t border-dark-borderSubtle/50 text-[11px]">
        <div className="flex items-center gap-1.5">
          {task.due_date ? (
            <div
              className={`flex items-center gap-1 text-[10px] font-medium ${
                isTaskOverdue ? 'text-status-danger font-bold' : 'text-text-muted'
              }`}
            >
              {isTaskOverdue ? <AlertCircle className="w-3 h-3 text-status-danger" /> : <Calendar className="w-3 h-3" />}
              <span>{formatDate(task.due_date)}</span>
            </div>
          ) : (
            <span className="text-[10px] text-text-muted">No due date</span>
          )}
        </div>

        {task.assigned_user ? (
          <Avatar name={task.assigned_user.name} size="xs" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-dark-surface border border-dark-borderSubtle flex items-center justify-center text-[9px] text-text-muted">
            —
          </div>
        )}
      </div>
    </div>
  );
};
