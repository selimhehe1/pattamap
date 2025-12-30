import { useState, useEffect } from 'react';

export interface PublicStats {
  establishments: number;
  employees: number;
  reviews: number;
  zones: number;
}

/**
 * Hook to fetch public platform statistics (no auth required)
 * Used for displaying stats on the login/register hero section
 */
export function usePublicStats() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/public/stats`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.status}`);
        }

        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching public stats:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        // Set fallback stats on error
        setStats({
          establishments: 0,
          employees: 0,
          reviews: 0,
          zones: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
}
