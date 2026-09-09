export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  pagination?: PaginationMeta;
  errors?: Record<string, string>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type StatusColor = 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
export type Size = 'sm' | 'md' | 'lg';
