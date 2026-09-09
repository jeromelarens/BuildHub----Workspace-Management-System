import apiClient from './axios';
import { ApiResponse, Notification, GetNotificationsParams } from '../types';

export interface UnreadCountResponse {
  unread_count: number;
}

/**
 * Get count of unread notifications for current user
 * GET /api/notifications/unread-count
 */
export const getUnreadNotificationCountApi = async (): Promise<ApiResponse<UnreadCountResponse>> => {
  const response = await apiClient.get<ApiResponse<UnreadCountResponse>>('/notifications/unread-count');
  return response.data;
};

/**
 * Get all notifications for authenticated user
 * GET /api/notifications
 */
export const getNotificationsApi = async (
  params?: GetNotificationsParams
): Promise<ApiResponse<Notification[]>> => {
  const response = await apiClient.get<ApiResponse<Notification[]>>('/notifications', {
    params,
  });
  return response.data;
};

/**
 * Mark a single notification as read
 * PUT /api/notifications/:id/read
 */
export const markNotificationAsReadApi = async (
  id: number | string
): Promise<ApiResponse<Notification>> => {
  const response = await apiClient.put<ApiResponse<Notification>>(
    `/notifications/${id}/read`
  );
  return response.data;
};

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
export const markAllNotificationsAsReadApi = async (): Promise<ApiResponse<null>> => {
  const response = await apiClient.put<ApiResponse<null>>('/notifications/read-all');
  return response.data;
};

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
export const deleteNotificationApi = async (
  id: number | string
): Promise<ApiResponse<null>> => {
  const response = await apiClient.delete<ApiResponse<null>>(`/notifications/${id}`);
  return response.data;
};
