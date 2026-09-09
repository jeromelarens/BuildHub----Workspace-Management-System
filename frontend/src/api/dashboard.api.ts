import apiClient from './axios';
import { ApiResponse } from '../types';

export interface AdminDashboardData {
  users: {
    total: number;
    admin: number;
    manager: number;
    team_lead: number;
    employee: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    archived: number;
    on_hold: number;
  };
  tasks: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    overdue: number;
    by_priority: {
      low: number;
      medium: number;
      high: number;
      urgent: number;
    };
  };
  recent_activity: {
    projects: Array<{ id: number; name: string; status: string; created_at: string }>;
    tasks: Array<{ id: number; title: string; status: string; priority: string; due_date: string | null; created_at: string }>;
  };
}

export interface MyTasksDashboardData {
  assigned_tasks: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    overdue: number;
  };
  created_tasks: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  upcoming_deadlines: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    project: { id: number; name: string } | null;
  }>;
  overdue_tasks: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    project: { id: number; name: string } | null;
  }>;
}

/**
 * Get Admin Dashboard Metrics
 * GET /api/dashboard/admin (Admin only)
 */
export const getAdminDashboardApi = async (): Promise<ApiResponse<AdminDashboardData>> => {
  const response = await apiClient.get<ApiResponse<AdminDashboardData>>('/dashboard/admin');
  return response.data;
};

/**
 * Get Personal Dashboard Metrics (My Tasks)
 * GET /api/dashboard/my-tasks (All authenticated users)
 */
export const getMyTasksDashboardApi = async (): Promise<ApiResponse<MyTasksDashboardData>> => {
  const response = await apiClient.get<ApiResponse<MyTasksDashboardData>>('/dashboard/my-tasks');
  return response.data;
};
