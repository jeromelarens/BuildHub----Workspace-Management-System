import { User } from './user.types';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  role?: 'employee' | 'manager';
}

export type RegisterData = RegisterCredentials;

export interface AuthResponseData {
  token: string;
  user: User;
}
