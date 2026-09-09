import React from 'react';
import { cn } from '../../utils/cn';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-xs select-none', className)}>
      <ol className="flex items-center gap-1.5 list-none p-0 m-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" aria-hidden="true" />
              )}

              {item.icon && <span className="text-text-muted">{item.icon}</span>}

              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className="text-text-secondary hover:text-text-primary transition-colors font-medium"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  className={cn(
                    'font-medium truncate',
                    isLast ? 'text-text-primary font-semibold' : 'text-text-secondary'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
