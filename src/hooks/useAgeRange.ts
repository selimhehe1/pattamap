/**
 * useAgeRange - Age range filter with debouncing and validation
 *
 * Extracted from SearchFilters.tsx for better maintainability.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface UseAgeRangeReturn {
  localAgeMin: string;
  localAgeMax: string;
  ageError: string;
  ageMinRef: React.RefObject<HTMLInputElement>;
  ageMaxRef: React.RefObject<HTMLInputElement>;
  handleAgeMinChange: (value: string) => void;
  handleAgeMaxChange: (value: string) => void;
  resetAgeRange: () => void;
}

export const useAgeRange = (
  initialMin: string,
  initialMax: string,
  onFilterChange: (key: string, value: string) => void,
  debounceMs = 500
): UseAgeRangeReturn => {
  const { t } = useTranslation();

  const [localAgeMin, setLocalAgeMin] = useState(initialMin);
  const [localAgeMax, setLocalAgeMax] = useState(initialMax);
  const [ageError, setAgeError] = useState('');

  const ageMinRef = useRef<HTMLInputElement>(null);
  const ageMaxRef = useRef<HTMLInputElement>(null);
  const ageDebounceTimeoutRef = useRef<number | undefined>(undefined);
  const wasTypingAgeRef = useRef<{ min: boolean; max: boolean }>({ min: false, max: false });

  // Refs to track latest values without causing effect re-runs
  const localAgeMinRef = useRef<string>(localAgeMin);
  const localAgeMaxRef = useRef<string>(localAgeMax);

  // Sync with parent props
  useEffect(() => {
    setLocalAgeMin(initialMin);
    setLocalAgeMax(initialMax);
    localAgeMinRef.current = initialMin;
    localAgeMaxRef.current = initialMax;
  }, [initialMin, initialMax]);

  // Focus restoration after loading
  useEffect(() => {
    // Focus age min if user was typing
    if (wasTypingAgeRef.current.min && ageMinRef.current && document.activeElement !== ageMinRef.current) {
      const timeoutId = setTimeout(() => {
        if (ageMinRef.current && wasTypingAgeRef.current.min) {
          ageMinRef.current.focus();
        }
      }, 10);
      return () => clearTimeout(timeoutId);
    }
    // Focus age max if user was typing
    if (wasTypingAgeRef.current.max && ageMaxRef.current && document.activeElement !== ageMaxRef.current) {
      const timeoutId = setTimeout(() => {
        if (ageMaxRef.current && wasTypingAgeRef.current.max) {
          ageMaxRef.current.focus();
        }
      }, 10);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  const validateAge = useCallback((value: string): boolean => {
    if (value === '' || value === '0') return true;
    const age = parseInt(value, 10);
    if (isNaN(age) || age < 18 || age > 60) {
      setAgeError(t('search.ageValidation.outOfRange'));
      return false;
    }
    setAgeError('');
    return true;
  }, [t]);

  const handleAgeMinChange = useCallback((value: string) => {
    wasTypingAgeRef.current.min = true;
    setLocalAgeMin(value);
    localAgeMinRef.current = value;

    if (!validateAge(value)) return;

    if (ageDebounceTimeoutRef.current) {
      clearTimeout(ageDebounceTimeoutRef.current);
    }

    ageDebounceTimeoutRef.current = window.setTimeout(() => {
      onFilterChange('age_min', value);
      wasTypingAgeRef.current.min = false;
    }, debounceMs);
  }, [onFilterChange, debounceMs, validateAge]);

  const handleAgeMaxChange = useCallback((value: string) => {
    wasTypingAgeRef.current.max = true;
    setLocalAgeMax(value);
    localAgeMaxRef.current = value;

    if (!validateAge(value)) return;

    if (ageDebounceTimeoutRef.current) {
      clearTimeout(ageDebounceTimeoutRef.current);
    }

    ageDebounceTimeoutRef.current = window.setTimeout(() => {
      onFilterChange('age_max', value);
      wasTypingAgeRef.current.max = false;
    }, debounceMs);
  }, [onFilterChange, debounceMs, validateAge]);

  const resetAgeRange = useCallback(() => {
    setLocalAgeMin('');
    setLocalAgeMax('');
    setAgeError('');
    wasTypingAgeRef.current = { min: false, max: false };
  }, []);

  // Cleanup on unmount - flush pending values
  useEffect(() => {
    return () => {
      if (ageDebounceTimeoutRef.current) {
        clearTimeout(ageDebounceTimeoutRef.current);
        if (wasTypingAgeRef.current.min && localAgeMinRef.current !== '') {
          onFilterChange('age_min', localAgeMinRef.current);
        }
        if (wasTypingAgeRef.current.max && localAgeMaxRef.current !== '') {
          onFilterChange('age_max', localAgeMaxRef.current);
        }
      }
    };
  }, [onFilterChange]);

  return {
    localAgeMin,
    localAgeMax,
    ageError,
    ageMinRef: ageMinRef as React.RefObject<HTMLInputElement>,
    ageMaxRef: ageMaxRef as React.RefObject<HTMLInputElement>,
    handleAgeMinChange,
    handleAgeMaxChange,
    resetAgeRange
  };
};

export default useAgeRange;
