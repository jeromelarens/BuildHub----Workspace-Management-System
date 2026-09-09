import apiClient from './axios';
import { ApiResponse, AuditLogEntry, AuditLogQueryParams } from '../types';

/**
 * Get system audit logs (Admin only)
 * GET /api/audit-logs
 */
export const getAuditLogsApi = async (
  params?: AuditLogQueryParams
): Promise<ApiResponse<AuditLogEntry[]>> => {
  const response = await apiClient.get<ApiResponse<AuditLogEntry[]>>('/audit-logs', {
    params,
  });
  return response.data;
};
