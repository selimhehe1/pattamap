/**
 * @vitest-environment jsdom
 */
/**
 * Tests for Leaderboard component
 * Using Vitest syntax
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen as _screen, fireEvent as _fireEvent, waitFor as _waitFor } from '@testing-library/react';
import React from 'react';
import Leaderboard from '../Leaderboard';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock GamificationContext
vi.mock('../../../contexts/GamificationContext', () => ({
  useGamification: () => ({
    getLevelIcon: (level: number) => `🎖️${level}`,
    getLevelName: (level: number) => {
      const names: Record<number, string> = {
        1: 'Newbie', 2: 'Explorer', 3: 'Regular', 4: 'Insider', 5: 'VIP', 6: 'Legend', 7: 'Ambassador'
      };
      return names[level] || 'Unknown';
    },
  }),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | object) => {
      if (typeof fallback === 'string') return fallback;
      if (key.includes('.')) return key.split('.').pop();
      return key;
    },
  }),
}));

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_API_URL: 'http://localhost:8080'
    }
  }
});

describe('Leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading skeleton initially', () => {
    // Keep fetch pending
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<Leaderboard />);

    // Should show loading state
    expect(document.querySelector('.leaderboard-loading')).not.toBeNull();
  });

  it('should make initial fetch call', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<Leaderboard />);

    // Fetch should be called for global leaderboard
    expect(mockFetch).toHaveBeenCalled();
  });

  it('should render skeleton entries', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<Leaderboard />);

    expect(document.querySelectorAll('.leaderboard-entry-skeleton').length).toBeGreaterThanOrEqual(10);
  });
});
