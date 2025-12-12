/**
 * @vitest-environment jsdom
 */
/**
 * Tests for useXPHistory hook
 * Using Vitest syntax
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useXPHistory } from '../useXPHistory';

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

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_API_URL: 'http://localhost:8080'
    }
  }
});

describe('useXPHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch XP history on mount', async () => {
    const mockData = {
      period: 30,
      totalXPGained: 100,
      dataPoints: [{ date: '2025-12-10', xp: 50, sources: { check_in: 50 } }],
      breakdown: { check_in: 100 }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData)
    });

    const { result } = renderHook(() => useXPHistory(30));

    // Initially loading
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
        json: () => Promise.resolve({ period: 30, totalXPGained: 0, dataPoints: [], breakdown: {} })
      }), 100);
    }));

    const { result } = renderHook(() => useXPHistory());

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('should handle error state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    const { result } = renderHook(() => useXPHistory());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch XP history');
    expect(result.current.data).toBeNull();
  });

  it('should handle authentication error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401
    });

    const { result } = renderHook(() => useXPHistory());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Authentication required');
  });

  it('should format data correctly', async () => {
    const mockData = {
      period: 7,
      totalXPGained: 250,
      dataPoints: [
        { date: '2025-12-05', xp: 100, sources: { review: 100 } },
        { date: '2025-12-06', xp: 150, sources: { mission: 150 } }
      ],
      breakdown: { review: 100, mission: 150 }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData)
    });

    const { result } = renderHook(() => useXPHistory(7));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.period).toBe(7);
    expect(result.current.data?.totalXPGained).toBe(250);
    expect(result.current.data?.dataPoints).toHaveLength(2);
    expect(result.current.data?.breakdown).toEqual({ review: 100, mission: 150 });
  });
});
