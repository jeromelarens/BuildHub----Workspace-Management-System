import apiClient from './axios';
import { ApiResponse, TaskComment } from '../types';

export interface CreateCommentPayload {
  comment: string;
}

/**
 * Get all comments for a task
 * GET /api/tasks/:id/comments
 */
export const getTaskCommentsApi = async (
  taskId: number | string
): Promise<ApiResponse<TaskComment[]>> => {
  const response = await apiClient.get<ApiResponse<TaskComment[]>>(
    `/tasks/${taskId}/comments`
  );
  return response.data;
};

/**
 * Add a comment to a task
 * POST /api/tasks/:id/comments
 */
export const createTaskCommentApi = async (
  taskId: number | string,
  payload: CreateCommentPayload
): Promise<ApiResponse<TaskComment>> => {
  const response = await apiClient.post<ApiResponse<TaskComment>>(
    `/tasks/${taskId}/comments`,
    payload
  );
  return response.data;
};

/**
 * Update a comment
 * PUT /api/comments/:id
 */
export const updateCommentApi = async (
  commentId: number | string,
  payload: CreateCommentPayload
): Promise<ApiResponse<TaskComment>> => {
  const response = await apiClient.put<ApiResponse<TaskComment>>(
    `/comments/${commentId}`,
    payload
  );
  return response.data;
};

/**
 * Delete a comment
 * DELETE /api/comments/:id
 */
export const deleteCommentApi = async (
  commentId: number | string
): Promise<ApiResponse<null>> => {
  const response = await apiClient.delete<ApiResponse<null>>(`/comments/${commentId}`);
  return response.data;
};
