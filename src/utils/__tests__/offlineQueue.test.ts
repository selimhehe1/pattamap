/**
 * @vitest-environment jsdom
 */
/**
 * Offline Queue Tests
 *
 * Tests for IndexedDB-based offline request queue:
 * - isOfflineQueueSupported (2 tests)
 * - initDB (3 tests)
 * - addToQueue (4 tests)
 * - getQueuedRequests (3 tests)
 * - getQueueCount (2 tests)
 * - removeFromQueue (3 tests)
 * - updateRetryCount (3 tests)
 * - clearQueue (2 tests)
 * - processQueue (5 tests)
 *
 * Total: 27 tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock IndexedDB
class MockIDBRequest<T = unknown> {
  result: T | null = null;
  error: DOMException | null = null;
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  _triggerSuccess(result: T) {
    this.result = result;
    if (this.onsuccess) {
      this.onsuccess(new Event('success'));
    }
  }

  _triggerError(error: DOMException) {
    this.error = error;
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

class MockIDBObjectStore {
  name = 'request-queue';
  private data: Map<string, unknown> = new Map();
  private indexes: Map<string, MockIDBIndex> = new Map();

  add(value: unknown): MockIDBRequest {
    const request = new MockIDBRequest();
    const record = value as { id: string };
    setTimeout(() => {
      this.data.set(record.id, value);
      request._triggerSuccess(record.id);
    }, 0);
    return request;
  }

  put(value: unknown): MockIDBRequest {
    const request = new MockIDBRequest();
    const record = value as { id: string };
    setTimeout(() => {
      this.data.set(record.id, value);
      request._triggerSuccess(record.id);
    }, 0);
    return request;
  }

  get(key: string): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      request._triggerSuccess(this.data.get(key) || undefined);
    }, 0);
    return request;
  }

  delete(key: string): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      this.data.delete(key);
      request._triggerSuccess(undefined);
    }, 0);
    return request;
  }

  clear(): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      this.data.clear();
      request._triggerSuccess(undefined);
    }, 0);
    return request;
  }

  count(): MockIDBRequest<number> {
    const request = new MockIDBRequest<number>();
    setTimeout(() => {
      request._triggerSuccess(this.data.size);
    }, 0);
    return request;
  }

  createIndex(name: string): MockIDBIndex {
    const index = new MockIDBIndex(this.data);
    this.indexes.set(name, index);
    return index;
  }

  index(name: string): MockIDBIndex {
    return this.indexes.get(name) || new MockIDBIndex(this.data);
  }

  // For testing - set initial data
  _setData(data: Map<string, unknown>) {
    this.data = data;
  }

  _getData(): Map<string, unknown> {
    return this.data;
  }
}

class MockIDBIndex {
  constructor(private data: Map<string, unknown>) {}

  getAll(): MockIDBRequest<unknown[]> {
    const request = new MockIDBRequest<unknown[]>();
    setTimeout(() => {
      request._triggerSuccess(Array.from(this.data.values()));
    }, 0);
    return request;
  }
}

class MockIDBTransaction {
  private store: MockIDBObjectStore;

  constructor(store: MockIDBObjectStore) {
    this.store = store;
  }

  objectStore(): MockIDBObjectStore {
    return this.store;
  }
}

class MockIDBDatabase {
  name = 'pattamap-offline';
  objectStoreNames = { contains: vi.fn().mockReturnValue(true) };
  private store = new MockIDBObjectStore();

  transaction(): MockIDBTransaction {
    return new MockIDBTransaction(this.store);
  }

  createObjectStore(): MockIDBObjectStore {
    return this.store;
  }

  _getStore(): MockIDBObjectStore {
    return this.store;
  }
}

class MockIDBOpenDBRequest extends MockIDBRequest<MockIDBDatabase> {
  onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null = null;
}

// Store reference to mock DB for tests
let mockDB: MockIDBDatabase;
let mockOpenRequest: MockIDBOpenDBRequest;

// Setup IndexedDB mock
const mockIndexedDB = {
  open: vi.fn(() => {
    mockOpenRequest = new MockIDBOpenDBRequest();
    mockDB = new MockIDBDatabase();

    setTimeout(() => {
      mockOpenRequest._triggerSuccess(mockDB);
    }, 0);

    return mockOpenRequest;
  }),
};

// Mock globals
beforeAll(() => {
  // @ts-ignore
  global.indexedDB = mockIndexedDB;

  // Mock window.dispatchEvent
  global.window.dispatchEvent = vi.fn();

  // Mock navigator.serviceWorker
  // @ts-ignore
  global.navigator.serviceWorker = {
    ready: Promise.resolve({
      sync: { register: vi.fn() },
    }),
  };

  // @ts-ignore
  global.window.ServiceWorkerRegistration = {
    prototype: { sync: {} },
  };
});

describe('Offline Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Reset mock DB
    mockDB = new MockIDBDatabase();
    mockOpenRequest = new MockIDBOpenDBRequest();

    mockIndexedDB.open.mockImplementation(() => {
      mockOpenRequest = new MockIDBOpenDBRequest();
      setTimeout(() => {
        mockOpenRequest._triggerSuccess(mockDB);
      }, 0);
      return mockOpenRequest;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isOfflineQueueSupported', () => {
    it('should return true when IndexedDB is available', async () => {
      const { isOfflineQueueSupported } = await import('../offlineQueue');
      expect(isOfflineQueueSupported()).toBe(true);
    });

    it('should return false when IndexedDB is not available', async () => {
      const originalIndexedDB = global.indexedDB;
      // @ts-ignore
      delete global.indexedDB;

      // Re-import to get fresh module
      vi.resetModules();
      const { isOfflineQueueSupported } = await import('../offlineQueue');

      expect(isOfflineQueueSupported()).toBe(false);

      // Restore
      // @ts-ignore
      global.indexedDB = originalIndexedDB;
    });
  });

  describe('initDB', () => {
    it('should initialize the database', async () => {
      const { initDB } = await import('../offlineQueue');

      const db = await initDB();

      expect(db).toBeDefined();
      expect(mockIndexedDB.open).toHaveBeenCalledWith('pattamap-offline', 1);
    });

    it('should return cached database on subsequent calls', async () => {
      const { initDB } = await import('../offlineQueue');

      const db1 = await initDB();
      const db2 = await initDB();

      expect(db1).toBe(db2);
      // Only called once because of caching
      expect(mockIndexedDB.open).toHaveBeenCalledTimes(1);
    });

    it('should reject on database error', async () => {
      vi.resetModules();

      mockIndexedDB.open.mockImplementationOnce(() => {
        const request = new MockIDBOpenDBRequest();
        setTimeout(() => {
          request._triggerError(new DOMException('Failed to open'));
        }, 0);
        return request;
      });

      const { initDB } = await import('../offlineQueue');

      await expect(initDB()).rejects.toThrow();
    });
  });

  describe('addToQueue', () => {
    it('should add a request to the queue', async () => {
      const { addToQueue } = await import('../offlineQueue');

      const request = await addToQueue(
        '/api/test',
        'POST',
        { data: 'test' },
        { description: 'Test request' }
      );

      expect(request).toMatchObject({
        url: '/api/test',
        method: 'POST',
        body: { data: 'test' },
        description: 'Test request',
        retryCount: 0,
        maxRetries: 3,
      });
      expect(request.id).toBeDefined();
      expect(request.timestamp).toBeDefined();
    });

    it('should use custom maxRetries', async () => {
      const { addToQueue } = await import('../offlineQueue');

      const request = await addToQueue('/api/test', 'PUT', null, {
        maxRetries: 5,
      });

      expect(request.maxRetries).toBe(5);
    });

    it('should dispatch offline-queue-change event', async () => {
      const { addToQueue } = await import('../offlineQueue');

      await addToQueue('/api/test', 'DELETE');

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'offline-queue-change',
          detail: expect.objectContaining({
            type: 'add',
          }),
        })
      );
    });

    it('should include headers when provided', async () => {
      const { addToQueue } = await import('../offlineQueue');

      const request = await addToQueue('/api/test', 'PATCH', null, {
        headers: { Authorization: 'Bearer token' },
      });

      expect(request.headers).toEqual({ Authorization: 'Bearer token' });
    });
  });

  describe('getQueuedRequests', () => {
    it('should return empty array when queue is empty', async () => {
      const { getQueuedRequests } = await import('../offlineQueue');

      const requests = await getQueuedRequests();

      expect(requests).toEqual([]);
    });

    it('should return all queued requests', async () => {
      const { addToQueue, getQueuedRequests } = await import('../offlineQueue');

      await addToQueue('/api/test1', 'POST');
      await addToQueue('/api/test2', 'PUT');

      const requests = await getQueuedRequests();

      expect(requests.length).toBe(2);
    });

    it('should return requests sorted by timestamp', async () => {
      const { addToQueue, getQueuedRequests } = await import('../offlineQueue');

      await addToQueue('/api/first', 'POST');
      await new Promise((r) => setTimeout(r, 10));
      await addToQueue('/api/second', 'POST');

      const requests = await getQueuedRequests();

      expect(requests[0].url).toBe('/api/first');
      expect(requests[1].url).toBe('/api/second');
    });
  });

  describe('getQueueCount', () => {
    it('should return 0 when queue is empty', async () => {
      const { getQueueCount } = await import('../offlineQueue');

      const count = await getQueueCount();

      expect(count).toBe(0);
    });

    it('should return correct count', async () => {
      const { addToQueue, getQueueCount } = await import('../offlineQueue');

      await addToQueue('/api/test1', 'POST');
      await addToQueue('/api/test2', 'POST');
      await addToQueue('/api/test3', 'POST');

      const count = await getQueueCount();

      expect(count).toBe(3);
    });
  });

  describe('removeFromQueue', () => {
    it('should remove a request from the queue', async () => {
      const { addToQueue, removeFromQueue, getQueueCount } = await import('../offlineQueue');

      const request = await addToQueue('/api/test', 'POST');
      expect(await getQueueCount()).toBe(1);

      await removeFromQueue(request.id);

      expect(await getQueueCount()).toBe(0);
    });

    it('should dispatch offline-queue-change event', async () => {
      const { addToQueue, removeFromQueue } = await import('../offlineQueue');

      const request = await addToQueue('/api/test', 'POST');
      vi.mocked(window.dispatchEvent).mockClear();

      await removeFromQueue(request.id);

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'offline-queue-change',
          detail: expect.objectContaining({
            type: 'remove',
            id: request.id,
          }),
        })
      );
    });

    it('should handle non-existent ID gracefully', async () => {
      const { removeFromQueue } = await import('../offlineQueue');

      // Should not throw
      await expect(removeFromQueue('non-existent-id')).resolves.toBeUndefined();
    });
  });

  describe('updateRetryCount', () => {
    it('should increment retry count', async () => {
      const { addToQueue, updateRetryCount } = await import('../offlineQueue');

      const request = await addToQueue('/api/test', 'POST');
      expect(request.retryCount).toBe(0);

      const updated = await updateRetryCount(request.id);

      expect(updated?.retryCount).toBe(1);
    });

    it('should return null for non-existent request', async () => {
      const { updateRetryCount } = await import('../offlineQueue');

      const result = await updateRetryCount('non-existent-id');

      expect(result).toBeNull();
    });

    it('should increment multiple times', async () => {
      const { addToQueue, updateRetryCount } = await import('../offlineQueue');

      const request = await addToQueue('/api/test', 'POST');

      await updateRetryCount(request.id);
      await updateRetryCount(request.id);
      const updated = await updateRetryCount(request.id);

      expect(updated?.retryCount).toBe(3);
    });
  });

  describe('clearQueue', () => {
    it('should clear all requests from queue', async () => {
      const { addToQueue, clearQueue, getQueueCount } = await import('../offlineQueue');

      await addToQueue('/api/test1', 'POST');
      await addToQueue('/api/test2', 'POST');
      expect(await getQueueCount()).toBe(2);

      await clearQueue();

      expect(await getQueueCount()).toBe(0);
    });

    it('should dispatch offline-queue-change event with type clear', async () => {
      const { clearQueue } = await import('../offlineQueue');

      await clearQueue();

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'offline-queue-change',
          detail: expect.objectContaining({
            type: 'clear',
          }),
        })
      );
    });
  });

  describe('processQueue', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('should process and remove successful requests', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const { addToQueue, processQueue, getQueueCount } = await import('../offlineQueue');

      await addToQueue('/api/test', 'POST', { data: 'test' });
      expect(await getQueueCount()).toBe(1);

      const result = await processQueue();

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.remaining).toBe(0);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: 'test' }),
        })
      );
    });

    it('should increment retry count on failure', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const { addToQueue, processQueue, getQueuedRequests } = await import('../offlineQueue');

      await addToQueue('/api/test', 'POST');

      await processQueue();

      const requests = await getQueuedRequests();
      expect(requests[0].retryCount).toBe(1);
    });

    it('should remove request after max retries exceeded', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const { addToQueue, processQueue, getQueueCount, updateRetryCount } = await import('../offlineQueue');

      const request = await addToQueue('/api/test', 'POST', null, { maxRetries: 2 });

      // Simulate reaching max retries
      await updateRetryCount(request.id);
      await updateRetryCount(request.id);

      const result = await processQueue();

      expect(result.failed).toBe(1);
      expect(await getQueueCount()).toBe(0);
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const { addToQueue, processQueue, getQueuedRequests } = await import('../offlineQueue');

      await addToQueue('/api/test', 'POST');

      const result = await processQueue();

      expect(result.failed).toBe(1);
      const requests = await getQueuedRequests();
      expect(requests[0].retryCount).toBe(1);
    });

    it('should dispatch sync-complete event', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const { addToQueue, processQueue } = await import('../offlineQueue');

      await addToQueue('/api/test', 'POST');
      vi.mocked(window.dispatchEvent).mockClear();

      await processQueue();

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'offline-queue-sync-complete',
          detail: expect.objectContaining({
            success: 1,
            failed: 0,
            remaining: 0,
          }),
        })
      );
    });
  });
});
