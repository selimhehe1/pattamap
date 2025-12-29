/**
 * useUnreadNotificationCount Hook
 *
 * Simple hook to get the unread notification count for the header.
 * Used to display a notification dot on the menu button.
 *
 * @version 10.5 - Header redesign
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSecureFetch } from './useSecureFetch';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

const BASE_POLL_INTERVAL_MS = 30000; // 30 seconds
const MAX_POLL_INTERVAL_MS = 300000; // 5 minutes max

interface UseUnreadNotificationCountReturn {
  unreadCount: number;
  hasUnread: boolean;
  refetch: () => Promise<void>;
}

export function useUnreadNotificationCount(): UseUnreadNotificationCountReturn {
  const { secureFetch } = useSecureFetch();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const consecutiveErrorsRef = useRef(0);
  const currentIntervalRef = useRef(BASE_POLL_INTERVAL_MS);
  const API_URL = import.meta.env.VITE_API_URL || '';

  const fetchUnreadCount = useCallback(async (): Promise<boolean> => {
    if (!user) return true;

    try {
      const response = await secureFetch(`${API_URL}/api/notifications/unread-count`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to fetch unread notification count:', error);
      return false;
    }
  }, [user, secureFetch, API_URL]);

  const refetch = useCallback(async () => {
    await fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();

    consecutiveErrorsRef.current = 0;
    currentIntervalRef.current = BASE_POLL_INTERVAL_MS;

    let timeoutId: NodeJS.Timeout;

    const scheduleNextPoll = () => {
      timeoutId = setTimeout(async () => {
        const success = await fetchUnreadCount();

        if (success) {
          consecutiveErrorsRef.current = 0;
          currentIntervalRef.current = BASE_POLL_INTERVAL_MS;
        } else {
          consecutiveErrorsRef.current++;
          const backoffMultiplier = Math.pow(2, consecutiveErrorsRef.current);
          currentIntervalRef.current = Math.min(
            BASE_POLL_INTERVAL_MS * backoffMultiplier,
            MAX_POLL_INTERVAL_MS
          );
        }

        scheduleNextPoll();
      }, currentIntervalRef.current);
    };

    scheduleNextPoll();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, fetchUnreadCount]);

  return {
    unreadCount,
    hasUnread: unreadCount > 0,
    refetch
  };
}

export default useUnreadNotificationCount;
