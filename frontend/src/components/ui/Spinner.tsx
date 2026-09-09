import React from 'react';
import { cn } from '../../utils/cn';

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'lemon' | 'white' | 'dark' | 'muted';
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'lemon',
  className,
  ...props
}) => {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
  };

  const variants = {
    lemon: 'text-brand',
    white: 'text-text-primary',
    dark: 'text-dark-bg',
    muted: 'text-text-muted',
  };

  return (
    <svg
      className={cn('animate-spin', sizes[size], variants[variant], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};
