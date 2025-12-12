// PattaMap Service Worker
// Handles push notifications for PWA
// Version: 1.0.0

const CACHE_NAME = 'pattamap-v3'; // v3: Added background sync queue
const urlsToCache = [
  '/',
  '/offline.html', // 🆕 v10.3 - Offline fallback page
  '/static/css/main.css',
  '/static/js/main.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json'
];

// ==========================================
// INSTALL EVENT
// ==========================================
// Triggered when service worker is first installed
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  // Skip waiting to activate immediately
  self.skipWaiting();

  // Pre-cache essential assets
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[Service Worker] Cache error:', error);
      })
  );
});

// ==========================================
// ACTIVATE EVENT
// ==========================================
// Triggered when service worker becomes active
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  // Claim all clients immediately
  event.waitUntil(
    clients.claim().then(() => {
      console.log('[Service Worker] Claimed all clients');
    })
  );

  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// ==========================================
// PUSH EVENT
// ==========================================
// Triggered when a push notification is received
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  let notificationData = {
    title: 'PattaMap Notification',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      url: '/'
    }
  };

  // Parse notification payload
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[Service Worker] Push payload:', payload);

      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        image: payload.image, // Optional large image
        tag: payload.tag || 'pattamap-notification', // Group notifications by tag
        requireInteraction: payload.requireInteraction || false,
        data: payload.data || notificationData.data,
        actions: payload.actions || [] // Notification action buttons
      };
    } catch (error) {
      console.error('[Service Worker] Error parsing push payload:', error);
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      image: notificationData.image,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: notificationData.actions,
      vibrate: [200, 100, 200], // Vibration pattern (mobile)
      timestamp: Date.now()
    })
  );
});

// ==========================================
// NOTIFICATION CLICK EVENT
// ==========================================
// Triggered when user clicks on a notification
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click:', event);

  event.notification.close();

  // Get the URL to open (from notification data)
  const urlToOpen = event.notification.data?.url || '/';

  // Handle action button clicks
  if (event.action) {
    console.log('[Service Worker] Action clicked:', event.action);

    // You can handle different actions here
    // For example: 'view', 'dismiss', 'reply', etc.
  }

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ==========================================
// NOTIFICATION CLOSE EVENT
// ==========================================
// Triggered when user dismisses a notification
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event);

  // Optional: Track notification dismissal analytics
  // Can send to backend or analytics service
});

// ==========================================
// FETCH EVENT (Offline Support)
// ==========================================
// Intercept network requests for offline functionality
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip caching for API requests (always fetch fresh)
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if found
        if (response) {
          return response;
        }

        // Otherwise, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response (can only be consumed once)
            const responseToCache = response.clone();

            // Add to cache for future offline use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch error:', error);

            // 🆕 v10.3 - Return offline fallback page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
          });
      })
  );
});

// ==========================================
// MESSAGE EVENT
// ==========================================
// Handle messages from the main app (e.g., skip waiting, cache update)
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(event.data.urls))
    );
  }
});

// ==========================================
// BACKGROUND SYNC (Offline Queue)
// ==========================================
// Handle background sync for offline actions
// v10.4: Enabled background sync for offline queue

const DB_NAME = 'pattamap-offline';
const DB_VERSION = 1;
const STORE_NAME = 'request-queue';

/**
 * Open IndexedDB database for offline queue
 */
function openQueueDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Get all queued requests from IndexedDB
 */
async function getQueuedRequests() {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove a request from the queue
 */
async function removeFromQueue(id) {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update retry count for a request
 */
async function updateRetryCount(id) {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const request = getRequest.result;
      if (!request) {
        resolve(null);
        return;
      }

      request.retryCount = (request.retryCount || 0) + 1;
      const putRequest = store.put(request);
      putRequest.onsuccess = () => resolve(request);
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Process the offline queue - replay all pending requests
 */
async function processOfflineQueue() {
  console.log('[Service Worker] Processing offline queue...');

  try {
    const requests = await getQueuedRequests();
    console.log(`[Service Worker] Found ${requests.length} queued requests`);

    let success = 0;
    let failed = 0;

    for (const queuedRequest of requests) {
      // Skip if max retries exceeded
      if (queuedRequest.retryCount >= (queuedRequest.maxRetries || 3)) {
        console.warn('[Service Worker] Max retries exceeded for:', queuedRequest.id);
        await removeFromQueue(queuedRequest.id);
        failed++;
        continue;
      }

      try {
        const response = await fetch(queuedRequest.url, {
          method: queuedRequest.method,
          headers: {
            'Content-Type': 'application/json',
            ...(queuedRequest.headers || {}),
          },
          body: queuedRequest.body ? JSON.stringify(queuedRequest.body) : undefined,
          credentials: 'include',
        });

        if (response.ok) {
          await removeFromQueue(queuedRequest.id);
          success++;
          console.log('[Service Worker] Request succeeded:', queuedRequest.id);
        } else {
          await updateRetryCount(queuedRequest.id);
          failed++;
          console.warn('[Service Worker] Request failed:', response.status);
        }
      } catch (error) {
        await updateRetryCount(queuedRequest.id);
        failed++;
        console.error('[Service Worker] Request error:', error);
      }
    }

    console.log(`[Service Worker] Queue processed: ${success} success, ${failed} failed`);

    // Notify all clients about sync completion
    const allClients = await clients.matchAll({ type: 'window' });
    for (const client of allClients) {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        payload: { success, failed }
      });
    }

    return { success, failed };
  } catch (error) {
    console.error('[Service Worker] Failed to process queue:', error);
    throw error;
  }
}

// Background Sync Event Handler
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'offline-queue') {
    event.waitUntil(processOfflineQueue());
  }
});

console.log('[Service Worker] Loaded successfully (v3 with background sync)');
