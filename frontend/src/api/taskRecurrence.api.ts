import apiClient from './axios';
import { isAxiosError } from 'axios';
import { ApiResponse, TaskRecurrenceRule, SetRecurrencePayload } from '../types';

/**
 * Get recurrence configuration for a task
 * GET /api/tasks/:id/recurrence
 */
export const getTaskRecurrenceApi = async (
  taskId: number | string
): Promise<ApiResponse<TaskRecurrenceRule | null>> => {
  try {
    const response = await apiClient.get<ApiResponse<TaskRecurrenceRule>>(
      `/tasks/${taskId}/recurrence`
    );
    return response.data;
  } catch (err: unknown) {
    // If backend returns 404 for "No recurrence rule configured", treat as null rule
    if (isAxiosError(err) && err.response?.status === 404) {
      return { success: true, data: null, message: 'No recurrence configured' };
    }
    throw err;
  }
};

/**
 * Configure or update recurrence for a task
 * POST /api/tasks/:id/recurrence
 */
export const setTaskRecurrenceApi = async (
  taskId: number | string,
  payload: SetRecurrencePayload
): Promise<ApiResponse<TaskRecurrenceRule>> => {
  const response = await apiClient.post<ApiResponse<TaskRecurrenceRule>>(
    `/tasks/${taskId}/recurrence`,
    payload
  );
  return response.data;
};

/**
 * Delete recurrence configuration for a task
 * DELETE /api/tasks/:id/recurrence
 */
export const deleteTaskRecurrenceApi = async (
  taskId: number | string
): Promise<ApiResponse<null>> => {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/tasks/${taskId}/recurrence`
  );
  return response.data;
};
