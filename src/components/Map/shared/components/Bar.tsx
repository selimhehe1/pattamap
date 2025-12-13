import React, { forwardRef, useMemo, memo } from 'react';
import { Establishment } from '../../../../types';
import { getBarStyle, BarType, DEFAULT_BAR_TYPE } from '../../../../utils/mapConstants';
import LazyImage from '../../../Common/LazyImage';
import { MapBar, DropAction } from '../hooks/useMapState';

/**
 * Props for the Bar component
 */
export interface BarProps {
  /** Bar data */
  bar: MapBar;

  /** Full establishment data (optional, for additional info) */
  establishment?: Establishment;

  /** Whether this bar is currently selected */
  isSelected?: boolean;

  /** Whether this bar is currently hovered */
  isHovered?: boolean;

  /** Whether this bar is being dragged */
  isBeingDragged?: boolean;

  /** Whether this bar is a drop target */
  isDropTarget?: boolean;

  /** Current drop action for visual feedback */
  dropAction?: DropAction;

  /** Whether edit mode is active */
  isEditMode?: boolean;

  /** Whether the user can edit (admin/moderator) */
  canEdit?: boolean;

  /** Whether an operation is loading */
  isLoading?: boolean;

  /** Whether this bar is part of a duplicate position */
  isDuplicate?: boolean;

  /** Tab index for keyboard navigation */
  tabIndex?: number;

  /** Click handler */
  onClick?: () => void;

  /** Key down handler */
  onKeyDown?: (event: React.KeyboardEvent) => void;

  /** Mouse enter handler */
  onMouseEnter?: () => void;

  /** Mouse leave handler */
  onMouseLeave?: () => void;

  /** Drag start handler */
  onDragStart?: (event: React.DragEvent) => void;

  /** Drag end handler */
  onDragEnd?: (event: React.DragEvent) => void;

  /** Touch start handler */
  onTouchStart?: (event: React.TouchEvent) => void;

  /** Touch move handler */
  onTouchMove?: (event: React.TouchEvent) => void;

  /** Touch end handler */
  onTouchEnd?: (event: React.TouchEvent) => void;

  /** Additional CSS class */
  className?: string;

  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * Get establishment icon with fallback
 */
function getEstablishmentIcon(
  barId: string,
  establishment?: Establishment,
  fallbackIcon?: string
): string {
  if (establishment?.logo_url) {
    return establishment.logo_url;
  }
  return fallbackIcon || '🏢';
}

/**
 * Bar - Individual establishment marker on the map
 *
 * This component handles:
 * - Visual rendering with proper styling based on type
 * - Drag & drop visual feedback
 * - VIP and badge indicators
 * - Keyboard accessibility
 * - Selection and hover states
 *
 * Previously ~150 lines duplicated in each bar rendering loop × 9 maps.
 *
 * @example
 * <Bar
 *   bar={bar}
 *   establishment={establishment}
 *   isSelected={selectedId === bar.id}
 *   isHovered={hoveredId === bar.id}
 *   onClick={() => handleBarClick(bar)}
 *   onDragStart={(e) => handleDragStart(bar, e)}
 * />
 */
export const Bar = memo(forwardRef<HTMLDivElement, BarProps>(
  (
    {
      bar,
      establishment,
      isSelected = false,
      isHovered = false,
      isBeingDragged = false,
      isDropTarget = false,
      dropAction,
      isEditMode = false,
      canEdit = false,
      isLoading = false,
      isDuplicate = false,
      tabIndex = 0,
      onClick,
      onKeyDown,
      onMouseEnter,
      onMouseLeave,
      onDragStart,
      onDragEnd,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      className = '',
      style: customStyle,
    },
    ref
  ) => {
    // Get type style
    const typeStyle = getBarStyle((bar.type as BarType) || DEFAULT_BAR_TYPE);

    // Check VIP status
    const isVip = bar.isVip || establishment?.is_vip || false;

    // Get icon
    const icon = getEstablishmentIcon(bar.id, establishment, bar.icon);
    const hasLogoUrl = establishment?.logo_url;

    // Calculate bar width (from position data or default)
    const barWidth = (bar as { barWidth?: number }).barWidth || 40;

    // Build CSS classes
    const cssClasses = useMemo(() => {
      const classes = ['map-bar'];

      if (isSelected) classes.push('map-bar--selected');
      if (isHovered) classes.push('map-bar--hovered');
      if (isBeingDragged) classes.push('map-bar--dragging');
      if (isDropTarget) {
        classes.push('map-bar--drop-target');
        if (dropAction === 'swap') classes.push('map-bar--swap');
        if (dropAction === 'blocked') classes.push('map-bar--blocked');
      }
      if (isEditMode) classes.push('map-bar--edit-mode');
      if (isVip) classes.push('map-bar--vip');
      if (isDuplicate) classes.push('map-bar--duplicate');
      if (isLoading) classes.push('map-bar--loading');
      if (className) classes.push(className);

      return classes.join(' ');
    }, [
      isSelected,
      isHovered,
      isBeingDragged,
      isDropTarget,
      dropAction,
      isEditMode,
      isVip,
      isDuplicate,
      isLoading,
      className,
    ]);

    // Build inline styles
    const inlineStyle = useMemo<React.CSSProperties>(() => {
      return {
        position: 'absolute',
        left: bar.position.x,
        top: bar.position.y,
        width: barWidth,
        height: barWidth,
        backgroundColor: typeStyle.color,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isEditMode && canEdit ? 'grab' : 'pointer',
        transform: `translate(-50%, -50%) ${isBeingDragged ? 'scale(1.1)' : 'scale(1)'}`,
        transition: isBeingDragged
          ? 'none'
          : 'transform 0.15s ease, box-shadow 0.15s ease',
        boxShadow: isSelected
          ? '0 0 0 3px #fff, 0 0 0 5px #3b82f6'
          : isHovered
          ? '0 4px 12px rgba(0,0,0,0.3)'
          : '0 2px 4px rgba(0,0,0,0.2)',
        opacity: isBeingDragged ? 0.7 : 1,
        zIndex: isBeingDragged ? 1000 : isSelected ? 100 : isHovered ? 50 : 1,
        ...customStyle,
      };
    }, [
      bar.position,
      barWidth,
      typeStyle.color,
      isEditMode,
      canEdit,
      isBeingDragged,
      isSelected,
      isHovered,
      customStyle,
    ]);

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={tabIndex}
        className={cssClasses}
        style={inlineStyle}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        draggable={isEditMode && canEdit && !isLoading}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        aria-label={`${bar.name}${isVip ? ' (VIP)' : ''}`}
        aria-pressed={isSelected}
        data-bar-id={bar.id}
        data-bar-type={bar.type}
        data-grid-row={bar.grid_row}
        data-grid-col={bar.grid_col}
      >
        {/* Icon/Logo */}
        {hasLogoUrl ? (
          <LazyImage
            src={icon}
            alt={bar.name}
            className="map-bar__logo"
            style={{
              width: '80%',
              height: '80%',
              objectFit: 'cover',
              borderRadius: '4px',
            }}
          />
        ) : (
          <span
            className="map-bar__icon"
            style={{ fontSize: barWidth * 0.5 }}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        {/* VIP Crown */}
        {isVip && (
          <span
            className="map-bar__vip-badge"
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              fontSize: 12,
              backgroundColor: '#fbbf24',
              borderRadius: '50%',
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="VIP"
          >
            👑
          </span>
        )}

        {/* Duplicate Warning */}
        {isDuplicate && (
          <span
            className="map-bar__duplicate-badge"
            style={{
              position: 'absolute',
              bottom: -6,
              left: -6,
              fontSize: 10,
              backgroundColor: '#ef4444',
              color: 'white',
              borderRadius: '50%',
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
            }}
            title="Duplicate position detected"
          >
            !
          </span>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div
            className="map-bar__loading"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="map-bar__spinner" />
          </div>
        )}
      </div>
    );
  }
));

Bar.displayName = 'Bar';

export default Bar;
