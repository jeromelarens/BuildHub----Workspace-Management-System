import React from 'react';
import { cn } from '../../utils/cn';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { IconButton } from './IconButton';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-status-danger shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-status-warning shrink-0" />,
    info: <Info className="w-4 h-4 text-brand shrink-0" />,
  };

  const borders = {
    success: 'border-status-success/30',
    error: 'border-status-danger/30',
    warning: 'border-status-warning/30',
    info: 'border-brand/30',
  };

  return (
    <div
      role="alert"
      className={cn(
        'w-80 bg-dark-elevated border rounded-lg shadow-elevated p-3.5 flex items-start gap-3 animate-scale-in transition-all',
        borders[toast.type]
      )}
    >
      <div className="mt-0.5">{icons[toast.type]}</div>

      <div className="flex-1 overflow-hidden">
        {toast.title && (
          <h5 className="text-xs font-semibold text-text-primary mb-0.5">{toast.title}</h5>
        )}
        <p className="text-xs text-text-secondary leading-relaxed break-words">
          {toast.message}
        </p>
      </div>

      <IconButton
        variant="ghost"
        size="sm"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className="text-text-muted hover:text-text-primary -mr-1 -mt-1"
      >
        <X className="w-3.5 h-3.5" />
      </IconButton>
    </div>
  );
};
