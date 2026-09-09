import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User, AuthState } from '../types';
import { tokenStorage } from '../utils/tokenStorage';
import { getUnreadNotificationCountApi } from '../api/notifications.api';

interface AuthContextValue extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    tokenStorage.clearSession();
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Session verification on application startup
  const restoreSession = useCallback(async () => {
    try {
      const storedToken = tokenStorage.getAccessToken();
      const cachedUser = tokenStorage.getCachedUser();

      if (!storedToken || !cachedUser) {
        setToken(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Verify token liveness with backend PostgreSQL
      await getUnreadNotificationCountApi();

      // Token is valid and account is active
      setToken(storedToken);
      setUser(cachedUser);
    } catch {
      // 401 Unauthorized or invalid token -> clear session
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    restoreSession();

    // Listen for unauthorized 401 events broadcast from Axios interceptor
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('taskflow:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('taskflow:unauthorized', handleUnauthorized);
    };
  }, [restoreSession, logout]);

  const login = (newToken: string, newUser: User) => {
    tokenStorage.setAccessToken(newToken);
    tokenStorage.setCachedUser(newUser);
    setToken(newToken);
    setUser(newUser);
    queryClient.invalidateQueries();
  };

  const refreshUser = async () => {
    try {
      await restoreSession();
    } catch (e) {
      console.error('Failed to refresh user session', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
