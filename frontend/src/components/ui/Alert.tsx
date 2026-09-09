import React from 'react';
import { cn } from '../../utils/cn';
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { IconButton } from './IconButton';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  onDismiss?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  onDismiss,
  className,
  children,
  ...props
}) => {
  const icons = {
    info: <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-status-warning shrink-0 mt-0.5" />,
    danger: <AlertCircle className="w-4 h-4 text-status-danger shrink-0 mt-0.5" />,
  };

  const variants = {
    info: 'bg-brand/10 border-brand/25 text-text-primary',
    success: 'bg-status-success/10 border-status-success/25 text-text-primary',
    warning: 'bg-status-warning/10 border-status-warning/25 text-text-primary',
    danger: 'bg-status-danger/10 border-status-danger/25 text-text-primary',
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-3.5 border rounded-lg text-xs leading-relaxed',
        variants[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}

      <div className="flex-1">
        {title && <h5 className="font-semibold text-text-primary mb-0.5">{title}</h5>}
        <div className="text-text-secondary">{children}</div>
      </div>

      {onDismiss && (
        <IconButton
          variant="ghost"
          size="sm"
          aria-label="Dismiss alert"
          onClick={onDismiss}
          className="text-text-muted hover:text-text-primary -mr-1 -mt-1"
        >
          <X className="w-3.5 h-3.5" />
        </IconButton>
      )}
    </div>
  );
};
