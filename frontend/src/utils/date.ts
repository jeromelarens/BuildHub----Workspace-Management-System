/**
 * Date and Time Formatting & Calendar Utilities
 */

export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return 'No date';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(dateString);
  }
};

export const formatDateTime = (dateString?: string | null): string => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateString);
  }
};

export const formatRelativeTime = (dateString?: string | null): string => {
  if (!dateString) return 'just now';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  } catch {
    return String(dateString);
  }
};

/**
 * Calendar calculation utilities
 */
export const formatDateToISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

export const isSameDay = (d1: Date | string, d2: Date | string): boolean => {
  const date1 = typeof d1 === 'string' ? new Date(d1) : d1;
  const date2 = typeof d2 === 'string' ? new Date(d2) : d2;
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const isToday = (d: Date | string): boolean => {
  return isSameDay(d, new Date());
};

export const isOverdue = (dateString?: string | null, isCompleted: boolean = false): boolean => {
  if (!dateString || isCompleted) return false;
  try {
    const due = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  } catch {
    return false;
  }
};
