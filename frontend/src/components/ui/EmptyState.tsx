import React from 'react';
import { cn } from '../../utils/cn';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-dark-border bg-dark-surface/50 min-h-[200px]',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-dark-elevated border border-dark-border flex items-center justify-center text-text-muted mb-3.5 shadow-sm">
        {icon || <Inbox className="w-6 h-6 text-brand/80" />}
      </div>

      <h4 className="text-sm font-semibold text-text-primary mb-1 tracking-tight">
        {title}
      </h4>

      {description && (
        <p className="text-xs text-text-muted max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}

      {action && <div className="mt-1">{action}</div>}
    </div>
  );
};
