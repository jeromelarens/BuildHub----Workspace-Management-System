import React from 'react';
import { cn } from '../../utils/cn';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none';

    const variants = {
      // Primary: High energy Electric Lemon Green with deep dark text
      primary:
        'bg-brand text-dark-bg hover:bg-brand-hover shadow-lemon-sm hover:shadow-lemon-glow font-semibold',
      // Secondary: Deep surface with subtle border and crisp text
      secondary:
        'bg-dark-elevated text-text-primary hover:bg-dark-hover border border-dark-border hover:border-dark-borderHover',
      // Outline: Transparent with distinct border and hover fill
      outline:
        'border border-dark-border text-text-primary hover:bg-dark-elevated hover:border-brand-border hover:text-brand',
      // Ghost: Borderless with subtle hover
      ghost:
        'text-text-secondary hover:text-text-primary hover:bg-dark-elevated',
      // Danger: Deep crimson red
      danger:
        'bg-status-danger/15 text-status-danger hover:bg-status-danger/25 border border-status-danger/30',
      // Success: Emerald green
      success:
        'bg-status-success/15 text-status-success hover:bg-status-success/25 border border-status-success/30',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-3.5 py-2 gap-2 h-9',
      lg: 'text-base px-5 py-2.5 gap-2.5 h-11',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" variant={variant === 'primary' ? 'dark' : 'lemon'} />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
