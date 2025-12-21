/**
 * @vitest-environment jsdom
 */
/**
 * useRewards Hook Tests
 *
 * Tests for gamification rewards hook:
 * - useRewards functionality (7 tests)
 * - getLevelName helper (2 tests)
 * - getXPForNextLevel helper (1 test)
 * - getXPForCurrentLevel helper (1 test)
 *
 * Total: 11 tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act as _act } from '@testing-library/react';
import { useRewards, getLevelName, getXPForNextLevel, getXPForCurrentLevel } from '../useRewards';

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockLocalStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockLocalStorage[key]; }),
  clear: vi.fn(),
});

// We don't override document globally - jsdom provides it
// CSRF token will be undefined in tests, which is acceptable

describe('useRewards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockLocalStorage['token'] = 'mock-jwt-token';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete mockLocalStorage['token'];
  });

  it('should fetch rewards on mount', async () => {
    const mockData = {
      rewards: [
        { id: 'r1', name: 'Photo Upload', is_unlocked: true, claimed: false }
      ],
      currentLevel: 3,
      totalXp: 300
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData)
    });

    const { result } = renderHook(() => useRewards());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('should handle loading state', async () => {
    mockFetch.mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ rewards: [], currentLevel: 1, totalXp: 0 })
      }), 100);
    }));

    const { result } = renderHook(() => useRewards());

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('should handle error state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    const { result } = renderHook(() => useRewards());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('Failed to fetch rewards');
    expect(result.current.data).toBeNull();
  });

  it('should handle authentication error when no token', async () => {
    delete mockLocalStorage['token'];
    (localStorage.getItem as any).mockReturnValue(null);

    const { result } = renderHook(() => useRewards());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Not authenticated');
  });

  it('should have claimReward function', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        rewards: [],
        currentLevel: 1,
        totalXp: 0
      })
    });

    const { result } = renderHook(() => useRewards());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // claimReward should be a function
    expect(typeof result.current.claimReward).toBe('function');
  });

  it('should have refetch function', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        rewards: [],
        currentLevel: 1,
        totalXp: 0
      })
    });

    const { result } = renderHook(() => useRewards());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // refetch should be a function
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should return false when claimReward is called without authentication', async () => {
    delete mockLocalStorage['token'];
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const { result } = renderHook(() => useRewards());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Calling claimReward without auth should return false
    const claimResult = await result.current.claimReward('r1');
    expect(claimResult).toBe(false);
  });
});

// Test helper functions
describe('getLevelName', () => {
  it('should return correct level names', () => {
    expect(getLevelName(1)).toBe('Newbie');
    expect(getLevelName(2)).toBe('Explorer');
    expect(getLevelName(3)).toBe('Regular');
    expect(getLevelName(4)).toBe('Insider');
    expect(getLevelName(5)).toBe('VIP');
    expect(getLevelName(6)).toBe('Legend');
    expect(getLevelName(7)).toBe('Ambassador');
  });

  it('should return Unknown for invalid levels', () => {
    expect(getLevelName(0)).toBe('Unknown');
    expect(getLevelName(99)).toBe('Unknown');
  });
});

describe('getXPForNextLevel', () => {
  it('should return correct XP thresholds', () => {
    expect(getXPForNextLevel(1)).toBe(100);
    expect(getXPForNextLevel(2)).toBe(250);
    expect(getXPForNextLevel(3)).toBe(500);
    expect(getXPForNextLevel(4)).toBe(1000);
    expect(getXPForNextLevel(5)).toBe(2000);
    expect(getXPForNextLevel(6)).toBe(5000);
    expect(getXPForNextLevel(7)).toBe(Infinity);
  });
});

describe('getXPForCurrentLevel', () => {
  it('should return correct XP for current level', () => {
    expect(getXPForCurrentLevel(1)).toBe(0);
    expect(getXPForCurrentLevel(2)).toBe(100);
    expect(getXPForCurrentLevel(3)).toBe(250);
    expect(getXPForCurrentLevel(4)).toBe(500);
    expect(getXPForCurrentLevel(5)).toBe(1000);
    expect(getXPForCurrentLevel(6)).toBe(2000);
    expect(getXPForCurrentLevel(7)).toBe(5000);
  });
});
