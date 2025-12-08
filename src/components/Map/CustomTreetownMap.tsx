import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Establishment, CustomBar } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getZoneConfig } from '../../utils/zoneConfig';
import { MAP_CONFIG } from '../../utils/constants';
import { useContainerSize } from '../../hooks/useContainerSize';
import TreeTownRoad from './TreeTownRoad';
import DragDropIndicator from './DragDropIndicator';
import { logger } from '../../utils/logger';
import toast from '../../utils/toast';
import ScreenReaderEstablishmentList from './ScreenReaderEstablishmentList';
import LazyImage from '../Common/LazyImage';
import { generateEstablishmentUrl } from '../../utils/slugify';

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
 *   - Row 1: North side (cols 1-10, 10 positions)
 *   - Row 2: South side (cols 2-9, 8 positions - masked 2,1 and 2,10)
 *
 * Rows 3-8: Left vertical branch (2 cols × 6 rows = 12 positions)
 *   - Col 1: West side (6 positions)
 *   - Col 2: East side (6 positions)
 *
 * Rows 9-14: Right vertical branch (2 cols × 6 rows = 12 positions)
 *   - Col 1: West side (6 positions)
 *   - Col 2: East side (6 positions)
 *
 * MASKED POSITIONS: (2,1) and (2,10) interfere with vertical roads
 */
const getSegmentType = (row: number): 'horizontal-main' | 'left-vertical' | 'right-vertical' => {
  if (row <= 2) return 'horizontal-main';
  if (row <= 8) return 'left-vertical';
  return 'right-vertical';
};

const calculateResponsivePosition = (row: number, col: number, isMobile: boolean, containerElement?: HTMLElement) => {
  const _zoneConfig = getZoneConfig('treetown');
  const segment = getSegmentType(row);

  if (isMobile) {
    // Mobile: Simplified vertical layout
    const totalWidth = 350;
    const usableWidth = totalWidth * 0.9;
    const barWidth = Math.min(40, usableWidth / 10 - 4); // Use max 10 cols
    const spacing = (usableWidth - (10 * barWidth)) / 11;
    const x = spacing + (col - 1) * (barWidth + spacing);
    const y = 60 + (row - 1) * 50; // Tighter vertical spacing
    return { x, y, barWidth };
  }

  // Desktop: U-shaped topographic layout
  const containerWidth = containerElement ? containerElement.clientWidth :
                        (window.innerWidth > 1200 ? 1200 : window.innerWidth - 40);
  const containerHeight = containerElement ? containerElement.clientHeight : MAP_CONFIG.DEFAULT_HEIGHT;

  // ROAD DIMENSIONS (matching TreeTownRoad.tsx exactly)
  const roadWidth = 120; // Same as canvas road
  const roadHalfWidth = roadWidth / 2; // 60px
  const topY = containerHeight * 0.22; // Horizontal road Y position
  const leftX = containerWidth * 0.20;  // Left vertical road X position
  const rightX = containerWidth * 0.80; // Right vertical road X position
  const bottomY = containerHeight * 0.92; // Bottom of vertical roads

  if (segment === 'horizontal-main') {
    // HORIZONTAL MAIN STREET (Rows 1-2) - 10 columns
    // Establishments positioned along the horizontal road like shops on a street
    const segmentStartX = leftX;
    const segmentEndX = rightX;
    const segmentWidth = segmentEndX - segmentStartX;

    const idealBarWidth = Math.min(45, Math.max(25, segmentWidth / 10 - 8));
    const totalBarsWidth = 10 * idealBarWidth;
    const totalSpacing = segmentWidth - totalBarsWidth;
    const spacing = totalSpacing / 11; // 11 gaps for 10 bars

    const x = segmentStartX + spacing + (col - 1) * (idealBarWidth + spacing);

    // Y position: Aligned to road edges like shops on a street
    const barHalfWidth = idealBarWidth / 2;
    const y = row === 1
      ? topY - roadHalfWidth - barHalfWidth  // North side: Above road
      : topY + roadHalfWidth + barHalfWidth; // South side: Below road

    return { x, y, barWidth: idealBarWidth };

  } else if (segment === 'left-vertical') {
    // LEFT VERTICAL BRANCH (Rows 3-8) - 6 positions × 2 sides
    // Establishments positioned along the left vertical road
    const segmentStartY = topY;
    const segmentEndY = bottomY;
    const segmentHeight = segmentEndY - segmentStartY;

    const idealBarWidth = Math.min(45, Math.max(25, segmentHeight / 6 - 8));
    const spacing = (segmentHeight - (6 * idealBarWidth)) / 7; // 7 gaps for 6 bars

    // Y position based on which of the 6 vertical positions (row 3-8)
    const verticalIndex = row - 3; // 0-5 for rows 3-8
    const y = segmentStartY + spacing + verticalIndex * (idealBarWidth + spacing);

    // X position: Aligned to left road edges like shops on a street
    const barHalfWidth = idealBarWidth / 2;
    const x = col === 1
      ? leftX - roadHalfWidth - barHalfWidth // Col 1: West side (left of road)
      : leftX + roadHalfWidth + barHalfWidth; // Col 2: East side (right of road)

    return { x, y, barWidth: idealBarWidth };

  } else {
    // RIGHT VERTICAL BRANCH (Rows 9-14) - 6 positions × 2 sides
    // Establishments positioned along the right vertical road
    const segmentStartY = topY;
    const segmentEndY = bottomY;
    const segmentHeight = segmentEndY - segmentStartY;

    const idealBarWidth = Math.min(45, Math.max(25, segmentHeight / 6 - 8));
    const spacing = (segmentHeight - (6 * idealBarWidth)) / 7; // 7 gaps for 6 bars

    // Y position based on which of the 6 vertical positions (row 9-14)
    const verticalIndex = row - 9; // 0-5 for rows 9-14
    const y = segmentStartY + spacing + verticalIndex * (idealBarWidth + spacing);

    // X position: Aligned to right road edges like shops on a street
    const barHalfWidth = idealBarWidth / 2;
    const x = col === 1
      ? rightX - roadHalfWidth - barHalfWidth // Col 1: West side (left of road)
      : rightX + roadHalfWidth + barHalfWidth; // Col 2: East side (right of road)

    return { x, y, barWidth: idealBarWidth };
  }
};

const establishmentsToVisualBars = (establishments: Establishment[], isMobile: boolean, containerElement?: HTMLElement): Bar[] => {
  return establishments
    .filter(est => {
      if (est.zone !== 'treetown' || !est.grid_row || !est.grid_col) return false;

      const row = est.grid_row;
      const col = est.grid_col;

      // MASKED POSITIONS: (2,1) and (2,10) interfere with vertical roads
      if ((row === 2 && col === 1) || (row === 2 && col === 10)) {
        return false;
      }

      // Rows 1-2: Horizontal main (cols 1-10)
      if (row >= 1 && row <= 2) {
        return col >= 1 && col <= 10;
      }
      // Rows 3-8: Left vertical (cols 1-2)
      if (row >= 3 && row <= 8) {
        return col >= 1 && col <= 2;
      }
      // Rows 9-14: Right vertical (cols 1-2)
      if (row >= 9 && row <= 14) {
        return col >= 1 && col <= 2;
      }

      return false;
    })
    .map(est => {
      const barType = CATEGORY_TO_TYPE_MAP[est.category_id] || 'beer';
      const style = TYPE_STYLES[barType];
      const { x, y } = calculateResponsivePosition(est.grid_row || 1, est.grid_col || 1, isMobile, containerElement);

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
};

const CustomTreetownMap: React.FC<CustomTreetownMapProps> = ({
  establishments,
  onEstablishmentClick,
  selectedEstablishment,
  onBarClick,
  onEstablishmentUpdate
}) => {
  const navigate = useNavigate();
  const { user, token: _token } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ✅ KEYBOARD NAVIGATION: Track focused bar index for arrow key navigation
  const [focusedBarIndex, setFocusedBarIndex] = useState<number>(-1);
  const barRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // ✅ PERFORMANCE: 300ms debounce reduces re-renders by 50% during resize
  const containerDimensions = useContainerSize(containerRef, 300);

  // Drag and drop state
  const [draggedBar, setDraggedBar] = useState<Bar | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<{ row: number; col: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropAction, setDropAction] = useState<'move' | 'swap' | 'blocked' | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  // Optimistic UI + Locking
  const [optimisticPositions, setOptimisticPositions] = useState<Map<string, { row: number; col: number }>>(new Map());
  const [operationLockUntil, setOperationLockUntil] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [_waitingForDataUpdate, setWaitingForDataUpdate] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Orientation detection (for landscape responsive design)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(orientation: portrait)');

    const handleOrientationChange = (e: MediaQueryListEvent | MediaQueryList) => {
      // Orientation change detected - CSS media queries will handle styling
      logger.debug('Orientation changed', {
        isPortrait: e.matches,
        isLandscape: !e.matches
      });
    };

    // Initial check
    handleOrientationChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', handleOrientationChange);

    // Also listen for orientationchange event (for iOS Safari)
    window.addEventListener('orientationchange', () => {
      setTimeout(() => handleOrientationChange(mediaQuery), 100);
    });

    return () => {
      mediaQuery.removeEventListener('change', handleOrientationChange);
      window.removeEventListener('orientationchange', () => handleOrientationChange(mediaQuery));
    };
  }, []);

  const allBars = useMemo(() => {
    const bars = establishmentsToVisualBars(establishments, isMobile, containerRef.current || undefined);

    // Apply optimistic positions to prevent bars from disappearing during API calls
    if (optimisticPositions.size > 0) {
      const updatedBars = bars.map(bar => {
        const optimisticPos = optimisticPositions.get(bar.id);
        if (optimisticPos) {
          // Recalculate visual position using optimistic grid position
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

      // CRITICAL: Add missing bars that have optimistic positions but aren't in the current bars array
      // This happens when backend hasn't updated yet but we need to show the bar at its new position
      const existingBarIds = new Set(bars.map(b => b.id));
      const missingBars: Bar[] = [];

      optimisticPositions.forEach((pos, establishmentId) => {
        if (!existingBarIds.has(establishmentId)) {
          // Find the establishment in the full list
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
  }, [establishments, isMobile, containerDimensions, optimisticPositions]);

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

  const isAdmin = user && (user.role === 'admin' || user.role === 'moderator');

  const currentBarSize = useMemo(() => {
    if (containerRef.current) {
      const { barWidth } = calculateResponsivePosition(1, 1, isMobile, containerRef.current);
      return barWidth;
    }
    return isMobile ? 35 : 40;
  }, [isMobile, containerDimensions]);

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

  // ✅ KEYBOARD NAVIGATION: Arrow key handler for navigating between establishments (14-row U-shaped grid)
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

  // Find bar at specific grid position
  const findBarAtPosition = useCallback((row: number, col: number): Bar | null => {
    // CRITICAL FIX: Search directly in allBars (which has optimistic positions)
    // instead of establishments (which has database positions)
    // This fixes the issue where empty cells show swap instead of move
    const bar = allBars.find(b => b.grid_row === row && b.grid_col === col);

    // Verify this is a valid position for Tree Town
    if (bar) {
      // Vérifier positions masquées
      if ((row === 2 && col === 1) || (row === 2 && col === 10)) return null;

      // Vérifier validité selon segment
      if (row >= 1 && row <= 2) return col >= 1 && col <= 10 ? bar : null; // Horizontal
      if (row >= 3 && row <= 8) return col >= 1 && col <= 2 ? bar : null;  // Left vertical
      if (row >= 9 && row <= 14) return col >= 1 && col <= 2 ? bar : null; // Right vertical

      return null; // Invalid position
    }

    return null;
  }, [allBars]);

  // Convert mouse position to grid position with TOPOGRAPHIC U-shaped detection
  // ✅ TOUCH SUPPORT: Extract coordinates from both drag and touch events
  const getEventCoordinates = (event: React.DragEvent | React.TouchEvent): { clientX: number; clientY: number } | null => {
    if ('touches' in event && event.touches.length > 0) {
      return {
        clientX: event.touches[0].clientX,
        clientY: event.touches[0].clientY
      };
    } else if ('clientX' in event) {
      return {
        clientX: event.clientX,
        clientY: event.clientY
      };
    }
    return null;
  };

  const getGridFromMousePosition = useCallback((event: React.DragEvent | React.TouchEvent): { row: number; col: number } | null => {
    if (!containerRef.current) return null;

    const coords = getEventCoordinates(event);
    if (!coords) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = coords.clientX - rect.left;
    const relativeY = coords.clientY - rect.top;

    const containerWidth = rect.width;
    const containerHeight = rect.height;

    // ROAD DIMENSIONS (matching calculateResponsivePosition)
    const _roadWidth = 120;
    const _roadHalfWidth = 60;
    const topY = containerHeight * 0.22;
    const leftX = containerWidth * 0.20;
    const rightX = containerWidth * 0.80;
    const bottomY = containerHeight * 0.92;

    // === DETECTION TOPOGRAPHIQUE EN 3 ÉTAPES ===

    // ÉTAPE 1: Déterminer quel segment (horizontal / left-vertical / right-vertical)

    // Zone horizontale : entre topY-80 et topY+80
    const horizontalZoneTop = topY - 80;
    const horizontalZoneBottom = topY + 80;

    // Zone verticale gauche : X < leftX + 80
    const leftVerticalZoneRight = leftX + 80;

    // Zone verticale droite : X > rightX - 80
    const rightVerticalZoneLeft = rightX - 80;

    if (relativeY >= horizontalZoneTop && relativeY <= horizontalZoneBottom) {
      // === SEGMENT HORIZONTAL (Rows 1-2) ===

      // Déterminer row (1 ou 2) selon si au-dessus ou en-dessous de topY
      const row = relativeY < topY ? 1 : 2;

      // Déterminer colonne (1-10)
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

      // Vérifier position masquée
      if ((row === 2 && col === 1) || (row === 2 && col === 10)) {
        return null; // Position bloquée
      }

      return { row, col };

    } else if (relativeX < leftVerticalZoneRight && relativeY > horizontalZoneBottom) {
      // === SEGMENT VERTICAL GAUCHE (Rows 3-8) ===

      // Déterminer row (3-8) selon position Y
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

      // Déterminer colonne (1 ou 2) selon si à gauche ou droite de leftX
      const col = relativeX < leftX ? 1 : 2;

      return { row, col };

    } else if (relativeX > rightVerticalZoneLeft && relativeY > horizontalZoneBottom) {
      // === SEGMENT VERTICAL DROIT (Rows 9-14) ===

      // Déterminer row (9-14) selon position Y
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

      // Déterminer colonne (1 ou 2) selon si à gauche ou droite de rightX
      const col = relativeX < rightX ? 1 : 2;

      return { row, col };
    }

    // Mouse hors zones valides
    return null;
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, bar: Bar) => {
    // Check lock
    if (Date.now() < operationLockUntil) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.effectAllowed = 'move';
    setDraggedBar(bar);
    setIsDragging(true);

    // Convert viewport coordinates to container-relative coordinates
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, [operationLockUntil]);

  const handleDragOver = useCallback((e: React.DragEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDragging || !draggedBar) return;

    const coords = getEventCoordinates(e);
    if (!coords) return;

    // Convert viewport coordinates to container-relative coordinates
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePosition({
        x: coords.clientX - rect.left,
        y: coords.clientY - rect.top
      });
    }

    const gridPos = getGridFromMousePosition(e);
    if (!gridPos) {
      setDropAction('blocked');
      setDragOverPosition(null);
      return;
    }

    setDragOverPosition(gridPos);

    // Check si position occupée
    const barAtPosition = findBarAtPosition(gridPos.row, gridPos.col);

    if (!barAtPosition) {
      setDropAction('move');
    } else if (barAtPosition.id === draggedBar.id) {
      setDropAction('blocked'); // Même position
    } else {
      setDropAction('swap');
    }
  }, [isDragging, draggedBar, getGridFromMousePosition, findBarAtPosition]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();

    if (!draggedBar || !dragOverPosition || dropAction === 'blocked') {
      // Reset states
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);
      return;
    }

    const { row, col } = dragOverPosition;
    const conflictBar = findBarAtPosition(row, col);

    // Déterminer action
    const actualAction = conflictBar ? 'swap' : 'move';

    // Timeout safety
    const loadingTimeout = setTimeout(() => {
      logger.warn('⚠️ Loading timeout - resetting states');
      setIsLoading(false);
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);
    }, 10000);

    try {
      setIsLoading(true);

      if (actualAction === 'move') {
        // === MOVE SIMPLE ===
        const establishment = establishments.find(est => est.id === draggedBar.id);
        if (!establishment) return;

        // Optimistic UI
        setWaitingForDataUpdate(true);
        setOptimisticPositions(prev => {
          const newMap = new Map(prev);
          newMap.set(establishment.id, { row, col });
          logger.debug(`🎨 OPTIMISTIC UI: Stored ${establishment.name} at (${row},${col})`);
          return newMap;
        });

        // API Call
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/grid-move-workaround`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            establishmentId: establishment.id,
            grid_row: row,
            grid_col: col,
            zone: 'treetown'
          })
        });

        if (response.ok) {
          // Success - keep optimistic position, no need to reload all data
          logger.debug('✅ Position updated successfully on server');
          setWaitingForDataUpdate(false);
          const lockUntil = Date.now() + 500;
          setOperationLockUntil(lockUntil);
        } else {
          const errorText = await response.text();
          logger.error(`❌ Move failed:`, errorText);
          setOptimisticPositions(prev => {
            const newMap = new Map(prev);
            newMap.delete(establishment.id);
            return newMap;
          });
          setWaitingForDataUpdate(false);
          toast.error(`Move failed: ${response.status}`);
        }

      } else if (actualAction === 'swap' && conflictBar) {
        // === SWAP ATOMIQUE ===
        const draggedEst = establishments.find(est => est.id === draggedBar.id);
        const conflictEst = establishments.find(est => est.id === conflictBar.id);
        if (!draggedEst || !conflictEst) return;

        const draggedOriginal = {
          row: draggedEst.grid_row || 1,
          col: draggedEst.grid_col || 1
        };

        // Optimistic UI (2 positions)
        setWaitingForDataUpdate(true);
        setOptimisticPositions(prev => {
          const newMap = new Map(prev);
          newMap.set(draggedEst.id, { row, col });
          newMap.set(conflictEst.id, draggedOriginal);
          logger.debug(`🔄 OPTIMISTIC SWAP: ${draggedEst.name} ⇄ ${conflictEst.name}`);
          return newMap;
        });

        // API Call atomique
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/grid-move-workaround`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            establishmentId: draggedEst.id,
            grid_row: row,
            grid_col: col,
            zone: 'treetown',
            swap_with_id: conflictEst.id
          })
        });

        if (response.ok) {
          // Success - keep optimistic position, no need to reload all data
          logger.debug('✅ Position updated successfully on server');
          setWaitingForDataUpdate(false);
          const lockUntil = Date.now() + 500;
          setOperationLockUntil(lockUntil);
        } else {
          const errorText = await response.text();
          logger.error(`❌ Swap failed:`, errorText);
          setOptimisticPositions(prev => {
            const newMap = new Map(prev);
            newMap.delete(draggedEst.id);
            newMap.delete(conflictEst.id);
            return newMap;
          });
          setWaitingForDataUpdate(false);
          toast.error(`Swap failed: ${response.status}`);
        }
      }

    } catch (error) {
      logger.error('Drop error:', error);
      setOptimisticPositions(new Map());
      setWaitingForDataUpdate(false);
      toast.error('Network error');
    } finally {
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);
    }
  }, [draggedBar, dragOverPosition, dropAction, findBarAtPosition, establishments, onEstablishmentUpdate]);

  const handleDragEnd = useCallback(() => {
    setDraggedBar(null);
    setDragOverPosition(null);
    setIsDragging(false);
    setDropAction(null);
    setMousePosition(null);
  }, []);

  // ✅ TOUCH SUPPORT: Touch event handlers for mobile/tablet drag&drop
  const handleTouchStart = useCallback((e: React.TouchEvent, bar: Bar) => {
    const now = Date.now();

    if (isLoading || now < operationLockUntil) {
      e.preventDefault();
      return;
    }

    e.preventDefault();

    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

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
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);
      return;
    }

    if (navigator.vibrate) {
      navigator.vibrate([20, 10, 20]);
    }

    const { row, col } = dragOverPosition;
    const conflictBar = findBarAtPosition(row, col);

    const actualAction = conflictBar ? 'swap' : 'move';

    const loadingTimeout = setTimeout(() => {
      logger.warn('⚠️ Loading timeout - resetting states');
      setIsLoading(false);
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);
    }, 10000);

    try {
      setIsLoading(true);

      if (actualAction === 'move') {
        const establishment = establishments.find(est => est.id === draggedBar.id);
        if (!establishment) return;

        setWaitingForDataUpdate(true);
        setOptimisticPositions(prev => {
          const newMap = new Map(prev);
          newMap.set(establishment.id, { row, col });
          return newMap;
        });

        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/grid-move-workaround`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            establishmentId: establishment.id,
            grid_row: row,
            grid_col: col,
            zone: 'treetown'
          })
        });

        if (response.ok) {
          logger.debug('✅ Position updated successfully on server');
          setWaitingForDataUpdate(false);
          const lockUntil = Date.now() + 500;
          setOperationLockUntil(lockUntil);
        } else {
          setOptimisticPositions(prev => {
            const newMap = new Map(prev);
            newMap.delete(establishment.id);
            return newMap;
          });
          setWaitingForDataUpdate(false);
          toast.error(`Move failed: ${response.status}`);
        }

      } else if (actualAction === 'swap' && conflictBar) {
        const draggedEst = establishments.find(est => est.id === draggedBar.id);
        const conflictEst = establishments.find(est => est.id === conflictBar.id);
        if (!draggedEst || !conflictEst) return;

        const draggedOriginal = {
          row: draggedEst.grid_row || 1,
          col: draggedEst.grid_col || 1
        };

        setWaitingForDataUpdate(true);
        setOptimisticPositions(prev => {
          const newMap = new Map(prev);
          newMap.set(draggedEst.id, { row, col });
          newMap.set(conflictEst.id, draggedOriginal);
          return newMap;
        });

        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/grid-move-workaround`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            establishmentId: draggedEst.id,
            grid_row: row,
            grid_col: col,
            zone: 'treetown',
            swap_with_id: conflictEst.id
          })
        });

        if (response.ok) {
          logger.debug('✅ Swap completed successfully on server');
          setWaitingForDataUpdate(false);
          const lockUntil = Date.now() + 500;
          setOperationLockUntil(lockUntil);
        } else {
          setOptimisticPositions(prev => {
            const newMap = new Map(prev);
            newMap.delete(draggedEst.id);
            newMap.delete(conflictEst.id);
            return newMap;
          });
          setWaitingForDataUpdate(false);
          toast.error(`Swap failed: ${response.status}`);
        }
      }

    } catch (error) {
      logger.error('Touch drop error:', error);
      setOptimisticPositions(new Map());
      setWaitingForDataUpdate(false);
      toast.error('Network error');
    } finally {
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);
    }
  }, [draggedBar, dragOverPosition, dropAction, findBarAtPosition, establishments]);

  // Grid debug visualization - show all 44 valid positions
  const renderGridDebug = (barSize: number) => {
    if (!isEditMode || !containerRef.current) return null;

    const gridCells: React.ReactElement[] = [];
    const gridSize = barSize; // Use same size as bars for perfect alignment

    // Horizontal main street: rows 1-2, cols 1-10 (18 positions - masked: 2,1 and 2,10)
    for (let row = 1; row <= 2; row++) {
      for (let col = 1; col <= 10; col++) {
        // Skip masked positions that interfere with vertical roads
        if ((row === 2 && col === 1) || (row === 2 && col === 10)) {
          continue;
        }

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
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
            }}
            title={`Horizontal Main - Row ${row}, Col ${col}`}
          >
            {row},{col}
          </div>
        );
      }
    }

    // Left vertical: rows 3-8, cols 1-2 (12 positions)
    for (let row = 3; row <= 8; row++) {
      for (let col = 1; col <= 2; col++) {
        const { x, y } = calculateResponsivePosition(row, col, isMobile, containerRef.current);
        const side = col === 1 ? 'West' : 'East';
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
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
            }}
            title={`Left Vertical ${side} - Row ${row}, Col ${col}`}
          >
            {row},{col}
          </div>
        );
      }
    }

    // Right vertical: rows 9-14, cols 1-2 (12 positions)
    for (let row = 9; row <= 14; row++) {
      for (let col = 1; col <= 2; col++) {
        const { x, y } = calculateResponsivePosition(row, col, isMobile, containerRef.current);
        const side = col === 1 ? 'West' : 'East';
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
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
            }}
            title={`Right Vertical ${side} - Row ${row}, Col ${col}`}
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
      aria-describedby="treetown-map-description"
    >
      {/* Screen Reader Accessible Description */}
      <p id="treetown-map-description" className="sr-only">
        Interactive U-shaped map displaying {allBars.length} establishments in Tree Town.
        {isEditMode ? ' Edit mode active: drag establishments to reposition them.' : ' Click on establishments to view details.'}
        For keyboard navigation, press Tab to focus establishments, then use Arrow keys to navigate between them, Enter or Space to select.
      </p>

      {/* Screen Reader Only Establishment List */}
      <ScreenReaderEstablishmentList
        establishments={establishments}
        zone="treetown"
        onEstablishmentSelect={(est) => onEstablishmentClick?.(est)}
      />

      {isAdmin && (
        <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 20 }}>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            aria-label={isEditMode ? 'Exit edit mode and save changes' : 'Enter edit mode to reposition establishments'}
            aria-pressed={isEditMode}
            style={{
              background: isEditMode ? 'linear-gradient(135deg, #FF6B6B, #FF8E53)' : 'linear-gradient(135deg, #4ECDC4, #44A08D)',
              color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px',
              fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
          >
            {isEditMode ? (<>🔒<span className="edit-mode-text"> Exit Edit</span></>) : (<>✏️<span className="edit-mode-text"> Edit Mode</span></>)}
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

      {/* U-shaped road visualization - HTML5 Canvas with Perfect Junctions */}
      {!isMobile ? (
        <>
          <TreeTownRoad isEditMode={isEditMode} />
        </>
      ) : (
        <>
          {/* Mobile - Simplified road */}
          <TreeTownRoad isEditMode={isEditMode} />
        </>
      )}

      {/* Grid debug visualization */}
      {renderGridDebug(currentBarSize)}

      {/* Drag & Drop Indicator */}
      <DragDropIndicator
        isEditMode={isEditMode}
        isDragging={isDragging}
        mousePosition={mousePosition}
        dropAction={dropAction}
        draggedBar={draggedBar}
        dragOverPosition={dragOverPosition}
        currentBarSize={currentBarSize}
      />

      {/* Establishments */}
      {allBars.map((bar, index) => {
        const isSelected = selectedEstablishment === bar.id;
        const isHovered = hoveredBar === bar.id;

        // Get establishment details for aria-label
        const establishment = establishments.find(est => est.id === bar.id);
        const categoryName = establishment?.category_id === 2 ? 'GoGo Bar'
          : establishment?.category_id === 1 ? 'Bar'
          : establishment?.category_id === 3 ? 'Massage Salon'
          : establishment?.category_id === 4 ? 'Nightclub'
          : 'Establishment';

        // 🆕 v10.3 Phase 5 - VIP Status Check
        const isVIP = establishment?.is_vip && establishment?.vip_expires_at &&
          new Date(establishment.vip_expires_at) > new Date();

        // Responsive VIP sizing: Mobile +15%, Tablet +25%, Desktop +35%
        const vipSizeMultiplier = window.innerWidth < 480 ? 1.15
                                : window.innerWidth < 768 ? 1.25
                                : 1.35;
        const vipBarSize = Math.round(currentBarSize * vipSizeMultiplier);
        const finalBarSize = isVIP ? vipBarSize : currentBarSize;

        const ariaLabel = `${bar.name}, ${categoryName}${isVIP ? ', VIP establishment' : ''}, click to view details`;

        return (
          <div
            key={bar.id}
            className={isVIP ? 'vip-establishment-marker' : ''}
            ref={(el) => {
              if (el) {
                barRefs.current.set(bar.id, el);
              } else {
                barRefs.current.delete(bar.id);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={ariaLabel}
            aria-pressed={isSelected}
            aria-describedby={isHovered ? `tooltip-tt-${bar.id}` : undefined}
            draggable={isEditMode}
            onDragStart={(e) => handleDragStart(e, bar)}
            onDragEnd={handleDragEnd}
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
              border: isVIP
                ? '5px solid #FFD700'  // VIP: Always gold border (thick)
                : isSelected
                ? '3px solid #FFD700'
                : isEditMode
                  ? (bar.id === draggedBar?.id ? '3px solid #00FF00' : '2px solid #00FF00')
                  : '2px solid rgba(255,255,255,0.6)',
              cursor: isEditMode ? 'grab' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transform: isHovered ? 'scale(1.2)' : 'scale(1)',
              transition: isVIP ? 'none' : 'all 0.3s ease',
              boxShadow: isVIP
                ? undefined  // CSS animation handles VIP glow
                : isHovered
                ? `0 0 25px ${TYPE_STYLES[bar.type].shadow}`
                : isEditMode
                  ? '0 0 15px rgba(0,255,0,0.5)'
                  : `0 0 12px ${bar.color}66`,
              zIndex: isHovered ? 15 : bar.id === draggedBar?.id ? 20 : 10,
              opacity: bar.id === draggedBar?.id ? 0.5 : 1
            }}
          >
            {getEstablishmentIcon(bar.id, establishments, bar.icon)}

            {/* 🆕 v10.3 Phase 5 - VIP Ultra Premium Effects */}
            {isVIP && (
              <div
                className="vip-crown"
                style={{
                  position: 'absolute',
                  top: '-35px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 5,
                  pointerEvents: 'none'
                }}
                title={`VIP until ${new Date(establishment.vip_expires_at!).toLocaleDateString()}`}
              >
                👑
              </div>
            )}
            {isVIP && (
              <div className="vip-badge">VIP</div>
            )}

            {isHovered && (
              <div
                id={`tooltip-tt-${bar.id}`}
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
          box-shadow:
            0 0 25px rgba(255, 215, 0, 0.8),
            0 0 40px rgba(255, 215, 0, 0.5),
            inset 0 0 15px rgba(255, 255, 255, 0.3) !important;
        }

        [role="button"]:focus-visible {
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

        @keyframes vipPulse {
          0%, 100% {
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
          }
          50% {
            box-shadow: 0 0 20px rgba(255, 215, 0, 1);
          }
        }
      `}</style>
    </div>
  );
};

export default CustomTreetownMap;
