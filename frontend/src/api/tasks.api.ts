import apiClient from './axios';
import { ApiResponse, Task, TaskFilters, TaskPriority, TaskStatus } from '../types';

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  project_id?: number | null;
  assigned_to?: number | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  project_id?: number | null;
  assigned_to?: number | null;
}

export interface AdvancedSearchParams {
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  priority?: string;
  project_id?: number | string;
  assigned_to?: number | string;
  hasAttachments?: boolean;
  isOverdue?: boolean;
  isBlocked?: boolean;
  sortBy?: 'created_at' | 'due_date' | 'priority' | 'title' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Get task list with filters and pagination
 * GET /api/tasks
 */
export const getTasksApi = async (
  params?: TaskFilters
): Promise<ApiResponse<Task[]>> => {
  const response = await apiClient.get<ApiResponse<Task[]>>('/tasks', {
    params,
  });
  return response.data;
};

/**
 * Get single task by ID
 * GET /api/tasks/:id
 */
export const getTaskByIdApi = async (
  id: number | string
): Promise<ApiResponse<Task>> => {
  const response = await apiClient.get<ApiResponse<Task>>(`/tasks/${id}`);
  return response.data;
};

/**
 * Advanced Task Search
 * GET /api/tasks/search/advanced
 */
export const advancedTaskSearchApi = async (
  params?: AdvancedSearchParams
): Promise<ApiResponse<Task[]>> => {
  const response = await apiClient.get<ApiResponse<Task[]>>('/tasks/search/advanced', {
    params,
  });
  return response.data;
};

/**
 * Create a new task
 * POST /api/tasks
 */
export const createTaskApi = async (
  payload: CreateTaskPayload
): Promise<ApiResponse<Task>> => {
  const response = await apiClient.post<ApiResponse<Task>>('/tasks', payload);
  return response.data;
};

/**
 * Update task details or status
 * PUT /api/tasks/:id
 */
export const updateTaskApi = async (
  id: number | string,
  payload: UpdateTaskPayload
): Promise<ApiResponse<Task>> => {
  const response = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}`, payload);
  return response.data;
};

/**
 * Soft delete a task
 * DELETE /api/tasks/:id
 */
export const deleteTaskApi = async (
  id: number | string
): Promise<ApiResponse<null>> => {
  const response = await apiClient.delete<ApiResponse<null>>(`/tasks/${id}`);
  return response.data;
};
