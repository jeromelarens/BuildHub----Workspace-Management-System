import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProjectsApi,
  getProjectByIdApi,
  createProjectApi,
  updateProjectApi,
  deleteProjectApi,
  GetProjectsParams,
  CreateProjectPayload,
  UpdateProjectPayload,
} from '../api/projects.api';
import { Project } from '../types';
import { useToast } from './useToast';
import { normalizeApiError } from '../api/apiError';

export const PROJECTS_QUERY_KEY = ['projects'];
export const PROJECT_DETAIL_QUERY_KEY = ['project'];

export const useProjects = (params?: GetProjectsParams) => {
  return useQuery<{ projects: Project[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }>({
    queryKey: [...PROJECTS_QUERY_KEY, params],
    queryFn: async () => {
      const res = await getProjectsApi(params);
      return {
        projects: res.data || [],
        pagination: res.pagination,
      };
    },
    staleTime: 60 * 1000,
  });
};

export const useProject = (projectId: number | string | undefined) => {
  return useQuery<Project>({
    queryKey: [...PROJECT_DETAIL_QUERY_KEY, projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      const res = await getProjectByIdApi(projectId);
      return res.data;
    },
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (payload: CreateProjectPayload) => {
      const res = await createProjectApi(payload);
      return res.data;
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success(`Project "${newProject.name}" created successfully!`, 'Project Created');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to create project');
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number | string; payload: UpdateProjectPayload }) => {
      const res = await updateProjectApi(id, payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...PROJECT_DETAIL_QUERY_KEY, updated.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success(`Project "${updated.name}" updated successfully!`, 'Project Updated');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to update project');
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: number | string) => {
      const res = await deleteProjectApi(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success('Project removed successfully.', 'Project Deleted');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to delete project');
    },
  });
};
