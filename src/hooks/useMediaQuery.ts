/**
 * Custom hook for media query matching with memoization
 * Prevents recreating MediaQueryList on every render
 */

import { useState, useEffect, useMemo } from 'react';

export const useMediaQuery = (query: string): boolean => {
  const mediaQuery = useMemo(() => window.matchMedia(query), [query]);
  const [matches, setMatches] = useState(mediaQuery.matches);

  useEffect(() => {
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [mediaQuery]);

  return matches;
};

export const useIsPortrait = (): boolean => {
  return useMediaQuery('(orientation: portrait)');
};

export default useMediaQuery;
