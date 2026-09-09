import axios, { AxiosError } from 'axios';

export interface NormalizedApiError {
  message: string;
  statusCode?: number;
  validationErrors?: Record<string, string>;
  isNetworkError: boolean;
}

interface BackendErrorPayload {
  success?: boolean;
  message?: string;
  errors?: Record<string, string> | string;
}

/**
 * Normalizes backend error responses into safe, user-friendly UI error objects.
 * Prevents leakage of internal SQL errors, stack traces, or raw server internals.
 */
export const normalizeApiError = (error: unknown): NormalizedApiError => {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error) {
      return {
        message: error.message || 'An unexpected error occurred.',
        isNetworkError: false,
      };
    }
    return {
      message: 'An unknown error occurred.',
      isNetworkError: false,
    };
  }

  const axiosError = error as AxiosError<BackendErrorPayload>;

  // Network or connection failure
  if (!axiosError.response) {
    if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
      return {
        message: 'Request timed out. Please check your network connection and try again.',
        isNetworkError: true,
      };
    }
    return {
      message: 'Unable to reach the TaskFlow server. Please check your connection.',
      isNetworkError: true,
    };
  }

  const status = axiosError.response.status;
  const data = axiosError.response.data;

  // Extract validation errors if returned
  let validationErrors: Record<string, string> | undefined;
  if (data && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
    validationErrors = data.errors as Record<string, string>;
  }

  // Safe user-facing message mapping
  let message = data?.message || 'Request failed';

  switch (status) {
    case 400:
      if (validationErrors && Object.keys(validationErrors).length > 0) {
        const firstErrorKey = Object.keys(validationErrors)[0];
        message = validationErrors[firstErrorKey] || 'Please review the submitted form fields.';
      } else {
        message = data?.message || 'Invalid request. Please check the provided information.';
      }
      break;

    case 401:
      message = data?.message || 'Your session has expired. Please sign in again.';
      break;

    case 403:
      message = data?.message || "You don't have permission to access this resource.";
      break;

    case 404:
      message = data?.message || 'The requested resource was not found.';
      break;

    case 409:
      message = data?.message || 'This resource or email is already registered.';
      break;

    case 422:
      message = data?.message || 'Unprocessable request parameters.';
      break;

    case 429:
      message = data?.message || 'Too many requests. Please wait a moment before trying again.';
      break;

    case 500:
    case 502:
    case 503:
      // Never show raw backend 500 internals to user
      message = 'A temporary server error occurred. Our team has been alerted.';
      break;

    default:
      message = data?.message || 'An error occurred while processing your request.';
  }

  return {
    message,
    statusCode: status,
    validationErrors,
    isNetworkError: false,
  };
};
