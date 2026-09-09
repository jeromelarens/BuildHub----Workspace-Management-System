import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWorkspacesApi,
  getWorkspaceByIdApi,
  createWorkspaceApi,
  updateWorkspaceApi,
  getWorkspaceMembersApi,
  addWorkspaceMemberApi,
  removeWorkspaceMemberApi,
} from '../api/workspaces.api';
import { useToast } from './useToast';

export const workspaceKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  detail: (id: number) => [...workspaceKeys.all, 'detail', id] as const,
  members: (id: number) => [...workspaceKeys.all, 'members', id] as const,
};

export const useWorkspaces = () => {
  return useQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: async () => {
      const res = await getWorkspacesApi();
      return res.data;
    },
  });
};

export const useWorkspace = (id: number) => {
  return useQuery({
    queryKey: workspaceKeys.detail(id),
    queryFn: async () => {
      const res = await getWorkspaceByIdApi(id);
      return res.data;
    },
    enabled: !!id && !isNaN(id),
  });
};

export const useWorkspaceMembers = (workspaceId: number) => {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: async () => {
      const res = await getWorkspaceMembersApi(workspaceId);
      return res.data;
    },
    enabled: !!workspaceId && !isNaN(workspaceId),
  });
};

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: { name: string; slug?: string; description?: string }) =>
      createWorkspaceApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
      success('Workspace created successfully.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to create workspace.');
    },
  });
};

export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string } }) =>
      updateWorkspaceApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      success('Workspace updated successfully.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update workspace.');
    },
  });
};

export const useAddWorkspaceMember = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({
      workspaceId,
      data,
    }: {
      workspaceId: number;
      data: { user_id: number; role?: 'owner' | 'admin' | 'member' };
    }) => addWorkspaceMemberApi(workspaceId, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(vars.workspaceId) });
      success('Member added to workspace.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to add workspace member.');
    },
  });
};

export const useRemoveWorkspaceMember = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: number; userId: number }) =>
      removeWorkspaceMemberApi(workspaceId, userId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(vars.workspaceId) });
      success('Member removed from workspace.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to remove member.');
    },
  });
};
