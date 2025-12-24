/**
 * useOfflineQueue Hook
 *
 * React hook for interacting with the offline queue.
 * Provides queue count, sync status, and methods to add/sync requests.
 *
 * @module useOfflineQueue
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getQueueCount,
  addToQueue as addToQueueUtil,
  processQueue,
  getQueuedRequests,
  clearQueue as clearQueueUtil,
  isOfflineQueueSupported,
  type QueuedRequest,
} from '../utils/offlineQueue';
import { useOnline } from './useOnline';

export interface UseOfflineQueueResult {
  /** Number of requests waiting in the queue */
  queueCount: number;
  /** Whether the queue is currently being synced */
  isSyncing: boolean;
  /** Whether offline queue is supported in this browser */
  isSupported: boolean;
  /** Add a request to the offline queue */
  addToQueue: (
    url: string,
    method: QueuedRequest['method'],
    body?: unknown,
    options?: {
      headers?: Record<string, string>;
      description?: string;
    }
  ) => Promise<QueuedRequest>;
  /** Force sync the queue now */
  syncQueue: () => Promise<void>;
  /** Clear all pending requests */
  clearQueue: () => Promise<void>;
  /** Get all pending requests */
  getQueue: () => Promise<QueuedRequest[]>;
  /** Last sync result */
  lastSyncResult: {
    success: number;
    failed: number;
    remaining: number;
  } | null;
  /** Timestamp of last successful sync */
  lastSyncTime: Date | null;
}

export function useOfflineQueue(): UseOfflineQueueResult {
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<UseOfflineQueueResult['lastSyncResult']>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { isOnline } = useOnline();
  const isSupported = isOfflineQueueSupported();

  // Load initial queue count
  useEffect(() => {
    if (!isSupported) return;

    const loadCount = async () => {
      try {
        const count = await getQueueCount();
        setQueueCount(count);
      } catch (error) {
        console.error('[useOfflineQueue] Failed to load queue count:', error);
      }
    };

    loadCount();
  }, [isSupported]);

  // Listen for queue changes
  useEffect(() => {
    if (!isSupported) return;

    const handleQueueChange = async () => {
      try {
        const count = await getQueueCount();
        setQueueCount(count);
      } catch (error) {
        console.error('[useOfflineQueue] Failed to update queue count:', error);
      }
    };

    const handleSyncComplete = (event: Event) => {
      const customEvent = event as CustomEvent<{
        success: number;
        failed: number;
        remaining: number;
      }>;
      setLastSyncResult(customEvent.detail);
      setIsSyncing(false);
      // Update last sync time if any requests were synced
      if (customEvent.detail.success > 0) {
        setLastSyncTime(new Date());
      }
    };

    window.addEventListener('offline-queue-change', handleQueueChange);
    window.addEventListener('offline-queue-sync-complete', handleSyncComplete);

    return () => {
      window.removeEventListener('offline-queue-change', handleQueueChange);
      window.removeEventListener('offline-queue-sync-complete', handleSyncComplete);
    };
  }, [isSupported]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (!isSupported || !isOnline || queueCount === 0) return;

    // Debounce to avoid multiple syncs
    const timeoutId = setTimeout(() => {
      syncQueue();
    }, 1000);

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, isSupported]);

  const addToQueue = useCallback(
    async (
      url: string,
      method: QueuedRequest['method'],
      body?: unknown,
      options?: {
        headers?: Record<string, string>;
        description?: string;
      }
    ): Promise<QueuedRequest> => {
      if (!isSupported) {
        throw new Error('Offline queue is not supported in this browser');
      }

      return addToQueueUtil(url, method, body, options);
    },
    [isSupported]
  );

  const syncQueue = useCallback(async (): Promise<void> => {
    if (!isSupported || isSyncing || queueCount === 0) return;

    setIsSyncing(true);

    try {
      const result = await processQueue();
      setLastSyncResult(result);
    } catch (error) {
      console.error('[useOfflineQueue] Sync failed:', error);
    } finally {
      setIsSyncing(false);
      // Refresh count after sync
      const count = await getQueueCount();
      setQueueCount(count);
    }
  }, [isSupported, isSyncing, queueCount]);

  const clearQueue = useCallback(async (): Promise<void> => {
    if (!isSupported) return;

    await clearQueueUtil();
    setQueueCount(0);
  }, [isSupported]);

  const getQueue = useCallback(async (): Promise<QueuedRequest[]> => {
    if (!isSupported) return [];

    return getQueuedRequests();
  }, [isSupported]);

  return {
    queueCount,
    isSyncing,
    isSupported,
    addToQueue,
    syncQueue,
    clearQueue,
    getQueue,
    lastSyncResult,
    lastSyncTime,
  };
}
