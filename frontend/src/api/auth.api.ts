import apiClient from './axios';
import { ApiResponse, User } from '../types';
import { LoginCredentials, RegisterData } from '../types/auth.types';

export interface LoginResponseData {
  token: string;
  user: User;
}

export interface RegisterResponseData {
  id: number;
  name: string;
  email: string;
  role: string;
  email_verified?: boolean;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export interface VerifyEmailData {
  token: string;
}

export interface VerificationStatusData {
  email_verified: boolean;
  email_verified_at: string | null;
}

/**
 * Login user and obtain JWT token
 * POST /api/auth/login
 */
export const loginApi = async (
  credentials: LoginCredentials
): Promise<ApiResponse<LoginResponseData>> => {
  const response = await apiClient.post<ApiResponse<LoginResponseData>>(
    '/auth/login',
    credentials
  );
  return response.data;
};

/**
 * Register a new user account (role: employee or manager only)
 * POST /api/auth/register
 */
export const registerApi = async (
  data: RegisterData
): Promise<ApiResponse<RegisterResponseData>> => {
  const response = await apiClient.post<ApiResponse<RegisterResponseData>>(
    '/auth/register',
    data
  );
  return response.data;
};

/**
 * Request password reset email
 * POST /api/auth/forgot-password
 */
export const forgotPasswordApi = async (
  data: ForgotPasswordData
): Promise<ApiResponse<{ message: string; debug_token?: string }>> => {
  const response = await apiClient.post<ApiResponse<{ message: string; debug_token?: string }>>(
    '/auth/forgot-password',
    data
  );
  return response.data;
};

/**
 * Reset password using token
 * POST /api/auth/reset-password
 */
export const resetPasswordApi = async (
  data: ResetPasswordData
): Promise<ApiResponse<{ message: string }>> => {
  const response = await apiClient.post<ApiResponse<{ message: string }>>(
    '/auth/reset-password',
    data
  );
  return response.data;
};

/**
 * Verify email address with token
 * POST /api/auth/verify-email
 */
export const verifyEmailApi = async (
  data: VerifyEmailData
): Promise<ApiResponse<{ message: string; email_verified: boolean }>> => {
  const response = await apiClient.post<ApiResponse<{ message: string; email_verified: boolean }>>(
    '/auth/verify-email',
    data
  );
  return response.data;
};

/**
 * Resend email verification token
 * POST /api/auth/resend-verification
 */
export const resendVerificationApi = async (
  data: { email: string }
): Promise<ApiResponse<{ message: string; debug_token?: string }>> => {
  const response = await apiClient.post<ApiResponse<{ message: string; debug_token?: string }>>(
    '/auth/resend-verification',
    data
  );
  return response.data;
};

/**
 * Get current verification status
 * GET /api/auth/verification-status
 */
export const getVerificationStatusApi = async (): Promise<ApiResponse<VerificationStatusData>> => {
  const response = await apiClient.get<ApiResponse<VerificationStatusData>>(
    '/auth/verification-status'
  );
  return response.data;
};
