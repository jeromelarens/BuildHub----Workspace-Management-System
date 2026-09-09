import apiClient from './axios';
import { ApiResponse } from '../types';

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  description?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceMember {
  id: number;
  user_id: number;
  workspace_id: number;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export const getWorkspacesApi = async (): Promise<ApiResponse<Workspace[]>> => {
  const response = await apiClient.get<ApiResponse<Workspace[]>>('/workspaces');
  return response.data;
};

export const getWorkspaceByIdApi = async (id: number): Promise<ApiResponse<Workspace>> => {
  const response = await apiClient.get<ApiResponse<Workspace>>(`/workspaces/${id}`);
  return response.data;
};

export const createWorkspaceApi = async (data: {
  name: string;
  slug?: string;
  description?: string;
}): Promise<ApiResponse<Workspace>> => {
  const response = await apiClient.post<ApiResponse<Workspace>>('/workspaces', data);
  return response.data;
};

export const updateWorkspaceApi = async (
  id: number,
  data: { name?: string; description?: string }
): Promise<ApiResponse<Workspace>> => {
  const response = await apiClient.put<ApiResponse<Workspace>>(`/workspaces/${id}`, data);
  return response.data;
};

export const getWorkspaceMembersApi = async (
  workspaceId: number
): Promise<ApiResponse<WorkspaceMember[]>> => {
  const response = await apiClient.get<ApiResponse<WorkspaceMember[]>>(
    `/workspaces/${workspaceId}/members`
  );
  return response.data;
};

export const addWorkspaceMemberApi = async (
  workspaceId: number,
  data: { user_id: number; role?: 'owner' | 'admin' | 'member' }
): Promise<ApiResponse<WorkspaceMember>> => {
  const response = await apiClient.post<ApiResponse<WorkspaceMember>>(
    `/workspaces/${workspaceId}/members`,
    data
  );
  return response.data;
};

export const removeWorkspaceMemberApi = async (
  workspaceId: number,
  userId: number
): Promise<ApiResponse<{ message: string }>> => {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(
    `/workspaces/${workspaceId}/members/${userId}`
  );
  return response.data;
};
