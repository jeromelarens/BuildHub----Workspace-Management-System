import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUnreadNotificationCountApi,
  getNotificationsApi,
  markNotificationAsReadApi,
  markAllNotificationsAsReadApi,
  deleteNotificationApi,
} from '../api/notifications.api';
import { Notification, GetNotificationsParams } from '../types';
import { useToast } from './useToast';
import { normalizeApiError } from '../api/apiError';

export const UNREAD_COUNT_QUERY_KEY = ['notifications', 'unread-count'];
export const NOTIFICATIONS_QUERY_KEY = ['notifications', 'list'];

export const useUnreadNotifications = (enabled: boolean = true) => {
  return useQuery<number>({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: async () => {
      const res = await getUnreadNotificationCountApi();
      return res.data.unread_count;
    },
    enabled,
    staleTime: 30 * 1000,
    retry: 1,
  });
};

export const useNotifications = (params?: GetNotificationsParams) => {
  return useQuery<{
    notifications: Notification[];
    pagination?: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, params],
    queryFn: async () => {
      const res = await getNotificationsApi(params);
      return {
        notifications: res.data || [],
        pagination: res.pagination,
      };
    },
    staleTime: 30 * 1000,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number | string) => {
      const res = await markNotificationAsReadApi(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await markAllNotificationsAsReadApi();
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
      success('All notifications marked as read.', 'Caught Up');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to mark all as read');
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: number | string) => {
      const res = await deleteNotificationApi(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
      success('Notification dismissed.', 'Dismissed');
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      error(normalized.message, 'Failed to delete notification');
    },
  });
};
