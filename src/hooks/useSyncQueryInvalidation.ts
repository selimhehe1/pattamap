/**
 * useSyncQueryInvalidation Hook
 *
 * Listens for offline queue sync completion events and invalidates
 * relevant React Query caches to ensure data freshness after
 * offline mutations are synced.
 *
 * @module useSyncQueryInvalidation
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { favoriteKeys } from './useFavorites';
import { logger } from '../utils/logger';

/**
 * Maps URL patterns to query keys that should be invalidated
 */
const URL_TO_QUERY_KEYS: Array<{
  pattern: RegExp;
  queryKeys: unknown[][];
}> = [
  // Favorites endpoints
  {
    pattern: /\/api\/favorites/,
    queryKeys: [[...favoriteKeys.all]],
  },
  // Employees endpoints (for ratings, comments)
  {
    pattern: /\/api\/employees/,
    queryKeys: [['employees'], ['employee']],
  },
  // Establishments endpoints
  {
    pattern: /\/api\/establishments/,
    queryKeys: [['establishments'], ['establishment']],
  },
  // Gamification endpoints (check-ins, XP)
  {
    pattern: /\/api\/gamification/,
    queryKeys: [['gamification'], ['user-stats'], ['leaderboard']],
  },
  // Reviews/comments endpoints
  {
    pattern: /\/api\/reviews|\/api\/comments/,
    queryKeys: [['reviews'], ['comments']],
  },
];

interface SyncEventDetail {
  request?: {
    url: string;
    id: string;
    description?: string;
  };
  success?: number;
  failed?: number;
  remaining?: number;
}

/**
 * Hook that automatically invalidates React Query caches when
 * offline mutations are synced.
 *
 * Should be mounted once at app root level.
 *
 * @example
 * ```tsx
 * // In App.tsx or a provider
 * function App() {
 *   useSyncQueryInvalidation();
 *   return <Routes />;
 * }
 * ```
 */
export function useSyncQueryInvalidation(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    /**
     * Handle individual request sync success
     * Invalidates queries related to the synced endpoint
     */
    const handleRequestSuccess = (event: Event) => {
      const customEvent = event as CustomEvent<SyncEventDetail>;
      const request = customEvent.detail?.request;

      if (!request?.url) return;

      logger.debug('[SyncInvalidation] Request synced:', request.url);

      // Find matching query keys to invalidate
      for (const { pattern, queryKeys } of URL_TO_QUERY_KEYS) {
        if (pattern.test(request.url)) {
          for (const queryKey of queryKeys) {
            logger.debug('[SyncInvalidation] Invalidating:', queryKey);
            queryClient.invalidateQueries({ queryKey: queryKey as unknown[] });
          }
          break; // Stop after first match
        }
      }
    };

    /**
     * Handle sync completion
     * Shows summary and does full invalidation if many requests synced
     */
    const handleSyncComplete = (event: Event) => {
      const customEvent = event as CustomEvent<SyncEventDetail>;
      const { success = 0, failed = 0, remaining = 0 } = customEvent.detail || {};

      logger.debug(`[SyncInvalidation] Sync complete: ${success} success, ${failed} failed, ${remaining} remaining`);

      // If multiple requests synced, do a broader invalidation
      if (success > 2) {
        logger.debug('[SyncInvalidation] Multiple syncs - invalidating all user data');
        // Invalidate commonly affected queries
        queryClient.invalidateQueries({ queryKey: [...favoriteKeys.all] });
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        queryClient.invalidateQueries({ queryKey: ['gamification'] });
      }
    };

    // Register event listeners
    window.addEventListener('offline-queue-request-success', handleRequestSuccess);
    window.addEventListener('offline-queue-sync-complete', handleSyncComplete);

    return () => {
      window.removeEventListener('offline-queue-request-success', handleRequestSuccess);
      window.removeEventListener('offline-queue-sync-complete', handleSyncComplete);
    };
  }, [queryClient]);
}

export default useSyncQueryInvalidation;
