import { useQuery } from '@tanstack/react-query';
import { tokenStorage } from '../utils/tokenStorage';
import { getUnreadNotificationCountApi } from '../api/notifications.api';
import { User } from '../types';

export const CURRENT_USER_QUERY_KEY = ['currentUser'];

/**
 * Session verification query
 * Confirms with backend that the stored Bearer token is valid and unexpired.
 */
export const useCurrentUser = () => {
  const token = tokenStorage.getAccessToken();
  const cachedUser = tokenStorage.getCachedUser();

  return useQuery<User | null>({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: async () => {
      if (!token) return null;

      try {
        // Ping authenticated endpoint to verify token validity in live PostgreSQL
        await getUnreadNotificationCountApi();
        return cachedUser;
      } catch {
        // If 401 Unauthorized or invalid, remove session
        tokenStorage.clearSession();
        return null;
      }
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};
