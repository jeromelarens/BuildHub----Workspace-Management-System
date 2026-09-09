import { User } from '../types';

const TOKEN_KEY = 'taskflow_access_token';
const USER_KEY = 'taskflow_user_profile';

/**
 * Token and Session Storage Abstraction
 * Isolates direct localStorage access to a single authoritative module.
 */
export const tokenStorage = {
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setAccessToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error('Failed to store access token', e);
    }
  },

  removeAccessToken(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error('Failed to remove access token', e);
    }
  },

  getCachedUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  setCachedUser(user: User): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to store user profile', e);
    }
  },

  removeCachedUser(): void {
    try {
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error('Failed to remove user profile', e);
    }
  },

  clearSession(): void {
    this.removeAccessToken();
    this.removeCachedUser();
  },
};
