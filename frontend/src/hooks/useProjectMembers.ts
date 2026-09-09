import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProjectMembersApi,
  addProjectMemberApi,
  removeProjectMemberApi,
  AddProjectMemberPayload,
} from '../api/projectMembers.api';
import { ProjectMember } from '../types';
import { useToast } from './useToast';
import { normalizeApiError } from '../api/apiError';
import { PROJECT_DETAIL_QUERY_KEY } from './useProjects';

export const PROJECT_MEMBERS_QUERY_KEY = ['project-members'];

export const useProjectMembers = (projectId: number | string | undefined) => {
  return useQuery<ProjectMember[]>({
    queryKey: [...PROJECT_MEMBERS_QUERY_KEY, projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await getProjectMembersApi(projectId);
      return res.data || [];
    },
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
};

export const useAddProjectMember = (projectId: number | string | undefined) => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (payload: AddProjectMemberPayload) => {
      if (!projectId) throw new Error('Project ID required');
      const res = await addProjectMemberApi(projectId, payload);
      return res.data;
    },
    onSuccess: (newMember) => {
      queryClient.invalidateQueries({ queryKey: [...PROJECT_MEMBERS_QUERY_KEY, projectId] });
      queryClient.invalidateQueries({ queryKey: [...PROJECT_DETAIL_QUERY_KEY, projectId] });
      const memberName = newMember.user?.name || newMember.name || 'Member';
      success(`${memberName} was added to the project as a ${newMember.role || newMember.project_role}.`, 'Member Added');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to add member');
    },
  });
};

export const useRemoveProjectMember = (projectId: number | string | undefined) => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (userId: number | string) => {
      if (!projectId) throw new Error('Project ID required');
      const res = await removeProjectMemberApi(projectId, userId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PROJECT_MEMBERS_QUERY_KEY, projectId] });
      queryClient.invalidateQueries({ queryKey: [...PROJECT_DETAIL_QUERY_KEY, projectId] });
      success('Member removed from project.', 'Member Removed');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to remove member');
    },
  });
};
