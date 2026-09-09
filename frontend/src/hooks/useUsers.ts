import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsersApi, updateUserRoleApi, GetUsersParams } from '../api/users.api';
import { User } from '../types';
import { UserRole } from '../types/role.types';
import { useToast } from './useToast';
import { normalizeApiError } from '../api/apiError';

export const USERS_QUERY_KEY = ['users'];

export const useUsers = (params?: GetUsersParams, enabled: boolean = true) => {
  return useQuery<{ users: User[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }>({
    queryKey: [...USERS_QUERY_KEY, params],
    queryFn: async () => {
      const res = await getUsersApi(params);
      return {
        users: res.data || [],
        pagination: res.pagination,
      };
    },
    enabled,
    staleTime: 60 * 1000,
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: number | string; role: UserRole | string }) => {
      const res = await updateUserRoleApi(userId, role);
      return res.data;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      success(`Role updated to ${updatedUser.role} for ${updatedUser.name}.`, 'Role Updated');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to update role');
    },
  });
};
