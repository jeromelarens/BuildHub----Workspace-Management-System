import apiClient from './axios';
import { ApiResponse } from '../types';

export interface Permission {
  id: number;
  name: string;
  description: string;
  created_at?: string;
}

export interface RoleWithPermissions {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  permissions: Permission[];
}

export interface CreateRolePayload {
  name: string;
  description: string;
}

/**
 * Get all roles with their assigned permissions
 * GET /api/roles
 */
export const getRolesApi = async (): Promise<ApiResponse<RoleWithPermissions[]>> => {
  const response = await apiClient.get<ApiResponse<RoleWithPermissions[]>>('/roles');
  return response.data;
};

/**
 * Get all system permissions
 * GET /api/permissions
 */
export const getPermissionsApi = async (): Promise<ApiResponse<Permission[]>> => {
  const response = await apiClient.get<ApiResponse<Permission[]>>('/permissions');
  return response.data;
};

/**
 * Create a new custom role (Admin only)
 * POST /api/roles
 */
export const createRoleApi = async (
  payload: CreateRolePayload
): Promise<ApiResponse<RoleWithPermissions>> => {
  const response = await apiClient.post<ApiResponse<RoleWithPermissions>>('/roles', payload);
  return response.data;
};

/**
 * Add a permission to a role (Admin only)
 * POST /api/roles/:id/permissions
 */
export const addPermissionToRoleApi = async (
  roleId: number | string,
  permissionId: number | string
): Promise<ApiResponse<{ role_id: number; permission: Permission }>> => {
  const response = await apiClient.post<ApiResponse<{ role_id: number; permission: Permission }>>(
    `/roles/${roleId}/permissions`,
    { permissionId: Number(permissionId) }
  );
  return response.data;
};

/**
 * Remove a permission from a role (Admin only)
 * DELETE /api/roles/:id/permissions/:permissionId
 */
export const removePermissionFromRoleApi = async (
  roleId: number | string,
  permissionId: number | string
): Promise<ApiResponse<null>> => {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/roles/${roleId}/permissions/${permissionId}`
  );
  return response.data;
};

/**
 * Delete a custom role (Admin only)
 * DELETE /api/roles/:id
 */
export const deleteRoleApi = async (
  roleId: number | string
): Promise<ApiResponse<null>> => {
  const response = await apiClient.delete<ApiResponse<null>>(`/roles/${roleId}`);
  return response.data;
};
