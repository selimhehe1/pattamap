/**
 * useSearchAutocomplete - Search name autocomplete with debouncing
 *
 * Extracted from SearchFilters.tsx for better maintainability.
 */

import { useState, useRef, useCallback } from 'react';
import { logger } from '../utils/logger';

const isDev = process.env.NODE_ENV === 'development';

interface AutocompleteState {
  suggestions: string[];
  visible: boolean;
  loading: boolean;
}

interface UseSearchAutocompleteReturn {
  localQuery: string;
  setLocalQuery: (value: string) => void;
  autocompleteState: AutocompleteState;
  setAutocompleteVisible: (visible: boolean) => void;
  handleInputChange: (value: string) => void;
  handleSuggestionClick: (suggestion: string, onQueryChange: (value: string) => void) => void;
  clearAutocomplete: () => void;
  wasTypingRef: React.MutableRefObject<boolean>;
}

export const useSearchAutocomplete = (
  initialQuery: string,
  debounceMs = 200,
  minChars = 2
): UseSearchAutocompleteReturn => {
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const [autocompleteState, setAutocompleteState] = useState<AutocompleteState>({
    suggestions: [],
    visible: false,
    loading: false
  });

  const debounceTimeoutRef = useRef<number | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);
  const wasTypingRef = useRef<boolean>(false);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < minChars) {
      setAutocompleteState({ suggestions: [], visible: false, loading: false });
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setAutocompleteState(prev => ({ ...prev, loading: true }));

    try {
      const apiBase = isDev ? 'http://localhost:3001' : '';
      const url = `${apiBase}/api/employees/suggestions/names?q=${encodeURIComponent(query)}`;
      const response = await fetch(
        url,
        { signal: abortControllerRef.current.signal }
      );

      if (response.ok) {
        const data = await response.json();
        setAutocompleteState({
          suggestions: data.suggestions || [],
          visible: (data.suggestions?.length || 0) > 0,
          loading: false
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        logger.error('Error fetching suggestions:', error);
        setAutocompleteState({ suggestions: [], visible: false, loading: false });
      }
    }
  }, [minChars]);

  const handleInputChange = useCallback((value: string) => {
    setLocalQuery(value);
    wasTypingRef.current = true;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    if (value.length < minChars) {
      setAutocompleteState({ suggestions: [], visible: false, loading: false });
      return;
    }

    debounceTimeoutRef.current = window.setTimeout(() => {
      fetchSuggestions(value);
    }, debounceMs);
  }, [fetchSuggestions, debounceMs, minChars]);

  const handleSuggestionClick = useCallback((
    suggestion: string,
    onQueryChange: (value: string) => void
  ) => {
    requestAnimationFrame(() => {
      setLocalQuery(suggestion);
      onQueryChange(suggestion);
      setAutocompleteState({ suggestions: [], visible: false, loading: false });
    });
  }, []);

  const setAutocompleteVisible = useCallback((visible: boolean) => {
    setAutocompleteState(prev => ({ ...prev, visible }));
  }, []);

  const clearAutocomplete = useCallback(() => {
    setLocalQuery('');
    wasTypingRef.current = false;
    setAutocompleteState({ suggestions: [], visible: false, loading: false });
  }, []);

  return {
    localQuery,
    setLocalQuery,
    autocompleteState,
    setAutocompleteVisible,
    handleInputChange,
    handleSuggestionClick,
    clearAutocomplete,
    wasTypingRef
  };
};

export default useSearchAutocomplete;
