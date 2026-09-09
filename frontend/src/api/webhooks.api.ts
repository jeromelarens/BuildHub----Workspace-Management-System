import apiClient from './axios';
import { ApiResponse } from '../types';

export interface WebhookDelivery {
  id: number;
  webhook_id: number;
  event_type: string;
  status_code?: number;
  success: boolean;
  attempt_count: number;
  error_message?: string;
  created_at: string;
}

export interface WebhookEndpoint {
  id: number;
  workspace_id?: number;
  target_url: string;
  events: string[];
  is_active: boolean;
  secret_preview?: string;
  created_at: string;
  updated_at: string;
  deliveries?: WebhookDelivery[];
}

export const getWebhooksApi = async (): Promise<ApiResponse<WebhookEndpoint[]>> => {
  const response = await apiClient.get<ApiResponse<WebhookEndpoint[]>>('/webhooks');
  return response.data;
};

export const getWebhookByIdApi = async (id: number): Promise<ApiResponse<WebhookEndpoint>> => {
  const response = await apiClient.get<ApiResponse<WebhookEndpoint>>(`/webhooks/${id}`);
  return response.data;
};

export const createWebhookApi = async (data: {
  target_url: string;
  events: string[];
}): Promise<ApiResponse<WebhookEndpoint & { signing_secret?: string }>> => {
  const response = await apiClient.post<ApiResponse<WebhookEndpoint & { signing_secret?: string }>>(
    '/webhooks',
    data
  );
  return response.data;
};

export const updateWebhookApi = async (
  id: number,
  data: {
    target_url?: string;
    events?: string[];
    is_active?: boolean;
  }
): Promise<ApiResponse<WebhookEndpoint>> => {
  const response = await apiClient.put<ApiResponse<WebhookEndpoint>>(`/webhooks/${id}`, data);
  return response.data;
};

export const deleteWebhookApi = async (
  id: number
): Promise<ApiResponse<{ message: string }>> => {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/webhooks/${id}`);
  return response.data;
};

export const testWebhookApi = async (
  id: number
): Promise<ApiResponse<{ message: string; delivery_id?: number; status_code?: number }>> => {
  const response = await apiClient.post<ApiResponse<{ message: string; delivery_id?: number; status_code?: number }>>(
    `/webhooks/${id}/test`
  );
  return response.data;
};

export const getWebhookDeliveriesApi = async (
  id: number
): Promise<ApiResponse<WebhookDelivery[]>> => {
  const response = await apiClient.get<ApiResponse<WebhookDelivery[]>>(
    `/webhooks/${id}/deliveries`
  );
  return response.data;
};
