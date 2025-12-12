import React, { useRef, useEffect, forwardRef, CSSProperties, ReactNode } from 'react';

/**
 * MapContainer - Shared accessible container for zone maps
 *
 * Provides:
 * - Consistent styling and layout
 * - Accessibility features (ARIA labels, keyboard navigation)
 * - Drag & drop container handlers
 * - Responsive sizing
 *
 * @example
 * <MapContainer
 *   zone="soi6"
 *   isEditMode={isEditMode}
 *   onDragOver={handleDragOver}
 *   onDrop={handleDrop}
 * >
 *   {children}
 * </MapContainer>
 */

export interface MapContainerProps {
  /** Zone identifier for accessibility */
  zone: string;

  /** Zone display name for screen readers */
  zoneName?: string;

  /** Whether edit mode is active */
  isEditMode: boolean;

  /** Children (map content, bars, etc.) */
  children: ReactNode;

  /** Container className */
  className?: string;

  /** Additional inline styles */
  style?: CSSProperties;

  /** Drag over handler */
  onDragOver?: (e: React.DragEvent) => void;

  /** Drop handler */
  onDrop?: (e: React.DragEvent) => void;

  /** Key down handler for keyboard navigation */
  onKeyDown?: (e: React.KeyboardEvent) => void;

  /** Click handler */
  onClick?: (e: React.MouseEvent) => void;

  /** Touch start handler */
  onTouchStart?: (e: React.TouchEvent) => void;

  /** Touch move handler */
  onTouchMove?: (e: React.TouchEvent) => void;

  /** Touch end handler */
  onTouchEnd?: (e: React.TouchEvent) => void;

  /** Ref forwarding for container size tracking */
  containerRef?: React.RefObject<HTMLDivElement>;
}

const MapContainer = forwardRef<HTMLDivElement, MapContainerProps>(({
  zone,
  zoneName,
  isEditMode,
  children,
  className = '',
  style,
  onDragOver,
  onDrop,
  onKeyDown,
  onClick,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}, ref) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = (ref as React.RefObject<HTMLDivElement>) || internalRef;

  // Prevent default drag behavior
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventDefault = (e: Event) => {
      if (isEditMode) {
        e.preventDefault();
      }
    };

    // Prevent scroll during drag on touch devices
    container.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      container.removeEventListener('touchmove', preventDefault);
    };
  }, [isEditMode, containerRef]);

  const displayName = zoneName || zone.charAt(0).toUpperCase() + zone.slice(1);

  return (
    <div
      ref={containerRef}
      className={`map-container map-container--${zone} ${isEditMode ? 'map-container--edit-mode' : ''} ${className}`}
      role="application"
      aria-label={`${displayName} map${isEditMode ? ' - Edit mode active' : ''}`}
      aria-describedby={`${zone}-map-description`}
      tabIndex={0}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        outline: 'none',
        ...style,
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onKeyDown={onKeyDown}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Screen reader description */}
      <div
        id={`${zone}-map-description`}
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Interactive map of {displayName}.
        Use arrow keys to navigate between establishments.
        Press Enter to select an establishment.
        {isEditMode && ' Edit mode is active. Drag establishments to reposition them.'}
      </div>

      {/* Edit mode indicator */}
      {isEditMode && (
        <div
          className="map-edit-mode-indicator"
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            padding: '4px 8px',
            background: 'rgba(255, 193, 7, 0.9)',
            color: '#000',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          Edit Mode Active
        </div>
      )}

      {children}
    </div>
  );
});

MapContainer.displayName = 'MapContainer';

export default MapContainer;
