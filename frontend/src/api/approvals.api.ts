import apiClient from './axios';
import { ApiResponse } from '../types';

export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ApprovalStep {
  id: number;
  workflow_id: number;
  step_order: number;
  name: string;
  approver_role?: string;
  approver_user_id?: number;
}

export interface ApprovalWorkflow {
  id: number;
  workspace_id?: number;
  name: string;
  description?: string;
  entity_type: 'task' | 'project';
  is_active: boolean;
  steps: ApprovalStep[];
  created_at?: string;
}

export interface ApprovalAction {
  id: number;
  request_id: number;
  step_id: number;
  user_id: number;
  action: 'approve' | 'reject';
  notes?: string;
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ApprovalRequest {
  id: number;
  workflow_id: number;
  entity_type: 'task' | 'project';
  entity_id: number;
  requester_id: number;
  current_step_id?: number;
  status: ApprovalRequestStatus;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  workflow?: ApprovalWorkflow;
  requester?: {
    id: number;
    name: string;
    email: string;
  };
  actions?: ApprovalAction[];
}

export const getApprovalWorkflowsApi = async (): Promise<ApiResponse<ApprovalWorkflow[]>> => {
  const response = await apiClient.get<ApiResponse<ApprovalWorkflow[]>>('/approvals/workflows');
  return response.data;
};

export const createApprovalWorkflowApi = async (data: {
  name: string;
  description?: string;
  entity_type?: 'task' | 'project';
  steps: Array<{
    step_order: number;
    name: string;
    approver_role?: string;
    approver_user_id?: number;
  }>;
}): Promise<ApiResponse<ApprovalWorkflow>> => {
  const response = await apiClient.post<ApiResponse<ApprovalWorkflow>>('/approvals/workflows', data);
  return response.data;
};

export const getApprovalRequestsApi = async (params?: {
  status?: ApprovalRequestStatus;
  entity_type?: 'task' | 'project';
  entity_id?: number;
}): Promise<ApiResponse<ApprovalRequest[]>> => {
  const response = await apiClient.get<ApiResponse<ApprovalRequest[]>>('/approvals/requests', {
    params,
  });
  return response.data;
};

export const getApprovalRequestByIdApi = async (
  id: number
): Promise<ApiResponse<ApprovalRequest>> => {
  const response = await apiClient.get<ApiResponse<ApprovalRequest>>(`/approvals/requests/${id}`);
  return response.data;
};

export const submitApprovalRequestApi = async (data: {
  workflow_id: number;
  entity_type: 'task' | 'project';
  entity_id: number;
}): Promise<ApiResponse<ApprovalRequest>> => {
  const response = await apiClient.post<ApiResponse<ApprovalRequest>>(
    '/approvals/requests',
    data
  );
  return response.data;
};

export const decideApprovalRequestApi = async (
  requestId: number,
  data: {
    action: 'approve' | 'reject';
    notes?: string;
    rejection_reason?: string;
  }
): Promise<ApiResponse<ApprovalRequest>> => {
  const response = await apiClient.post<ApiResponse<ApprovalRequest>>(
    `/approvals/requests/${requestId}/decide`,
    data
  );
  return response.data;
};

export const cancelApprovalRequestApi = async (
  requestId: number
): Promise<ApiResponse<{ message: string }>> => {
  const response = await apiClient.post<ApiResponse<{ message: string }>>(
    `/approvals/requests/${requestId}/cancel`
  );
  return response.data;
};
