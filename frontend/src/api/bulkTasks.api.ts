import apiClient from './axios';
import { ApiResponse, Task, BulkUpdateTasksPayload, BulkDeleteTasksPayload } from '../types';

/**
 * Bulk update tasks (transactional)
 * POST /api/tasks/bulk-update
 */
export const bulkUpdateTasksApi = async (
  payload: BulkUpdateTasksPayload
): Promise<ApiResponse<{ updated_tasks: Task[] }>> => {
  const response = await apiClient.post<ApiResponse<{ updated_tasks: Task[] }>>(
    '/tasks/bulk-update',
    payload
  );
  return response.data;
};

/**
 * Bulk delete tasks (transactional soft delete moving to trash)
 * POST /api/tasks/bulk-delete
 */
export const bulkDeleteTasksApi = async (
  payload: BulkDeleteTasksPayload
): Promise<ApiResponse<null>> => {
  const response = await apiClient.post<ApiResponse<null>>(
    '/tasks/bulk-delete',
    payload
  );
  return response.data;
};
