import React, { useEffect } from 'react';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
  showCloseButton = true,
}) => {
  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Body */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-[calc(100vw-24px)] max-h-[calc(100vh-32px)] sm:w-full overflow-y-auto bg-dark-elevated border border-dark-border rounded-xl shadow-elevated z-10 animate-scale-in p-4 sm:p-6',
          sizes[size],
          className
        )}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-text-primary tracking-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-text-secondary mt-1">{description}</p>
              )}
            </div>

            {showCloseButton && (
              <IconButton
                variant="ghost"
                size="sm"
                aria-label="Close dialog"
                onClick={onClose}
                className="text-text-muted hover:text-text-primary -mr-1 -mt-1"
              >
                <X className="w-4 h-4" />
              </IconButton>
            )}
          </div>
        )}

        <div className="w-full">{children}</div>
      </div>
    </div>
  );
};

export const ModalFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2.5 pt-4 mt-6 border-t border-dark-borderSubtle',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
