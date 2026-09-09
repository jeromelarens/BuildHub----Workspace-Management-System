import React from 'react';
import { cn } from '../../utils/cn';

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  label,
  className,
  ...props
}) => {
  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn('w-[1px] self-stretch bg-dark-borderSubtle', className)}
      />
    );
  }

  if (label) {
    return (
      <div className={cn('relative flex py-2 items-center w-full select-none', className)}>
        <div className="flex-grow border-t border-dark-borderSubtle" />
        <span className="flex-shrink mx-3 text-xs text-text-muted font-medium uppercase tracking-wider">
          {label}
        </span>
        <div className="flex-grow border-t border-dark-borderSubtle" />
      </div>
    );
  }

  return (
    <hr
      className={cn('w-full border-t border-dark-borderSubtle my-3', className)}
      {...props}
    />
  );
};
