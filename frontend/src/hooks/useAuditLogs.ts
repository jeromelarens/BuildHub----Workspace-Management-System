import { useQuery } from '@tanstack/react-query';
import { getAuditLogsApi } from '../api/auditLogs.api';
import { AuditLogEntry, AuditLogQueryParams } from '../types';

export const AUDIT_LOGS_QUERY_KEY = ['audit-logs'];

export const useAuditLogs = (params?: AuditLogQueryParams, enabled: boolean = true) => {
  return useQuery<{
    logs: AuditLogEntry[];
    pagination?: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: [...AUDIT_LOGS_QUERY_KEY, params],
    queryFn: async () => {
      const res = await getAuditLogsApi(params);
      return {
        logs: res.data || [],
        pagination: res.pagination,
      };
    },
    enabled,
    staleTime: 30 * 1000,
  });
};
