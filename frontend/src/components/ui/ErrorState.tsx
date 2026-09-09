import React from 'react';
import { cn } from '../../utils/cn';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We encountered an error while loading this content. Please try again.',
  onRetry,
  className,
}) => {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-status-danger/30 bg-status-danger/5 min-h-[200px]',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-status-danger/10 border border-status-danger/25 flex items-center justify-center text-status-danger mb-3.5 shadow-sm">
        <AlertCircle className="w-6 h-6" />
      </div>

      <h4 className="text-sm font-semibold text-text-primary mb-1 tracking-tight">
        {title}
      </h4>

      <p className="text-xs text-text-secondary max-w-sm mb-4 leading-relaxed">
        {message}
      </p>

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
