import apiClient from './axios';
import { ApiResponse, TaskDependenciesData, AddDependencyPayload } from '../types';

/**
 * Get all dependencies and dependents for a task
 * GET /api/tasks/:id/dependencies
 */
export const getTaskDependenciesApi = async (
  taskId: number | string
): Promise<ApiResponse<TaskDependenciesData>> => {
  const response = await apiClient.get<ApiResponse<TaskDependenciesData>>(
    `/tasks/${taskId}/dependencies`
  );
  return response.data;
};

/**
 * Add a prerequisite dependency to a task
 * POST /api/tasks/:id/dependencies
 */
export const addTaskDependencyApi = async (
  taskId: number | string,
  payload: AddDependencyPayload
): Promise<ApiResponse<{ id: number; task_id: number; depends_on_task_id: number; created_at: string }>> => {
  const response = await apiClient.post<
    ApiResponse<{ id: number; task_id: number; depends_on_task_id: number; created_at: string }>
  >(`/tasks/${taskId}/dependencies`, payload);
  return response.data;
};

/**
 * Remove a dependency from a task
 * DELETE /api/tasks/:id/dependencies/:dependencyId
 */
export const removeTaskDependencyApi = async (
  taskId: number | string,
  dependencyId: number | string
): Promise<ApiResponse<null>> => {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/tasks/${taskId}/dependencies/${dependencyId}`
  );
  return response.data;
};
