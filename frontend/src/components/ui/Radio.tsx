import React from 'react';
import { cn } from '../../utils/cn';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, id, checked, disabled, onChange, ...props }, ref) => {
    const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex items-start gap-2.5 cursor-pointer select-none group',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            id={inputId}
            ref={ref}
            type="radio"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'w-4 h-4 rounded-full border border-dark-border bg-dark-surface transition-all duration-150 flex items-center justify-center',
              'group-hover:border-dark-borderHover',
              'peer-checked:border-brand',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30',
              className
            )}
          >
            <div className="w-2 h-2 rounded-full bg-brand opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
        </div>

        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-text-primary">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-text-muted mt-0.5">{description}</span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Radio.displayName = 'Radio';
