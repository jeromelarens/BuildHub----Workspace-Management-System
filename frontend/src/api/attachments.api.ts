import apiClient from './axios';
import { AxiosProgressEvent } from 'axios';
import { ApiResponse, TaskAttachment } from '../types';

/**
 * Get all attachments for a task
 * GET /api/tasks/:id/attachments
 */
export const getTaskAttachmentsApi = async (
  taskId: number | string
): Promise<ApiResponse<TaskAttachment[]>> => {
  const response = await apiClient.get<ApiResponse<TaskAttachment[]>>(
    `/tasks/${taskId}/attachments`
  );
  return response.data;
};

/**
 * Upload a file attachment for a task
 * POST /api/tasks/:id/attachments
 */
export const uploadTaskAttachmentApi = async (
  taskId: number | string,
  file: File,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
): Promise<ApiResponse<TaskAttachment>> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ApiResponse<TaskAttachment>>(
    `/tasks/${taskId}/attachments`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    }
  );
  return response.data;
};

/**
 * Delete an attachment
 * DELETE /api/attachments/:id
 */
export const deleteAttachmentApi = async (
  attachmentId: number | string
): Promise<ApiResponse<null>> => {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/attachments/${attachmentId}`
  );
  return response.data;
};

/**
 * Download attachment file as blob
 * GET /api/attachments/:id/download
 */
export const downloadAttachmentBlobApi = async (
  attachmentId: number | string
): Promise<Blob> => {
  const response = await apiClient.get(`/attachments/${attachmentId}/download`, {
    responseType: 'blob',
  });
  return response.data;
};
