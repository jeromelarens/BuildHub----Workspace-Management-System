import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRolesApi,
  getPermissionsApi,
  createRoleApi,
  addPermissionToRoleApi,
  removePermissionFromRoleApi,
  deleteRoleApi,
  RoleWithPermissions,
  Permission,
  CreateRolePayload,
} from '../api/roles.api';
import { useToast } from '../contexts/ToastContext';
import { normalizeApiError } from '../api/apiError';

export const ROLES_QUERY_KEY = ['roles'];
export const PERMISSIONS_QUERY_KEY = ['permissions'];

export const useRoles = () => {
  return useQuery<RoleWithPermissions[]>({
    queryKey: ROLES_QUERY_KEY,
    queryFn: async () => {
      const res = await getRolesApi();
      return res.data || [];
    },
    staleTime: 60 * 1000,
  });
};

export const usePermissions = () => {
  return useQuery<Permission[]>({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: async () => {
      const res = await getPermissionsApi();
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: CreateRolePayload) => {
      const res = await createRoleApi(payload);
      return res.data;
    },
    onSuccess: (newRole) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      showToast(`Role "${newRole.name}" created successfully!`, 'success');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      showToast(normalized.message, 'error');
    },
  });
};

export const useAddPermissionToRole = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ roleId, permissionId }: { roleId: number | string; permissionId: number | string }) => {
      const res = await addPermissionToRoleApi(roleId, permissionId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      showToast('Permission added to role', 'success');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      showToast(normalized.message, 'error');
    },
  });
};

export const useRemovePermissionFromRole = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ roleId, permissionId }: { roleId: number | string; permissionId: number | string }) => {
      const res = await removePermissionFromRoleApi(roleId, permissionId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      showToast('Permission removed from role', 'success');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      showToast(normalized.message, 'error');
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (roleId: number | string) => {
      const res = await deleteRoleApi(roleId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      showToast('Role deleted successfully', 'success');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      showToast(normalized.message, 'error');
    },
  });
};
