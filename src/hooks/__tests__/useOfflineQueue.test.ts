/**
 * @vitest-environment jsdom
 */
/**
 * useOfflineQueue Hook Tests
 *
 * Tests for offline queue management:
 * - Initial state (3 tests)
 * - addToQueue functionality (3 tests)
 * - syncQueue functionality (5 tests)
 * - clearQueue functionality (2 tests)
 * - getQueue functionality (2 tests)
 * - Event handling (2 tests)
 * - Unsupported browser (3 tests)
 *
 * Total: 20 tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineQueue } from '../useOfflineQueue';

// Mock offlineQueue utils
const mockGetQueueCount = vi.fn();
const mockAddToQueue = vi.fn();
const mockProcessQueue = vi.fn();
const mockGetQueuedRequests = vi.fn();
const mockClearQueue = vi.fn();
const mockIsOfflineQueueSupported = vi.fn();

vi.mock('../../utils/offlineQueue', () => ({
  getQueueCount: () => mockGetQueueCount(),
  addToQueue: (...args: unknown[]) => mockAddToQueue(...args),
  processQueue: () => mockProcessQueue(),
  getQueuedRequests: () => mockGetQueuedRequests(),
  clearQueue: () => mockClearQueue(),
  isOfflineQueueSupported: () => mockIsOfflineQueueSupported()
}));

// Mock useOnline
vi.mock('../useOnline', () => ({
  useOnline: () => ({ isOnline: true })
}));

// Sample queued request
const mockQueuedRequest = {
  id: 'req-1',
  url: '/api/test',
  method: 'POST' as const,
  body: { data: 'test' },
  timestamp: Date.now(),
  retryCount: 0
};

describe('useOfflineQueue Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOfflineQueueSupported.mockReturnValue(true);
    mockGetQueueCount.mockResolvedValue(0);
    mockAddToQueue.mockResolvedValue(mockQueuedRequest);
    mockProcessQueue.mockResolvedValue({ success: 1, failed: 0, remaining: 0 });
    mockGetQueuedRequests.mockResolvedValue([]);
    mockClearQueue.mockResolvedValue(undefined);
  });

  describe('Initial state', () => {
    it('should return initial state with zero queue count', () => {
      const { result } = renderHook(() => useOfflineQueue());

      expect(result.current.queueCount).toBe(0);
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.isSupported).toBe(true);
      expect(result.current.lastSyncResult).toBeNull();
    });

    it('should load queue count on mount', async () => {
      mockGetQueueCount.mockResolvedValue(5);

      const { result } = renderHook(() => useOfflineQueue());

      await waitFor(() => {
        expect(result.current.queueCount).toBe(5);
      });
    });

    it('should indicate when offline queue is supported', () => {
      mockIsOfflineQueueSupported.mockReturnValue(true);

      const { result } = renderHook(() => useOfflineQueue());

      expect(result.current.isSupported).toBe(true);
    });
  });

  describe('addToQueue functionality', () => {
    it('should add request to queue', async () => {
      const { result } = renderHook(() => useOfflineQueue());

      let queuedRequest;
      await act(async () => {
        queuedRequest = await result.current.addToQueue('/api/test', 'POST', { data: 'test' });
      });

      expect(mockAddToQueue).toHaveBeenCalledWith('/api/test', 'POST', { data: 'test' }, undefined);
      expect(queuedRequest).toEqual(mockQueuedRequest);
    });

    it('should add request with options', async () => {
      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.addToQueue('/api/test', 'PUT', { id: 1 }, {
          headers: { 'X-Custom': 'header' },
          description: 'Update item'
        });
      });

      expect(mockAddToQueue).toHaveBeenCalledWith('/api/test', 'PUT', { id: 1 }, {
        headers: { 'X-Custom': 'header' },
        description: 'Update item'
      });
    });

    it('should throw error when not supported', async () => {
      mockIsOfflineQueueSupported.mockReturnValue(false);

      const { result } = renderHook(() => useOfflineQueue());

      await expect(
        act(async () => {
          await result.current.addToQueue('/api/test', 'POST');
        })
      ).rejects.toThrow('Offline queue is not supported in this browser');
    });
  });

  describe('syncQueue functionality', () => {
    it('should sync queue and update result', async () => {
      mockGetQueueCount.mockResolvedValue(2);
      mockProcessQueue.mockResolvedValue({ success: 2, failed: 0, remaining: 0 });

      const { result } = renderHook(() => useOfflineQueue());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.queueCount).toBe(2);
      });

      // Sync queue
      await act(async () => {
        await result.current.syncQueue();
      });

      expect(mockProcessQueue).toHaveBeenCalled();
      expect(result.current.lastSyncResult).toEqual({ success: 2, failed: 0, remaining: 0 });
    });

    it('should not sync when queue is empty', async () => {
      mockGetQueueCount.mockResolvedValue(0);

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.syncQueue();
      });

      expect(mockProcessQueue).not.toHaveBeenCalled();
    });

    it('should set isSyncing to true during sync', async () => {
      mockGetQueueCount.mockResolvedValue(3);
      // Create a promise we can control
      let resolveProcess: (value: { success: number; failed: number; remaining: number }) => void;
      mockProcessQueue.mockImplementation(() => new Promise(resolve => {
        resolveProcess = resolve;
      }));

      const { result } = renderHook(() => useOfflineQueue());

      await waitFor(() => {
        expect(result.current.queueCount).toBe(3);
      });

      // Start sync but don't await
      act(() => {
        result.current.syncQueue();
      });

      // Should be syncing now
      expect(result.current.isSyncing).toBe(true);

      // Resolve the process
      await act(async () => {
        resolveProcess!({ success: 3, failed: 0, remaining: 0 });
      });

      expect(result.current.isSyncing).toBe(false);
    });

    it('should refresh queue count after sync', async () => {
      // Initial count
      mockGetQueueCount.mockResolvedValue(5);
      mockProcessQueue.mockResolvedValue({ success: 3, failed: 0, remaining: 2 });

      const { result } = renderHook(() => useOfflineQueue());

      await waitFor(() => {
        expect(result.current.queueCount).toBe(5);
      });

      // After sync, count should be refreshed
      mockGetQueueCount.mockResolvedValue(2);

      await act(async () => {
        await result.current.syncQueue();
      });

      await waitFor(() => {
        expect(result.current.queueCount).toBe(2);
      });
    });

    it('should handle sync with partial failures', async () => {
      mockGetQueueCount.mockResolvedValue(5);
      mockProcessQueue.mockResolvedValue({ success: 3, failed: 2, remaining: 2 });

      const { result } = renderHook(() => useOfflineQueue());

      await waitFor(() => {
        expect(result.current.queueCount).toBe(5);
      });

      await act(async () => {
        await result.current.syncQueue();
      });

      expect(result.current.lastSyncResult).toEqual({ success: 3, failed: 2, remaining: 2 });
    });
  });

  describe('clearQueue functionality', () => {
    it('should clear queue and reset count', async () => {
      mockGetQueueCount.mockResolvedValue(3);

      const { result } = renderHook(() => useOfflineQueue());

      await waitFor(() => {
        expect(result.current.queueCount).toBe(3);
      });

      await act(async () => {
        await result.current.clearQueue();
      });

      expect(mockClearQueue).toHaveBeenCalled();
      expect(result.current.queueCount).toBe(0);
    });

    it('should do nothing when not supported', async () => {
      mockIsOfflineQueueSupported.mockReturnValue(false);

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.clearQueue();
      });

      expect(mockClearQueue).not.toHaveBeenCalled();
    });
  });

  describe('getQueue functionality', () => {
    it('should return queued requests', async () => {
      const requests = [mockQueuedRequest, { ...mockQueuedRequest, id: 'req-2' }];
      mockGetQueuedRequests.mockResolvedValue(requests);

      const { result } = renderHook(() => useOfflineQueue());

      let queue;
      await act(async () => {
        queue = await result.current.getQueue();
      });

      expect(queue).toEqual(requests);
    });

    it('should return empty array when not supported', async () => {
      mockIsOfflineQueueSupported.mockReturnValue(false);

      const { result } = renderHook(() => useOfflineQueue());

      let queue;
      await act(async () => {
        queue = await result.current.getQueue();
      });

      expect(queue).toEqual([]);
      expect(mockGetQueuedRequests).not.toHaveBeenCalled();
    });
  });

  describe('Event handling', () => {
    it('should update count on queue-change event', async () => {
      mockGetQueueCount.mockResolvedValue(0);

      const { result } = renderHook(() => useOfflineQueue());

      await waitFor(() => {
        expect(mockGetQueueCount).toHaveBeenCalled();
      });

      // Simulate queue change event
      mockGetQueueCount.mockResolvedValue(3);
      await act(async () => {
        window.dispatchEvent(new CustomEvent('offline-queue-change'));
      });

      await waitFor(() => {
        expect(result.current.queueCount).toBe(3);
      });
    });

    it('should update lastSyncResult on sync-complete event', async () => {
      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        window.dispatchEvent(new CustomEvent('offline-queue-sync-complete', {
          detail: { success: 5, failed: 1, remaining: 0 }
        }));
      });

      expect(result.current.lastSyncResult).toEqual({ success: 5, failed: 1, remaining: 0 });
      expect(result.current.isSyncing).toBe(false);
    });
  });

  describe('Unsupported browser', () => {
    it('should not load queue count when not supported', async () => {
      mockIsOfflineQueueSupported.mockReturnValue(false);
      mockGetQueueCount.mockClear();

      renderHook(() => useOfflineQueue());

      // Give time for potential async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockGetQueueCount).not.toHaveBeenCalled();
    });

    it('should return isSupported as false', () => {
      mockIsOfflineQueueSupported.mockReturnValue(false);

      const { result } = renderHook(() => useOfflineQueue());

      expect(result.current.isSupported).toBe(false);
    });

    it('should not sync when not supported', async () => {
      mockIsOfflineQueueSupported.mockReturnValue(false);

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.syncQueue();
      });

      expect(mockProcessQueue).not.toHaveBeenCalled();
    });
  });
});
