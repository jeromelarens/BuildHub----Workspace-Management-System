import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';

export interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  align = 'right',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-2 w-52 rounded-lg bg-dark-elevated border border-dark-border shadow-elevated p-1 animate-scale-in focus:outline-none',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  danger?: boolean;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  className,
  icon,
  danger = false,
  children,
  ...props
}) => {
  return (
    <button
      type="button"
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left select-none',
        danger
          ? 'text-status-danger hover:bg-status-danger/15'
          : 'text-text-secondary hover:text-text-primary hover:bg-dark-hover',
        className
      )}
      {...props}
    >
      {icon && <span className="w-4 h-4 shrink-0 text-text-muted">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
};

export const DropdownDivider: React.FC = () => {
  return <div className="my-1 border-t border-dark-borderSubtle" />;
};
