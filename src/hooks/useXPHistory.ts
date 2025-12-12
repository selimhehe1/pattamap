import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';

export interface XPDataPoint {
  date: string;
  xp: number;
  sources: Record<string, number>;
}

export interface XPHistoryData {
  period: number;
  totalXPGained: number;
  dataPoints: XPDataPoint[];
  breakdown: Record<string, number>;
}

interface UseXPHistoryReturn {
  data: XPHistoryData | null;
  loading: boolean;
  error: string | null;
  refetch: (period?: number) => Promise<void>;
}

/**
 * Hook to fetch XP history data for the current user
 * @param initialPeriod - Initial period in days (7, 30, or 90)
 */
export const useXPHistory = (initialPeriod: 7 | 30 | 90 = 30): UseXPHistoryReturn => {
  const [data, setData] = useState<XPHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<number>(initialPeriod);

  const fetchHistory = useCallback(async (newPeriod?: number) => {
    const fetchPeriod = newPeriod ?? period;
    if (newPeriod !== undefined) {
      setPeriod(newPeriod);
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/gamification/xp-history?period=${fetchPeriod}`,
        {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        throw new Error('Failed to fetch XP history');
      }

      const result: XPHistoryData = await response.json();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Error fetching XP history:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    data,
    loading,
    error,
    refetch: fetchHistory
  };
};

export default useXPHistory;
