import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getActiveTimerApi,
  startTimerApi,
  stopTimerApi,
  getTimeEntriesApi,
  createManualTimeEntryApi,
  deleteTimeEntryApi,
  getTimesheetReportApi,
} from '../api/timeEntries.api';
import { useToast } from './useToast';

export const timeEntryKeys = {
  all: ['time-entries'] as const,
  active: () => [...timeEntryKeys.all, 'active'] as const,
  list: (params?: any) => [...timeEntryKeys.all, 'list', params] as const,
  report: (params?: any) => [...timeEntryKeys.all, 'report', params] as const,
};

export const useActiveTimer = () => {
  return useQuery({
    queryKey: timeEntryKeys.active(),
    queryFn: async () => {
      const res = await getActiveTimerApi();
      return res.data;
    },
    refetchInterval: 30000,
  });
};

export const useTimeEntries = (params?: {
  task_id?: number;
  user_id?: number;
  start_date?: string;
  end_date?: string;
}) => {
  return useQuery({
    queryKey: timeEntryKeys.list(params),
    queryFn: async () => {
      const res = await getTimeEntriesApi(params);
      return res.data;
    },
  });
};

export const useTimesheetReport = (params?: {
  group_by?: 'day' | 'week' | 'month' | 'user' | 'project';
  start_date?: string;
  end_date?: string;
  user_id?: number;
  project_id?: number;
}) => {
  return useQuery({
    queryKey: timeEntryKeys.report(params),
    queryFn: async () => {
      const res = await getTimesheetReportApi(params);
      return res.data;
    },
  });
};

export const useStartTimer = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: { task_id: number; description?: string }) => startTimerApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.all });
      success('Timer started.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to start timer.');
    },
  });
};

export const useStopTimer = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id?: number) => stopTimerApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.all });
      success('Timer stopped and recorded.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to stop timer.');
    },
  });
};

export const useCreateManualTimeEntry = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: {
      task_id: number;
      start_time: string;
      end_time: string;
      description?: string;
    }) => createManualTimeEntryApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.all });
      success('Time entry added.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to log time entry.');
    },
  });
};

export const useDeleteTimeEntry = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: number) => deleteTimeEntryApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.all });
      success('Time entry deleted.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to delete time entry.');
    },
  });
};
