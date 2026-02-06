/** @vitest-environment jsdom */
/**
 * useOnline Hook Tests
 *
 * Tests for the online/offline detection hook:
 * - Default online state (1 test)
 * - isOffline inverse (1 test)
 * - Window online event (1 test)
 * - Window offline event (1 test)
 * - checkConnection success (1 test)
 * - checkConnection failure (1 test)
 * - lastOnlineAt tracking (1 test)
 *
 * Total: 7 tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnline } from '../useOnline';

describe('useOnline', () => {
  beforeEach(() => {
    // Ensure navigator.onLine defaults to true
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });
  });

  it('returns online by default when navigator.onLine is true', () => {
    const { result } = renderHook(() => useOnline());

    expect(result.current.isOnline).toBe(true);
  });

  it('returns isOffline as inverse of isOnline', () => {
    const { result } = renderHook(() => useOnline());

    expect(result.current.isOffline).toBe(!result.current.isOnline);
    expect(result.current.isOffline).toBe(false);
  });

  it('sets isOnline to true when window "online" event fires', () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: false,
    });

    const { result } = renderHook(() => useOnline());
    expect(result.current.isOnline).toBe(false);

    // Simulate going online
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it('sets isOnline to false when window "offline" event fires', () => {
    const { result } = renderHook(() => useOnline());
    expect(result.current.isOnline).toBe(true);

    // Simulate going offline
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  it('checkConnection returns true when fetch succeeds', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
    } as Response);

    const { result } = renderHook(() => useOnline());

    let connected: boolean;
    await act(async () => {
      connected = await result.current.checkConnection();
    });

    expect(connected!).toBe(true);
    expect(result.current.isOnline).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/favicon.ico'),
      expect.objectContaining({ method: 'HEAD', cache: 'no-store' })
    );
  });

  it('checkConnection returns false when fetch fails', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useOnline());

    let connected: boolean;
    await act(async () => {
      connected = await result.current.checkConnection();
    });

    expect(connected!).toBe(false);
    expect(result.current.isOnline).toBe(false);
  });

  it('sets lastOnlineAt when online event fires', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: false,
    });

    const { result } = renderHook(() => useOnline());

    // lastOnlineAt should be null when starting offline
    expect(result.current.lastOnlineAt).toBeNull();

    const beforeEvent = new Date();

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.lastOnlineAt).toBeInstanceOf(Date);
    expect(result.current.lastOnlineAt!.getTime()).toBeGreaterThanOrEqual(
      beforeEvent.getTime()
    );
  });
});
