import apiClient from './axios';
import { ApiResponse, User } from '../types';
import { UserRole } from '../types/role.types';

export interface GetUsersParams {
  role?: UserRole | string;
  page?: number;
  limit?: number;
}

/**
 * Get all users (Admin only)
 * GET /api/users
 */
export const getUsersApi = async (
  params?: GetUsersParams
): Promise<ApiResponse<User[]>> => {
  const response = await apiClient.get<ApiResponse<User[]>>('/users', {
    params,
  });
  return response.data;
};

/**
 * Get single user by ID (Admin only)
 * GET /api/users/:id
 */
export const getUserByIdApi = async (
  id: number | string
): Promise<ApiResponse<User>> => {
  const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
  return response.data;
};

/**
 * Update user role (Admin only)
 * PUT /api/users/:id/role
 */
export const updateUserRoleApi = async (
  id: number | string,
  role: UserRole | string
): Promise<ApiResponse<User>> => {
  const response = await apiClient.put<ApiResponse<User>>(`/users/${id}/role`, {
    role,
  });
  return response.data;
};
