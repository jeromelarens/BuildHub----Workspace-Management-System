import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosProgressEvent } from 'axios';
import {
  getTaskAttachmentsApi,
  uploadTaskAttachmentApi,
  deleteAttachmentApi,
} from '../api/attachments.api';
import { TaskAttachment } from '../types';
import { useToast } from './useToast';
import { normalizeApiError } from '../api/apiError';
import { TASK_DETAIL_QUERY_KEY } from './useTasks';

export const TASK_ATTACHMENTS_QUERY_KEY = ['task-attachments'];

export const useTaskAttachments = (taskId: number | string | undefined) => {
  return useQuery<TaskAttachment[]>({
    queryKey: [...TASK_ATTACHMENTS_QUERY_KEY, taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const res = await getTaskAttachmentsApi(taskId);
      return res.data || [];
    },
    enabled: !!taskId,
    staleTime: 60 * 1000,
  });
};

export const useUploadAttachment = (taskId: number | string | undefined) => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({
      file,
      onUploadProgress,
    }: {
      file: File;
      onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
    }) => {
      if (!taskId) throw new Error('Task ID required');
      const res = await uploadTaskAttachmentApi(taskId, file, onUploadProgress);
      return res.data;
    },
    onSuccess: (attachment) => {
      queryClient.invalidateQueries({ queryKey: [...TASK_ATTACHMENTS_QUERY_KEY, taskId] });
      queryClient.invalidateQueries({ queryKey: [...TASK_DETAIL_QUERY_KEY, taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] });
      success(`Uploaded "${attachment.original_name}".`, 'File Attached');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Upload failed');
    },
  });
};

export const useDeleteAttachment = (taskId: number | string | undefined) => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (attachmentId: number | string) => {
      const res = await deleteAttachmentApi(attachmentId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TASK_ATTACHMENTS_QUERY_KEY, taskId] });
      queryClient.invalidateQueries({ queryKey: [...TASK_DETAIL_QUERY_KEY, taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] });
      success('Attachment deleted.', 'File Removed');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to delete attachment');
    },
  });
};
