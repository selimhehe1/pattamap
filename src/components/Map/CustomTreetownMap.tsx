import React, { useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Establishment, CustomBar } from '../../types';
import { MAP_CONFIG } from '../../utils/constants';
import { useContainerSize } from '../../hooks/useContainerSize';
import TreeTownRoad from './TreeTownRoad';
import DragDropIndicator from './DragDropIndicator';
import { logger } from '../../utils/logger';
import toast from '../../utils/toast';
import ScreenReaderEstablishmentList from './ScreenReaderEstablishmentList';
import LazyImage from '../Common/LazyImage';
import { generateEstablishmentUrl } from '../../utils/slugify';

// Shared hooks
import { useMapEditMode } from './shared/hooks/useMapEditMode';
import { useOptimisticPositions } from './shared/hooks/useOptimisticPositions';
import { useResponsiveMap } from './shared/hooks/useResponsiveMap';
import { triggerHaptic } from './shared/utils/hapticFeedback';
import { getEventCoordinates } from './shared/utils/eventCoordinates';

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

interface CustomTreetownMapProps {
  establishments: Establishment[];
  onEstablishmentClick?: (establishment: Establishment) => void;
  selectedEstablishment?: string;
  onBarClick?: (bar: CustomBar) => void;
  onEstablishmentUpdate?: () => Promise<void>;
}

const TYPE_STYLES = {
  gogo: { color: '#C19A6B', icon: '💃', shadow: 'rgba(193, 154, 107, 0.5)' },
  beer: { color: '#FFD700', icon: '🍺', shadow: 'rgba(255, 215, 0, 0.5)' },
  pub: { color: '#00E5FF', icon: '🍸', shadow: 'rgba(0, 255, 255, 0.5)' },
  massage: { color: '#06FFA5', icon: '💆', shadow: 'rgba(6, 255, 165, 0.5)' },
  nightclub: { color: '#7B2CBF', icon: '🎵', shadow: 'rgba(123, 44, 191, 0.5)' }
};

const CATEGORY_TO_TYPE_MAP: { [key: string | number]: 'gogo' | 'beer' | 'pub' | 'massage' | 'nightclub' } = {
  'cat-001': 'beer', 'cat-002': 'gogo', 'cat-003': 'massage', 'cat-004': 'nightclub',
  1: 'beer', 2: 'gogo', 3: 'massage', 4: 'nightclub'
};

/**
 * TREE TOWN U-SHAPED GRID SYSTEM (42 positions total)
 *
 * Rows 1-2: Horizontal main street (18 positions - masked: 2,1 and 2,10)
 * Rows 3-8: Left vertical branch (2 cols × 6 rows = 12 positions)
 * Rows 9-14: Right vertical branch (2 cols × 6 rows = 12 positions)
 * MASKED POSITIONS: (2,1) and (2,10) interfere with vertical roads
 */
const getSegmentType = (row: number): 'horizontal-main' | 'left-vertical' | 'right-vertical' => {
  if (row <= 2) return 'horizontal-main';
  if (row <= 8) return 'left-vertical';
  return 'right-vertical';
};

const calculateResponsivePosition = (row: number, col: number, isMobile: boolean, containerElement?: HTMLElement) => {
  const segment = getSegmentType(row);

  if (isMobile) {
    const totalWidth = 350;
    const usableWidth = totalWidth * 0.9;
    const barWidth = Math.min(40, usableWidth / 10 - 4);
    const spacing = (usableWidth - (10 * barWidth)) / 11;
    const x = spacing + (col - 1) * (barWidth + spacing);
    const y = 60 + (row - 1) * 50;
    return { x, y, barWidth };
  }

  // Desktop: U-shaped topographic layout
  const containerWidth = containerElement ? containerElement.clientWidth :
                        (window.innerWidth > 1200 ? 1200 : window.innerWidth - 40);
  const containerHeight = containerElement ? containerElement.clientHeight : MAP_CONFIG.DEFAULT_HEIGHT;

  const roadWidth = 120;
  const roadHalfWidth = roadWidth / 2;
  const topY = containerHeight * 0.22;
  const leftX = containerWidth * 0.20;
  const rightX = containerWidth * 0.80;
  const bottomY = containerHeight * 0.92;

  if (segment === 'horizontal-main') {
    const segmentStartX = leftX;
    const segmentEndX = rightX;
    const segmentWidth = segmentEndX - segmentStartX;

    const idealBarWidth = Math.min(45, Math.max(25, segmentWidth / 10 - 8));
    const totalBarsWidth = 10 * idealBarWidth;
    const totalSpacing = segmentWidth - totalBarsWidth;
    const spacing = totalSpacing / 11;

    const x = segmentStartX + spacing + (col - 1) * (idealBarWidth + spacing);
    const barHalfWidth = idealBarWidth / 2;
    const y = row === 1
      ? topY - roadHalfWidth - barHalfWidth
      : topY + roadHalfWidth + barHalfWidth;

    return { x, y, barWidth: idealBarWidth };

  } else if (segment === 'left-vertical') {
    const segmentStartY = topY;
    const segmentEndY = bottomY;
    const segmentHeight = segmentEndY - segmentStartY;

    const idealBarWidth = Math.min(45, Math.max(25, segmentHeight / 6 - 8));
    const spacing = (segmentHeight - (6 * idealBarWidth)) / 7;

    const verticalIndex = row - 3;
    const y = segmentStartY + spacing + verticalIndex * (idealBarWidth + spacing);

    const barHalfWidth = idealBarWidth / 2;
    const x = col === 1
      ? leftX - roadHalfWidth - barHalfWidth
      : leftX + roadHalfWidth + barHalfWidth;

    return { x, y, barWidth: idealBarWidth };

  } else {
    const segmentStartY = topY;
    const segmentEndY = bottomY;
    const segmentHeight = segmentEndY - segmentStartY;

    const idealBarWidth = Math.min(45, Math.max(25, segmentHeight / 6 - 8));
    const spacing = (segmentHeight - (6 * idealBarWidth)) / 7;

    const verticalIndex = row - 9;
    const y = segmentStartY + spacing + verticalIndex * (idealBarWidth + spacing);

    const barHalfWidth = idealBarWidth / 2;
    const x = col === 1
      ? rightX - roadHalfWidth - barHalfWidth
      : rightX + roadHalfWidth + barHalfWidth;

    return { x, y, barWidth: idealBarWidth };
  }
};

const CustomTreetownMap: React.FC<CustomTreetownMapProps> = ({
  establishments,
  onEstablishmentClick,
  selectedEstablishment,
  onBarClick,
}) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Shared hooks
  const { isMobile } = useResponsiveMap();
  const { isEditMode, setEditMode, canEdit } = useMapEditMode();
  const {
    optimisticPositions,
    applyOptimisticPosition,
    clearOptimisticPosition,
    operationLockUntil,
    setOperationLock,
  } = useOptimisticPositions();

  // Container size for responsive calculations
  useContainerSize(containerRef, 300);

  // Local state
  const [hoveredBar, setHoveredBar] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [focusedBarIndex, setFocusedBarIndex] = React.useState<number>(-1);
  const barRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Drag and drop state
  const [draggedBar, setDraggedBar] = React.useState<Bar | null>(null);
  const [dragOverPosition, setDragOverPosition] = React.useState<{ row: number; col: number } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dropAction, setDropAction] = React.useState<'move' | 'swap' | 'blocked' | null>(null);
  const [mousePosition, setMousePosition] = React.useState<{ x: number; y: number } | null>(null);

  // Convert establishments to visual bars
  const establishmentsToVisualBars = useCallback((establishments: Establishment[]): Bar[] => {
    return establishments
      .filter(est => {
        if (est.zone !== 'treetown' || !est.grid_row || !est.grid_col) return false;
        const row = est.grid_row;
        const col = est.grid_col;

        // MASKED POSITIONS
        if ((row === 2 && col === 1) || (row === 2 && col === 10)) return false;

        if (row >= 1 && row <= 2) return col >= 1 && col <= 10;
        if (row >= 3 && row <= 8) return col >= 1 && col <= 2;
        if (row >= 9 && row <= 14) return col >= 1 && col <= 2;
        return false;
      })
      .map(est => {
        const barType = CATEGORY_TO_TYPE_MAP[est.category_id] || 'beer';
        const style = TYPE_STYLES[barType];
        const { x, y } = calculateResponsivePosition(est.grid_row || 1, est.grid_col || 1, isMobile, containerRef.current || undefined);

        return {
          id: est.id,
          name: est.name,
          type: barType,
          position: { x, y },
          color: style.color,
          icon: style.icon,
          grid_row: est.grid_row || 1,
          grid_col: est.grid_col || 1
        };
      });
  }, [isMobile]);

  const allBars = useMemo(() => {
    const bars = establishmentsToVisualBars(establishments);

    if (optimisticPositions.size > 0) {
      const updatedBars = bars.map(bar => {
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

      // Add missing bars with optimistic positions
      const existingBarIds = new Set(bars.map(b => b.id));
      const missingBars: Bar[] = [];

      optimisticPositions.forEach((pos, establishmentId) => {
        if (!existingBarIds.has(establishmentId)) {
          const establishment = establishments.find(est => est.id === establishmentId);
          if (establishment) {
            const barType = CATEGORY_TO_TYPE_MAP[establishment.category_id] || 'beer';
            const style = TYPE_STYLES[barType];
            const { x, y } = calculateResponsivePosition(pos.row, pos.col, isMobile, containerRef.current || undefined);

            missingBars.push({
              id: establishment.id,
              name: establishment.name,
              type: barType,
              position: { x, y },
              color: style.color,
              icon: style.icon,
              grid_row: pos.row,
              grid_col: pos.col
            });
          }
        }
      });

      return [...updatedBars, ...missingBars];
    }

    return bars;
  }, [establishments, isMobile, optimisticPositions, establishmentsToVisualBars]);

  const handleBarClick = useCallback((bar: Bar) => {
    if (isEditMode) return;
    const establishment = establishments.find(est => est.id === bar.id);
    if (establishment && onEstablishmentClick) {
      onEstablishmentClick(establishment);
    } else if (onBarClick) {
      onBarClick({ id: bar.id, name: bar.name, type: bar.type, position: bar.position, color: bar.color });
    } else {
      navigate(generateEstablishmentUrl(bar.id, bar.name, establishment?.zone || 'treetown'));
    }
  }, [establishments, onEstablishmentClick, onBarClick, navigate, isEditMode]);

  // canEdit from hook replaces isAdmin check

  const currentBarSize = useMemo(() => {
    if (containerRef.current) {
      const { barWidth } = calculateResponsivePosition(1, 1, isMobile, containerRef.current);
      return barWidth;
    }
    return isMobile ? 35 : 40;
  }, [isMobile]);

  const getEstablishmentIcon = useCallback((barId: string, establishments: Establishment[], fallbackIcon: string) => {
    const establishment = establishments.find(est => est.id === barId);
    if (establishment?.logo_url) {
      return (
        <div className="map-logo-container-nightlife">
          <LazyImage
            src={establishment.logo_url}
            alt={establishment.name}
            cloudinaryPreset="establishmentLogo"
            className="map-logo-image-nightlife"
            objectFit="contain"
          />
        </div>
      );
    }
    return fallbackIcon;
  }, []);

  // Find bar at specific grid position
  const findBarAtPosition = useCallback((row: number, col: number): Bar | null => {
    const bar = allBars.find(b => b.grid_row === row && b.grid_col === col);
    if (bar) {
      if ((row === 2 && col === 1) || (row === 2 && col === 10)) return null;
      if (row >= 1 && row <= 2) return col >= 1 && col <= 10 ? bar : null;
      if (row >= 3 && row <= 8) return col >= 1 && col <= 2 ? bar : null;
      if (row >= 9 && row <= 14) return col >= 1 && col <= 2 ? bar : null;
      return null;
    }
    return null;
  }, [allBars]);

  // Convert mouse position to grid position (U-shaped detection)
  const getGridFromMousePosition = useCallback((event: React.DragEvent | React.TouchEvent): { row: number; col: number } | null => {
    if (!containerRef.current) return null;

    const coords = getEventCoordinates(event);
    if (!coords) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = coords.clientX - rect.left;
    const relativeY = coords.clientY - rect.top;

    const containerWidth = rect.width;
    const containerHeight = rect.height;

    const topY = containerHeight * 0.22;
    const leftX = containerWidth * 0.20;
    const rightX = containerWidth * 0.80;
    const bottomY = containerHeight * 0.92;

    const horizontalZoneTop = topY - 80;
    const horizontalZoneBottom = topY + 80;
    const leftVerticalZoneRight = leftX + 80;
    const rightVerticalZoneLeft = rightX - 80;

    if (relativeY >= horizontalZoneTop && relativeY <= horizontalZoneBottom) {
      // HORIZONTAL SEGMENT (Rows 1-2)
      const row = relativeY < topY ? 1 : 2;
      const segmentStartX = leftX;
      const segmentWidth = rightX - leftX;
      const idealBarWidth = Math.min(45, Math.max(25, segmentWidth / 10 - 8));
      const spacing = (segmentWidth - (10 * idealBarWidth)) / 11;

      let col = 1;
      const barRadius = idealBarWidth / 2;
      const relativeXInSegment = relativeX - segmentStartX;

      for (let testCol = 1; testCol <= 10; testCol++) {
        const barCenterX = spacing + (testCol - 1) * (idealBarWidth + spacing);
        if (Math.abs(relativeXInSegment - barCenterX) <= barRadius) {
          col = testCol;
          break;
        }
      }

      if ((row === 2 && col === 1) || (row === 2 && col === 10)) return null;
      return { row, col };

    } else if (relativeX < leftVerticalZoneRight && relativeY > horizontalZoneBottom) {
      // LEFT VERTICAL SEGMENT (Rows 3-8)
      const segmentHeight = bottomY - topY;
      const idealBarWidth = Math.min(45, Math.max(25, segmentHeight / 6 - 8));
      const spacing = (segmentHeight - (6 * idealBarWidth)) / 7;

      let row = 3;
      const barRadius = idealBarWidth / 2;
      const relativeYInSegment = relativeY - topY;

      for (let verticalIndex = 0; verticalIndex < 6; verticalIndex++) {
        const barCenterY = spacing + verticalIndex * (idealBarWidth + spacing);
        if (Math.abs(relativeYInSegment - barCenterY) <= barRadius) {
          row = 3 + verticalIndex;
          break;
        }
      }

      const col = relativeX < leftX ? 1 : 2;
      return { row, col };

    } else if (relativeX > rightVerticalZoneLeft && relativeY > horizontalZoneBottom) {
      // RIGHT VERTICAL SEGMENT (Rows 9-14)
      const segmentHeight = bottomY - topY;
      const idealBarWidth = Math.min(45, Math.max(25, segmentHeight / 6 - 8));
      const spacing = (segmentHeight - (6 * idealBarWidth)) / 7;

      let row = 9;
      const barRadius = idealBarWidth / 2;
      const relativeYInSegment = relativeY - topY;

      for (let verticalIndex = 0; verticalIndex < 6; verticalIndex++) {
        const barCenterY = spacing + verticalIndex * (idealBarWidth + spacing);
        if (Math.abs(relativeYInSegment - barCenterY) <= barRadius) {
          row = 9 + verticalIndex;
          break;
        }
      }

      const col = relativeX < rightX ? 1 : 2;
      return { row, col };
    }

    return null;
  }, []);

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
        targetBar = allBars.filter(b => b.grid_row === currentRow && (b.grid_col || 1) > currentCol).sort((a, b) => (a.grid_col || 1) - (b.grid_col || 1))[0] || null;
        break;
      case 'ArrowLeft':
        targetBar = allBars.filter(b => b.grid_row === currentRow && (b.grid_col || 1) < currentCol).sort((a, b) => (b.grid_col || 1) - (a.grid_col || 1))[0] || null;
        break;
      case 'ArrowUp':
        targetBar = allBars.filter(b => (b.grid_row || 1) < currentRow).sort((a, b) => {
          const rowDiff = (b.grid_row || 1) - (a.grid_row || 1);
          if (rowDiff !== 0) return rowDiff;
          return Math.abs((a.grid_col || 1) - currentCol) - Math.abs((b.grid_col || 1) - currentCol);
        })[0] || null;
        break;
      case 'ArrowDown':
        targetBar = allBars.filter(b => (b.grid_row || 1) > currentRow).sort((a, b) => {
          const rowDiff = (a.grid_row || 1) - (b.grid_row || 1);
          if (rowDiff !== 0) return rowDiff;
          return Math.abs((a.grid_col || 1) - currentCol) - Math.abs((b.grid_col || 1) - currentCol);
        })[0] || null;
        break;
    }

    if (targetBar) {
      const targetIndex = allBars.findIndex(b => b.id === targetBar.id);
      if (targetIndex !== -1) {
        setFocusedBarIndex(targetIndex);
        barRefs.current.get(targetBar.id)?.focus();
      }
    }
  }, [allBars, focusedBarIndex, isEditMode]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, bar: Bar) => {
    if (Date.now() < operationLockUntil) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.effectAllowed = 'move';
    setDraggedBar(bar);
    setIsDragging(true);
    triggerHaptic('tap');

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, [operationLockUntil]);

  const handleDragOver = useCallback((e: React.DragEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDragging || !draggedBar) return;

    const coords = getEventCoordinates(e);
    if (!coords) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePosition({ x: coords.clientX - rect.left, y: coords.clientY - rect.top });
    }

    const gridPos = getGridFromMousePosition(e);
    if (!gridPos) {
      setDropAction('blocked');
      setDragOverPosition(null);
      return;
    }

    setDragOverPosition(gridPos);
    const barAtPosition = findBarAtPosition(gridPos.row, gridPos.col);

    if (!barAtPosition) {
      setDropAction('move');
    } else if (barAtPosition.id === draggedBar.id) {
      setDropAction('blocked');
    } else {
      setDropAction('swap');
    }
  }, [isDragging, draggedBar, getGridFromMousePosition, findBarAtPosition]);

  const resetDragState = useCallback(() => {
    setDraggedBar(null);
    setDragOverPosition(null);
    setIsDragging(false);
    setDropAction(null);
    setMousePosition(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();

    if (!draggedBar || !dragOverPosition || dropAction === 'blocked') {
      resetDragState();
      return;
    }

    const { row, col } = dragOverPosition;
    const conflictBar = findBarAtPosition(row, col);
    const actualAction = conflictBar ? 'swap' : 'move';

    const loadingTimeout = setTimeout(() => {
      logger.warn('Loading timeout - resetting states');
      setIsLoading(false);
      resetDragState();
    }, 10000);

    try {
      setIsLoading(true);

      if (actualAction === 'move') {
        const establishment = establishments.find(est => est.id === draggedBar.id);
        if (!establishment) return;

        applyOptimisticPosition(establishment.id, { row, col });

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/grid-move-workaround`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            establishmentId: establishment.id,
            grid_row: row,
            grid_col: col,
            zone: 'treetown'
          })
        });

        if (response.ok) {
          triggerHaptic('success');
          setOperationLock(500);
        } else {
          clearOptimisticPosition(establishment.id);
          toast.error(`Move failed: ${response.status}`);
        }

      } else if (actualAction === 'swap' && conflictBar) {
        const draggedEst = establishments.find(est => est.id === draggedBar.id);
        const conflictEst = establishments.find(est => est.id === conflictBar.id);
        if (!draggedEst || !conflictEst) return;

        const draggedOriginal = { row: draggedEst.grid_row || 1, col: draggedEst.grid_col || 1 };

        applyOptimisticPosition(draggedEst.id, { row, col });
        applyOptimisticPosition(conflictEst.id, { row: draggedOriginal.row, col: draggedOriginal.col });

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/grid-move-workaround`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            establishmentId: draggedEst.id,
            grid_row: row,
            grid_col: col,
            zone: 'treetown',
            swap_with_id: conflictEst.id
          })
        });

        if (response.ok) {
          triggerHaptic('swap');
          setOperationLock(500);
        } else {
          clearOptimisticPosition(draggedEst.id);
          clearOptimisticPosition(conflictEst.id);
          toast.error(`Swap failed: ${response.status}`);
        }
      }

    } catch (error) {
      logger.error('Drop error:', error);
      toast.error('Network error');
    } finally {
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      resetDragState();
    }
  }, [draggedBar, dragOverPosition, dropAction, findBarAtPosition, establishments, applyOptimisticPosition, clearOptimisticPosition, setOperationLock, resetDragState]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent, bar: Bar) => {
    if (isLoading || Date.now() < operationLockUntil) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    triggerHaptic('tap');
    setDraggedBar(bar);
    setIsDragging(true);
  }, [isLoading, operationLockUntil]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !draggedBar) return;
    e.preventDefault();
    handleDragOver(e);
  }, [isDragging, draggedBar, handleDragOver]);

  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    e.preventDefault();

    if (!draggedBar || !dragOverPosition || dropAction === 'blocked') {
      resetDragState();
      return;
    }

    triggerHaptic('success');

    const { row, col } = dragOverPosition;
    const conflictBar = findBarAtPosition(row, col);
    const actualAction = conflictBar ? 'swap' : 'move';

    try {
      setIsLoading(true);

      if (actualAction === 'move') {
        const establishment = establishments.find(est => est.id === draggedBar.id);
        if (!establishment) return;

        applyOptimisticPosition(establishment.id, { row, col });

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/grid-move-workaround`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            establishmentId: establishment.id,
            grid_row: row,
            grid_col: col,
            zone: 'treetown'
          })
        });

        if (!response.ok) {
          clearOptimisticPosition(establishment.id);
          toast.error(`Move failed: ${response.status}`);
        } else {
          setOperationLock(500);
        }

      } else if (actualAction === 'swap' && conflictBar) {
        const draggedEst = establishments.find(est => est.id === draggedBar.id);
        const conflictEst = establishments.find(est => est.id === conflictBar.id);
        if (!draggedEst || !conflictEst) return;

        const draggedOriginal = { row: draggedEst.grid_row || 1, col: draggedEst.grid_col || 1 };

        applyOptimisticPosition(draggedEst.id, { row, col });
        applyOptimisticPosition(conflictEst.id, { row: draggedOriginal.row, col: draggedOriginal.col });

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/grid-move-workaround`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            establishmentId: draggedEst.id,
            grid_row: row,
            grid_col: col,
            zone: 'treetown',
            swap_with_id: conflictEst.id
          })
        });

        if (!response.ok) {
          clearOptimisticPosition(draggedEst.id);
          clearOptimisticPosition(conflictEst.id);
          toast.error(`Swap failed: ${response.status}`);
        } else {
          setOperationLock(500);
        }
      }

    } catch (error) {
      logger.error('Touch drop error:', error);
      toast.error('Network error');
    } finally {
      setIsLoading(false);
      resetDragState();
    }
  }, [draggedBar, dragOverPosition, dropAction, findBarAtPosition, establishments, applyOptimisticPosition, clearOptimisticPosition, setOperationLock, resetDragState]);

  // Grid debug visualization
  const renderGridDebug = (barSize: number) => {
    if (!isEditMode || !containerRef.current) return null;

    const gridCells: React.ReactElement[] = [];
    const gridSize = barSize;

    // Horizontal main street: rows 1-2, cols 1-10
    for (let row = 1; row <= 2; row++) {
      for (let col = 1; col <= 10; col++) {
        if ((row === 2 && col === 1) || (row === 2 && col === 10)) continue;

        const { x, y } = calculateResponsivePosition(row, col, isMobile, containerRef.current);
        gridCells.push(
          <div
            key={`grid-${row}-${col}`}
            style={{
              position: 'absolute',
              left: `${x - gridSize/2}px`,
              top: `${y - gridSize/2}px`,
              width: `${gridSize}px`,
              height: `${gridSize}px`,
              border: '2px dashed #FFD700',
              background: 'rgba(255,215,0,0.1)',
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              color: '#FFD700',
              fontWeight: 'bold',
            }}
          >
            {row},{col}
          </div>
        );
      }
    }

    // Left vertical: rows 3-8, cols 1-2
    for (let row = 3; row <= 8; row++) {
      for (let col = 1; col <= 2; col++) {
        const { x, y } = calculateResponsivePosition(row, col, isMobile, containerRef.current);
        gridCells.push(
          <div
            key={`grid-${row}-${col}`}
            style={{
              position: 'absolute',
              left: `${x - gridSize/2}px`,
              top: `${y - gridSize/2}px`,
              width: `${gridSize}px`,
              height: `${gridSize}px`,
              border: '2px dashed #C19A6B',
              background: 'rgba(193, 154, 107,0.1)',
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              color: '#C19A6B',
              fontWeight: 'bold',
            }}
          >
            {row},{col}
          </div>
        );
      }
    }

    // Right vertical: rows 9-14, cols 1-2
    for (let row = 9; row <= 14; row++) {
      for (let col = 1; col <= 2; col++) {
        const { x, y } = calculateResponsivePosition(row, col, isMobile, containerRef.current);
        gridCells.push(
          <div
            key={`grid-${row}-${col}`}
            style={{
              position: 'absolute',
              left: `${x - gridSize/2}px`,
              top: `${y - gridSize/2}px`,
              width: `${gridSize}px`,
              height: `${gridSize}px`,
              border: '2px dashed #00E5FF',
              background: 'rgba(0,255,255,0.1)',
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              color: '#00E5FF',
              fontWeight: 'bold',
            }}
          >
            {row},{col}
          </div>
        );
      }
    }

    return gridCells;
  };

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`map-container-nightlife ${isEditMode ? 'edit-mode' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        background: 'linear-gradient(135deg, rgba(193, 154, 107,0.2), rgba(0,255,255,0.1), rgba(13,0,25,0.95))',
        overflow: 'hidden'
      }}
      onKeyDown={handleKeyboardNavigation}
      role="region"
      aria-label="Interactive U-shaped map of Tree Town establishments"
    >
      <p id="treetown-map-description" className="sr-only">
        Interactive U-shaped map displaying {allBars.length} establishments in Tree Town.
        {isEditMode ? ' Edit mode active: drag establishments to reposition them.' : ' Click on establishments to view details.'}
      </p>

      <ScreenReaderEstablishmentList
        establishments={establishments}
        zone="treetown"
        onEstablishmentSelect={(est) => onEstablishmentClick?.(est)}
      />

      {canEdit && (
        <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 20 }}>
          <button
            onClick={() => setEditMode(!isEditMode)}
            aria-pressed={isEditMode}
            style={{
              background: isEditMode ? 'linear-gradient(135deg, #FF6B6B, #FF8E53)' : 'linear-gradient(135deg, #4ECDC4, #44A08D)',
              color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px',
              fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
          >
            {isEditMode ? '🔒 Exit Edit' : '✏️ Edit Mode'}
          </button>
        </div>
      )}

      <div className="map-title-compact-nightlife" style={{
        color: '#C19A6B',
        textShadow: '0 0 20px rgba(193, 154, 107,0.8), 2px 2px 4px rgba(0,0,0,0.8)',
        border: '1px solid rgba(193, 154, 107,0.4)'
      }}>
        🌳 TREE TOWN
      </div>

      <TreeTownRoad isEditMode={isEditMode} />

      {renderGridDebug(currentBarSize)}

      <DragDropIndicator
        isEditMode={isEditMode}
        isDragging={isDragging}
        mousePosition={mousePosition}
        dropAction={dropAction}
        draggedBar={draggedBar}
        dragOverPosition={dragOverPosition}
        currentBarSize={currentBarSize}
      />

      {allBars.map((bar, index) => {
        const isSelected = selectedEstablishment === bar.id;
        const isHovered = hoveredBar === bar.id;
        const establishment = establishments.find(est => est.id === bar.id);

        const categoryName = establishment?.category_id === 2 ? 'GoGo Bar'
          : establishment?.category_id === 1 ? 'Bar'
          : establishment?.category_id === 3 ? 'Massage Salon'
          : establishment?.category_id === 4 ? 'Nightclub'
          : 'Establishment';

        const isVIP = establishment?.is_vip && establishment?.vip_expires_at &&
          new Date(establishment.vip_expires_at) > new Date();

        const vipSizeMultiplier = window.innerWidth < 480 ? 1.15
                                : window.innerWidth < 768 ? 1.25
                                : 1.35;
        const finalBarSize = isVIP ? Math.round(currentBarSize * vipSizeMultiplier) : currentBarSize;

        return (
          <div
            key={bar.id}
            className={isVIP ? 'vip-establishment-marker' : ''}
            ref={(el) => {
              if (el) barRefs.current.set(bar.id, el);
              else barRefs.current.delete(bar.id);
            }}
            role="button"
            tabIndex={0}
            aria-label={`${bar.name}, ${categoryName}${isVIP ? ', VIP' : ''}`}
            aria-pressed={isSelected}
            draggable={isEditMode}
            onDragStart={(e) => handleDragStart(e, bar)}
            onDragEnd={resetDragState}
            onTouchStart={isEditMode ? (e) => handleTouchStart(e, bar) : undefined}
            onTouchMove={isEditMode ? handleTouchMove : undefined}
            onTouchEnd={isEditMode ? handleTouchEnd : undefined}
            onClick={() => handleBarClick(bar)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleBarClick(bar);
              }
            }}
            onMouseEnter={() => setHoveredBar(bar.id)}
            onMouseLeave={() => setHoveredBar(null)}
            onFocus={() => {
              setHoveredBar(bar.id);
              setFocusedBarIndex(index);
            }}
            onBlur={() => setHoveredBar(null)}
            style={{
              touchAction: isEditMode ? 'none' : 'auto',
              position: 'absolute',
              left: `${bar.position.x - finalBarSize/2}px`,
              top: `${bar.position.y - finalBarSize/2}px`,
              width: `${finalBarSize}px`,
              height: `${finalBarSize}px`,
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, ${bar.color}FF, ${bar.color}DD 60%, ${bar.color}AA 100%)`,
              border: isVIP ? '5px solid #FFD700'
                : isSelected ? '3px solid #FFD700'
                : isEditMode ? (bar.id === draggedBar?.id ? '3px solid #00FF00' : '2px solid #00FF00')
                : '2px solid rgba(255,255,255,0.6)',
              cursor: isEditMode ? 'grab' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transform: isHovered ? 'scale(1.2)' : 'scale(1)',
              transition: isVIP ? 'none' : 'all 0.3s ease',
              boxShadow: isVIP ? undefined
                : isHovered ? `0 0 25px ${TYPE_STYLES[bar.type].shadow}`
                : isEditMode ? '0 0 15px rgba(0,255,0,0.5)'
                : `0 0 12px ${bar.color}66`,
              zIndex: isHovered ? 15 : bar.id === draggedBar?.id ? 20 : 10,
              opacity: bar.id === draggedBar?.id ? 0.5 : 1
            }}
          >
            {getEstablishmentIcon(bar.id, establishments, bar.icon)}

            {isVIP && (
              <>
                <div className="vip-crown" style={{
                  position: 'absolute', top: '-35px', left: '50%',
                  transform: 'translateX(-50%)', zIndex: 5, pointerEvents: 'none'
                }}>
                  👑
                </div>
                <div className="vip-badge">VIP</div>
              </>
            )}

            {isHovered && (
              <div
                role="tooltip"
                style={{
                  position: 'absolute', bottom: '45px', left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.9)', color: '#fff', padding: '5px 10px',
                  borderRadius: '5px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap',
                  zIndex: 20, border: '1px solid #C19A6B'
                }}
              >
                {bar.name}
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        [role="button"]:focus {
          outline: 3px solid #FFD700;
          outline-offset: 4px;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }
      `}</style>
    </div>
  );
};

export default CustomTreetownMap;
