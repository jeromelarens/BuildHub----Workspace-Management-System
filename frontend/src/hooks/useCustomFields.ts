import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCustomFieldDefinitionsApi,
  createCustomFieldDefinitionApi,
  updateCustomFieldDefinitionApi,
  deleteCustomFieldDefinitionApi,
  getCustomFieldValuesApi,
  setCustomFieldValuesApi,
  CustomFieldDefinition,
  CustomFieldType,
} from '../api/customFields.api';
import { useToast } from './useToast';

export const customFieldKeys = {
  all: ['custom-fields'] as const,
  definitions: (params?: { entity_type?: 'task' | 'project' }) =>
    [...customFieldKeys.all, 'definitions', params] as const,
  values: (entityType: 'task' | 'project', entityId: number) =>
    [...customFieldKeys.all, 'values', entityType, entityId] as const,
};

export const useCustomFieldDefinitions = (params?: { entity_type?: 'task' | 'project' }) => {
  return useQuery({
    queryKey: customFieldKeys.definitions(params),
    queryFn: async () => {
      const res = await getCustomFieldDefinitionsApi(params);
      return res.data;
    },
  });
};

export const useCustomFieldValues = (entityType: 'task' | 'project', entityId: number) => {
  return useQuery({
    queryKey: customFieldKeys.values(entityType, entityId),
    queryFn: async () => {
      const res = await getCustomFieldValuesApi(entityType, entityId);
      return res.data;
    },
    enabled: !!entityId && !isNaN(entityId),
  });
};

export const useCreateCustomFieldDefinition = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: {
      name: string;
      field_key: string;
      field_type: CustomFieldType;
      entity_type: 'task' | 'project';
      options?: string[];
      required?: boolean;
      default_value?: any;
    }) => createCustomFieldDefinitionApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.all });
      success('Custom field definition created.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to create custom field definition.');
    },
  });
};

export const useUpdateCustomFieldDefinition = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CustomFieldDefinition> }) =>
      updateCustomFieldDefinitionApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.all });
      success('Custom field updated.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update custom field.');
    },
  });
};

export const useDeleteCustomFieldDefinition = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: number) => deleteCustomFieldDefinitionApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.all });
      success('Custom field deleted.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to delete custom field.');
    },
  });
};

export const useSetCustomFieldValues = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({
      entityType,
      entityId,
      values,
    }: {
      entityType: 'task' | 'project';
      entityId: number;
      values: Record<string, any>;
    }) => setCustomFieldValuesApi(entityType, entityId, values),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: customFieldKeys.values(vars.entityType, vars.entityId),
      });
      success('Custom fields saved.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to save custom field values.');
    },
  });
};
