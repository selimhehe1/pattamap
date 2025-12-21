/**
 * @vitest-environment jsdom
 */
/**
 * useOnline Hook Tests
 *
 * Tests for online/offline status detection:
 * - Initial state (3 tests)
 * - Online/offline events (3 tests)
 * - Visibility change (2 tests)
 * - checkConnection (3 tests)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnline } from '../useOnline';

// Store original values
const originalNavigator = global.navigator;
const originalDocument = global.document;

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useOnline Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    // Default to online
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('should return isOnline as true when navigator.onLine is true', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useOnline());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
    });

    it('should return isOnline as false when navigator.onLine is false', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useOnline());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isOffline).toBe(true);
    });

    it('should set lastOnlineAt when initially online', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useOnline());

      expect(result.current.lastOnlineAt).toBeInstanceOf(Date);
    });
  });

  describe('Online/offline events', () => {
    it('should update to online when online event fires', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useOnline());

      expect(result.current.isOnline).toBe(false);

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
      expect(result.current.lastOnlineAt).toBeInstanceOf(Date);
    });

    it('should update to offline when offline event fires', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useOnline());

      expect(result.current.isOnline).toBe(true);

      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isOffline).toBe(true);
    });

    it('should update lastOnlineAt when coming back online', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useOnline());

      const initialLastOnlineAt = result.current.lastOnlineAt;

      // Go offline
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      // Wait a bit and go back online
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.lastOnlineAt).toBeInstanceOf(Date);
      expect(result.current.lastOnlineAt!.getTime()).toBeGreaterThanOrEqual(initialLastOnlineAt!.getTime());
    });
  });

  describe('Visibility change', () => {
    it('should sync with navigator.onLine when tab becomes visible', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useOnline());

      // Simulate going offline while tab is hidden
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      // Simulate tab becoming visible
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(result.current.isOnline).toBe(false);
    });

    it('should update isOnline when visibility changes to visible and online', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useOnline());

      expect(result.current.isOnline).toBe(false);

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      // Simulate tab becoming visible
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(result.current.isOnline).toBe(true);
    });
  });

  describe('checkConnection', () => {
    it('should return true and update state when fetch succeeds', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useOnline());

      let connected;
      await act(async () => {
        connected = await result.current.checkConnection();
      });

      expect(connected).toBe(true);
      expect(result.current.isOnline).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/favicon.ico?_='),
        expect.objectContaining({ method: 'HEAD', cache: 'no-store' })
      );
    });

    it('should return false and update state when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useOnline());

      let connected;
      await act(async () => {
        connected = await result.current.checkConnection();
      });

      expect(connected).toBe(false);
      expect(result.current.isOnline).toBe(false);
    });

    it('should return false when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const { result } = renderHook(() => useOnline());

      let connected;
      await act(async () => {
        connected = await result.current.checkConnection();
      });

      expect(connected).toBe(false);
      expect(result.current.isOnline).toBe(false);
    });
  });
});
