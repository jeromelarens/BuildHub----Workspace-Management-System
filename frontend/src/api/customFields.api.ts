import apiClient from './axios';
import { ApiResponse } from '../types';

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multi_select'
  | 'url';

export interface CustomFieldDefinition {
  id: number;
  workspace_id?: number;
  name: string;
  field_key: string;
  field_type: CustomFieldType;
  entity_type: 'task' | 'project';
  options?: string[];
  required: boolean;
  default_value?: any;
  created_at?: string;
  updated_at?: string;
}

export interface CustomFieldValue {
  id: number;
  definition_id: number;
  entity_id: number;
  entity_type: 'task' | 'project';
  value: any;
  definition?: CustomFieldDefinition;
}

export const getCustomFieldDefinitionsApi = async (params?: {
  entity_type?: 'task' | 'project';
}): Promise<ApiResponse<CustomFieldDefinition[]>> => {
  const response = await apiClient.get<ApiResponse<CustomFieldDefinition[]>>('/custom-fields', {
    params,
  });
  return response.data;
};

export const createCustomFieldDefinitionApi = async (data: {
  name: string;
  field_key: string;
  field_type: CustomFieldType;
  entity_type: 'task' | 'project';
  options?: string[];
  required?: boolean;
  default_value?: any;
}): Promise<ApiResponse<CustomFieldDefinition>> => {
  const response = await apiClient.post<ApiResponse<CustomFieldDefinition>>(
    '/custom-fields',
    data
  );
  return response.data;
};

export const updateCustomFieldDefinitionApi = async (
  id: number,
  data: Partial<CustomFieldDefinition>
): Promise<ApiResponse<CustomFieldDefinition>> => {
  const response = await apiClient.put<ApiResponse<CustomFieldDefinition>>(
    `/custom-fields/${id}`,
    data
  );
  return response.data;
};

export const deleteCustomFieldDefinitionApi = async (
  id: number
): Promise<ApiResponse<{ message: string }>> => {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(
    `/custom-fields/${id}`
  );
  return response.data;
};

export const getCustomFieldValuesApi = async (
  entityType: 'task' | 'project',
  entityId: number
): Promise<ApiResponse<CustomFieldValue[]>> => {
  const response = await apiClient.get<ApiResponse<CustomFieldValue[]>>(
    `/custom-fields/values/${entityType}/${entityId}`
  );
  return response.data;
};

export const setCustomFieldValuesApi = async (
  entityType: 'task' | 'project',
  entityId: number,
  values: Record<string, any>
): Promise<ApiResponse<CustomFieldValue[]>> => {
  const response = await apiClient.post<ApiResponse<CustomFieldValue[]>>(
    `/custom-fields/values/${entityType}/${entityId}`,
    { values }
  );
  return response.data;
};
