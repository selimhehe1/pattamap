/**
 * Push Manager Tests
 * Tests for push notification subscription and management
 *
 * Tests:
 * - isPushSupported (4 tests)
 * - getNotificationPermission (2 tests)
 * - requestNotificationPermission (4 tests)
 * - registerServiceWorker (4 tests)
 * - getServiceWorkerRegistration (3 tests)
 * - subscribeToPush (9 tests)
 * - unsubscribeFromPush (4 tests)
 * - getCurrentSubscription (3 tests)
 * - isPushSubscribed (2 tests)
 * - getPushStatus (3 tests)
 * - showTestNotification (5 tests)
 *
 * Total: 43 tests
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  registerServiceWorker,
  getServiceWorkerRegistration,
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  isPushSubscribed,
  getPushStatus,
  showTestNotification
} from '../pushManager';

// ==========================================
// MOCKS
// ==========================================

// Mock global objects
global.fetch = vi.fn();

// Mock ServiceWorkerRegistration
class MockServiceWorkerRegistration {
  installing: ServiceWorker | null = null;
  waiting: ServiceWorker | null = null;
  active: ServiceWorker | null = null;
  scope = '/';
  updateViaCache: ServiceWorkerUpdateViaCache = 'imports';

  pushManager = {
    subscribe: vi.fn(),
    getSubscription: vi.fn()
  };

  showNotification = vi.fn();
  getNotifications = vi.fn();
  update = vi.fn();
  unregister = vi.fn();

  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
}

// Mock PushSubscription
class MockPushSubscription {
  endpoint = 'https://fcm.googleapis.com/fcm/send/test-endpoint';
  expirationTime = null;
  options = {
    applicationServerKey: new Uint8Array(),
    userVisibleOnly: true
  };

  getKey(name: PushEncryptionKeyName): ArrayBuffer | null {
    if (name === 'p256dh') {
      return new Uint8Array([1, 2, 3]).buffer;
    }
    if (name === 'auth') {
      return new Uint8Array([4, 5, 6]).buffer;
    }
    return null;
  }

  toJSON(): PushSubscriptionJSON {
    return {
      endpoint: this.endpoint,
      keys: {
        p256dh: 'AQID',
        auth: 'BAUG'
      }
    };
  }

  unsubscribe = vi.fn().mockResolvedValue(true);
}

// Mock ServiceWorker
class MockServiceWorker {
  scriptURL = '/service-worker.js';
  state: ServiceWorkerState = 'activated';
  onstatechange: ((this: ServiceWorker, ev: Event) => any) | null = null;
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null;

  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
  postMessage = vi.fn();
}

// Mock Notification API
class MockNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = vi.fn().mockResolvedValue('granted');

  constructor(public title: string, public options?: NotificationOptions) {}
}

// Setup global mocks
beforeAll(() => {
  // @ts-ignore
  global.Notification = MockNotification;

  // @ts-ignore
  global.navigator.serviceWorker = {
    register: vi.fn(),
    ready: Promise.resolve(new MockServiceWorkerRegistration()),
    controller: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    getRegistration: vi.fn(),
    getRegistrations: vi.fn()
  };

  // Mock atob - proper base64 decoding
  global.atob = (str: string) => {
    // Handle URL-safe base64
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    return Buffer.from(padded, 'base64').toString('binary');
  };

  // Mock btoa - proper base64 encoding
  global.btoa = (str: string) => {
    return Buffer.from(str, 'binary').toString('base64');
  };

  // Mock cookies
  Object.defineProperty(document, 'cookie', {
    writable: true,
    value: 'csrf-token=test-csrf-token'
  });
});

// Store original navigator.serviceWorker
let originalServiceWorker: ServiceWorkerContainer | undefined;

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  MockNotification.permission = 'default';
  MockNotification.requestPermission = vi.fn().mockResolvedValue('granted');
  (global.fetch as ReturnType<typeof vi.fn>).mockClear();

  // Save original and restore serviceWorker
  originalServiceWorker = navigator.serviceWorker;

  // Reset navigator.serviceWorker with fresh mock
  // @ts-ignore
  global.navigator.serviceWorker = {
    register: vi.fn(),
    ready: Promise.resolve(new MockServiceWorkerRegistration()),
    controller: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    getRegistration: vi.fn(),
    getRegistrations: vi.fn()
  };

  // @ts-ignore
  global.window.PushManager = {};
  // @ts-ignore
  global.window.Notification = MockNotification;
});

// Cleanup after each test
afterEach(() => {
  // Restore original serviceWorker if it existed
  if (originalServiceWorker) {
    // @ts-ignore
    global.navigator.serviceWorker = originalServiceWorker;
  }
});

// ==========================================
// TESTS
// ==========================================

describe('Push Manager', () => {
  describe('isPushSupported', () => {
    test('returns true when all APIs are available', () => {
      expect(isPushSupported()).toBe(true);
    });

    test('returns false when ServiceWorker is not available', () => {
      const saved = navigator.serviceWorker;
      // @ts-ignore
      delete global.navigator.serviceWorker;

      expect(isPushSupported()).toBe(false);

      // Restore immediately
      // @ts-ignore
      global.navigator.serviceWorker = saved;
    });

    test('returns false when PushManager is not available', () => {
      const saved = window.PushManager;
      // @ts-ignore
      delete global.window.PushManager;

      expect(isPushSupported()).toBe(false);

      // Restore immediately
      // @ts-ignore
      global.window.PushManager = saved;
    });

    test('returns false when Notification is not available', () => {
      const saved = window.Notification;
      // @ts-ignore
      delete global.window.Notification;

      expect(isPushSupported()).toBe(false);

      // Restore immediately
      // @ts-ignore
      global.window.Notification = saved;
    });
  });

  describe('getNotificationPermission', () => {
    test('returns current permission status', () => {
      MockNotification.permission = 'granted';
      expect(getNotificationPermission()).toBe('granted');

      MockNotification.permission = 'denied';
      expect(getNotificationPermission()).toBe('denied');

      MockNotification.permission = 'default';
      expect(getNotificationPermission()).toBe('default');
    });

    test('returns "denied" when Notification API is not available', () => {
      const saved = window.Notification;
      // @ts-ignore
      delete global.window.Notification;

      expect(getNotificationPermission()).toBe('denied');

      // Restore immediately
      // @ts-ignore
      global.window.Notification = saved;
    });
  });

  describe('requestNotificationPermission', () => {
    test('requests and returns permission when granted', async () => {
      MockNotification.requestPermission = vi.fn().mockResolvedValue('granted');

      const permission = await requestNotificationPermission();

      expect(permission).toBe('granted');
      expect(MockNotification.requestPermission).toHaveBeenCalled();
    });

    test('requests and returns permission when denied', async () => {
      MockNotification.requestPermission = vi.fn().mockResolvedValue('denied');

      const permission = await requestNotificationPermission();

      expect(permission).toBe('denied');
      expect(MockNotification.requestPermission).toHaveBeenCalled();
    });

    test('returns "denied" when Notification API is not available', async () => {
      const saved = window.Notification;
      // @ts-ignore
      delete global.window.Notification;

      const permission = await requestNotificationPermission();

      expect(permission).toBe('denied');

      // Restore immediately
      // @ts-ignore
      global.window.Notification = saved;
    });

    test('handles request failure gracefully', async () => {
      MockNotification.requestPermission = vi.fn().mockRejectedValue(new Error('Request failed'));

      const permission = await requestNotificationPermission();

      expect(permission).toBe('denied');
    });
  });

  describe('registerServiceWorker', () => {
    test('registers service worker successfully', async () => {
      const mockRegistration = new MockServiceWorkerRegistration();
      mockRegistration.active = new MockServiceWorker();

      (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockResolvedValue(mockRegistration);

      const registration = await registerServiceWorker();

      expect(registration).toBe(mockRegistration);
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/service-worker.js', { scope: '/' });
    });

    test('waits for installing service worker to activate', async () => {
      const mockWorker = new MockServiceWorker();
      mockWorker.state = 'installing';

      const mockRegistration = new MockServiceWorkerRegistration();
      mockRegistration.installing = mockWorker;

      (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockResolvedValue(mockRegistration);

      // Mock addEventListener to immediately call the callback
      mockWorker.addEventListener = vi.fn((event, callback) => {
        if (event === 'statechange') {
          mockWorker.state = 'activated';
          callback();
        }
      });

      const registration = await registerServiceWorker();

      expect(registration).toBe(mockRegistration);
      expect(mockWorker.addEventListener).toHaveBeenCalledWith('statechange', expect.any(Function));
    });

    test('returns null when service workers are not supported', async () => {
      const saved = navigator.serviceWorker;
      // @ts-ignore
      delete global.navigator.serviceWorker;

      const registration = await registerServiceWorker();

      expect(registration).toBeNull();

      // Restore immediately
      // @ts-ignore
      global.navigator.serviceWorker = saved;
    });

    test('returns null when registration fails', async () => {
      (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Registration failed'));

      const registration = await registerServiceWorker();

      expect(registration).toBeNull();
    });
  });

  describe('getServiceWorkerRegistration', () => {
    test('returns existing registration', async () => {
      const mockRegistration = new MockServiceWorkerRegistration();
      (navigator.serviceWorker.ready as any) = Promise.resolve(mockRegistration);

      const registration = await getServiceWorkerRegistration();

      expect(registration).toBe(mockRegistration);
    });

    test('returns null when service workers are not supported', async () => {
      const saved = navigator.serviceWorker;
      // @ts-ignore
      delete global.navigator.serviceWorker;

      const registration = await getServiceWorkerRegistration();

      expect(registration).toBeNull();

      // Restore immediately
      // @ts-ignore
      global.navigator.serviceWorker = saved;
    });

    test('returns null when getting registration fails', async () => {
      // Create a rejected promise that is properly handled
      const rejectedPromise = Promise.reject(new Error('Failed'));
      // Prevent unhandled rejection
      rejectedPromise.catch(() => {});
      (navigator.serviceWorker.ready as any) = rejectedPromise;

      const registration = await getServiceWorkerRegistration();

      expect(registration).toBeNull();
    });
  });

  describe('subscribeToPush', () => {
    test('subscribes to push notifications successfully', async () => {
      // Setup mocks
      MockNotification.permission = 'granted';
      const mockSubscription = new MockPushSubscription();
      const mockRegistration = new MockServiceWorkerRegistration();
      mockRegistration.pushManager.subscribe = vi.fn().mockResolvedValue(mockSubscription);

      (navigator.serviceWorker.ready as any) = Promise.resolve(mockRegistration);

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ publicKey: 'test-vapid-key' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const subscription = await subscribeToPush();

      expect(subscription).toBe(mockSubscription);
      expect(mockRegistration.pushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array)
      });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('requests permission if not granted', async () => {
      MockNotification.permission = 'default';
      MockNotification.requestPermission = vi.fn().mockResolvedValue('granted');

      const mockSubscription = new MockPushSubscription();
      const mockRegistration = new MockServiceWorkerRegistration();
      mockRegistration.pushManager.subscribe = vi.fn().mockResolvedValue(mockSubscription);

      (navigator.serviceWorker.ready as any) = Promise.resolve(mockRegistration);

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ publicKey: 'test-vapid-key' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      await subscribeToPush();

      expect(MockNotification.requestPermission).toHaveBeenCalled();
    });

    test('throws error when push is not supported', async () => {
      const saved = navigator.serviceWorker;
      // @ts-ignore
      delete global.navigator.serviceWorker;

      await expect(subscribeToPush()).rejects.toThrow('Push notifications not supported');

      // Restore immediately
      // @ts-ignore
      global.navigator.serviceWorker = saved;
    });

    test('throws error when permission is denied', async () => {
      MockNotification.permission = 'denied';

      await expect(subscribeToPush()).rejects.toThrow('Notification permission denied');
    });

    test('throws error when permission request is not granted', async () => {
      MockNotification.permission = 'default';
      MockNotification.requestPermission = vi.fn().mockResolvedValue('denied');

      await expect(subscribeToPush()).rejects.toThrow('Notification permission not granted');
    });

    test('throws error when VAPID key fetch fails', async () => {
      MockNotification.permission = 'granted';
      (navigator.serviceWorker.ready as any) = Promise.resolve(new MockServiceWorkerRegistration());

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to get VAPID key' })
      });

      await expect(subscribeToPush()).rejects.toThrow('Failed to get VAPID public key');
    });

    test('throws error when backend subscription save fails', async () => {
      MockNotification.permission = 'granted';
      const mockSubscription = new MockPushSubscription();
      const mockRegistration = new MockServiceWorkerRegistration();
      mockRegistration.pushManager.subscribe = vi.fn().mockResolvedValue(mockSubscription);

      (navigator.serviceWorker.ready as any) = Promise.resolve(mockRegistration);

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ publicKey: 'test-vapid-key' })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Backend save failed' })
        });

      await expect(subscribeToPush()).rejects.toThrow('Backend save failed');
    });

    test('registers new service worker if none exists', async () => {
      MockNotification.permission = 'granted';
      const mockSubscription = new MockPushSubscription();
      const mockRegistration = new MockServiceWorkerRegistration();
      mockRegistration.pushManager.subscribe = vi.fn().mockResolvedValue(mockSubscription);
      mockRegistration.active = new MockServiceWorker();

      // First ready call returns rejection (no registration)
      const rejectedPromise = Promise.reject(new Error('No registration'));
      rejectedPromise.catch(() => {}); // Prevent unhandled rejection
      (navigator.serviceWorker.ready as any) = rejectedPromise;

      // Register returns new registration
      (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockResolvedValue(mockRegistration);

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ publicKey: 'test-vapid-key' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const subscription = await subscribeToPush();

      expect(navigator.serviceWorker.register).toHaveBeenCalled();
      expect(subscription).toBe(mockSubscription);
    });

    test('includes CSRF token in subscription request', async () => {
      MockNotification.permission = 'granted';
      const mockSubscription = new MockPushSubscription();
      const mockRegistration = new MockServiceWorkerRegistration();
      mockRegistration.pushManager.subscribe = vi.fn().mockResolvedValue(mockSubscription);

      (navigator.serviceWorker.ready as any) = Promise.resolve(mockRegistration);

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ publicKey: 'test-vapid-key' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      await subscribeToPush();

      // Check second fetch call (subscription save) includes CSRF token
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/push/subscribe'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': 'test-csrf-token'
          })
        })
      );
    });
  });

  describe('unsubscribeFromPush', () => {
    test('unsubscribes successfully', async () => {
      const mockSubscription = new MockPushSubscription();
      const mockRegistration = new MockServiceWorkerRegistration();
      mockRegistration.pushManager.getSubscription = vi.fn().mockResolvedValue(mockSubscription);

      (navigator.serviceWorker.ready as any) = Promise.resolve(mockRegistration);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await unsubscribeFromPush();

      expect(result).toBe(true);
      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/push/unsubscribe'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ endpoint: mockSubscription.endpoint })
        })
      );
    });

    test('returns false when no subscription exists', async () => {
      const mockRegistration = new MockServiceWorkerRegistration();
      mockRegistration.pushManager.getSubscription = vi.fn().mockResolvedValue(null);

      (navigator.serviceWorker.ready as any) = Promise.resolve(mockRegistration);

      const result = await unsubscribeFromPush();

      expect(result).toBe(false);
    });

    test('throws error when no service worker registration', async () => {
      const rejectedPromise = Promise.reject(new Error('No registration'));
      rejectedPromise.catch(() => {}); // Prevent unhandled rejection
      (navigator.serviceWorker.ready as any) = rejectedPromise;

      await expect(unsubscribeFromPush()).rejects.toThrow();
    });

    test('throws error when backend removal fails', async () => {
      const mockSubscription = new MockPushSubscription();
      const mockRegistration = new MockServiceWorkerRegistration();
      mockRegistration.pushManager.getSubscription = vi.fn().mockResolvedValue(mockSubscription);

      (navigator.serviceWorker.ready as any) = Promise.resolve(mockRegistration);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Backend removal failed' })
      });

      await expect(unsubscribeFromPush()).rejects.toThrow('Backend removal failed');
    });
  });

  describe('getCurrentSubscription', () => {
    test('returns current subscription', async () => {
      const mockSubscription = new MockPushSubscription();
      const mockRegistration = new MockServiceWorkerRegistration();
      mockRegistration.pushManager.getSubscription = vi.fn().mockResolvedValue(mockSubscription);

      (navigator.serviceWorker.ready as any) = Promise.resolve(mockRegistration);

      const subscription = await getCurrentSubscription();

      expect(subscription).toBe(mockSubscription);
    });

    test('returns null when no subscription exists', async () => {
      const mockRegistration = new MockServiceWorkerRegistration();
      mockRegistration.pushManager.getSubscription = vi.fn().mockResolvedValue(null);

      (navigator.serviceWorker.ready as any) = Promise.resolve(mockRegistration);

      const subscription = await getCurrentSubscription();

      expect(subscription).toBeNull();
    });

    test('returns null when no registration exists', async () => {
      const rejectedPromise = Promise.reject(new Error('No registration'));
      rejectedPromise.catch(() => {}); // Prevent unhandled rejection
      (navigator.serviceWorker.ready as any) = rejectedPromise;

      const subscription = await getCurrentSubscription();

      expect(subscription).toBeNull();
    });
  });

  describe('isPushSubscribed', () => {
    test('returns true when subscribed', async () => {
      const mockSubscription = new MockPushSubscription();
      const mockRegistration = new MockServiceWorkerRegistration();
      mockRegistration.pushManager.getSubscription = vi.fn().mockResolvedValue(mockSubscription);

      (navigator.serviceWorker.ready as any) = Promise.resolve(mockRegistration);

      const isSubscribed = await isPushSubscribed();

      expect(isSubscribed).toBe(true);
    });

    test('returns false when not subscribed', async () => {
      const mockRegistration = new MockServiceWorkerRegistration();
      mockRegistration.pushManager.getSubscription = vi.fn().mockResolvedValue(null);

      (navigator.serviceWorker.ready as any) = Promise.resolve(mockRegistration);

      const isSubscribed = await isPushSubscribed();

      expect(isSubscribed).toBe(false);
    });
  });

  describe('getPushStatus', () => {
    test('returns push status from backend', async () => {
      const mockStatus = {
        configured: true,
        subscribed: true,
        subscriptionCount: 2
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus
      });

      const status = await getPushStatus();

      expect(status).toEqual(mockStatus);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/push/status'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );
    });

    test('returns default status on fetch failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false
      });

      const status = await getPushStatus();

      expect(status).toEqual({
        configured: false,
        subscribed: false,
        subscriptionCount: 0
      });
    });

    test('returns default status on network error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      const status = await getPushStatus();

      expect(status).toEqual({
        configured: false,
        subscribed: false,
        subscriptionCount: 0
      });
    });
  });

  describe('showTestNotification', () => {
    test('shows test notification successfully', async () => {
      MockNotification.permission = 'granted';
      const mockRegistration = new MockServiceWorkerRegistration();
      (navigator.serviceWorker.ready as any) = Promise.resolve(mockRegistration);

      await showTestNotification('Test Title', 'Test Body');

      expect(mockRegistration.showNotification).toHaveBeenCalledWith(
        'Test Title',
        expect.objectContaining({
          body: 'Test Body',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          tag: 'test-notification'
        })
      );
    });

    test('requests permission before showing notification', async () => {
      MockNotification.permission = 'default';
      MockNotification.requestPermission = vi.fn().mockResolvedValue('granted');
      const mockRegistration = new MockServiceWorkerRegistration();
      (navigator.serviceWorker.ready as any) = Promise.resolve(mockRegistration);

      await showTestNotification('Test Title', 'Test Body');

      expect(MockNotification.requestPermission).toHaveBeenCalled();
      expect(mockRegistration.showNotification).toHaveBeenCalled();
    });

    test('throws error when push is not supported', async () => {
      const saved = navigator.serviceWorker;
      // @ts-ignore
      delete global.navigator.serviceWorker;

      await expect(showTestNotification('Test', 'Test')).rejects.toThrow('Notifications not supported');

      // Restore immediately
      // @ts-ignore
      global.navigator.serviceWorker = saved;
    });

    test('throws error when permission is denied', async () => {
      MockNotification.permission = 'default';
      MockNotification.requestPermission = vi.fn().mockResolvedValue('denied');

      await expect(showTestNotification('Test', 'Test')).rejects.toThrow('Notification permission not granted');
    });

    test('throws error when no service worker registration', async () => {
      MockNotification.permission = 'granted';
      const rejectedPromise = Promise.reject(new Error('No registration'));
      rejectedPromise.catch(() => {}); // Prevent unhandled rejection
      (navigator.serviceWorker.ready as any) = rejectedPromise;

      await expect(showTestNotification('Test', 'Test')).rejects.toThrow('No service worker registration');
    });
  });
});
