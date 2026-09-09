import React from 'react';
import { cn } from '../../utils/cn';
import { Spinner } from './Spinner';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = 'ghost',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-md transition-all duration-150 active:scale-[0.95] disabled:opacity-50 disabled:pointer-events-none select-none';

    const variants = {
      primary: 'bg-brand text-dark-bg hover:bg-brand-hover shadow-lemon-sm',
      secondary: 'bg-dark-elevated text-text-primary hover:bg-dark-hover border border-dark-border',
      outline: 'border border-dark-border text-text-secondary hover:text-text-primary hover:bg-dark-elevated',
      ghost: 'text-text-secondary hover:text-text-primary hover:bg-dark-elevated',
      danger: 'text-status-danger hover:bg-status-danger/15',
    };

    const sizes = {
      sm: 'w-7 h-7 p-1 text-xs',
      md: 'w-9 h-9 p-2 text-sm',
      lg: 'w-11 h-11 p-2.5 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Spinner size={size === 'lg' ? 'md' : 'xs'} variant={variant === 'primary' ? 'dark' : 'lemon'} />
        ) : (
          children
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
