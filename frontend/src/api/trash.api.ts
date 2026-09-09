import apiClient from './axios';
import { ApiResponse, Task } from '../types';

/**
 * Get all soft-deleted tasks in trash
 * GET /api/tasks/trash
 */
export const getTrashTasksApi = async (): Promise<ApiResponse<Task[]>> => {
  const response = await apiClient.get<ApiResponse<Task[]>>('/tasks/trash');
  return response.data;
};

/**
 * Restore a soft-deleted task from trash
 * POST /api/tasks/:id/restore
 */
export const restoreTaskApi = async (
  taskId: number | string
): Promise<ApiResponse<null>> => {
  const response = await apiClient.post<ApiResponse<null>>(
    `/tasks/${taskId}/restore`
  );
  return response.data;
};

/**
 * Permanently delete a task from the database (Admin only)
 * DELETE /api/tasks/:id/permanent
 */
export const permanentDeleteTaskApi = async (
  taskId: number | string
): Promise<ApiResponse<null>> => {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/tasks/${taskId}/permanent`
  );
  return response.data;
};
