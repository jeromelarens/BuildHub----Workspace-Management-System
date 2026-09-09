import React from 'react';
import { cn } from '../../utils/cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from './IconButton';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  totalItems?: number;
  itemsPerPage?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
  totalItems,
  itemsPerPage,
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className={cn('flex items-center justify-between gap-4 py-3 select-none', className)}>
      {totalItems !== undefined && (
        <p className="text-xs text-text-muted">
          Showing <span className="font-semibold text-text-secondary">{Math.min(totalItems, ((currentPage - 1) * (itemsPerPage || 10)) + 1)}</span> to{' '}
          <span className="font-semibold text-text-secondary">{Math.min(totalItems, currentPage * (itemsPerPage || 10))}</span> of{' '}
          <span className="font-semibold text-text-secondary">{totalItems}</span> results
        </p>
      )}

      <div className="flex items-center gap-1.5 ml-auto">
        <IconButton
          variant="outline"
          size="sm"
          aria-label="Previous page"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </IconButton>

        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-xs text-text-muted">
                ...
              </span>
            );
          }
          const isCurrent = page === currentPage;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(Number(page))}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors',
                isCurrent
                  ? 'bg-brand text-dark-bg font-bold shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-dark-elevated'
              )}
            >
              {page}
            </button>
          );
        })}

        <IconButton
          variant="outline"
          size="sm"
          aria-label="Next page"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </IconButton>
      </div>
    </div>
  );
};
