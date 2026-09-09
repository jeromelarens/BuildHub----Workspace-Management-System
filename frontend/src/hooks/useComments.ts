import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTaskCommentsApi,
  createTaskCommentApi,
  deleteCommentApi,
  CreateCommentPayload,
} from '../api/comments.api';
import { TaskComment } from '../types';
import { useToast } from './useToast';
import { normalizeApiError } from '../api/apiError';

export const TASK_COMMENTS_QUERY_KEY = ['task-comments'];

export const useTaskComments = (taskId: number | string | undefined) => {
  return useQuery<TaskComment[]>({
    queryKey: [...TASK_COMMENTS_QUERY_KEY, taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const res = await getTaskCommentsApi(taskId);
      return res.data || [];
    },
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });
};

export const useCreateComment = (taskId: number | string | undefined) => {
  const queryClient = useQueryClient();
  const { error } = useToast();

  return useMutation({
    mutationFn: async (payload: CreateCommentPayload) => {
      if (!taskId) throw new Error('Task ID required');
      const res = await createTaskCommentApi(taskId, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TASK_COMMENTS_QUERY_KEY, taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] });
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to post comment');
    },
  });
};

export const useDeleteComment = (taskId: number | string | undefined) => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (commentId: number | string) => {
      const res = await deleteCommentApi(commentId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TASK_COMMENTS_QUERY_KEY, taskId] });
      success('Comment deleted.', 'Deleted');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to delete comment');
    },
  });
};
