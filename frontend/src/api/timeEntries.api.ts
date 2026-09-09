import apiClient from './axios';
import { ApiResponse } from '../types';

export interface TimeEntry {
  id: number;
  user_id: number;
  task_id: number;
  workspace_id?: number;
  start_time: string;
  end_time?: string | null;
  duration_seconds: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  task?: {
    id: number;
    title: string;
    project_id: number;
    project?: {
      id: number;
      name: string;
    };
  };
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface TimesheetReportData {
  summary: {
    total_seconds: number;
    total_hours: number;
    entry_count: number;
  };
  grouped_data: Array<{
    group_key: string;
    total_seconds: number;
    total_hours: number;
    entries: TimeEntry[];
  }>;
}

export const getActiveTimerApi = async (): Promise<ApiResponse<TimeEntry | null>> => {
  const response = await apiClient.get<ApiResponse<TimeEntry | null>>('/time-entries/active');
  return response.data;
};

export const startTimerApi = async (data: {
  task_id: number;
  description?: string;
}): Promise<ApiResponse<TimeEntry>> => {
  const response = await apiClient.post<ApiResponse<TimeEntry>>('/time-entries/start', data);
  return response.data;
};

export const stopTimerApi = async (
  id?: number
): Promise<ApiResponse<TimeEntry>> => {
  const response = await apiClient.post<ApiResponse<TimeEntry>>('/time-entries/stop', { id });
  return response.data;
};

export const getTimeEntriesApi = async (params?: {
  task_id?: number;
  user_id?: number;
  start_date?: string;
  end_date?: string;
}): Promise<ApiResponse<TimeEntry[]>> => {
  const response = await apiClient.get<ApiResponse<TimeEntry[]>>('/time-entries', { params });
  return response.data;
};

export const createManualTimeEntryApi = async (data: {
  task_id: number;
  start_time: string;
  end_time: string;
  description?: string;
}): Promise<ApiResponse<TimeEntry>> => {
  const response = await apiClient.post<ApiResponse<TimeEntry>>('/time-entries', data);
  return response.data;
};

export const deleteTimeEntryApi = async (
  id: number
): Promise<ApiResponse<{ message: string }>> => {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/time-entries/${id}`);
  return response.data;
};

export const getTimesheetReportApi = async (params?: {
  group_by?: 'day' | 'week' | 'month' | 'user' | 'project';
  start_date?: string;
  end_date?: string;
  user_id?: number;
  project_id?: number;
}): Promise<ApiResponse<TimesheetReportData>> => {
  const response = await apiClient.get<ApiResponse<TimesheetReportData>>(
    '/time-entries/reports/timesheet',
    { params }
  );
  return response.data;
};
