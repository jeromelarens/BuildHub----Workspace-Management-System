import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { advancedTaskSearchApi, AdvancedSearchParams } from '../api/tasks.api';
import { Task } from '../types';

export const useDebounce = <T>(value: T, delay: number = 350): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useAdvancedTaskSearch = (params?: AdvancedSearchParams, enabled: boolean = true) => {
  return useQuery<{
    tasks: Task[];
    pagination?: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: ['advanced-task-search', params],
    queryFn: async () => {
      const res = await advancedTaskSearchApi(params);
      return {
        tasks: res.data || [],
        pagination: res.pagination,
      };
    },
    enabled,
    staleTime: 60 * 1000,
  });
};
