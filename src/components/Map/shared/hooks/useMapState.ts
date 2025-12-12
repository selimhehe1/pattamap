import { useState, useCallback, useRef, useMemo } from 'react';
import { useMapEditMode, UseMapEditModeReturn } from './useMapEditMode';
import { useOptimisticPositions, UseOptimisticPositionsReturn } from './useOptimisticPositions';

/**
 * Types for map bars
 */
export interface MapBar {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  grid_row?: number;
  grid_col?: number;
  icon?: string;
  isVip?: boolean;
  [key: string]: unknown;
}

export interface GridPosition {
  row: number;
  col: number;
}

export type DropAction = 'move' | 'swap' | 'blocked' | null;

/**
 * Drag & drop state
 */
export interface DragDropState {
  draggedBar: MapBar | null;
  isDragging: boolean;
  dragOverPosition: GridPosition | null;
  dropAction: DropAction;
  mousePosition: { x: number; y: number } | null;
}

/**
 * UI state
 */
export interface UIState {
  hoveredBar: string | null;
  isLoading: boolean;
  isMobile: boolean;
}

/**
 * Keyboard navigation state
 */
export interface KeyboardNavigationState {
  focusedBarIndex: number;
  barRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
}

/**
 * Combined map state return type
 */
export interface UseMapStateReturn extends UseMapEditModeReturn, UseOptimisticPositionsReturn {
  // Drag & drop state
  dragState: DragDropState;
  setDraggedBar: (bar: MapBar | null) => void;
  setIsDragging: (value: boolean) => void;
  setDragOverPosition: (position: GridPosition | null) => void;
  setDropAction: (action: DropAction) => void;
  setMousePosition: (position: { x: number; y: number } | null) => void;
  resetDragState: () => void;

  // UI state
  uiState: UIState;
  setHoveredBar: (id: string | null) => void;
  setIsLoading: (value: boolean) => void;
  setIsMobile: (value: boolean) => void;

  // Keyboard navigation
  keyboardState: KeyboardNavigationState;
  setFocusedBarIndex: (index: number) => void;
  focusBar: (barId: string) => void;
}

/**
 * useMapState - Combined state management for map components
 *
 * Centralizes all state that was previously duplicated across 9 map components:
 * - Edit mode (from useMapEditMode)
 * - Optimistic positions (from useOptimisticPositions)
 * - Drag & drop state
 * - UI state (hover, loading, mobile)
 * - Keyboard navigation
 *
 * @example
 * const {
 *   isEditMode, toggleEditMode, canEdit,
 *   dragState, setDraggedBar, resetDragState,
 *   uiState, setHoveredBar,
 *   keyboardState, setFocusedBarIndex
 * } = useMapState();
 */
export const useMapState = (): UseMapStateReturn => {
  // Compose existing hooks
  const editMode = useMapEditMode();
  const optimisticPositions = useOptimisticPositions();

  // Drag & drop state
  const [draggedBar, setDraggedBar] = useState<MapBar | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverPosition, setDragOverPosition] = useState<GridPosition | null>(null);
  const [dropAction, setDropAction] = useState<DropAction>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  // UI state
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Keyboard navigation
  const [focusedBarIndex, setFocusedBarIndex] = useState(-1);
  const barRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Reset drag state (called after drop or cancel)
  const resetDragState = useCallback(() => {
    setDraggedBar(null);
    setIsDragging(false);
    setDragOverPosition(null);
    setDropAction(null);
    setMousePosition(null);
  }, []);

  // Focus a specific bar by ID
  const focusBar = useCallback((barId: string) => {
    const element = barRefs.current.get(barId);
    if (element) {
      element.focus();
    }
  }, []);

  // Memoized drag state object
  const dragState = useMemo<DragDropState>(() => ({
    draggedBar,
    isDragging,
    dragOverPosition,
    dropAction,
    mousePosition,
  }), [draggedBar, isDragging, dragOverPosition, dropAction, mousePosition]);

  // Memoized UI state object
  const uiState = useMemo<UIState>(() => ({
    hoveredBar,
    isLoading,
    isMobile,
  }), [hoveredBar, isLoading, isMobile]);

  // Memoized keyboard state object
  const keyboardState = useMemo<KeyboardNavigationState>(() => ({
    focusedBarIndex,
    barRefs,
  }), [focusedBarIndex]);

  return {
    // From useMapEditMode
    ...editMode,

    // From useOptimisticPositions
    ...optimisticPositions,

    // Drag & drop
    dragState,
    setDraggedBar,
    setIsDragging,
    setDragOverPosition,
    setDropAction,
    setMousePosition,
    resetDragState,

    // UI
    uiState,
    setHoveredBar,
    setIsLoading,
    setIsMobile,

    // Keyboard navigation
    keyboardState,
    setFocusedBarIndex,
    focusBar,
  };
};

export default useMapState;
