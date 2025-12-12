import { useState, useCallback, useRef } from 'react';
import { logger } from '../../../../utils/logger';

/**
 * useOptimisticPositions - Shared hook for optimistic UI during drag & drop
 *
 * Prevents bars from "disappearing" during API calls by maintaining
 * temporary positions that override server state until confirmed.
 *
 * @example
 * const {
 *   optimisticPositions,
 *   applyOptimisticPosition,
 *   clearOptimisticPosition,
 *   clearAllOptimistic
 * } = useOptimisticPositions();
 */

export interface GridPosition {
  row: number;
  col: number;
}

export interface UseOptimisticPositionsReturn {
  /** Map of establishment IDs to their optimistic positions */
  optimisticPositions: Map<string, GridPosition>;

  /** Apply an optimistic position for an establishment */
  applyOptimisticPosition: (establishmentId: string, position: GridPosition) => void;

  /** Clear the optimistic position for an establishment (server confirmed) */
  clearOptimisticPosition: (establishmentId: string) => void;

  /** Clear all optimistic positions */
  clearAllOptimistic: () => void;

  /** Get the optimistic position for an establishment (or null) */
  getOptimisticPosition: (establishmentId: string) => GridPosition | null;

  /** Check if an establishment has an optimistic position */
  hasOptimisticPosition: (establishmentId: string) => boolean;

  /** Operation lock to prevent concurrent drag operations */
  operationLockUntil: number;

  /** Set the operation lock */
  setOperationLock: (durationMs: number) => void;

  /** Check if operations are currently locked */
  isOperationLocked: () => boolean;
}

export const useOptimisticPositions = (): UseOptimisticPositionsReturn => {
  const [optimisticPositions, setOptimisticPositions] = useState<Map<string, GridPosition>>(new Map());
  const [operationLockUntil, setOperationLockUntil] = useState<number>(0);
  const lockRef = useRef<number>(0);

  // Apply optimistic position
  const applyOptimisticPosition = useCallback((establishmentId: string, position: GridPosition) => {
    logger.debug('[OptimisticPositions] Applying optimistic position', {
      establishmentId,
      position
    });

    setOptimisticPositions(prev => {
      const next = new Map(prev);
      next.set(establishmentId, position);
      return next;
    });
  }, []);

  // Clear optimistic position (server confirmed)
  const clearOptimisticPosition = useCallback((establishmentId: string) => {
    logger.debug('[OptimisticPositions] Clearing optimistic position', { establishmentId });

    setOptimisticPositions(prev => {
      const next = new Map(prev);
      next.delete(establishmentId);
      return next;
    });
  }, []);

  // Clear all optimistic positions
  const clearAllOptimistic = useCallback(() => {
    logger.debug('[OptimisticPositions] Clearing all optimistic positions');
    setOptimisticPositions(new Map());
  }, []);

  // Get optimistic position
  const getOptimisticPosition = useCallback((establishmentId: string): GridPosition | null => {
    return optimisticPositions.get(establishmentId) || null;
  }, [optimisticPositions]);

  // Check if has optimistic position
  const hasOptimisticPosition = useCallback((establishmentId: string): boolean => {
    return optimisticPositions.has(establishmentId);
  }, [optimisticPositions]);

  // Set operation lock
  const setOperationLock = useCallback((durationMs: number) => {
    const lockUntil = Date.now() + durationMs;
    lockRef.current = lockUntil;
    setOperationLockUntil(lockUntil);

    logger.debug('[OptimisticPositions] Operation locked', {
      durationMs,
      lockUntil: new Date(lockUntil).toISOString()
    });
  }, []);

  // Check if locked
  const isOperationLocked = useCallback((): boolean => {
    return Date.now() < lockRef.current;
  }, []);

  return {
    optimisticPositions,
    applyOptimisticPosition,
    clearOptimisticPosition,
    clearAllOptimistic,
    getOptimisticPosition,
    hasOptimisticPosition,
    operationLockUntil,
    setOperationLock,
    isOperationLocked,
  };
};

export default useOptimisticPositions;
