import React from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant =
  | 'default'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center font-medium rounded-full select-none transition-colors border';

  const variants = {
    // Brand Electric Lemon
    brand:
      'bg-brand/10 text-brand border-brand/25',
    // Default / Neutral
    default:
      'bg-dark-elevated text-text-secondary border-dark-border',
    // Success / Completed
    success:
      'bg-status-success/10 text-status-success border-status-success/25',
    // Warning
    warning:
      'bg-status-warning/10 text-status-warning border-status-warning/25',
    // Danger / Blocked / Urgent
    danger:
      'bg-status-danger/10 text-status-danger border-status-danger/25',
    // Info / In Progress
    info:
      'bg-status-info/10 text-status-info border-status-info/25',
    // Outline
    outline:
      'bg-transparent text-text-secondary border-dark-border',
  };

  const dotColors = {
    brand: 'bg-brand',
    default: 'bg-text-muted',
    success: 'bg-status-success',
    warning: 'bg-status-warning',
    danger: 'bg-status-danger',
    info: 'bg-status-info',
    outline: 'bg-text-secondary',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0 animate-pulse', dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

// Specialized Task Status Badge helper
export const TaskStatusBadge: React.FC<{ status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled' | string; size?: 'sm' | 'md' }> = ({
  status,
  size = 'sm',
}) => {
  const config: Record<string, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'To Do', variant: 'default' },
    in_progress: { label: 'In Progress', variant: 'info' },
    completed: { label: 'Completed', variant: 'success' },
    blocked: { label: 'Blocked', variant: 'danger' },
    cancelled: { label: 'Cancelled', variant: 'default' },
  };

  const current = config[status] || config.pending;

  return (
    <Badge variant={current.variant} size={size} dot>
      {current.label}
    </Badge>
  );
};

// Specialized Task Priority Badge helper
export const TaskPriorityBadge: React.FC<{ priority: 'low' | 'medium' | 'high' | 'urgent'; size?: 'sm' | 'md' }> = ({
  priority,
  size = 'sm',
}) => {
  const config = {
    low: { label: 'Low', variant: 'default' as const, symbol: '↓' },
    medium: { label: 'Medium', variant: 'info' as const, symbol: '→' },
    high: { label: 'High', variant: 'warning' as const, symbol: '↑' },
    urgent: { label: 'Urgent', variant: 'danger' as const, symbol: '⚡' },
  };

  const current = config[priority] || config.medium;

  return (
    <Badge variant={current.variant} size={size}>
      <span className="font-bold opacity-80" aria-hidden="true">{current.symbol}</span>
      <span>{current.label}</span>
    </Badge>
  );
};
