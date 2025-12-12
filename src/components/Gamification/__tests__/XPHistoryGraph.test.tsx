/**
 * @vitest-environment jsdom
 */
/**
 * Tests for XPHistoryGraph component
 * Using Vitest syntax
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import XPHistoryGraph from '../XPHistoryGraph';

// Mock recharts (problematic in test environments)
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  LineChart: () => <div />,
  Line: () => <div />,
}));

// Mock useXPHistory hook
const mockRefetch = vi.fn();
const mockUseXPHistory = vi.fn();

vi.mock('../../../hooks/useXPHistory', () => ({
  useXPHistory: () => mockUseXPHistory(),
  default: () => mockUseXPHistory(),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | object) => {
      if (typeof fallback === 'string') return fallback;
      if (typeof fallback === 'object' && 'defaultValue' in fallback) return (fallback as any).defaultValue;
      return key.split('.').pop();
    },
  }),
}));

describe('XPHistoryGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading skeleton', () => {
    mockUseXPHistory.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<XPHistoryGraph />);

    expect(document.querySelector('.xp-history-loading')).not.toBeNull();
    expect(document.querySelector('.xp-history-skeleton')).not.toBeNull();
  });

  it('should render error state', () => {
    mockUseXPHistory.mockReturnValue({
      data: null,
      loading: false,
      error: 'Failed to fetch',
      refetch: mockRefetch,
    });

    render(<XPHistoryGraph />);

    expect(document.querySelector('.xp-history-error')).not.toBeNull();
    expect(document.querySelector('.retry-btn')).not.toBeNull();
  });

  it('should render chart with data', () => {
    const mockData = {
      period: 30,
      totalXPGained: 500,
      dataPoints: [
        { date: '2025-12-10', xp: 100, sources: { check_in: 100 } },
        { date: '2025-12-11', xp: 200, sources: { review: 200 } },
      ],
      breakdown: { check_in: 100, review: 200 },
    };

    mockUseXPHistory.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<XPHistoryGraph />);

    // Chart should be rendered
    expect(screen.getByTestId('responsive-container')).not.toBeNull();
    expect(screen.getByTestId('area-chart')).not.toBeNull();

    // Summary should show total XP
    expect(document.querySelector('.summary-stat')).not.toBeNull();
  });

  it('should switch periods on tab click', async () => {
    mockUseXPHistory.mockReturnValue({
      data: {
        period: 30,
        totalXPGained: 100,
        dataPoints: [{ date: '2025-12-10', xp: 100, sources: {} }],
        breakdown: {},
      },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<XPHistoryGraph />);

    // Find period tabs
    const tabs = document.querySelectorAll('.period-tab');
    expect(tabs.length).toBeGreaterThanOrEqual(3);

    // Click 7-day tab
    fireEvent.click(tabs[0]);

    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalledWith(7);
    });
  });

  it('should show breakdown bars when data available', () => {
    const mockData = {
      period: 30,
      totalXPGained: 300,
      dataPoints: [{ date: '2025-12-10', xp: 300, sources: { check_in: 100, review: 200 } }],
      breakdown: { check_in: 100, review: 200 },
    };

    mockUseXPHistory.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<XPHistoryGraph />);

    // Breakdown should be rendered
    expect(document.querySelector('.xp-breakdown')).not.toBeNull();
    expect(document.querySelector('.breakdown-bar')).not.toBeNull();
    expect(document.querySelectorAll('.breakdown-segment').length).toBeGreaterThanOrEqual(2);
  });

  it('should show empty state when no XP data', () => {
    const mockData = {
      period: 30,
      totalXPGained: 0,
      dataPoints: [
        { date: '2025-12-10', xp: 0, sources: {} },
        { date: '2025-12-11', xp: 0, sources: {} },
      ],
      breakdown: {},
    };

    mockUseXPHistory.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<XPHistoryGraph />);

    expect(document.querySelector('.xp-history-empty')).not.toBeNull();
  });
});
