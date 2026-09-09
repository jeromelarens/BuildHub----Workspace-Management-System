import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTrashTasksApi,
  restoreTaskApi,
  permanentDeleteTaskApi,
} from '../api/trash.api';
import { Task } from '../types';
import { useToast } from './useToast';
import { normalizeApiError } from '../api/apiError';
import { TASKS_QUERY_KEY } from './useTasks';
import { DASHBOARD_TASKS_QUERY_KEY } from './useDashboardData';

export const TRASH_TASKS_QUERY_KEY = ['trash-tasks'];

export const useTrashTasks = () => {
  return useQuery<Task[]>({
    queryKey: TRASH_TASKS_QUERY_KEY,
    queryFn: async () => {
      const res = await getTrashTasksApi();
      return res.data || [];
    },
    staleTime: 30 * 1000,
  });
};

export const useRestoreTask = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (taskId: number | string) => {
      const res = await restoreTaskApi(taskId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRASH_TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      success('Task restored to active workspace.', 'Task Restored');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to restore task');
    },
  });
};

export const usePermanentDeleteTask = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (taskId: number | string) => {
      const res = await permanentDeleteTaskApi(taskId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRASH_TASKS_QUERY_KEY });
      success('Task permanently erased from database.', 'Task Erased');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Permanent deletion failed');
    },
  });
};
