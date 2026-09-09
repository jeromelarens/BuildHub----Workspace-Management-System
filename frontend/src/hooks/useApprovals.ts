import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getApprovalWorkflowsApi,
  createApprovalWorkflowApi,
  getApprovalRequestsApi,
  getApprovalRequestByIdApi,
  submitApprovalRequestApi,
  decideApprovalRequestApi,
  cancelApprovalRequestApi,
  type ApprovalRequestStatus,
} from '../api/approvals.api';
import { useToast } from './useToast';

export const approvalKeys = {
  all: ['approvals'] as const,
  workflows: () => [...approvalKeys.all, 'workflows'] as const,
  requests: (params?: { status?: ApprovalRequestStatus; entity_type?: 'task' | 'project'; entity_id?: number }) =>
    [...approvalKeys.all, 'requests', params] as const,
  requestDetail: (id: number) => [...approvalKeys.all, 'request', id] as const,
};

export const useApprovalWorkflows = () => {
  return useQuery({
    queryKey: approvalKeys.workflows(),
    queryFn: async () => {
      const res = await getApprovalWorkflowsApi();
      return res.data;
    },
  });
};

export const useApprovalRequests = (params?: {
  status?: ApprovalRequestStatus;
  entity_type?: 'task' | 'project';
  entity_id?: number;
}) => {
  return useQuery({
    queryKey: approvalKeys.requests(params),
    queryFn: async () => {
      const res = await getApprovalRequestsApi(params);
      return res.data;
    },
  });
};

export const useApprovalRequest = (id: number) => {
  return useQuery({
    queryKey: approvalKeys.requestDetail(id),
    queryFn: async () => {
      const res = await getApprovalRequestByIdApi(id);
      return res.data;
    },
    enabled: !!id && !isNaN(id),
  });
};

export const useCreateApprovalWorkflow = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      entity_type?: 'task' | 'project';
      steps: Array<{
        step_order: number;
        name: string;
        approver_role?: string;
        approver_user_id?: number;
      }>;
    }) => createApprovalWorkflowApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.workflows() });
      success('Approval workflow created.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to create workflow.');
    },
  });
};

export const useSubmitApprovalRequest = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: {
      workflow_id: number;
      entity_type: 'task' | 'project';
      entity_id: number;
    }) => submitApprovalRequestApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.requests() });
      success('Approval request submitted.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to submit approval request.');
    },
  });
};

export const useDecideApprovalRequest = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: number;
      data: {
        action: 'approve' | 'reject';
        notes?: string;
        rejection_reason?: string;
      };
    }) => decideApprovalRequestApi(requestId, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
      success(`Approval request ${vars.data.action}d.`);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to record approval decision.');
    },
  });
};

export const useCancelApprovalRequest = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (requestId: number) => cancelApprovalRequestApi(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
      success('Approval request cancelled.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to cancel approval request.');
    },
  });
};
