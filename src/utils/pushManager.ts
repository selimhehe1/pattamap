/**
 * Push Notification Manager
 * Handles PWA push notification subscriptions and permissions
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const IS_DEV = import.meta.env.DEV;

// ==========================================
// TYPES
// ==========================================

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushStatus {
  configured: boolean;
  subscribed: boolean;
  subscriptionCount: number;
}

// ==========================================
// UTILS
// ==========================================

/**
 * Convert base64 VAPID key to Uint8Array
 * Required for Web Push API subscription
 */
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

// ==========================================
// SERVICE WORKER
// ==========================================

/**
 * Register service worker
 * Returns service worker registration
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Push Manager] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });

    if (IS_DEV) console.log('[Push Manager] Service worker registered:', registration);

    // Wait for service worker to be active
    if (registration.installing) {
      await new Promise<void>((resolve) => {
        const worker = registration.installing!;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') {
            resolve();
          }
        });
      });
    }

    return registration;
  } catch (error) {
    console.error('[Push Manager] Service worker registration failed:', error);
    return null;
  }
};

/**
 * Get service worker registration
 * Returns existing registration or null
 */
export const getServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error('[Push Manager] Failed to get service worker registration:', error);
    return null;
  }
};

// ==========================================
// PUSH NOTIFICATIONS
// ==========================================

/**
 * Check if push notifications are supported
 */
export const isPushSupported = (): boolean => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

/**
 * Get current notification permission status
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};

/**
 * Request notification permission from user
 * Returns permission status: 'granted', 'denied', or 'default'
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('[Push Manager] Notifications not supported');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (IS_DEV) console.log('[Push Manager] Permission status:', permission);
    return permission;
  } catch (error) {
    console.error('[Push Manager] Permission request failed:', error);
    return 'denied';
  }
};

/**
 * Get VAPID public key from backend
 */
const getVapidPublicKey = async (): Promise<string | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/push/vapid-public-key`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Push Manager] Failed to get VAPID key:', error);
      return null;
    }

    const data = await response.json();
    return data.publicKey;
  } catch (error) {
    console.error('[Push Manager] VAPID key request failed:', error);
    return null;
  }
};

/**
 * Subscribe to push notifications
 * Returns subscription object or null if failed
 */
export const subscribeToPush = async (): Promise<PushSubscription | null> => {
  try {
    // 1. Check browser support
    if (!isPushSupported()) {
      throw new Error('Push notifications not supported');
    }

    // 2. Check permission
    const permission = getNotificationPermission();
    if (permission === 'denied') {
      throw new Error('Notification permission denied');
    }

    // 3. Request permission if needed
    if (permission !== 'granted') {
      const newPermission = await requestNotificationPermission();
      if (newPermission !== 'granted') {
        throw new Error('Notification permission not granted');
      }
    }

    // 4. Get service worker registration
    let registration = await getServiceWorkerRegistration();
    if (!registration) {
      registration = await registerServiceWorker();
      if (!registration) {
        throw new Error('Service worker registration failed');
      }
    }

    // 5. Get VAPID public key from backend
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      throw new Error('Failed to get VAPID public key');
    }

    // 6. Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true, // Always show notification to user
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource
    });

    if (IS_DEV) console.log('[Push Manager] Push subscription created:', subscription);

    // 7. Send subscription to backend
    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode(...Array.from(new Uint8Array(subscription.getKey('p256dh')!)))),
        auth: btoa(String.fromCharCode(...Array.from(new Uint8Array(subscription.getKey('auth')!))))
      }
    };

    const response = await fetch(`${API_BASE_URL}/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken()
      },
      credentials: 'include',
      body: JSON.stringify({ subscription: subscriptionData })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save subscription');
    }

    const data = await response.json();
    if (IS_DEV) console.log('[Push Manager] Subscription saved to backend:', data);

    return subscription;
  } catch (error) {
    console.error('[Push Manager] Subscribe failed:', error);
    throw error;
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async (): Promise<boolean> => {
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      throw new Error('No service worker registration found');
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.warn('[Push Manager] No active subscription found');
      return false;
    }

    // Unsubscribe from browser
    const unsubscribed = await subscription.unsubscribe();
    if (IS_DEV) console.log('[Push Manager] Browser unsubscribe result:', unsubscribed);

    // Remove from backend
    const response = await fetch(`${API_BASE_URL}/push/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken()
      },
      credentials: 'include',
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove subscription from backend');
    }

    if (IS_DEV) console.log('[Push Manager] Subscription removed from backend');
    return true;
  } catch (error) {
    console.error('[Push Manager] Unsubscribe failed:', error);
    throw error;
  }
};

/**
 * Get current push subscription
 */
export const getCurrentSubscription = async (): Promise<PushSubscription | null> => {
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      return null;
    }

    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('[Push Manager] Failed to get current subscription:', error);
    return null;
  }
};

/**
 * Check if user is currently subscribed to push
 */
export const isPushSubscribed = async (): Promise<boolean> => {
  const subscription = await getCurrentSubscription();
  return subscription !== null;
};

/**
 * Get push status from backend
 */
export const getPushStatus = async (): Promise<PushStatus> => {
  try {
    const response = await fetch(`${API_BASE_URL}/push/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to get push status');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Push Manager] Failed to get push status:', error);
    return {
      configured: false,
      subscribed: false,
      subscriptionCount: 0
    };
  }
};

// ==========================================
// HELPERS
// ==========================================

/**
 * Get CSRF token from cookie
 */
const getCsrfToken = (): string => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token') {
      return decodeURIComponent(value);
    }
  }
  return '';
};

/**
 * Show test notification (for testing only)
 */
export const showTestNotification = async (title: string, body: string): Promise<void> => {
  if (!isPushSupported()) {
    throw new Error('Notifications not supported');
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    throw new Error('No service worker registration');
  }

  await registration.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'test-notification'
  });
};
