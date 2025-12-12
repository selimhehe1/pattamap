/**
 * CustomLKMetroMap - REFACTORED VERSION
 *
 * Reduced from ~1537 lines to ~650 lines by using shared hooks.
 * Zone-specific logic: L-shaped grid (4 rows), segment-based positioning, masked columns.
 */
import React, { useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Establishment, CustomBar } from '../../types';
import { getZoneConfig } from '../../utils/zoneConfig';
import { MAP_CONFIG } from '../../utils/constants';
import { useContainerSize } from '../../hooks/useContainerSize';
import toast from '../../utils/toast';
import GenericRoadCanvas from './GenericRoadCanvas';
import DragDropIndicator from './DragDropIndicator';
import ScreenReaderEstablishmentList from './ScreenReaderEstablishmentList';
import LazyImage from '../Common/LazyImage';
import { generateEstablishmentUrl } from '../../utils/slugify';
// Shared hooks
import { useMapEditMode } from './shared/hooks/useMapEditMode';
import { useOptimisticPositions } from './shared/hooks/useOptimisticPositions';
import { useResponsiveMap } from './shared/hooks/useResponsiveMap';
import { triggerHaptic, getEventCoordinates } from './shared/utils';
import '../../styles/components/map-components.css';
import '../../styles/components/maps.css';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
export interface Bar {
  id: string;
  name: string;
  type: 'gogo' | 'beer' | 'pub' | 'massage' | 'nightclub';
  position: { x: number; y: number };
  color: string;
  icon: string;
  grid_row?: number;
  grid_col?: number;
}

interface CustomLKMetroMapProps {
  establishments: Establishment[];
  onEstablishmentClick?: (establishment: Establishment) => void;
  selectedEstablishment?: string;
  onBarClick?: (bar: CustomBar) => void;
  onEstablishmentUpdate?: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// ZONE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const ZONE = 'lkmetro';
const _ZONE_CONFIG = getZoneConfig(ZONE);

const TYPE_STYLES = {
  gogo: { color: '#C19A6B', icon: '💃' },
  beer: { color: '#FFD700', icon: '🍺' },
  pub: { color: '#00E5FF', icon: '🍸' },
  massage: { color: '#06FFA5', icon: '💆' },
  nightclub: { color: '#7B2CBF', icon: '🎵' }
};

const CATEGORY_TO_TYPE_MAP: { [key: string | number]: 'gogo' | 'beer' | 'pub' | 'massage' | 'nightclub' } = {
  'cat-001': 'beer', 'cat-002': 'gogo', 'cat-003': 'massage', 'cat-004': 'nightclub',
  1: 'beer', 2: 'gogo', 3: 'massage', 4: 'nightclub'
};

// ═══════════════════════════════════════════════════════════════════════════
// LK METRO GRID CONFIGURATION (L-shaped)
// ═══════════════════════════════════════════════════════════════════════════
const getSegmentType = (row: number): 'horizontal' | 'vertical' => row <= 2 ? 'horizontal' : 'vertical';

const isValidColumn = (row: number, col: number): boolean => {
  if (row === 2) return col >= 1 && col <= 8; // Row 2: mask col 9
  if (row === 3) return col >= 3 && col <= 9; // Row 3: mask cols 1-2
  return col >= 1 && col <= 9; // Rows 1 and 4: all columns
};

const calculateResponsivePosition = (row: number, col: number, isMobile: boolean, containerElement?: HTMLElement) => {
  const segment = getSegmentType(row);
  const maxColsPerSegment = 9;

  if (isMobile) {
    const totalWidth = 350;
    const usableWidth = totalWidth * 0.9;
    const barWidth = Math.min(40, usableWidth / maxColsPerSegment - 4);
    const spacing = (usableWidth - (maxColsPerSegment * barWidth)) / (maxColsPerSegment + 1);
    const x = spacing + (col - 1) * (barWidth + spacing);
    const y = 60 + (row - 1) * 140;
    return { x, y, barWidth };
  }

  const containerWidth = containerElement?.getBoundingClientRect().width || (window.innerWidth > 1200 ? 1200 : window.innerWidth - 40);
  const containerHeight = containerElement?.getBoundingClientRect().height || MAP_CONFIG.DEFAULT_HEIGHT;

  if (segment === 'horizontal') {
    const segmentStartX = containerWidth * 0.25;
    const segmentEndX = containerWidth * 0.55;
    const segmentWidth = segmentEndX - segmentStartX;
    const idealBarWidth = Math.min(45, Math.max(25, segmentWidth / maxColsPerSegment - 8));
    const totalBarsWidth = maxColsPerSegment * idealBarWidth;
    const spacing = (segmentWidth - totalBarsWidth) / (maxColsPerSegment + 1);
    const x = segmentStartX + spacing + (col - 1) * (idealBarWidth + spacing);
    const centerY = containerHeight * 0.30;
    const y = row === 1 ? centerY - 60 : centerY + 60;
    return { x, y, barWidth: idealBarWidth };
  } else {
    const segmentCenterX = containerWidth * 0.55;
    const segmentStartY = containerHeight * 0.30;
    const segmentEndY = containerHeight * 0.90;
    const segmentHeight = segmentEndY - segmentStartY;
    const idealBarWidth = Math.min(45, Math.max(25, segmentHeight / maxColsPerSegment - 8));
    const spacing = (segmentHeight - (maxColsPerSegment * idealBarWidth)) / (maxColsPerSegment + 1);
    const y = segmentStartY + spacing + (col - 1) * (idealBarWidth + spacing);
    const x = row === 3 ? segmentCenterX - 60 : segmentCenterX + 60;
    return { x, y, barWidth: idealBarWidth };
  }
};

const establishmentsToVisualBars = (establishments: Establishment[], isMobile: boolean, containerElement?: HTMLElement): Bar[] => {
  return establishments
    .filter(est => est.zone === ZONE && est.grid_row && est.grid_row >= 1 && est.grid_row <= 4 && est.grid_col && isValidColumn(est.grid_row, est.grid_col))
    .map(est => {
      const barType = CATEGORY_TO_TYPE_MAP[est.category_id] || 'beer';
      const style = TYPE_STYLES[barType];
      const { x, y } = calculateResponsivePosition(est.grid_row || 1, est.grid_col || 1, isMobile, containerElement);
      return { id: est.id, name: est.name, type: barType, position: { x, y }, color: style.color, icon: style.icon,
        grid_row: est.grid_row || 1, grid_col: est.grid_col || 1 };
    });
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const CustomLKMetroMap: React.FC<CustomLKMetroMapProps> = ({
  establishments,
  onEstablishmentClick,
  selectedEstablishment,
  onBarClick,
  onEstablishmentUpdate: _onEstablishmentUpdate
}) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // SHARED HOOKS
  const { isEditMode, toggleEditMode, canEdit, isAdmin } = useMapEditMode();
  const { isMobile } = useResponsiveMap();
  const {
    optimisticPositions,
    applyOptimisticPosition,
    clearOptimisticPosition,
    isOperationLocked,
    setOperationLock,
  } = useOptimisticPositions();

  const containerDimensions = useContainerSize(containerRef, 300);

  // LOCAL STATE
  const [hoveredBar, setHoveredBar] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [focusedBarIndex, setFocusedBarIndex] = React.useState(-1);
  const barRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Drag state
  const [draggedBar, setDraggedBar] = React.useState<Bar | null>(null);
  const [dragOverPosition, setDragOverPosition] = React.useState<{ row: number; col: number } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dropAction, setDropAction] = React.useState<'move' | 'swap' | 'blocked' | null>(null);
  const [mousePosition, setMousePosition] = React.useState<{ x: number; y: number } | null>(null);
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);

  const resetDragState = useCallback(() => {
    setDraggedBar(null);
    setDragOverPosition(null);
    setIsDragging(false);
    setDropAction(null);
    setMousePosition(null);
  }, []);

  // COMPUTED VALUES
  const allBars = useMemo(() => {
    const bars = establishmentsToVisualBars(establishments, isMobile, containerRef.current || undefined);
    if (optimisticPositions.size > 0) {
      const updatedBars = bars.map(bar => {
        const optimisticPos = optimisticPositions.get(bar.id);
        if (optimisticPos) {
          const { x, y } = calculateResponsivePosition(optimisticPos.row, optimisticPos.col, isMobile, containerRef.current || undefined);
          return { ...bar, position: { x, y }, grid_row: optimisticPos.row, grid_col: optimisticPos.col };
        }
        return bar;
      });
      const existingBarIds = new Set(bars.map(b => b.id));
      const missingBars: Bar[] = [];
      optimisticPositions.forEach((pos, establishmentId) => {
        if (!existingBarIds.has(establishmentId)) {
          const establishment = establishments.find(est => est.id === establishmentId);
          if (establishment) {
            const barType = CATEGORY_TO_TYPE_MAP[establishment.category_id] || 'beer';
            const style = TYPE_STYLES[barType];
            const { x, y } = calculateResponsivePosition(pos.row, pos.col, isMobile, containerRef.current || undefined);
            missingBars.push({ id: establishment.id, name: establishment.name, type: barType, position: { x, y },
              color: style.color, icon: style.icon, grid_row: pos.row, grid_col: pos.col });
          }
        }
      });
      return [...updatedBars, ...missingBars];
    }
    return bars;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- containerDimensions triggers recalculation
  }, [establishments, isMobile, containerDimensions, optimisticPositions]);

  const currentBarSize = useMemo(() => {
    if (containerRef.current) {
      const { barWidth } = calculateResponsivePosition(1, 1, isMobile, containerRef.current);
      return barWidth;
    }
    return isMobile ? 40 : 45;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- containerDimensions triggers recalculation
  }, [isMobile, containerDimensions]);

  // HELPER FUNCTIONS
  const findBarAtPosition = useCallback((row: number, col: number): Bar | null => {
    const establishment = establishments.find(est =>
      est.zone === ZONE && est.grid_row === row && est.grid_col === col &&
      est.grid_row >= 1 && est.grid_row <= 4 && isValidColumn(est.grid_row, est.grid_col)
    );
    return establishment ? allBars.find(bar => bar.id === establishment.id) || null : null;
  }, [allBars, establishments]);

  const getGridFromMousePosition = useCallback((event: React.DragEvent | React.TouchEvent) => {
    if (!containerRef.current) return null;
    const coords = getEventCoordinates(event);
    if (!coords) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = coords.clientX - rect.left;
    const relativeY = coords.clientY - rect.top;
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    if (isMobile) {
      const totalWidth = 350;
      const usableWidth = totalWidth * 0.9;
      const barWidth = Math.min(40, usableWidth / 9 - 4);
      const spacing = (usableWidth - (9 * barWidth)) / 10;
      const col = Math.max(1, Math.min(9, Math.floor((relativeX - spacing) / (barWidth + spacing)) + 1));
      const row = Math.max(1, Math.min(4, Math.floor((relativeY - 60) / 140) + 1));
      if (row < 1 || row > 4 || !isValidColumn(row, col)) return null;
      return { row, col };
    }

    // Desktop: Detect segment and calculate position
    const segmentStartY = containerHeight * 0.30;
    const horizontalBoundaryY = segmentStartY;
    const isInHorizontalSegment = relativeY < horizontalBoundaryY + 100 && relativeY > 0;
    const isInVerticalSegment = !isInHorizontalSegment && relativeX > containerWidth * 0.45;

    if (isInHorizontalSegment) {
      const segmentStartX = containerWidth * 0.25;
      const segmentEndX = containerWidth * 0.55;
      const segmentWidth = segmentEndX - segmentStartX;
      const idealBarWidth = Math.min(45, Math.max(25, segmentWidth / 9 - 8));
      const spacing = (segmentWidth - (9 * idealBarWidth)) / 10;
      const col = Math.max(1, Math.min(9, Math.floor((relativeX - segmentStartX - spacing) / (idealBarWidth + spacing)) + 1));
      const centerY = containerHeight * 0.30;
      const row = relativeY < centerY ? 1 : 2;
      if (!isValidColumn(row, col)) {
        const adjustedCol = row === 2 && col === 9 ? 8 : col;
        if (!isValidColumn(row, adjustedCol)) return null;
        return { row, col: adjustedCol };
      }
      return { row, col };
    } else if (isInVerticalSegment) {
      const segmentCenterX = containerWidth * 0.55;
      const segmentStartY = containerHeight * 0.30;
      const segmentEndY = containerHeight * 0.90;
      const segmentHeight = segmentEndY - segmentStartY;
      const idealBarWidth = Math.min(45, Math.max(25, segmentHeight / 9 - 8));
      const spacing = (segmentHeight - (9 * idealBarWidth)) / 10;
      let col = Math.max(1, Math.min(9, Math.floor((relativeY - segmentStartY - spacing) / (idealBarWidth + spacing)) + 1));
      const row = relativeX < segmentCenterX ? 3 : 4;
      if (row === 3 && (col === 1 || col === 2)) col = 3;
      if (!isValidColumn(row, col)) return null;
      return { row, col };
    }
    return null;
  }, [isMobile]);

  // BAR CLICK HANDLER
  const handleBarClick = useCallback((bar: Bar) => {
    if (isEditMode) return;
    const establishment = establishments.find(est => est.id === bar.id);
    if (establishment && onEstablishmentClick) {
      onEstablishmentClick(establishment);
    } else if (onBarClick) {
      onBarClick({ id: bar.id, name: bar.name, type: bar.type, position: bar.position, color: bar.color });
    } else {
      navigate(generateEstablishmentUrl(bar.id, bar.name, establishment?.zone || ZONE));
    }
  }, [establishments, onEstablishmentClick, onBarClick, navigate, isEditMode]);

  const getEstablishmentIcon = useCallback((barId: string, establishments: Establishment[], fallbackIcon: string) => {
    const establishment = establishments.find(est => est.id === barId);
    if (establishment?.logo_url) {
      return (
        <div className="map-logo-container-nightlife">
          <LazyImage src={establishment.logo_url} alt={establishment.name}
            cloudinaryPreset="establishmentLogo" className="map-logo-image-nightlife" objectFit="contain" />
        </div>
      );
    }
    return fallbackIcon;
  }, []);

  // KEYBOARD NAVIGATION
  const handleKeyboardNavigation = useCallback((e: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    if (isEditMode || allBars.length === 0) return;
    e.preventDefault();

    const currentIndex = focusedBarIndex;
    if (currentIndex === -1 || currentIndex >= allBars.length) {
      setFocusedBarIndex(0);
      barRefs.current.get(allBars[0].id)?.focus();
      return;
    }

    const currentBar = allBars[currentIndex];
    const currentRow = currentBar.grid_row || 1;
    const currentCol = currentBar.grid_col || 1;
    let targetBar: Bar | null = null;

    switch (e.key) {
      case 'ArrowRight':
        targetBar = allBars.filter(b => b.grid_row === currentRow && (b.grid_col || 1) > currentCol)
          .sort((a, b) => (a.grid_col || 1) - (b.grid_col || 1))[0] || null;
        break;
      case 'ArrowLeft':
        targetBar = allBars.filter(b => b.grid_row === currentRow && (b.grid_col || 1) < currentCol)
          .sort((a, b) => (b.grid_col || 1) - (a.grid_col || 1))[0] || null;
        break;
      case 'ArrowUp':
        targetBar = allBars.filter(b => (b.grid_row || 1) < currentRow).sort((a, b) => {
          const rowDiff = (b.grid_row || 1) - (a.grid_row || 1);
          return rowDiff !== 0 ? rowDiff : Math.abs((a.grid_col || 1) - currentCol) - Math.abs((b.grid_col || 1) - currentCol);
        })[0] || null;
        break;
      case 'ArrowDown':
        targetBar = allBars.filter(b => (b.grid_row || 1) > currentRow).sort((a, b) => {
          const rowDiff = (a.grid_row || 1) - (b.grid_row || 1);
          return rowDiff !== 0 ? rowDiff : Math.abs((a.grid_col || 1) - currentCol) - Math.abs((b.grid_col || 1) - currentCol);
        })[0] || null;
        break;
    }

    if (targetBar) {
      const targetIndex = allBars.findIndex(b => b.id === targetBar!.id);
      if (targetIndex !== -1) {
        setFocusedBarIndex(targetIndex);
        barRefs.current.get(targetBar.id)?.focus();
      }
    }
  }, [allBars, focusedBarIndex, isEditMode]);

  // DRAG & DROP HANDLERS
  const updateMousePosition = useCallback((event: React.DragEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const coords = getEventCoordinates(event);
    if (!coords) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePosition({ x: coords.clientX - rect.left, y: coords.clientY - rect.top });

    if (throttleTimeout.current) clearTimeout(throttleTimeout.current);
    throttleTimeout.current = setTimeout(() => {
      const gridPos = getGridFromMousePosition(event);
      setDragOverPosition(gridPos);
      if (gridPos) {
        const conflictBar = findBarAtPosition(gridPos.row, gridPos.col);
        if (!conflictBar) setDropAction('move');
        else if (conflictBar.id === draggedBar?.id) setDropAction('blocked');
        else setDropAction('swap');
      } else {
        setDropAction('blocked');
      }
    }, 16);
  }, [getGridFromMousePosition, findBarAtPosition, draggedBar]);

  const handleDragStart = useCallback((bar: Bar, event: React.DragEvent) => {
    if (!isEditMode || isLoading || isOperationLocked()) {
      event.preventDefault();
      return;
    }
    setDraggedBar(bar);
    setIsDragging(true);
    event.dataTransfer.setData('application/json', JSON.stringify(bar));
    event.dataTransfer.effectAllowed = 'move';
  }, [isEditMode, isLoading, isOperationLocked]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (!isEditMode || !isDragging || !draggedBar) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    updateMousePosition(event);
  }, [isEditMode, isDragging, draggedBar, updateMousePosition]);

  const handleDragEnd = useCallback(() => resetDragState(), [resetDragState]);

  const handleTouchStart = useCallback((bar: Bar, _event: React.TouchEvent) => {
    if (!isEditMode || isLoading || isOperationLocked()) return;
    triggerHaptic('tap');
    setDraggedBar(bar);
    setIsDragging(true);
  }, [isEditMode, isLoading, isOperationLocked]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isEditMode || !isDragging || !draggedBar) return;
    updateMousePosition(event);
  }, [isEditMode, isDragging, draggedBar, updateMousePosition]);

  // API CALL
  const performMoveOrSwap = useCallback(async () => {
    if (!draggedBar || !dragOverPosition || dropAction === 'blocked') return false;
    const targetRow = dragOverPosition.row;
    const targetCol = dragOverPosition.col;
    const conflictEst = establishments.find(est => est.zone === ZONE && est.grid_row === targetRow && est.grid_col === targetCol);
    const isSwap = !!conflictEst && conflictEst.id !== draggedBar.id;

    applyOptimisticPosition(draggedBar.id, { row: targetRow, col: targetCol });
    if (isSwap && conflictEst) {
      const draggedEst = establishments.find(est => est.id === draggedBar.id);
      if (draggedEst) applyOptimisticPosition(conflictEst.id, { row: draggedEst.grid_row || 1, col: draggedEst.grid_col || 1 });
    }

    setIsLoading(true);
    try {
      const requestBody = isSwap && conflictEst
        ? { sourceId: draggedBar.id, targetId: conflictEst.id, sourceRow: targetRow, sourceCol: targetCol,
            targetRow: establishments.find(est => est.id === draggedBar.id)?.grid_row,
            targetCol: establishments.find(est => est.id === draggedBar.id)?.grid_col, zone: ZONE }
        : { sourceId: draggedBar.id, sourceRow: targetRow, sourceCol: targetCol, zone: ZONE };

      const response = await fetch('/api/grid-move-workaround', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        setOperationLock(500);
        return true;
      }
      clearOptimisticPosition(draggedBar.id);
      if (isSwap && conflictEst) clearOptimisticPosition(conflictEst.id);
      toast.error('Move failed');
      return false;
    } catch {
      clearOptimisticPosition(draggedBar.id);
      if (isSwap && conflictEst) clearOptimisticPosition(conflictEst.id);
      toast.error('Network error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [draggedBar, dragOverPosition, dropAction, establishments, applyOptimisticPosition, clearOptimisticPosition, setOperationLock]);

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    if (!isEditMode || !isDragging || !dragOverPosition || !draggedBar || dropAction === 'blocked') {
      resetDragState();
      return;
    }
    event.preventDefault();
    await performMoveOrSwap();
    resetDragState();
  }, [isEditMode, isDragging, dragOverPosition, draggedBar, dropAction, performMoveOrSwap, resetDragState]);

  const handleTouchEnd = useCallback(async (event: React.TouchEvent) => {
    if (!isEditMode || !isDragging || !dragOverPosition || !draggedBar || dropAction === 'blocked') {
      resetDragState();
      return;
    }
    event.preventDefault();
    const success = await performMoveOrSwap();
    triggerHaptic(success ? 'success' : 'error');
    resetDragState();
  }, [isEditMode, isDragging, dragOverPosition, draggedBar, dropAction, performMoveOrSwap, resetDragState]);

  // RENDER
  return (
    <div className="custom-map-container lkmetro-map" role="region" aria-label="LK Metro Interactive Map"
      onKeyDown={handleKeyboardNavigation}>
      <ScreenReaderEstablishmentList establishments={establishments.filter(est => est.zone === ZONE)} zone={ZONE} />

      {isAdmin && (
        <div className="map-controls">
          <button onClick={toggleEditMode} className={`edit-mode-toggle ${isEditMode ? 'active' : ''}`}
            aria-pressed={isEditMode} disabled={isLoading}>
            {isEditMode ? '✓ Editing' : '✎ Edit'}
          </button>
        </div>
      )}

      <div ref={containerRef} className={`map-canvas-container ${isEditMode ? 'edit-mode' : ''}`}
        style={{ position: 'relative', width: '100%', minHeight: isMobile ? '600px' : `${MAP_CONFIG.DEFAULT_HEIGHT}px` }}
        onDragOver={handleDragOver} onDrop={handleDrop}>
        <GenericRoadCanvas
          config={{
            shape: 'l-shape',
            width: isMobile ? 40 : 70,
            cornerX: 55,
            cornerY: 30,
            startX: 25,
            endY: 90
          }}
          style={{
            baseColor: '#2d2d2d',
            overlayColor: '#1a1a1a',
            edgeColor: '#FFD700',
          }}
          isEditMode={isEditMode}
        />

        {allBars.map((bar, index) => {
          const establishment = establishments.find(est => est.id === bar.id);
          const isVip = establishment?.is_vip || false;
          const isSelected = selectedEstablishment === bar.id;
          const isHovered = hoveredBar === bar.id;
          const isBeingDragged = draggedBar?.id === bar.id;

          return (
            <div key={bar.id} ref={(el) => { if (el) barRefs.current.set(bar.id, el); else barRefs.current.delete(bar.id); }}
              className={`map-bar ${bar.type} ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}
                ${isBeingDragged ? 'dragging' : ''} ${isVip ? 'vip' : ''}`}
              style={{
                position: 'absolute', left: bar.position.x, top: bar.position.y,
                width: currentBarSize, height: currentBarSize, backgroundColor: bar.color,
                transform: `translate(-50%, -50%) ${isBeingDragged ? 'scale(1.1)' : 'scale(1)'}`,
                opacity: isBeingDragged ? 0.7 : 1,
                cursor: isEditMode && canEdit ? 'grab' : 'pointer',
                zIndex: isBeingDragged ? 1000 : isSelected ? 100 : isHovered ? 50 : 1,
              }}
              role="button" tabIndex={index === focusedBarIndex ? 0 : -1}
              aria-label={`${bar.name}${isVip ? ' (VIP)' : ''}`}
              onClick={() => handleBarClick(bar)}
              onMouseEnter={() => setHoveredBar(bar.id)} onMouseLeave={() => setHoveredBar(null)}
              draggable={isEditMode && canEdit && !isLoading}
              onDragStart={(e) => handleDragStart(bar, e)} onDragEnd={handleDragEnd}
              onTouchStart={isEditMode && canEdit && !isLoading ? (e) => handleTouchStart(bar, e) : undefined}
              onTouchMove={isEditMode && canEdit && !isLoading ? handleTouchMove : undefined}
              onTouchEnd={isEditMode && canEdit && !isLoading ? handleTouchEnd : undefined}>
              {getEstablishmentIcon(bar.id, establishments, bar.icon)}
              {isVip && <span className="vip-crown">👑</span>}
            </div>
          );
        })}

        {isDragging && mousePosition && draggedBar && (
          <DragDropIndicator isEditMode={isEditMode} isDragging={isDragging}
            mousePosition={mousePosition} dropAction={dropAction} draggedBar={draggedBar}
            dragOverPosition={dragOverPosition} currentBarSize={currentBarSize} />
        )}
      </div>
    </div>
  );
};

export default CustomLKMetroMap;
