import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkUpdateTasksApi, bulkDeleteTasksApi } from '../api/bulkTasks.api';
import { BulkUpdateTasksPayload, BulkDeleteTasksPayload } from '../types';
import { useToast } from './useToast';
import { normalizeApiError } from '../api/apiError';
import { TASKS_QUERY_KEY } from './useTasks';
import { DASHBOARD_TASKS_QUERY_KEY } from './useDashboardData';

export const useBulkUpdateTasks = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (payload: BulkUpdateTasksPayload) => {
      const res = await bulkUpdateTasksApi(payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      success(
        `Successfully updated ${data.updated_tasks.length} tasks in batch.`,
        'Bulk Update Complete'
      );
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Bulk update failed');
    },
  });
};

export const useBulkDeleteTasks = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (payload: BulkDeleteTasksPayload) => {
      const res = await bulkDeleteTasksApi(payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['trash-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      success(
        `Moved ${variables.task_ids.length} tasks to trash.`,
        'Bulk Delete Complete'
      );
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Bulk delete failed');
    },
  });
};
