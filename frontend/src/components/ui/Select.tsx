import React from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      children,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-medium text-text-secondary select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full bg-dark-surface border border-dark-border rounded-md px-3 py-2.5 sm:py-2 text-base sm:text-sm text-text-primary transition-all duration-150 appearance-none pr-9 min-h-[44px] sm:min-h-[38px]',
              'focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30',
              'hover:border-dark-borderHover',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-dark-elevated',
              error && 'border-status-danger focus:border-status-danger focus:ring-status-danger/30',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-dark-surface text-text-primary">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3 pointer-events-none text-text-muted">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

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

Select.displayName = 'Select';
