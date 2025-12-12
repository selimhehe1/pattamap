import { useCallback, useRef } from 'react';
import { Establishment } from '../../../../types';
import { logger } from '../../../../utils/logger';
import toast from '../../../../utils/toast';
import { getEventCoordinates } from '../utils/eventCoordinates';
import { triggerHaptic } from '../utils/hapticFeedback';
import { MapBar, GridPosition, DropAction } from './useMapState';

/**
 * Zone type for all supported map zones
 */
export type ZoneType =
  | 'soi6'
  | 'walkingstreet'
  | 'lkmetro'
  | 'beachroad'
  | 'soibuakhao'
  | 'boyztown'
  | 'jomtiencomplex'
  | 'soi78'
  | 'treetown';

/**
 * Grid configuration for a zone
 */
export interface GridConfig {
  maxRows: number;
  maxCols: number;
  startX: number;
  endX: number;
  startY: number;
  endY: number;
}

/**
 * Options for useDragDropHandler hook
 */
export interface UseDragDropHandlerOptions {
  /** Zone identifier */
  zone: ZoneType;

  /** All establishments data */
  establishments: Establishment[];

  /** Grid configuration for the zone */
  gridConfig: GridConfig;

  /** Reference to the container element */
  containerRef: React.RefObject<HTMLElement>;

  /** Whether mobile layout is active */
  isMobile: boolean;

  /** Whether edit mode is enabled */
  isEditMode: boolean;

  /** Whether an operation is in progress */
  isLoading: boolean;

  /** Timestamp until which operations are locked */
  operationLockUntil: number;

  /** Current drag state */
  draggedBar: MapBar | null;

  /** Whether currently dragging */
  isDragging: boolean;

  /** Current drag over position */
  dragOverPosition: GridPosition | null;

  /** Current drop action type */
  dropAction: DropAction;

  /** State setters */
  setDraggedBar: (bar: MapBar | null) => void;
  setIsDragging: (value: boolean) => void;
  setDragOverPosition: (position: GridPosition | null) => void;
  setDropAction: (action: DropAction) => void;
  setMousePosition: (position: { x: number; y: number } | null) => void;
  setIsLoading: (value: boolean) => void;
  setOperationLockUntil: (timestamp: number) => void;

  /** Optimistic position updates */
  applyOptimisticPosition: (id: string, position: GridPosition) => void;
  clearOptimisticPosition: (id: string) => void;

  /** Function to calculate grid position from coordinates */
  getGridFromCoordinates: (x: number, y: number) => GridPosition | null;

  /** Function to find bar at a grid position */
  findBarAtPosition: (row: number, col: number) => MapBar | null;
}

/**
 * Return type for useDragDropHandler hook
 */
export interface UseDragDropHandlerReturn {
  /** Handle drag start event */
  handleDragStart: (bar: MapBar, event: React.DragEvent) => void;

  /** Handle drag over event */
  handleDragOver: (event: React.DragEvent) => void;

  /** Handle drop event */
  handleDrop: (event: React.DragEvent) => Promise<void>;

  /** Handle drag end event */
  handleDragEnd: () => void;

  /** Handle touch start event */
  handleTouchStart: (bar: MapBar, event: React.TouchEvent) => void;

  /** Handle touch move event */
  handleTouchMove: (event: React.TouchEvent) => void;

  /** Handle touch end event */
  handleTouchEnd: (event: React.TouchEvent) => Promise<void>;

  /** Reset all drag state */
  resetDragState: () => void;
}

/**
 * useDragDropHandler - Centralized drag & drop logic for map components
 *
 * Handles:
 * - Mouse drag events (dragstart, dragover, drop, dragend)
 * - Touch events (touchstart, touchmove, touchend)
 * - Position validation
 * - API calls for move/swap operations
 * - Optimistic UI updates
 * - Error handling and user feedback
 *
 * Previously duplicated ~250 lines × 9 maps = 2,250+ lines of duplicate code.
 *
 * @example
 * const {
 *   handleDragStart,
 *   handleDragOver,
 *   handleDrop,
 *   handleDragEnd,
 *   handleTouchStart,
 *   handleTouchMove,
 *   handleTouchEnd
 * } = useDragDropHandler({
 *   zone: 'soi6',
 *   establishments,
 *   gridConfig,
 *   containerRef,
 *   // ... other options
 * });
 */
export const useDragDropHandler = (
  options: UseDragDropHandlerOptions
): UseDragDropHandlerReturn => {
  const {
    zone,
    establishments,
    gridConfig,
    containerRef,
    isMobile: _isMobile,
    isEditMode,
    isLoading,
    operationLockUntil,
    draggedBar,
    isDragging,
    dragOverPosition,
    dropAction,
    setDraggedBar,
    setIsDragging,
    setDragOverPosition,
    setDropAction,
    setMousePosition,
    setIsLoading,
    setOperationLockUntil,
    applyOptimisticPosition,
    clearOptimisticPosition,
    getGridFromCoordinates,
    findBarAtPosition,
  } = options;

  // Throttle timeout for position updates
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);

  /**
   * Reset all drag state to initial values
   */
  const resetDragState = useCallback(() => {
    setDraggedBar(null);
    setIsDragging(false);
    setDragOverPosition(null);
    setDropAction(null);
    setMousePosition(null);

    if (throttleTimeout.current) {
      clearTimeout(throttleTimeout.current);
      throttleTimeout.current = null;
    }
  }, [setDraggedBar, setIsDragging, setDragOverPosition, setDropAction, setMousePosition]);

  /**
   * Update mouse/touch position and calculate grid position
   */
  const updatePosition = useCallback(
    (event: React.DragEvent | React.TouchEvent) => {
      if (!containerRef.current) return;

      const coords = getEventCoordinates(event.nativeEvent);
      if (!coords) return;

      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = coords.clientX - rect.left;
      const relativeY = coords.clientY - rect.top;

      setMousePosition({ x: coords.clientX, y: coords.clientY });

      // Throttle grid calculations
      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current);
      }

      throttleTimeout.current = setTimeout(() => {
        const gridPos = getGridFromCoordinates(relativeX, relativeY);
        setDragOverPosition(gridPos);

        // Determine drop action type
        if (gridPos) {
          const conflictBar = findBarAtPosition(gridPos.row, gridPos.col);

          if (!conflictBar) {
            setDropAction('move');
          } else if (conflictBar.id === draggedBar?.id) {
            setDropAction('blocked');
          } else {
            setDropAction('swap');
          }
        } else {
          setDropAction('blocked');
        }
      }, 16); // 16ms throttle for 60fps
    },
    [
      containerRef,
      draggedBar,
      getGridFromCoordinates,
      findBarAtPosition,
      setMousePosition,
      setDragOverPosition,
      setDropAction,
    ]
  );

  /**
   * Perform move/swap API call
   */
  const performMoveOperation = useCallback(
    async (
      targetRow: number,
      targetCol: number,
      conflictBar: MapBar | null
    ): Promise<boolean> => {
      if (!draggedBar) return false;

      const draggedEstablishment = establishments.find(
        (est) => est.id === draggedBar.id
      );
      if (!draggedEstablishment) {
        logger.error('Move failed - establishment not found');
        return false;
      }

      const originalPosition = {
        row: draggedEstablishment.grid_row || 1,
        col: draggedEstablishment.grid_col || 1,
      };

      // Validate position bounds
      if (
        targetRow < 1 ||
        targetRow > gridConfig.maxRows ||
        targetCol < 1 ||
        targetCol > gridConfig.maxCols
      ) {
        toast.error(`Invalid position: Row ${targetRow}, Col ${targetCol} is out of bounds`);
        return false;
      }

      // Check if dropping on same position
      if (
        originalPosition.row === targetRow &&
        originalPosition.col === targetCol
      ) {
        logger.debug('Dropping on same position, cancelling');
        return false;
      }

      const isSwap = conflictBar !== null;
      const conflictEstablishment = isSwap
        ? establishments.find((est) => est.id === conflictBar.id)
        : null;

      // Apply optimistic positions
      applyOptimisticPosition(draggedEstablishment.id, {
        row: targetRow,
        col: targetCol,
      });

      if (isSwap && conflictEstablishment) {
        applyOptimisticPosition(conflictEstablishment.id, originalPosition);
      }

      try {
        const requestUrl = `${import.meta.env.VITE_API_URL}/api/grid-move-workaround`;
        const requestBody: Record<string, unknown> = {
          establishmentId: draggedEstablishment.id,
          grid_row: targetRow,
          grid_col: targetCol,
          zone,
        };

        if (isSwap && conflictEstablishment) {
          requestBody.swap_with_id = conflictEstablishment.id;
        }

        const response = await fetch(requestUrl, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          logger.debug('Position updated successfully on server');
          // Lock operations briefly to prevent race conditions
          setOperationLockUntil(Date.now() + 500);
          return true;
        }

        // Handle error
        const errorText = await response.text();
        logger.error(`${isSwap ? 'Swap' : 'Move'} failed`, {
          status: response.status,
          error: errorText,
        });

        // Clear failed optimistic positions
        clearOptimisticPosition(draggedEstablishment.id);
        if (isSwap && conflictEstablishment) {
          clearOptimisticPosition(conflictEstablishment.id);
        }

        // Show user-friendly error
        let userMessage = isSwap
          ? 'Failed to swap establishments'
          : 'Failed to move establishment';

        if (response.status === 400) {
          if (errorText.includes('Column position out of bounds')) {
            userMessage = `Invalid position: Column ${targetCol} is out of bounds`;
          } else if (errorText.includes('Database constraint')) {
            userMessage = 'Database constraint error - please try a different position';
          }
        } else if (response.status === 500) {
          userMessage = 'Server error - please try again';
        }

        toast.error(userMessage);
        return false;
      } catch (error) {
        logger.error('Move operation error', error);

        // Clear failed optimistic positions
        clearOptimisticPosition(draggedEstablishment.id);
        if (isSwap && conflictEstablishment) {
          clearOptimisticPosition(conflictEstablishment.id);
        }

        toast.error('Network error - please try again');
        return false;
      }
    },
    [
      draggedBar,
      establishments,
      zone,
      gridConfig,
      applyOptimisticPosition,
      clearOptimisticPosition,
      setOperationLockUntil,
    ]
  );

  /**
   * Handle drag start event
   */
  const handleDragStart = useCallback(
    (bar: MapBar, event: React.DragEvent) => {
      const now = Date.now();

      // Block if not in edit mode, loading, or operation locked
      if (!isEditMode || isLoading || now < operationLockUntil) {
        event.preventDefault();
        return;
      }

      setDraggedBar(bar);
      setIsDragging(true);

      // Set drag data
      event.dataTransfer.setData('application/json', JSON.stringify(bar));
      event.dataTransfer.effectAllowed = 'move';
    },
    [isEditMode, isLoading, operationLockUntil, setDraggedBar, setIsDragging]
  );

  /**
   * Handle drag over event
   */
  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      if (!isEditMode || !isDragging || !draggedBar || !containerRef.current) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';

      updatePosition(event);
    },
    [isEditMode, isDragging, draggedBar, containerRef, updatePosition]
  );

  /**
   * Handle drop event
   */
  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      if (
        !isEditMode ||
        !isDragging ||
        !dragOverPosition ||
        !draggedBar ||
        dropAction === 'blocked'
      ) {
        resetDragState();
        return;
      }

      event.preventDefault();

      const { row, col } = dragOverPosition;

      // Re-check conflict at drop time (prevents stale data issues)
      const conflictBar = findBarAtPosition(row, col);

      // Loading timeout safety (10 seconds)
      const loadingTimeout = setTimeout(() => {
        logger.warn('Loading timeout - resetting drag states');
        setIsLoading(false);
        resetDragState();
      }, 10000);

      try {
        setIsLoading(true);
        await performMoveOperation(row, col, conflictBar);
      } catch (error) {
        logger.error('Drop operation error', error);
      } finally {
        clearTimeout(loadingTimeout);
        setIsLoading(false);
        resetDragState();
      }
    },
    [
      isEditMode,
      isDragging,
      dragOverPosition,
      draggedBar,
      dropAction,
      findBarAtPosition,
      performMoveOperation,
      setIsLoading,
      resetDragState,
    ]
  );

  /**
   * Handle drag end event
   */
  const handleDragEnd = useCallback(() => {
    resetDragState();
  }, [resetDragState]);

  /**
   * Handle touch start event
   */
  const handleTouchStart = useCallback(
    (bar: MapBar, event: React.TouchEvent) => {
      const now = Date.now();

      // Block if not in edit mode, loading, or operation locked
      if (!isEditMode || isLoading || now < operationLockUntil) {
        event.preventDefault();
        return;
      }

      // Prevent scrolling during drag
      event.preventDefault();

      // Haptic feedback on drag start
      triggerHaptic('tap');

      setDraggedBar(bar);
      setIsDragging(true);
    },
    [isEditMode, isLoading, operationLockUntil, setDraggedBar, setIsDragging]
  );

  /**
   * Handle touch move event
   */
  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!isEditMode || !isDragging || !draggedBar || !containerRef.current) {
        return;
      }

      event.preventDefault(); // Prevent scrolling

      updatePosition(event);
    },
    [isEditMode, isDragging, draggedBar, containerRef, updatePosition]
  );

  /**
   * Handle touch end event
   */
  const handleTouchEnd = useCallback(
    async (event: React.TouchEvent) => {
      if (
        !isEditMode ||
        !isDragging ||
        !dragOverPosition ||
        !draggedBar ||
        dropAction === 'blocked'
      ) {
        resetDragState();
        return;
      }

      event.preventDefault();

      // Haptic feedback on drop
      triggerHaptic('success');

      const { row, col } = dragOverPosition;

      // Re-check conflict at drop time
      const conflictBar = findBarAtPosition(row, col);

      // Loading timeout safety (10 seconds)
      const loadingTimeout = setTimeout(() => {
        logger.warn('Loading timeout - resetting drag states');
        setIsLoading(false);
        resetDragState();
      }, 10000);

      try {
        setIsLoading(true);
        await performMoveOperation(row, col, conflictBar);
      } catch (error) {
        logger.error('Touch end operation error', error);
      } finally {
        clearTimeout(loadingTimeout);
        setIsLoading(false);
        resetDragState();
      }
    },
    [
      isEditMode,
      isDragging,
      dragOverPosition,
      draggedBar,
      dropAction,
      findBarAtPosition,
      performMoveOperation,
      setIsLoading,
      resetDragState,
    ]
  );

  return {
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetDragState,
  };
};

export default useDragDropHandler;
