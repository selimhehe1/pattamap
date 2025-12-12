/**
 * Map Shared Hooks
 *
 * Centralized exports for all shared map hooks.
 * These hooks provide reusable logic across all zone map components.
 */

// Edit mode management
export { useMapEditMode } from './useMapEditMode';
export type { UseMapEditModeReturn } from './useMapEditMode';

// Optimistic UI positions
export { useOptimisticPositions } from './useOptimisticPositions';
export type { UseOptimisticPositionsReturn } from './useOptimisticPositions';

// Combined map state
export { useMapState } from './useMapState';
export type {
  UseMapStateReturn,
  MapBar,
  GridPosition,
  DropAction,
  DragDropState,
  UIState,
  KeyboardNavigationState,
} from './useMapState';

// Responsive behavior
export { useResponsiveMap, MAP_BREAKPOINTS } from './useResponsiveMap';
export type { UseResponsiveMapReturn, Orientation } from './useResponsiveMap';

// Drag & drop handling
export { useDragDropHandler } from './useDragDropHandler';
export type {
  UseDragDropHandlerOptions,
  UseDragDropHandlerReturn,
  ZoneType,
  GridConfig,
} from './useDragDropHandler';

// Bar click handling
export { useBarClickHandler } from './useBarClickHandler';
export type {
  UseBarClickHandlerOptions,
  UseBarClickHandlerReturn,
} from './useBarClickHandler';
