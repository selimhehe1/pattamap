// PattaMap Service Worker
// Handles push notifications for PWA
// Version: 1.0.0

const CACHE_NAME = 'pattamap-v2'; // v2: Added offline fallback page
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
// BACKGROUND SYNC (Future Enhancement)
// ==========================================
// Handle background sync for offline actions
// Uncomment when implementing offline functionality

/*
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      // Sync logic here
    );
  }
});
*/

console.log('[Service Worker] Loaded successfully');
