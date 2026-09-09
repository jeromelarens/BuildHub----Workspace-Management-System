import { useQuery } from '@tanstack/react-query';
import {
  getAnalyticsOverviewApi,
  getTeamVelocityApi,
  getProjectBurndownApi,
} from '../api/analytics.api';
import {
  AnalyticsOverview,
  TeamVelocityData,
  ProjectBurndownData,
} from '../types';

export const ANALYTICS_OVERVIEW_QUERY_KEY = ['analytics', 'overview'];
export const TEAM_VELOCITY_QUERY_KEY = ['analytics', 'team-velocity'];
export const PROJECT_BURNDOWN_QUERY_KEY = ['analytics', 'burndown'];

export const useAnalyticsOverview = () => {
  return useQuery<AnalyticsOverview>({
    queryKey: ANALYTICS_OVERVIEW_QUERY_KEY,
    queryFn: async () => {
      const res = await getAnalyticsOverviewApi();
      return res.data;
    },
    staleTime: 60 * 1000,
  });
};

export const useTeamVelocity = (filters?: { startDate?: string; endDate?: string }) => {
  return useQuery<TeamVelocityData>({
    queryKey: [...TEAM_VELOCITY_QUERY_KEY, filters],
    queryFn: async () => {
      const res = await getTeamVelocityApi(filters);
      return res.data;
    },
    staleTime: 60 * 1000,
  });
};

export const useProjectBurndown = (projectId: number | string | null | undefined) => {
  return useQuery<ProjectBurndownData | null>({
    queryKey: [...PROJECT_BURNDOWN_QUERY_KEY, projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await getProjectBurndownApi(projectId);
      return res.data || null;
    },
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
};
