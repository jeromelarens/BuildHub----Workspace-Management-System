import React from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      id,
      disabled,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-medium text-text-secondary select-none"
          >
            {label}
          </label>
        )}

        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          disabled={disabled}
          className={cn(
            'w-full bg-dark-surface border border-dark-border rounded-md px-3 py-2.5 sm:py-2 text-base sm:text-sm text-text-primary placeholder:text-text-muted transition-all duration-150 min-h-[88px]',
            'focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30',
            'hover:border-dark-borderHover resize-y',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-dark-elevated',
            error && 'border-status-danger focus:border-status-danger focus:ring-status-danger/30',
            className
          )}
          {...props}
        />

        {error && (
          <p className="text-xs text-status-danger font-medium animate-slide-down">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p className="text-xs text-text-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
