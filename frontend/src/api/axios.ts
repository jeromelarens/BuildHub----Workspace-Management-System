import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { tokenStorage } from '../utils/tokenStorage';

/**
 * Pre-configured Axios instance for TaskFlow Backend API
 */
export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Bearer token if present
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Centralized 401 handling & session expiration broadcast
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Don't trigger redirect if user was already on the login or register page
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        tokenStorage.clearSession();
        // Emit custom event for AuthContext to sync state without force reloading
        window.dispatchEvent(new CustomEvent('taskflow:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
