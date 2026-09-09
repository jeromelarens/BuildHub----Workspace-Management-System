import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-text-secondary select-none flex items-center justify-between"
          >
            <span>{label}</span>
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-text-muted">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            type={type}
            disabled={disabled}
            className={cn(
              'w-full bg-dark-surface border border-dark-border rounded-md px-3 py-2.5 sm:py-2 text-base sm:text-sm text-text-primary placeholder:text-text-muted transition-all duration-150 min-h-[44px] sm:min-h-[38px]',
              'focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30',
              'hover:border-dark-borderHover',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-dark-elevated',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error && 'border-status-danger focus:border-status-danger focus:ring-status-danger/30',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 flex items-center text-text-muted">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-status-danger font-medium animate-slide-down flex items-center gap-1">
            <span>{error}</span>
          </p>
        )}

        {!error && helperText && (
          <p className="text-xs text-text-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
