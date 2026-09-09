import { useQuery } from '@tanstack/react-query';
import { getTaskActivityApi } from '../api/activity.api';
import { TaskActivity } from '../types';

export const TASK_ACTIVITY_QUERY_KEY = ['task-activity'];

export const useTaskActivity = (taskId: number | string | undefined) => {
  return useQuery<TaskActivity[]>({
    queryKey: [...TASK_ACTIVITY_QUERY_KEY, taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const res = await getTaskActivityApi(taskId);
      return res.data || [];
    },
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });
};
