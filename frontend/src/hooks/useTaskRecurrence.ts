import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTaskRecurrenceApi,
  setTaskRecurrenceApi,
  deleteTaskRecurrenceApi,
} from '../api/taskRecurrence.api';
import { TaskRecurrenceRule, SetRecurrencePayload } from '../types';
import { useToast } from './useToast';
import { normalizeApiError } from '../api/apiError';
import { TASK_DETAIL_QUERY_KEY, TASKS_QUERY_KEY } from './useTasks';

export const TASK_RECURRENCE_QUERY_KEY = ['task-recurrence'];

export const useTaskRecurrence = (taskId: number | string | undefined) => {
  return useQuery<TaskRecurrenceRule | null>({
    queryKey: [...TASK_RECURRENCE_QUERY_KEY, taskId],
    queryFn: async () => {
      if (!taskId) return null;
      const res = await getTaskRecurrenceApi(taskId);
      return res.data || null;
    },
    enabled: !!taskId,
    staleTime: 60 * 1000,
  });
};

export const useSetRecurrence = (taskId: number | string | undefined) => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (payload: SetRecurrencePayload) => {
      if (!taskId) throw new Error('Task ID required');
      const res = await setTaskRecurrenceApi(taskId, payload);
      return res.data;
    },
    onSuccess: (rule) => {
      queryClient.invalidateQueries({ queryKey: [...TASK_RECURRENCE_QUERY_KEY, taskId] });
      queryClient.invalidateQueries({ queryKey: [...TASK_DETAIL_QUERY_KEY, taskId] });
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] });
      success(`Recurrence rule set to ${rule.frequency}.`, 'Recurrence Configured');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to configure recurrence');
    },
  });
};

export const useDeleteRecurrence = (taskId: number | string | undefined) => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (!taskId) throw new Error('Task ID required');
      const res = await deleteTaskRecurrenceApi(taskId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TASK_RECURRENCE_QUERY_KEY, taskId] });
      queryClient.invalidateQueries({ queryKey: [...TASK_DETAIL_QUERY_KEY, taskId] });
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] });
      success('Recurrence rule removed.', 'Recurrence Removed');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to delete recurrence');
    },
  });
};
