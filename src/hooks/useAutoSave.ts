import { useEffect, useCallback, useState, useRef } from 'react';
import { logger } from '../utils/logger';

/**
 * Hook for automatic form data saving to localStorage
 *
 * Features:
 * - Auto-saves form data after user stops typing (debounced)
 * - Restores draft on component mount
 * - Clears draft after successful submission
 * - Provides draft status and last saved timestamp
 * - Prevents data loss on accidental navigation/refresh
 *
 * Usage:
 * ```tsx
 * const { isDraft, clearDraft, lastSaved, restoreDraft } = useAutoSave({
 *   key: 'employee-form-draft',
 *   data: formData,
 *   debounceMs: 2000,
 *   enabled: true
 * });
 * ```
 *
 * @param options - Configuration options
 * @returns Object with draft management functions and state
 */

export interface UseAutoSaveOptions<T = any> {
  /**
   * Unique key for localStorage (e.g., 'employee-form-draft')
   */
  key: string;

  /**
   * Form data to auto-save
   */
  data: T;

  /**
   * Debounce delay in milliseconds (default: 2000ms = 2s)
   */
  debounceMs?: number;

  /**
   * Enable/disable auto-save (default: true)
   */
  enabled?: boolean;

  /**
   * Callback when draft is saved
   */
  onSave?: (data: T) => void;

  /**
   * Callback when draft is restored
   */
  onRestore?: (data: T) => void;
}

export interface UseAutoSaveReturn<T = any> {
  /**
   * Whether a draft exists in localStorage
   */
  isDraft: boolean;

  /**
   * Clear the draft from localStorage
   */
  clearDraft: () => void;

  /**
   * Get the saved draft data
   */
  restoreDraft: () => T | null;

  /**
   * Timestamp of last save (ISO string)
   */
  lastSaved: string | null;

  /**
   * Whether auto-save is currently in progress
   */
  isSaving: boolean;
}

export function useAutoSave<T = any>({
  key,
  data,
  debounceMs = 2000,
  enabled = true,
  onSave,
  onRestore,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn<T> {
  const [isDraft, setIsDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Storage keys
  const storageKey = `autosave_${key}`;
  const timestampKey = `${storageKey}_timestamp`;

  /**
   * Save data to localStorage
   */
  const saveDraft = useCallback(
    (dataToSave: T) => {
      if (!enabled) return;

      try {
        setIsSaving(true);
        const timestamp = new Date().toISOString();

        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        localStorage.setItem(timestampKey, timestamp);

        setIsDraft(true);
        setLastSaved(timestamp);
        setIsSaving(false);

        logger.debug(`📝 Draft auto-saved: ${key}`, { timestamp });

        if (onSave) {
          onSave(dataToSave);
        }
      } catch (error) {
        logger.error(`Failed to save draft for ${key}:`, error);
        setIsSaving(false);
      }
    },
    [enabled, key, storageKey, timestampKey, onSave]
  );

  /**
   * Restore draft from localStorage
   */
  const restoreDraft = useCallback((): T | null => {
    try {
      const savedData = localStorage.getItem(storageKey);
      const savedTimestamp = localStorage.getItem(timestampKey);

      if (savedData) {
        const parsed = JSON.parse(savedData) as T;
        setIsDraft(true);
        setLastSaved(savedTimestamp);

        logger.debug(`🔄 Draft restored: ${key}`, {
          timestamp: savedTimestamp,
        });

        if (onRestore) {
          onRestore(parsed);
        }

        return parsed;
      }

      return null;
    } catch (error) {
      logger.error(`Failed to restore draft for ${key}:`, error);
      return null;
    }
  }, [key, storageKey, timestampKey, onRestore]);

  /**
   * Clear draft from localStorage
   */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(timestampKey);
      setIsDraft(false);
      setLastSaved(null);

      logger.debug(`🗑️ Draft cleared: ${key}`);
    } catch (error) {
      logger.error(`Failed to clear draft for ${key}:`, error);
    }
  }, [key, storageKey, timestampKey]);

  /**
   * Debounced auto-save effect
   */
  useEffect(() => {
    // Skip on initial mount to avoid overwriting existing draft
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!enabled || !data) return;

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      saveDraft(data);
    }, debounceMs);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, debounceMs, enabled, saveDraft]);

  /**
   * Check for existing draft on mount
   */
  useEffect(() => {
    const hasDraft = localStorage.getItem(storageKey) !== null;
    const timestamp = localStorage.getItem(timestampKey);

    setIsDraft(hasDraft);
    setLastSaved(timestamp);

    if (hasDraft) {
      logger.debug(`✅ Draft found for ${key}`, { timestamp });
    }
  }, [key, storageKey, timestampKey]);

  return {
    isDraft,
    clearDraft,
    restoreDraft,
    lastSaved,
    isSaving,
  };
}

export default useAutoSave;
