import { useQuery } from '@tanstack/react-query';
import {
  getAdminDashboardApi,
  getMyTasksDashboardApi,
  AdminDashboardData,
  MyTasksDashboardData,
} from '../api/dashboard.api';
import { getTasksApi } from '../api/tasks.api';
import { UserRole } from '../types/role.types';
import { Task } from '../types';

export const ADMIN_DASHBOARD_QUERY_KEY = ['dashboard', 'admin'];
export const MY_TASKS_DASHBOARD_QUERY_KEY = ['dashboard', 'my-tasks'];
export const DASHBOARD_TASKS_QUERY_KEY = ['dashboard', 'tasks'];

export const useAdminDashboard = (enabled: boolean = true) => {
  return useQuery<AdminDashboardData>({
    queryKey: ADMIN_DASHBOARD_QUERY_KEY,
    queryFn: async () => {
      const res = await getAdminDashboardApi();
      return res.data;
    },
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
  });
};

export const useMyTasksDashboard = (enabled: boolean = true) => {
  return useQuery<MyTasksDashboardData>({
    queryKey: MY_TASKS_DASHBOARD_QUERY_KEY,
    queryFn: async () => {
      const res = await getMyTasksDashboardApi();
      return res.data;
    },
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
  });
};

export const useDashboardTasks = (role?: UserRole) => {
  return useQuery<Task[]>({
    queryKey: [...DASHBOARD_TASKS_QUERY_KEY, role],
    queryFn: async () => {
      const res = await getTasksApi({ limit: 10 });
      return res.data;
    },
    staleTime: 60 * 1000,
    retry: 1,
  });
};
