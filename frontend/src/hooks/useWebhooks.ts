import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWebhooksApi,
  getWebhookByIdApi,
  createWebhookApi,
  updateWebhookApi,
  deleteWebhookApi,
  testWebhookApi,
  getWebhookDeliveriesApi,
} from '../api/webhooks.api';
import { useToast } from './useToast';

export const webhookKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhookKeys.all, 'list'] as const,
  detail: (id: number) => [...webhookKeys.all, 'detail', id] as const,
  deliveries: (id: number) => [...webhookKeys.all, 'deliveries', id] as const,
};

export const useWebhooks = () => {
  return useQuery({
    queryKey: webhookKeys.lists(),
    queryFn: async () => {
      const res = await getWebhooksApi();
      return res.data;
    },
  });
};

export const useWebhook = (id: number) => {
  return useQuery({
    queryKey: webhookKeys.detail(id),
    queryFn: async () => {
      const res = await getWebhookByIdApi(id);
      return res.data;
    },
    enabled: !!id && !isNaN(id),
  });
};

export const useWebhookDeliveries = (id: number) => {
  return useQuery({
    queryKey: webhookKeys.deliveries(id),
    queryFn: async () => {
      const res = await getWebhookDeliveriesApi(id);
      return res.data;
    },
    enabled: !!id && !isNaN(id),
  });
};

export const useCreateWebhook = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: { target_url: string; events: string[] }) =>
      createWebhookApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.lists() });
      success('Webhook endpoint registered.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to create webhook endpoint.');
    },
  });
};

export const useUpdateWebhook = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { target_url?: string; events?: string[]; is_active?: boolean };
    }) => updateWebhookApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.all });
      success('Webhook updated.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update webhook.');
    },
  });
};

export const useDeleteWebhook = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: number) => deleteWebhookApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.all });
      success('Webhook deleted.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to delete webhook.');
    },
  });
};

export const useTestWebhook = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: number) => testWebhookApi(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.deliveries(id) });
      success(res.message || 'Test ping dispatched successfully.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to dispatch test ping.');
    },
  });
};
