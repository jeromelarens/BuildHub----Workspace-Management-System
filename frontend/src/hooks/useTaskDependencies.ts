import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTaskDependenciesApi,
  addTaskDependencyApi,
  removeTaskDependencyApi,
} from '../api/taskDependencies.api';
import { TaskDependenciesData, AddDependencyPayload } from '../types';
import { useToast } from './useToast';
import { normalizeApiError } from '../api/apiError';
import { TASK_DETAIL_QUERY_KEY, TASKS_QUERY_KEY } from './useTasks';

export const TASK_DEPENDENCIES_QUERY_KEY = ['task-dependencies'];

export const useTaskDependencies = (taskId: number | string | undefined) => {
  return useQuery<TaskDependenciesData>({
    queryKey: [...TASK_DEPENDENCIES_QUERY_KEY, taskId],
    queryFn: async () => {
      if (!taskId) return { depends_on: [], blocking: [] };
      const res = await getTaskDependenciesApi(taskId);
      return res.data || { depends_on: [], blocking: [] };
    },
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });
};

export const useAddDependency = (taskId: number | string | undefined) => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (payload: AddDependencyPayload) => {
      if (!taskId) throw new Error('Task ID required');
      const res = await addTaskDependencyApi(taskId, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TASK_DEPENDENCIES_QUERY_KEY, taskId] });
      queryClient.invalidateQueries({ queryKey: [...TASK_DETAIL_QUERY_KEY, taskId] });
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] });
      success('Dependency linked successfully.', 'Dependency Added');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to add dependency');
    },
  });
};

export const useRemoveDependency = (taskId: number | string | undefined) => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (dependencyId: number | string) => {
      if (!taskId) throw new Error('Task ID required');
      const res = await removeTaskDependencyApi(taskId, dependencyId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TASK_DEPENDENCIES_QUERY_KEY, taskId] });
      queryClient.invalidateQueries({ queryKey: [...TASK_DETAIL_QUERY_KEY, taskId] });
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] });
      success('Dependency unlinked.', 'Dependency Removed');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to remove dependency');
    },
  });
};
