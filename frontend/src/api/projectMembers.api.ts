import apiClient from './axios';
import { ApiResponse, ProjectMember } from '../types';

export interface AddProjectMemberPayload {
  user_id: number;
  role?: 'lead' | 'member';
}

/**
 * Get all members of a project
 * GET /api/projects/:id/members
 */
export const getProjectMembersApi = async (
  projectId: number | string
): Promise<ApiResponse<ProjectMember[]>> => {
  const response = await apiClient.get<ApiResponse<ProjectMember[]>>(
    `/projects/${projectId}/members`
  );
  return response.data;
};

/**
 * Add a member to a project
 * POST /api/projects/:id/members
 */
export const addProjectMemberApi = async (
  projectId: number | string,
  payload: AddProjectMemberPayload
): Promise<ApiResponse<ProjectMember>> => {
  const response = await apiClient.post<ApiResponse<ProjectMember>>(
    `/projects/${projectId}/members`,
    payload
  );
  return response.data;
};

/**
 * Remove a member from a project
 * DELETE /api/projects/:id/members/:userId
 */
export const removeProjectMemberApi = async (
  projectId: number | string,
  userId: number | string
): Promise<ApiResponse<null>> => {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/projects/${projectId}/members/${userId}`
  );
  return response.data;
};
