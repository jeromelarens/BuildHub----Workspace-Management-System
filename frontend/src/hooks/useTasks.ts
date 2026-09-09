import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTasksApi,
  getTaskByIdApi,
  createTaskApi,
  updateTaskApi,
  deleteTaskApi,
  CreateTaskPayload,
  UpdateTaskPayload,
} from '../api/tasks.api';
import { Task, TaskFilters } from '../types';
import { useToast } from './useToast';
import { normalizeApiError } from '../api/apiError';
import { DASHBOARD_TASKS_QUERY_KEY } from './useDashboardData';

export const TASKS_QUERY_KEY = ['tasks'];
export const TASK_DETAIL_QUERY_KEY = ['task'];

export const useTasks = (filters?: TaskFilters) => {
  return useQuery<{ tasks: Task[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }>({
    queryKey: [...TASKS_QUERY_KEY, filters],
    queryFn: async () => {
      const res = await getTasksApi(filters);
      return {
        tasks: res.data || [],
        pagination: res.pagination,
      };
    },
    staleTime: 60 * 1000,
  });
};

export const useTask = (taskId: number | string | undefined) => {
  return useQuery<Task>({
    queryKey: [...TASK_DETAIL_QUERY_KEY, taskId],
    queryFn: async () => {
      if (!taskId) throw new Error('Task ID is required');
      const res = await getTaskByIdApi(taskId);
      return res.data;
    },
    enabled: !!taskId,
    staleTime: 60 * 1000,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (payload: CreateTaskPayload) => {
      const res = await createTaskApi(payload);
      return res.data;
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (newTask.project_id) {
        queryClient.invalidateQueries({ queryKey: ['project', newTask.project_id] });
      }
      success(`Task "${newTask.title}" created successfully!`, 'Task Created');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to create task');
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number | string; payload: UpdateTaskPayload }) => {
      const res = await updateTaskApi(id, payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...TASK_DETAIL_QUERY_KEY, updated.id] });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['task-activity', updated.id] });
      if (updated.project_id) {
        queryClient.invalidateQueries({ queryKey: ['project', updated.project_id] });
      }
      success(`Task #${updated.id} updated.`, 'Task Updated');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to update task');
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: number | string) => {
      const res = await deleteTaskApi(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success('Task moved to trash.', 'Task Deleted');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to delete task');
    },
  });
};
