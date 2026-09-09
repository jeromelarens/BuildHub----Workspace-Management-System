import apiClient from './axios';
import {
  ApiResponse,
  AnalyticsOverview,
  TeamVelocityData,
  ProjectBurndownData,
} from '../types';

/**
 * Get overview analytics (role-scoped by backend)
 * GET /api/analytics/overview
 */
export const getAnalyticsOverviewApi = async (): Promise<ApiResponse<AnalyticsOverview>> => {
  const response = await apiClient.get<ApiResponse<AnalyticsOverview>>('/analytics/overview');
  return response.data;
};

/**
 * Get team velocity and assignee workload analytics
 * GET /api/analytics/team-velocity
 */
export const getTeamVelocityApi = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<ApiResponse<TeamVelocityData>> => {
  const response = await apiClient.get<ApiResponse<TeamVelocityData>>('/analytics/team-velocity', {
    params,
  });
  return response.data;
};

/**
 * Get project burndown timeline
 * GET /api/analytics/burndown/:projectId
 */
export const getProjectBurndownApi = async (
  projectId: number | string
): Promise<ApiResponse<ProjectBurndownData>> => {
  const response = await apiClient.get<ApiResponse<ProjectBurndownData>>(
    `/analytics/burndown/${projectId}`
  );
  return response.data;
};
