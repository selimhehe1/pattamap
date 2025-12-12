/**
 * Utility functions for extracting coordinates from mouse and touch events
 * Used across all map components for drag & drop operations
 */

export interface EventCoordinates {
  clientX: number;
  clientY: number;
}

/**
 * Extract client coordinates from either a mouse drag event or a touch event
 * Returns null if coordinates cannot be extracted (e.g., no touches)
 */
export function getEventCoordinates(
  event: React.DragEvent | React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent | DragEvent
): EventCoordinates | null {
  // Handle TouchEvent
  if ('touches' in event && event.touches.length > 0) {
    return {
      clientX: event.touches[0].clientX,
      clientY: event.touches[0].clientY,
    };
  }

  // Handle changedTouches (for touchend events)
  if ('changedTouches' in event && event.changedTouches.length > 0) {
    return {
      clientX: event.changedTouches[0].clientX,
      clientY: event.changedTouches[0].clientY,
    };
  }

  // Handle MouseEvent/DragEvent
  if ('clientX' in event && 'clientY' in event) {
    return {
      clientX: event.clientX,
      clientY: event.clientY,
    };
  }

  return null;
}

/**
 * Calculate the position of coordinates relative to an element
 */
export function getRelativePosition(
  coordinates: EventCoordinates,
  element: HTMLElement
): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: coordinates.clientX - rect.left,
    y: coordinates.clientY - rect.top,
  };
}

/**
 * Check if coordinates are within an element's bounds
 */
export function isWithinBounds(
  coordinates: EventCoordinates,
  element: HTMLElement
): boolean {
  const rect = element.getBoundingClientRect();
  return (
    coordinates.clientX >= rect.left &&
    coordinates.clientX <= rect.right &&
    coordinates.clientY >= rect.top &&
    coordinates.clientY <= rect.bottom
  );
}
