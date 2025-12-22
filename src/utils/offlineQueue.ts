/**
 * Offline Queue Manager
 *
 * Manages a queue of failed API requests in IndexedDB for later synchronization
 * when the network connection is restored.
 *
 * @module offlineQueue
 */

const DB_NAME = 'pattamap-offline';
const DB_VERSION = 1;
const STORE_NAME = 'request-queue';
const IS_DEV = import.meta.env.DEV;

export interface QueuedRequest {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  description?: string; // Human-readable description for UI
}

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the IndexedDB database
 */
export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[OfflineQueue] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      if (IS_DEV) console.log('[OfflineQueue] Database initialized');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('url', 'url', { unique: false });
        if (IS_DEV) console.log('[OfflineQueue] Object store created');
      }
    };
  });
}

/**
 * Generate a unique ID for a queued request
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add a request to the offline queue
 */
export async function addToQueue(
  url: string,
  method: QueuedRequest['method'],
  body?: unknown,
  options?: {
    headers?: Record<string, string>;
    description?: string;
    maxRetries?: number;
  }
): Promise<QueuedRequest> {
  const db = await initDB();

  const request: QueuedRequest = {
    id: generateId(),
    url,
    method,
    body,
    headers: options?.headers,
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: options?.maxRetries ?? 3,
    description: options?.description,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const addRequest = store.add(request);

    addRequest.onsuccess = () => {
      if (IS_DEV) console.log('[OfflineQueue] Request added to queue:', request.id);

      // Notify listeners that the queue has changed
      window.dispatchEvent(new CustomEvent('offline-queue-change', {
        detail: { type: 'add', request }
      }));

      // Register for background sync if available
      registerBackgroundSync();

      resolve(request);
    };

    addRequest.onerror = () => {
      console.error('[OfflineQueue] Failed to add request:', addRequest.error);
      reject(addRequest.error);
    };
  });
}

/**
 * Get all queued requests
 */
export async function getQueuedRequests(): Promise<QueuedRequest[]> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const request = index.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      console.error('[OfflineQueue] Failed to get requests:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Get the count of queued requests
 */
export async function getQueueCount(): Promise<number> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('[OfflineQueue] Failed to count requests:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Remove a request from the queue
 */
export async function removeFromQueue(id: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      if (IS_DEV) console.log('[OfflineQueue] Request removed from queue:', id);

      // Notify listeners that the queue has changed
      window.dispatchEvent(new CustomEvent('offline-queue-change', {
        detail: { type: 'remove', id }
      }));

      resolve();
    };

    request.onerror = () => {
      console.error('[OfflineQueue] Failed to remove request:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Update the retry count for a request
 */
export async function updateRetryCount(id: string): Promise<QueuedRequest | null> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const request = getRequest.result as QueuedRequest | undefined;

      if (!request) {
        resolve(null);
        return;
      }

      request.retryCount += 1;
      const putRequest = store.put(request);

      putRequest.onsuccess = () => {
        resolve(request);
      };

      putRequest.onerror = () => {
        reject(putRequest.error);
      };
    };

    getRequest.onerror = () => {
      reject(getRequest.error);
    };
  });
}

/**
 * Clear all requests from the queue
 */
export async function clearQueue(): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      if (IS_DEV) console.log('[OfflineQueue] Queue cleared');

      // Notify listeners that the queue has changed
      window.dispatchEvent(new CustomEvent('offline-queue-change', {
        detail: { type: 'clear' }
      }));

      resolve();
    };

    request.onerror = () => {
      console.error('[OfflineQueue] Failed to clear queue:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Process the queue - replay all pending requests
 */
export async function processQueue(): Promise<{
  success: number;
  failed: number;
  remaining: number;
}> {
  const requests = await getQueuedRequests();
  let success = 0;
  let failed = 0;

  if (IS_DEV) console.log(`[OfflineQueue] Processing ${requests.length} queued requests`);

  for (const queuedRequest of requests) {
    try {
      // Skip if max retries exceeded
      if (queuedRequest.retryCount >= queuedRequest.maxRetries) {
        console.warn('[OfflineQueue] Max retries exceeded for:', queuedRequest.id);
        await removeFromQueue(queuedRequest.id);
        failed++;
        continue;
      }

      // Make the actual request
      const response = await fetch(queuedRequest.url, {
        method: queuedRequest.method,
        headers: {
          'Content-Type': 'application/json',
          ...queuedRequest.headers,
        },
        body: queuedRequest.body ? JSON.stringify(queuedRequest.body) : undefined,
        credentials: 'include',
      });

      if (response.ok) {
        await removeFromQueue(queuedRequest.id);
        success++;
        if (IS_DEV) console.log('[OfflineQueue] Request succeeded:', queuedRequest.id);
      } else {
        await updateRetryCount(queuedRequest.id);
        failed++;
        if (IS_DEV) console.warn('[OfflineQueue] Request failed with status:', response.status);
      }
    } catch (error) {
      await updateRetryCount(queuedRequest.id);
      failed++;
      console.error('[OfflineQueue] Request error:', error);
    }
  }

  const remaining = await getQueueCount();

  // Notify listeners of sync completion
  window.dispatchEvent(new CustomEvent('offline-queue-sync-complete', {
    detail: { success, failed, remaining }
  }));

  if (IS_DEV) console.log(`[OfflineQueue] Sync complete: ${success} success, ${failed} failed, ${remaining} remaining`);

  return { success, failed, remaining };
}

/**
 * Register for background sync
 */
async function registerBackgroundSync(): Promise<void> {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('offline-queue');
      if (IS_DEV) console.log('[OfflineQueue] Background sync registered');
    } catch (error) {
      console.warn('[OfflineQueue] Background sync registration failed:', error);
    }
  }
}

/**
 * Check if offline queue is supported
 */
export function isOfflineQueueSupported(): boolean {
  return 'indexedDB' in window;
}
