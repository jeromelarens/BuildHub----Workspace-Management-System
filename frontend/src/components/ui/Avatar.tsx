import React, { useState } from 'react';
import { cn } from '../../utils/cn';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'busy' | 'away' | 'offline';
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = '',
  size = 'md',
  status,
  className,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);

  // Generate initials (e.g., Jerome Larens -> JL)
  const getInitials = (str: string) => {
    if (!str) return 'U';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg',
  };

  const statusSizes = {
    xs: 'w-1.5 h-1.5 ring-1',
    sm: 'w-2 h-2 ring-1',
    md: 'w-2.5 h-2.5 ring-2',
    lg: 'w-3 h-3 ring-2',
    xl: 'w-3.5 h-3.5 ring-2',
  };

  const statusColors = {
    online: 'bg-status-success',
    busy: 'bg-status-danger',
    away: 'bg-status-warning',
    offline: 'bg-text-muted',
  };

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-semibold select-none overflow-hidden bg-dark-elevated text-brand border border-dark-border',
          sizes[size],
          className
        )}
        title={name}
        {...props}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={name || 'Avatar'}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-dark-bg',
            statusSizes[size],
            statusColors[status]
          )}
          aria-hidden="true"
        />
      )}
    </div>
  );
};
