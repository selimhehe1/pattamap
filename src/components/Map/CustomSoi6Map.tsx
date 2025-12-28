/**
 * CustomSoi6Map - Refactored Version
 *
 * Uses shared hooks and utilities from ./shared to reduce code duplication.
 * Zone-specific logic (position calculation, grid detection) remains inline.
 *
 * Original: ~1933 lines
 * Refactored: ~800 lines (58% reduction)
 */
import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { Lock, Pencil, Target, AlertTriangle } from 'lucide-react';
import { useNavigateWithTransition } from '../../hooks/useNavigateWithTransition';
import { Establishment, CustomBar } from '../../types';
// Auth context is used via useMapEditMode hook
import GenericRoadCanvas from './GenericRoadCanvas';
import { getZoneConfig } from '../../utils/zoneConfig';
import { MAP_CONFIG } from '../../utils/constants';
import DragDropIndicator from './DragDropIndicator';
import ScreenReaderEstablishmentList from './ScreenReaderEstablishmentList';
import { logger } from '../../utils/logger';
import toast from '../../utils/toast';
import { useContainerSize } from '../../hooks/useContainerSize';
import LazyImage from '../Common/LazyImage';
import { generateEstablishmentUrl } from '../../utils/slugify';
import { TYPE_STYLES, getBarTypeFromCategory, MapBar } from '../../utils/mapConstants';

// Shared hooks and utilities
import {
  useMapEditMode,
  useOptimisticPositions,
  useResponsiveMap,
} from './shared/hooks';
import { triggerHaptic, getEventCoordinates } from './shared/utils';

import '../../styles/components/map-components.css';
import '../../styles/components/maps.css';
import '../../styles/features/map/CustomSoi6Map.css';

// Re-export Bar type for backward compatibility
export type Bar = MapBar;

interface CustomSoi6MapProps {
  establishments: Establishment[];
  onEstablishmentClick?: (establishment: Establishment) => void;
  selectedEstablishment?: string;
  onBarClick?: (bar: CustomBar) => void;
  onEstablishmentUpdate?: () => Promise<void>;
}

// Zone configuration
const ZONE = 'soi6' as const;
const ZONE_CONFIG = getZoneConfig(ZONE);

// ═══════════════════════════════════════════════════════════════════════════
// ZONE-SPECIFIC: Position Calculator (must stay inline - unique grid layout)
// ═══════════════════════════════════════════════════════════════════════════
const calculateResponsivePosition = (
  row: number,
  col: number,
  isMobile: boolean,
  containerElement?: HTMLElement
) => {
  if (isMobile) {
    // Mobile - VERTICAL layout
    const containerHeight = containerElement?.getBoundingClientRect().height ?? 600;
    const containerWidth = containerElement?.getBoundingClientRect().width ?? 350;

    const centerX = containerWidth * 0.5;
    const roadWidth = 80;
    const barWidth = 32;

    const offsetFromCenter = roadWidth / 2 + 12;
    const x = row === 1 ? centerX - offsetFromCenter : centerX + offsetFromCenter;

    const topMargin = 10;
    const bottomMargin = 10;
    const usableHeight = containerHeight - topMargin - bottomMargin;
    const spacing = usableHeight / (ZONE_CONFIG.maxCols + 1);
    const y = topMargin + col * spacing;

    return { x, y, barWidth };
  } else {
    // Desktop - Horizontal layout
    const containerWidth = containerElement?.getBoundingClientRect().width ??
                          Math.min(1200, window.innerWidth - 40);

    const usableWidth = containerWidth * (ZONE_CONFIG.endX - ZONE_CONFIG.startX) / 100;
    const startX = containerWidth * ZONE_CONFIG.startX / 100;

    const maxBarWidth = 45;
    const minBarWidth = 25;
    const idealBarWidth = Math.min(maxBarWidth, Math.max(minBarWidth, usableWidth / ZONE_CONFIG.maxCols - 8));

    const totalBarsWidth = ZONE_CONFIG.maxCols * idealBarWidth;
    const totalSpacing = usableWidth - totalBarsWidth;
    const spacing = totalSpacing / (ZONE_CONFIG.maxCols + 1);

    const x = startX + spacing + (col - 1) * (idealBarWidth + spacing);

    const containerHeight = containerElement?.getBoundingClientRect().height ?? MAP_CONFIG.DEFAULT_HEIGHT;
    const topY = containerHeight * ZONE_CONFIG.startY / 100;
    const bottomY = containerHeight * ZONE_CONFIG.endY / 100;
    const y = row === 1 ? topY : bottomY;

    return { x, y, barWidth: idealBarWidth };
  }
};

// Convert establishments to visual bars
const establishmentsToVisualBars = (
  establishments: Establishment[],
  isMobile: boolean,
  containerElement?: HTMLElement
): Bar[] => {
  return establishments
    .filter(est =>
      est.zone === ZONE &&
      est.grid_row && est.grid_row >= 1 && est.grid_row <= ZONE_CONFIG.maxRows &&
      est.grid_col && est.grid_col >= 1 && est.grid_col <= ZONE_CONFIG.maxCols
    )
    .map(est => {
      const barType = getBarTypeFromCategory(est.category_id);
      const style = TYPE_STYLES[barType];
      const { x, y } = calculateResponsivePosition(
        est.grid_row || 1,
        est.grid_col || 1,
        isMobile,
        containerElement
      );

      return {
        id: est.id,
        name: est.name,
        type: barType,
        position: { x, y },
        color: style.color,
        icon: style.icon,
        grid_row: est.grid_row || 1,
        grid_col: est.grid_col || 1,
      };
    });
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const CustomSoi6MapRefactored: React.FC<CustomSoi6MapProps> = ({
  establishments,
  onEstablishmentClick,
  selectedEstablishment,
  onBarClick,
}) => {
  const navigate = useNavigateWithTransition();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED HOOKS (replaces ~100 lines of duplicated state/logic)
  // ═══════════════════════════════════════════════════════════════════════════
  const { isEditMode, toggleEditMode, canEdit, isAdmin } = useMapEditMode();
  const { isMobile } = useResponsiveMap();
  const {
    optimisticPositions,
    applyOptimisticPosition,
    clearOptimisticPosition,
    isOperationLocked,
    setOperationLock,
  } = useOptimisticPositions();

  // Container size tracking
  const containerDimensions = useContainerSize(containerRef, 300);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCAL STATE (zone-specific needs)
  // ═══════════════════════════════════════════════════════════════════════════
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

  // Duplicate detection
  const [duplicatePositions, setDuplicatePositions] = React.useState<Array<{
    row: number;
    col: number;
    count: number;
    establishments: Establishment[];
  }>>([]);

  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // DUPLICATE DETECTION
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const zoneEstablishments = establishments.filter(
      est => est.zone === ZONE && est.grid_row && est.grid_col
    );

    if (zoneEstablishments.length === 0) {
      setDuplicatePositions([]);
      return;
    }

    const positionMap = new Map<string, Establishment[]>();
    zoneEstablishments.forEach(est => {
      const key = `${est.grid_row},${est.grid_col}`;
      if (!positionMap.has(key)) positionMap.set(key, []);
      positionMap.get(key)!.push(est);
    });

    const duplicates = Array.from(positionMap.entries())
      .filter(([_, ests]) => ests.length > 1)
      .map(([position, ests]) => {
        const [row, col] = position.split(',').map(Number);
        return { row, col, count: ests.length, establishments: ests };
      });

    setDuplicatePositions(duplicates);

    if (duplicates.length > 0) {
      logger.warn(`Duplicate positions detected on ${ZONE} map`, {
        duplicateCount: duplicates.length,
      });
    }
  }, [establishments]);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════
  const allBars = useMemo(() => {
    const bars = establishmentsToVisualBars(establishments, isMobile, containerRef.current || undefined);

    if (optimisticPositions.size > 0) {
      return bars.map(bar => {
        const optimisticPos = optimisticPositions.get(bar.id);
        if (optimisticPos) {
          const { x, y } = calculateResponsivePosition(
            optimisticPos.row,
            optimisticPos.col,
            isMobile,
            containerRef.current || undefined
          );
          return { ...bar, position: { x, y }, grid_row: optimisticPos.row, grid_col: optimisticPos.col };
        }
        return bar;
      });
    }

    return bars;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- containerDimensions triggers recalculation
  }, [establishments, isMobile, containerDimensions, optimisticPositions]);

  const currentBarSize = useMemo(() => {
    if (containerRef.current) {
      const { barWidth } = calculateResponsivePosition(1, 1, isMobile, containerRef.current);
      return barWidth;
    }
    return isMobile ? 32 : 40;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- containerDimensions triggers recalculation
  }, [isMobile, containerDimensions]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const findBarAtPosition = useCallback((row: number, col: number): Bar | null => {
    const establishment = establishments.find(est =>
      est.zone === ZONE &&
      est.grid_row === row &&
      est.grid_col === col &&
      est.grid_row >= 1 && est.grid_row <= ZONE_CONFIG.maxRows &&
      est.grid_col >= 1 && est.grid_col <= ZONE_CONFIG.maxCols
    );
    return establishment ? allBars.find(bar => bar.id === establishment.id) || null : null;
  }, [allBars, establishments]);

  const getGridFromMousePosition = useCallback((event: React.DragEvent | React.TouchEvent) => {
    if (!containerRef.current) return null;

    const coords = getEventCoordinates(event.nativeEvent);
    if (!coords) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = coords.clientX - rect.left;
    const relativeY = coords.clientY - rect.top;

    let row: number, col: number;

    if (isMobile) {
      const centerX = rect.width * 0.5;
      row = relativeX < centerX ? 1 : 2;

      const topMargin = 10;
      const bottomMargin = 10;
      const usableHeight = rect.height - topMargin - bottomMargin;
      const spacing = usableHeight / (ZONE_CONFIG.maxCols + 1);

      let closestCol = 1;
      let closestDistance = Infinity;
      for (let testCol = 1; testCol <= ZONE_CONFIG.maxCols; testCol++) {
        const barY = topMargin + testCol * spacing;
        const distance = Math.abs(relativeY - barY);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestCol = testCol;
        }
      }
      col = closestCol;
    } else {
      const usableWidth = rect.width * (ZONE_CONFIG.endX - ZONE_CONFIG.startX) / 100;
      const startX = rect.width * ZONE_CONFIG.startX / 100;
      const idealBarWidth = Math.min(45, Math.max(25, usableWidth / ZONE_CONFIG.maxCols - 8));
      const totalSpacing = usableWidth - ZONE_CONFIG.maxCols * idealBarWidth;
      const spacing = totalSpacing / (ZONE_CONFIG.maxCols + 1);

      const relativeXInZone = relativeX - startX;
      const clickSlot = (relativeXInZone - spacing) / (idealBarWidth + spacing);
      col = Math.max(1, Math.min(ZONE_CONFIG.maxCols, Math.floor(clickSlot) + 1));

      const midPoint = rect.height * 0.50;
      row = relativeY < midPoint ? 1 : 2;
    }

    if (row < 1 || row > ZONE_CONFIG.maxRows || col < 1 || col > ZONE_CONFIG.maxCols) {
      return null;
    }

    return { row, col };
  }, [isMobile]);

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleBarClick = useCallback((bar: Bar) => {
    if (isEditMode) return;

    const establishment = establishments.find(est => est.id === bar.id);

    if (establishment && onEstablishmentClick) {
      onEstablishmentClick(establishment);
    } else if (onBarClick) {
      const customBar: CustomBar = {
        id: bar.id,
        name: bar.name,
        type: bar.type,
        position: bar.position,
        color: bar.color,
      };
      onBarClick(customBar);
    } else {
      navigate(generateEstablishmentUrl(bar.id, bar.name, establishment?.zone || ZONE));
    }
  }, [establishments, onEstablishmentClick, onBarClick, navigate, isEditMode]);

  const resetDragState = useCallback(() => {
    setDraggedBar(null);
    setDragOverPosition(null);
    setIsDragging(false);
    setDropAction(null);
    setMousePosition(null);
    if (throttleTimeout.current) {
      clearTimeout(throttleTimeout.current);
      throttleTimeout.current = null;
    }
  }, []);

  const updateMousePosition = useCallback((event: React.DragEvent | React.TouchEvent) => {
    if (!containerRef.current) return;

    const coords = getEventCoordinates(event.nativeEvent);
    if (!coords) return;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = coords.clientX - rect.left;
    const relativeY = coords.clientY - rect.top;

    setMousePosition({ x: relativeX, y: relativeY });

    // Blocked zone check (central road)
    const roadTop = rect.height * 0.35;
    const roadBottom = rect.height * 0.65;
    if (relativeY >= roadTop && relativeY <= roadBottom) {
      setDropAction('blocked');
      setDragOverPosition(null);
      return;
    }

    if (throttleTimeout.current) clearTimeout(throttleTimeout.current);

    throttleTimeout.current = setTimeout(() => {
      const gridPos = getGridFromMousePosition(event);
      setDragOverPosition(gridPos);

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

  const performMove = useCallback(async (targetRow: number, targetCol: number, conflictBar: Bar | null) => {
    if (!draggedBar) return false;

    const draggedEst = establishments.find(est => est.id === draggedBar.id);
    if (!draggedEst) return false;

    const originalPos = { row: draggedEst.grid_row || 1, col: draggedEst.grid_col || 1 };
    if (originalPos.row === targetRow && originalPos.col === targetCol) return false;

    const isSwap = conflictBar !== null;
    const conflictEst = isSwap ? establishments.find(est => est.id === conflictBar.id) : null;

    // Optimistic update
    applyOptimisticPosition(draggedEst.id, { row: targetRow, col: targetCol });
    if (isSwap && conflictEst) {
      applyOptimisticPosition(conflictEst.id, originalPos);
    }

    try {
      const requestBody: Record<string, unknown> = {
        establishmentId: draggedEst.id,
        grid_row: targetRow,
        grid_col: targetCol,
        zone: ZONE,
      };
      if (isSwap && conflictEst) {
        requestBody.swap_with_id = conflictEst.id;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/grid-move-workaround`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        setOperationLock(500);
        return true;
      }

      const errorText = await response.text();
      logger.error(`${isSwap ? 'Swap' : 'Move'} failed`, { status: response.status, error: errorText });

      clearOptimisticPosition(draggedEst.id);
      if (isSwap && conflictEst) clearOptimisticPosition(conflictEst.id);

      toast.error(isSwap ? 'Failed to swap establishments' : 'Failed to move establishment');
      return false;
    } catch (error) {
      logger.error('Move operation error', error);
      clearOptimisticPosition(draggedEst.id);
      if (isSwap && conflictEst) clearOptimisticPosition(conflictEst.id);
      toast.error('Network error - please try again');
      return false;
    }
  }, [draggedBar, establishments, applyOptimisticPosition, clearOptimisticPosition, setOperationLock]);

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    if (!isEditMode || !isDragging || !dragOverPosition || !draggedBar || dropAction === 'blocked') {
      resetDragState();
      return;
    }

    event.preventDefault();
    const { row, col } = dragOverPosition;
    const conflictBar = findBarAtPosition(row, col);

    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
      resetDragState();
    }, 10000);

    try {
      setIsLoading(true);
      await performMove(row, col, conflictBar);
    } finally {
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      resetDragState();
    }
  }, [isEditMode, isDragging, dragOverPosition, draggedBar, dropAction, findBarAtPosition, performMove, resetDragState]);

  const handleDragEnd = useCallback(() => resetDragState(), [resetDragState]);

  // Touch handlers using shared haptic feedback
  const handleTouchStart = useCallback((bar: Bar, event: React.TouchEvent) => {
    if (!isEditMode || isLoading || isOperationLocked()) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    triggerHaptic('tap');
    setDraggedBar(bar);
    setIsDragging(true);
  }, [isEditMode, isLoading, isOperationLocked]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isEditMode || !isDragging || !draggedBar) return;
    event.preventDefault();
    updateMousePosition(event);
  }, [isEditMode, isDragging, draggedBar, updateMousePosition]);

  const handleTouchEnd = useCallback(async (event: React.TouchEvent) => {
    if (!isEditMode || !isDragging || !dragOverPosition || !draggedBar || dropAction === 'blocked') {
      resetDragState();
      return;
    }

    event.preventDefault();
    triggerHaptic('success');

    const { row, col } = dragOverPosition;
    const conflictBar = findBarAtPosition(row, col);

    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
      resetDragState();
    }, 10000);

    try {
      setIsLoading(true);
      await performMove(row, col, conflictBar);
    } finally {
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      resetDragState();
    }
  }, [isEditMode, isDragging, dragOverPosition, draggedBar, dropAction, findBarAtPosition, performMove, resetDragState]);

  // Keyboard navigation
  const handleKeyboardNavigation = useCallback((e: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    if (isEditMode || allBars.length === 0) return;

    e.preventDefault();

    let currentIndex = focusedBarIndex;
    if (currentIndex === -1 || currentIndex >= allBars.length) {
      currentIndex = 0;
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
        targetBar = allBars
          .filter(bar => bar.grid_row === currentRow && (bar.grid_col || 1) > currentCol)
          .sort((a, b) => (a.grid_col || 1) - (b.grid_col || 1))[0] || null;
        break;
      case 'ArrowLeft':
        targetBar = allBars
          .filter(bar => bar.grid_row === currentRow && (bar.grid_col || 1) < currentCol)
          .sort((a, b) => (b.grid_col || 1) - (a.grid_col || 1))[0] || null;
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        targetBar = allBars
          .filter(bar => (bar.grid_row || 1) !== currentRow)
          .sort((a, b) => Math.abs((a.grid_col || 1) - currentCol) - Math.abs((b.grid_col || 1) - currentCol))[0] || null;
        break;
    }

    if (targetBar) {
      const targetIndex = allBars.findIndex(b => b.id === targetBar!.id);
      setFocusedBarIndex(targetIndex);
      barRefs.current.get(targetBar.id)?.focus();
    }
  }, [allBars, focusedBarIndex, isEditMode]);

  // Cleanup
  useEffect(() => {
    return () => {
      resetDragState();
    };
  }, [resetDragState]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  const getEstablishmentIcon = useCallback((barId: string, fallbackIcon: string) => {
    const establishment = establishments.find(est => est.id === barId);

    if (establishment?.logo_url) {
      return (
        <div className="bar-logo-container">
          <LazyImage
            src={establishment.logo_url}
            alt={establishment.name}
            cloudinaryPreset="establishmentLogo"
            className="bar-logo"
            objectFit="cover"
          />
        </div>
      );
    }
    return fallbackIcon;
  }, [establishments]);

  const renderGridDebug = () => {
    if (!isEditMode || !containerRef.current) return null;

    const gridCells: React.ReactElement[] = [];
    const fixedGridSize = isMobile ? 32 : 40;

    for (let row = 1; row <= ZONE_CONFIG.maxRows; row++) {
      for (let col = 1; col <= ZONE_CONFIG.maxCols; col++) {
        const { x, y } = calculateResponsivePosition(row, col, isMobile, containerRef.current!);

        gridCells.push(
          <div
            key={`grid-${row}-${col}`}
            className="grid-debug-cell"
            style={{
              position: 'absolute',
              left: `${x - fixedGridSize/2}px`,
              top: `${y - fixedGridSize/2}px`,
              width: `${fixedGridSize}px`,
              height: `${fixedGridSize}px`,
            }}
          >
            {row},{col}
          </div>
        );
      }
    }
    return gridCells;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      ref={containerRef}
      className={`map-container-nightlife map-bg-soi6 ${isEditMode ? 'edit-mode' : ''}`}
      onDragOver={isEditMode ? handleDragOver : undefined}
      onDrop={isEditMode ? handleDrop : undefined}
      onKeyDown={handleKeyboardNavigation}
      role="region"
      aria-label="Interactive map of Soi 6 establishments"
    >
      {/* Accessibility */}
      <p id="soi6-map-description" className="sr-only">
        Interactive map displaying {allBars.length} establishments in Soi 6.
        {isEditMode ? ' Edit mode active.' : ' Click to view details.'}
      </p>

      <ScreenReaderEstablishmentList
        establishments={establishments}
        zone={ZONE}
        onEstablishmentSelect={(est) => onEstablishmentClick?.(est)}
      />

      {/* Road */}
      <GenericRoadCanvas
        config={{
          shape: isMobile ? 'vertical' : 'horizontal',
          width: isMobile ? 80 : 200,
          startX: 1, endX: 99,
          startY: 0, endY: 100,
        }}
        style={{
          baseColor: '#2d2d2d',
          overlayColor: '#1a1a1a',
          edgeColor: '#FFD700',
          centerLineColor: '#FFD700',
        }}
        isEditMode={isEditMode}
        grainCount={1500}
      />

      {/* Admin Controls */}
      {isAdmin && (
        <div className="map-edit-controls">
          <button
            onClick={toggleEditMode}
            aria-pressed={isEditMode}
            className={`edit-mode-btn ${isEditMode ? 'active' : ''}`}
          >
            {isEditMode ? <><Lock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Exit Edit</> : <><Pencil size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Edit Mode</>}
          </button>
        </div>
      )}

      {/* Debug Grid */}
      {renderGridDebug()}

      {/* Edit Mode Indicator */}
      {isEditMode && <div className="edit-mode-indicator"><Target size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> EDIT MODE</div>}

      {/* Bars */}
      {allBars.map((bar, index) => {
        const isSelected = selectedEstablishment === bar.id;
        const isHovered = hoveredBar === bar.id;
        const isBeingDragged = isDragging && draggedBar?.id === bar.id;
        const establishment = establishments.find(est => est.id === bar.id);
        const isVIP = establishment?.is_vip && establishment?.vip_expires_at &&
          new Date(establishment.vip_expires_at) > new Date();

        const vipMultiplier = window.innerWidth < 480 ? 1.15 : window.innerWidth < 768 ? 1.25 : 1.35;
        const finalBarSize = isVIP ? Math.round(currentBarSize * vipMultiplier) : currentBarSize;

        return (
          <div
            key={bar.id}
            ref={(el) => {
              if (el) barRefs.current.set(bar.id, el);
              else barRefs.current.delete(bar.id);
            }}
            className={`soi6-bar-circle ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${isBeingDragged ? 'dragging' : ''} ${isVIP ? 'vip-establishment-marker' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`${bar.name}${isVIP ? ', VIP' : ''}`}
            onClick={() => handleBarClick(bar)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBarClick(bar); } }}
            onMouseEnter={() => setHoveredBar(bar.id)}
            onMouseLeave={() => setHoveredBar(null)}
            onFocus={() => { setHoveredBar(bar.id); setFocusedBarIndex(index); }}
            onBlur={() => setHoveredBar(null)}
            draggable={isEditMode && canEdit && !isLoading}
            onDragStart={(e) => handleDragStart(bar, e)}
            onDragEnd={handleDragEnd}
            onTouchStart={isEditMode && canEdit && !isLoading ? (e) => handleTouchStart(bar, e) : undefined}
            onTouchMove={isEditMode && canEdit && !isLoading ? handleTouchMove : undefined}
            onTouchEnd={isEditMode && canEdit && !isLoading ? handleTouchEnd : undefined}
            style={{
              touchAction: isEditMode ? 'none' : 'auto',
              position: 'absolute',
              left: `${bar.position.x - finalBarSize/2}px`,
              top: `${bar.position.y - finalBarSize/2}px`,
              width: `${finalBarSize}px`,
              height: `${finalBarSize}px`,
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, ${bar.color}FF, ${bar.color}DD 60%, ${bar.color}AA 100%)`,
              border: isVIP ? '5px solid #FFD700' : isSelected ? '3px solid #FFD700' : isEditMode ? '2px solid #00FF00' : '2px solid rgba(255,255,255,0.6)',
              cursor: isLoading ? 'not-allowed' : isEditMode ? (isBeingDragged ? 'grabbing' : 'grab') : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isHovered && !isBeingDragged ? 'scale(1.2)' : 'scale(1)',
              transition: isVIP ? 'none' : 'all 0.3s ease',
              boxShadow: isHovered ? `0 0 25px ${TYPE_STYLES[bar.type].shadow}` : `0 0 12px ${bar.color}66`,
              zIndex: isHovered ? 15 : isBeingDragged ? 100 : 10,
              opacity: isBeingDragged ? 0.7 : 1,
            }}
          >
            {getEstablishmentIcon(bar.id, bar.icon)}
            {isVIP && <div className="vip-crown">👑</div>}
            {isVIP && <div className="vip-badge">VIP</div>}

            {/* Tooltip */}
            {isHovered && !isDragging && (
              <div className="bar-tooltip">
                {bar.name}
                {isEditMode && <div className="tooltip-edit-hint"><Target size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Drag to move</div>}
              </div>
            )}
          </div>
        );
      })}

      {/* Duplicate Indicators */}
      {isAdmin && isEditMode && duplicatePositions.map((dup) => {
        const { x, y } = calculateResponsivePosition(dup.row, dup.col, isMobile, containerRef.current || undefined);
        return (
          <div
            key={`dup-${dup.row}-${dup.col}`}
            className="duplicate-indicator"
            style={{ left: `${x}px`, top: `${y}px` }}
            title={`${dup.count} establishments at same position`}
          >
            <span className="duplicate-count"><AlertTriangle size={12} style={{ marginRight: '2px', verticalAlign: 'middle' }} />{dup.count}</span>
          </div>
        );
      })}

      {/* Drop Zone Indicator */}
      {isEditMode && isDragging && dragOverPosition && dropAction !== 'blocked' && containerRef.current && (() => {
        const { x, y } = calculateResponsivePosition(dragOverPosition.row, dragOverPosition.col, isMobile, containerRef.current!);
        const size = isMobile ? 32 : 40;
        return (
          <div
            className={`drop-zone-indicator ${dropAction === 'swap' ? 'swap' : 'move'}`}
            style={{ left: `${x - size/2}px`, top: `${y - size/2}px`, width: `${size}px`, height: `${size}px` }}
          />
        );
      })()}

      {/* Drag Indicator */}
      <DragDropIndicator
        isEditMode={isEditMode}
        isDragging={isDragging}
        mousePosition={mousePosition}
        dropAction={dropAction}
        draggedBar={draggedBar}
        dragOverPosition={dragOverPosition}
        currentBarSize={currentBarSize}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span>Updating position...</span>
        </div>
      )}
    </div>
  );
};

export default CustomSoi6MapRefactored;
