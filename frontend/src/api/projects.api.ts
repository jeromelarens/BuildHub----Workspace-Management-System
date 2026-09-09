import apiClient from './axios';
import { ApiResponse, Project, ProjectStatus } from '../types';

export interface GetProjectsParams {
  status?: ProjectStatus | string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  status: ProjectStatus;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

/**
 * Get all accessible projects
 * GET /api/projects
 */
export const getProjectsApi = async (
  params?: GetProjectsParams
): Promise<ApiResponse<Project[]>> => {
  const response = await apiClient.get<ApiResponse<Project[]>>('/projects', {
    params,
  });
  return response.data;
};

/**
 * Get single project by ID with members, task stats & health
 * GET /api/projects/:id
 */
export const getProjectByIdApi = async (
  id: number | string
): Promise<ApiResponse<Project>> => {
  const response = await apiClient.get<ApiResponse<Project>>(`/projects/${id}`);
  return response.data;
};

/**
 * Create a new project (Roles: admin, manager)
 * POST /api/projects
 */
export const createProjectApi = async (
  payload: CreateProjectPayload
): Promise<ApiResponse<Project>> => {
  const response = await apiClient.post<ApiResponse<Project>>('/projects', payload);
  return response.data;
};

/**
 * Update project details (Roles: admin, project creator)
 * PUT /api/projects/:id
 */
export const updateProjectApi = async (
  id: number | string,
  payload: UpdateProjectPayload
): Promise<ApiResponse<Project>> => {
  const response = await apiClient.put<ApiResponse<Project>>(`/projects/${id}`, payload);
  return response.data;
};

/**
 * Delete a project (Roles: admin, project creator)
 * DELETE /api/projects/:id
 */
export const deleteProjectApi = async (
  id: number | string
): Promise<ApiResponse<null>> => {
  const response = await apiClient.delete<ApiResponse<null>>(`/projects/${id}`);
  return response.data;
};
