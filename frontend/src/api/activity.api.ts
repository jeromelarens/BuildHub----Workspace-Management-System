import apiClient from './axios';
import { ApiResponse, TaskActivity } from '../types';

/**
 * Get activity history for a task
 * GET /api/tasks/:id/activity
 */
export const getTaskActivityApi = async (
  taskId: number | string
): Promise<ApiResponse<TaskActivity[]>> => {
  const response = await apiClient.get<ApiResponse<TaskActivity[]>>(
    `/tasks/${taskId}/activity`
  );
  return response.data;
};
