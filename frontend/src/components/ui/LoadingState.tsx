import React from 'react';
import { cn } from '../../utils/cn';
import { Spinner } from './Spinner';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  className,
}) => {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center min-h-[180px] w-full',
        className
      )}
    >
      <Spinner size="lg" variant="lemon" className="mb-3" />
      <p className="text-xs font-medium text-text-secondary">{message}</p>
    </div>
  );
};
