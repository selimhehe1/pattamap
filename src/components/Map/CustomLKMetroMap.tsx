import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Establishment, CustomBar } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getZoneConfig } from '../../utils/zoneConfig';
import { useContainerSize } from '../../hooks/useContainerSize';
import { logger } from '../../utils/logger';
import GenericRoadCanvas from './GenericRoadCanvas';
import DragDropIndicator from './DragDropIndicator';

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

const TYPE_STYLES = {
  gogo: { color: '#FF1B8D', icon: '💃', shadow: 'rgba(255, 27, 141, 0.5)' },
  beer: { color: '#FFD700', icon: '🍺', shadow: 'rgba(255, 215, 0, 0.5)' },
  pub: { color: '#00FFFF', icon: '🍸', shadow: 'rgba(0, 255, 255, 0.5)' },
  massage: { color: '#06FFA5', icon: '💆', shadow: 'rgba(6, 255, 165, 0.5)' },
  nightclub: { color: '#7B2CBF', icon: '🎵', shadow: 'rgba(123, 44, 191, 0.5)' }
};

// Mapping categories to bar types (using both string and number keys for compatibility)
const CATEGORY_TO_TYPE_MAP: { [key: string | number]: 'gogo' | 'beer' | 'pub' | 'massage' | 'nightclub' } = {
  // String keys (old format)
  'cat-001': 'beer',      // Bar
  'cat-002': 'gogo',      // GoGo Bar
  'cat-003': 'massage',   // Massage Salon
  'cat-004': 'nightclub', // Nightclub
  // Number keys (Supabase format) - Updated to match new schema
  1: 'beer',              // Bar
  2: 'gogo',              // GoGo Bar
  3: 'massage',           // Massage Salon
  4: 'nightclub'          // Nightclub
  // Removed: Beer Bar (5), Club (6), Restaurant Bar (7) - no longer in schema
};

/**
 * Détecte si une row appartient au segment horizontal (1-2) ou vertical (3-4)
 */
const getSegmentType = (row: number): 'horizontal' | 'vertical' => {
  return row <= 2 ? 'horizontal' : 'vertical';
};

// Removed complex getLayoutDimensions - use simple inline calculations like Soi 6

/**
 * LK Metro L-shaped Grid System - Position Calculation
 *
 * IMPORTANT: Column orientation differs between segments!
 *
 * HORIZONTAL SEGMENT (Rows 1-2):
 * - Columns distributed along X axis (standard horizontal layout)
 * - Row 1 = North side (above road), Row 2 = South side (below road)
 * - Example: (row=1, col=5) = 5th position from LEFT (horizontal)
 * - Total: 9+8 = 17 positions (col 9 masked on row 2)
 *
 * VERTICAL SEGMENT (Rows 3-4):
 * - Columns distributed along Y axis (ROTATED 90° - vertical layout)
 * - Row 3 = West side (left of road), Row 4 = East side (right of road)
 * - Example: (row=3, col=5) = 5th position from TOP (vertical) ← COUNTER-INTUITIVE!
 * - Total: 7+9 = 16 positions (cols 1-2 masked on row 3)
 *
 * This rotation allows flexible L-shaped layouts while maintaining
 * a consistent (row, col) grid coordinate system across both segments.
 *
 * Total capacity: 33 positions (9+8+7+9)
 */
const calculateResponsivePosition = (row: number, col: number, isMobile: boolean, containerElement?: HTMLElement) => {
  const zoneConfig = getZoneConfig('lkmetro');
  const segment = getSegmentType(row);
  const maxColsPerSegment = 9; // 9 cols pour les deux segments

  if (isMobile) {
    // Mobile - Layout vertical simple
    const totalWidth = 350;
    const usableWidth = totalWidth * 0.9;
    const barWidth = Math.min(40, usableWidth / maxColsPerSegment - 4);
    const spacing = (usableWidth - (maxColsPerSegment * barWidth)) / (maxColsPerSegment + 1);
    const x = spacing + (col - 1) * (barWidth + spacing);
    const y = 60 + (row - 1) * 140;
    return { x, y, barWidth };
  }

  // Desktop - Layout L-shaped (simple inline calculations like Soi 6)
  const containerWidth = containerElement ? containerElement.getBoundingClientRect().width :
                        (window.innerWidth > 1200 ? 1200 : window.innerWidth - 40);
  const containerHeight = containerElement ? containerElement.getBoundingClientRect().height : 600;

  if (segment === 'horizontal') {
    // SEGMENT HORIZONTAL (Rows 1-2) - 9 colonnes
    const segmentStartX = containerWidth * 0.25;
    const segmentEndX = containerWidth * 0.55;
    const segmentWidth = segmentEndX - segmentStartX;

    const idealBarWidth = Math.min(45, Math.max(25, segmentWidth / maxColsPerSegment - 8));
    const totalBarsWidth = maxColsPerSegment * idealBarWidth;
    const totalSpacing = segmentWidth - totalBarsWidth;
    const spacing = totalSpacing / (maxColsPerSegment + 1);

    const x = segmentStartX + spacing + (col - 1) * (idealBarWidth + spacing);

    // Rows 1 et 2 positionnées autour de 30% Y (route horizontale en haut)
    const centerY = containerHeight * 0.30;
    const offsetFromCenter = 60;
    const y = row === 1
      ? centerY - offsetFromCenter  // North side
      : centerY + offsetFromCenter; // South side

    return { x, y, barWidth: idealBarWidth };

  } else {
    // SEGMENT VERTICAL (Rows 3-4) - 9 colonnes
    const segmentCenterX = containerWidth * 0.55;
    const segmentStartY = containerHeight * 0.30;
    const segmentEndY = containerHeight * 0.90;
    const segmentHeight = segmentEndY - segmentStartY;

    const idealBarWidth = Math.min(45, Math.max(25, segmentHeight / maxColsPerSegment - 8));
    const spacing = (segmentHeight - (maxColsPerSegment * idealBarWidth)) / (maxColsPerSegment + 1);

    const y = segmentStartY + spacing + (col - 1) * (idealBarWidth + spacing);

    // Rows 3 et 4 positionnées de part et d'autre du segment vertical
    const offsetFromCenter = 60;
    const x = row === 3
      ? segmentCenterX - offsetFromCenter  // West side
      : segmentCenterX + offsetFromCenter; // East side

    return { x, y, barWidth: idealBarWidth };
  }
};

/**
 * Valide si une colonne est valide pour un row donné avec positions masquées
 * Row 1: cols 1-9 (9 positions)
 * Row 2: cols 1-8 (8 positions, masque 9 pour éviter superposition)
 * Row 3: cols 3-9 (7 positions, masque 1-2 pour éviter superposition jonction)
 * Row 4: cols 1-9 (9 positions)
 * Total: 9+8+7+9 = 33 positions
 */
const isValidColumn = (row: number, col: number): boolean => {
  if (row === 2) {
    // Row 2: masque col 9 (superposition avec début du vertical)
    return col >= 1 && col <= 8;
  } else if (row === 3) {
    // Row 3: masque cols 1-2 (superposition avec fin de l'horizontal)
    return col >= 3 && col <= 9;
  } else {
    // Rows 1 et 4: toutes les colonnes 1-9
    return col >= 1 && col <= 9;
  }
};

const establishmentsToVisualBars = (establishments: Establishment[], isMobile: boolean, containerElement?: HTMLElement): Bar[] => {
  return establishments
    .filter(est =>
      est.zone === 'lkmetro' &&
      est.grid_row && est.grid_row >= 1 && est.grid_row <= 4 &&
      est.grid_col && isValidColumn(est.grid_row, est.grid_col)
    )
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

const CustomLKMetroMap: React.FC<CustomLKMetroMapProps> = ({
  establishments,
  onEstablishmentClick,
  selectedEstablishment,
  onBarClick,
  onEstablishmentUpdate
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waitingForDataUpdate, setWaitingForDataUpdate] = useState(false);

  // OPTIMISTIC UI: Store temporary positions during API calls to prevent disappearing bars
  const [optimisticPositions, setOptimisticPositions] = useState<
    Map<string, { row: number; col: number }>
  >(new Map());

  // STRICT LOCKING: Only allow ONE drag operation at a time
  const [operationLockUntil, setOperationLockUntil] = useState<number>(0);

  // Drag and drop state
  const [draggedBar, setDraggedBar] = useState<Bar | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<{ row: number; col: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropAction, setDropAction] = useState<'move' | 'swap' | 'blocked' | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  // Monitor container size changes
  const containerDimensions = useContainerSize(containerRef, 150);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const allBars = useMemo(() => {
    const bars = establishmentsToVisualBars(establishments, isMobile, containerRef.current || undefined);

    // Apply optimistic positions to prevent bars from disappearing during API calls
    if (optimisticPositions.size > 0) {
      // Step 1: Update existing bars with optimistic positions
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

      // Step 2: CRITICAL - Create missing bars
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
  }, [establishments, isMobile, containerDimensions, optimisticPositions]);

  const handleBarClick = useCallback((bar: Bar) => {
    if (isEditMode) return;
    const establishment = establishments.find(est => est.id === bar.id);
    if (establishment && onEstablishmentClick) {
      onEstablishmentClick(establishment);
    } else if (onBarClick) {
      onBarClick({ id: bar.id, name: bar.name, type: bar.type, position: bar.position, color: bar.color });
    } else {
      navigate(`/bar/${bar.id}`);
    }
  }, [establishments, onEstablishmentClick, onBarClick, navigate, isEditMode]);

  // Find bar at specific grid position
  const findBarAtPosition = useCallback((row: number, col: number): Bar | null => {
    const establishment = establishments.find(est =>
      est.zone === 'lkmetro' &&
      est.grid_row === row &&
      est.grid_col === col &&
      est.grid_row && est.grid_row >= 1 && est.grid_row <= 4 &&
      est.grid_col && isValidColumn(row, col)
    );

    if (establishment) {
      return allBars.find(bar => bar.id === establishment.id) || null;
    }

    return null;
  }, [allBars, establishments]);

  // Convert mouse position to grid position (L-shaped detection)
  const getGridFromMousePosition = useCallback((event: React.DragEvent) => {
    if (!containerRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;

    let row: number, col: number;

    if (isMobile) {
      // Mobile - simple vertical layout
      const totalWidth = rect.width;
      const usableWidth = totalWidth * 0.9;
      // Determine row first to get correct maxCols
      const tentativeRow = Math.max(1, Math.min(4, Math.floor(relativeY / 140) + 1));
      const maxColsPerSegment = 9; // 9 cols pour tous les segments
      const barWidth = Math.min(40, usableWidth / maxColsPerSegment - 4);
      const spacing = (usableWidth - (maxColsPerSegment * barWidth)) / (maxColsPerSegment + 1);

      col = Math.max(1, Math.min(maxColsPerSegment, Math.floor((relativeX - spacing) / (barWidth + spacing)) + 1));
      row = tentativeRow;

    } else {
      // Desktop - L-shaped detection (like Soi 6: check if IN bar first, then fallback)
      const containerWidth = rect.width;
      const containerHeight = rect.height;
      const maxColsPerSegment = 9;

      // Determine segment
      const centerY = containerHeight * 0.30;
      const centerX = containerWidth * 0.55;
      // Segment horizontal inclut row 1 ET row 2 (de 0% à ~45% pour couvrir centerY + 60px + marge)
      const horizontalSegmentBottom = centerY + 120; // Route + espace pour row 2
      const isInHorizontalSegment = relativeY < horizontalSegmentBottom && relativeX < centerX;

      if (isInHorizontalSegment) {
        // SEGMENT HORIZONTAL (Rows 1-2) - 9 colonnes
        const segmentStartX = containerWidth * 0.25;
        const segmentEndX = containerWidth * 0.55;
        const segmentWidth = segmentEndX - segmentStartX;

        const idealBarWidth = Math.min(45, Math.max(25, segmentWidth / maxColsPerSegment - 8));
        const totalBarsWidth = maxColsPerSegment * idealBarWidth;
        const totalSpacing = segmentWidth - totalBarsWidth;
        const spacing = totalSpacing / (maxColsPerSegment + 1);

        const relativeXInSegment = relativeX - segmentStartX;

        // STEP 1: Check if mouse is IN a bar slot
        let detectedCol = 0;
        const barRadius = idealBarWidth / 2;
        const gapTolerance = spacing * 0.5; // Allow clicks in gaps between bars

        for (let testCol = 1; testCol <= maxColsPerSegment; testCol++) {
          const barCenterX = spacing + (testCol - 1) * (idealBarWidth + spacing);
          const barLeftEdge = barCenterX - barRadius - gapTolerance;
          const barRightEdge = barCenterX + barRadius + gapTolerance;

          if (relativeXInSegment >= barLeftEdge && relativeXInSegment <= barRightEdge) {
            detectedCol = testCol;
            logger.debug(`✅ LK HORIZONTAL - Detected col ${testCol}`);
            break;
          }
        }

        // STEP 2: If outside all bar slots, return null (like Soi 6)
        if (detectedCol === 0) {
          logger.debug(`❌ LK HORIZONTAL - Mouse outside valid drop zones`);
          return null;
        }

        col = detectedCol;

        // Detect row based on distance to actual row positions
        // Row 1: centerY - 60px, Row 2: centerY + 60px
        const row1Y = centerY - 60;  // Row 1 position (North side)
        const row2Y = centerY + 60;  // Row 2 position (South side)
        const distanceToRow1 = Math.abs(relativeY - row1Y);
        const distanceToRow2 = Math.abs(relativeY - row2Y);
        row = distanceToRow1 < distanceToRow2 ? 1 : 2;

        logger.debug(`🎯 LK HORIZONTAL - Row detection: relativeY=${relativeY.toFixed(0)}, row1Y=${row1Y.toFixed(0)}, row2Y=${row2Y.toFixed(0)}, distances=[${distanceToRow1.toFixed(0)}, ${distanceToRow2.toFixed(0)}] → row ${row}`);

      } else {
        // SEGMENT VERTICAL (Rows 3-4) - 9 colonnes
        const segmentStartY = containerHeight * 0.30;
        const segmentEndY = containerHeight * 0.90;
        const segmentHeight = segmentEndY - segmentStartY;

        const idealBarWidth = Math.min(45, Math.max(25, segmentHeight / maxColsPerSegment - 8));
        const totalBarsWidth = maxColsPerSegment * idealBarWidth;
        const totalSpacing = segmentHeight - totalBarsWidth;
        const spacing = totalSpacing / (maxColsPerSegment + 1);

        const relativeYInSegment = relativeY - segmentStartY;

        // STEP 1: Check if mouse is IN a bar slot
        let detectedCol = 0;
        const barRadius = idealBarWidth / 2;
        const gapTolerance = spacing * 0.5; // Allow clicks in gaps between bars

        for (let testCol = 1; testCol <= maxColsPerSegment; testCol++) {
          const barCenterY = spacing + (testCol - 1) * (idealBarWidth + spacing);
          const barTopEdge = barCenterY - barRadius - gapTolerance;
          const barBottomEdge = barCenterY + barRadius + gapTolerance;

          if (relativeYInSegment >= barTopEdge && relativeYInSegment <= barBottomEdge) {
            detectedCol = testCol;
            logger.debug(`✅ LK VERTICAL - Detected col ${testCol}`);
            break;
          }
        }

        // STEP 2: If outside all bar slots, return null (like Soi 6)
        if (detectedCol === 0) {
          logger.debug(`❌ LK VERTICAL - Mouse outside valid drop zones`);
          return null;
        }

        col = detectedCol;
        row = relativeX < centerX ? 3 : 4;
      }
    }

    // Auto-adjust masked positions to nearest valid column
    if (row >= 1 && row <= 4 && !isValidColumn(row, col)) {
      // Row 2: col 9 masked → adjust to col 8
      if (row === 2 && col === 9) {
        col = 8;
        logger.debug('🟡 LK METRO - Auto-adjusted masked position (2,9) → (2,8)');
      }
      // Row 3: cols 1-2 masked → adjust to col 3
      else if (row === 3 && (col === 1 || col === 2)) {
        col = 3;
        logger.debug('🟡 LK METRO - Auto-adjusted masked position (3,' + col + ') → (3,3)');
      }
    }

    // Validate final position bounds
    if (row < 1 || row > 4 || !isValidColumn(row, col)) {
      logger.warn('🔴 LK METRO - Invalid grid position detected:', {
        row,
        col,
        segment: getSegmentType(row),
        reason: !isValidColumn(row, col) ? 'Masked position' : 'Out of bounds',
        mousePosition: { x: relativeX, y: relativeY }
      });
      return null;
    }

    return { row, col };
  }, [isMobile]);

  // Get establishment icon (logo or emoji fallback)
  const getEstablishmentIcon = useCallback((barId: string, establishments: Establishment[], fallbackIcon: string) => {
    const establishment = establishments.find(est => est.id === barId);

    if (establishment?.logo_url) {
      return (
        <div className="map-logo-container-nightlife">
          <img
            src={establishment.logo_url}
            alt={establishment.name}
            className="map-logo-image-nightlife"
            onError={(e) => {
              const target = e.target as HTMLElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.textContent = fallbackIcon;
                parent.style.background = 'transparent';
                parent.style.fontSize = '16px';
              }
            }}
          />
        </div>
      );
    }

    return fallbackIcon;
  }, []);

  // Throttled drag over handler
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);

  const updateMousePosition = useCallback((event: React.DragEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;

    setMousePosition({ x: relativeX, y: relativeY });

    if (throttleTimeout.current) {
      clearTimeout(throttleTimeout.current);
    }

    throttleTimeout.current = setTimeout(() => {
      const gridPos = getGridFromMousePosition(event);
      logger.debug('🎯 LK METRO - Grid position detected:', gridPos);
      setDragOverPosition(gridPos);

      if (gridPos) {
        const conflictBar = findBarAtPosition(gridPos.row, gridPos.col);
        logger.debug('🔍 LK METRO - Conflict check:', { gridPos, conflictBar: conflictBar?.name || 'none' });

        if (!conflictBar) {
          setDropAction('move');
        } else if (conflictBar.id === draggedBar?.id) {
          setDropAction('blocked');
        } else {
          setDropAction('swap');
        }
      } else {
        logger.debug('❌ LK METRO - No valid grid position detected');
        setDropAction('blocked');
      }
    }, 50); // Throttle at 50ms for balance between speed and visibility
  }, [getGridFromMousePosition, findBarAtPosition, draggedBar]);

  // Handle drag start
  const handleDragStart = useCallback((bar: Bar, event: React.DragEvent) => {
    const now = Date.now();

    // STRICT CHECK: Block if locked OR loading
    if (!isEditMode || isLoading || now < operationLockUntil) {
      event.preventDefault();
      return;
    }

    setDraggedBar(bar);
    setIsDragging(true);

    event.dataTransfer.setData('application/json', JSON.stringify(bar));
    event.dataTransfer.effectAllowed = 'move';
  }, [isEditMode, isLoading, operationLockUntil]);

  // Handle drag over
  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (!isEditMode || !isDragging || !draggedBar || !containerRef.current) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    updateMousePosition(event);
  }, [isEditMode, isDragging, draggedBar, updateMousePosition]);

  // Handle drop
  const handleDrop = useCallback(async (event: React.DragEvent) => {
    if (!isEditMode || !isDragging || !dragOverPosition || !draggedBar || dropAction === 'blocked') {
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);
      return;
    }

    event.preventDefault();

    const { row, col } = dragOverPosition;
    const conflictBar = findBarAtPosition(row, col);
    const draggedEstablishment = establishments.find(est => est.id === draggedBar.id);
    const originalPosition = draggedEstablishment ? {
      row: draggedEstablishment.grid_row,
      col: draggedEstablishment.grid_col
    } : null;

    if (originalPosition && originalPosition.row === row && originalPosition.col === col) {
      logger.warn('⚠️ Dropping on same position, cancelling');
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);
      return;
    }

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

      const actualAction = conflictBar ? 'swap' : 'move';

      if (actualAction === 'move') {
        const establishment = establishments.find(est => est.id === draggedBar.id);

        if (establishment) {
          // OPTIMISTIC UI: Store temporary position IMMEDIATELY for instant feedback
          setWaitingForDataUpdate(true);
          setOptimisticPositions(prev => {
            const newMap = new Map(prev);
            newMap.set(establishment.id, { row, col });
            return newMap;
          });

          const requestUrl = `${process.env.REACT_APP_API_URL}/api/grid-move-workaround`;
          const requestBody = {
            establishmentId: establishment.id,
            grid_row: row,
            grid_col: col,
            zone: 'lkmetro'
          };

          const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          if (response.ok) {
            // Success - keep optimistic position, no need to reload all data
            logger.debug('✅ Position updated successfully on server');
            setWaitingForDataUpdate(false);

            // STRICT LOCK: Block all drags for 500ms to prevent rapid changes
            const lockUntil = Date.now() + 500;
            setOperationLockUntil(lockUntil);
          } else {
            const errorText = await response.text();

            // OPTIMISTIC UI: Clear failed position (automatic rollback)
            setOptimisticPositions(prev => {
              const newMap = new Map(prev);
              newMap.delete(establishment.id);
              return newMap;
            });
            setWaitingForDataUpdate(false);

            alert(`❌ Move failed: ${response.status} ${response.statusText}`);
          }
        }

      } else if (actualAction === 'swap' && conflictBar) {
        const draggedEstablishment = establishments.find(est => est.id === draggedBar.id);
        const conflictEstablishment = establishments.find(est => est.id === conflictBar.id);

        if (draggedEstablishment && conflictEstablishment) {
          const draggedOriginalPos = {
            row: draggedEstablishment.grid_row || 1,
            col: draggedEstablishment.grid_col || 1
          };

          // OPTIMISTIC UI: Store BOTH swapped positions immediately
          setWaitingForDataUpdate(true);
          setOptimisticPositions(prev => {
            const newMap = new Map(prev);
            newMap.set(draggedEstablishment.id, { row, col });
            newMap.set(conflictEstablishment.id, {
              row: draggedOriginalPos.row,
              col: draggedOriginalPos.col
            });
            return newMap;
          });

          const requestUrl = `${process.env.REACT_APP_API_URL}/api/grid-move-workaround`;
          const requestBody = {
            establishmentId: draggedEstablishment.id,
            grid_row: row,
            grid_col: col,
            zone: 'lkmetro',
            swap_with_id: conflictEstablishment.id
          };

          const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          if (response.ok) {
            // Success - keep optimistic positions for both swapped items
            logger.debug('✅ Swap completed successfully on server');
            setWaitingForDataUpdate(false);

            // STRICT LOCK: Block all drags for 500ms to prevent rapid changes
            const lockUntil = Date.now() + 500;
            setOperationLockUntil(lockUntil);
          } else {
            const errorText = await response.text();

            // OPTIMISTIC UI: Clear both failed positions (rollback)
            setOptimisticPositions(prev => {
              const newMap = new Map(prev);
              newMap.delete(draggedEstablishment.id);
              newMap.delete(conflictEstablishment.id);
              return newMap;
            });
            setWaitingForDataUpdate(false);

            alert(`❌ Swap failed: ${response.status} ${response.statusText}`);
          }
        }
      }

    } catch (error) {
      logger.error('Drop operation error', error);
    } finally {
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);

      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current);
        throttleTimeout.current = null;
      }
    }
  }, [isEditMode, isDragging, dragOverPosition, draggedBar, dropAction, findBarAtPosition, establishments, onEstablishmentUpdate]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
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

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setIsEditMode(!isEditMode);
    setDraggedBar(null);
    setDragOverPosition(null);
    setIsDragging(false);
    setDropAction(null);
    setMousePosition(null);

    if (throttleTimeout.current) {
      clearTimeout(throttleTimeout.current);
      throttleTimeout.current = null;
    }
  }, [isEditMode]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);
      setIsLoading(false);

      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current);
        throttleTimeout.current = null;
      }
    };
  }, []);

  const isAdmin = user && (user.role === 'admin' || user.role === 'moderator');

  const currentBarSize = useMemo(() => {
    if (containerRef.current) {
      const { barWidth } = calculateResponsivePosition(1, 1, isMobile, containerRef.current);
      return barWidth;
    }
    return isMobile ? 35 : 40;
  }, [isMobile, containerDimensions]);

  // Render debug grid (L-shaped yellow circles)
  const renderGridDebug = () => {
    if (!isEditMode || !containerRef.current || isMobile) return null;

    const gridCells: React.ReactElement[] = [];
    const fixedGridSize = 40;

    for (let row = 1; row <= 4; row++) {
      const maxCols = 9; // 9 cols max

      for (let col = 1; col <= maxCols; col++) {
        // Skip masked positions
        if (!isValidColumn(row, col)) continue;

        const { x, y } = calculateResponsivePosition(row, col, isMobile, containerRef.current!);

        // Different colors for horizontal vs vertical segments
        const segment = getSegmentType(row);
        const borderColor = segment === 'horizontal' ? '#FFD700' : '#00FFFF'; // Gold vs Cyan
        const bgColor = segment === 'horizontal' ? 'rgba(255, 215, 0, 0.1)' : 'rgba(0, 255, 255, 0.1)';
        const textColor = segment === 'horizontal' ? '#FFD700' : '#00FFFF';

        // Label with orientation indicator
        const label = segment === 'horizontal'
          ? `${row},${col}`
          : `${row},${col}↕️`; // Arrow indicates vertical orientation

        gridCells.push(
          <div
            key={`grid-${row}-${col}`}
            style={{
              position: 'absolute',
              left: `${x - fixedGridSize/2}px`,
              top: `${y - fixedGridSize/2}px`,
              width: `${fixedGridSize}px`,
              height: `${fixedGridSize}px`,
              border: `2px dashed ${borderColor}`,
              background: bgColor,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              color: textColor,
              fontWeight: 'bold',
              pointerEvents: 'none',
              zIndex: 5,
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
            }}
          >
            {label}
          </div>
        );
      }
    }

    return gridCells;
  };

  return (
    <div
      ref={containerRef}
      className={`map-container-nightlife ${isEditMode ? 'edit-mode' : ''}`}
      onDragOver={isEditMode ? handleDragOver : undefined}
      onDrop={isEditMode ? handleDrop : undefined}
      style={{
        position: 'relative',
        width: '100%',
        background: 'linear-gradient(135deg, rgba(138,43,226,0.3) 0%, rgba(75,0,130,0.4) 50%, rgba(148,0,211,0.3) 100%), linear-gradient(135deg, rgba(13,0,25,0.95), rgba(26,0,51,0.95))',
        overflow: 'hidden'
      }}
    >
      {/* L-Shaped Road Component - Canvas Rendering */}
      <GenericRoadCanvas
        config={{
          shape: 'l-shape',
          width: isMobile ? 40 : 70,
          cornerX: 55,  // Jonction centrale à 55% X
          cornerY: 30,  // Jonction centrale à 30% Y
          startX: 25,   // Début segment horizontal à 25%
          endY: 90      // Fin segment vertical à 90%
        }}
        style={{
          baseColor: '#2d2d2d',
          overlayColor: '#1a1a1a',
          edgeColor: '#FFD700',       // Or pour bordures (thème LK Metro)
          centerLineColor: '#FFD700'  // Or pour ligne centrale pointillée
        }}
        isEditMode={isEditMode}
        grainCount={1500}
      />

      {/* Admin controls */}
      {isAdmin && (
        <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 20 }}>
          <button
            onClick={toggleEditMode}
            style={{
              background: isEditMode ? 'linear-gradient(135deg, #FF6B6B, #FF8E53)' : 'linear-gradient(135deg, #4ECDC4, #44A08D)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease'
            }}
          >
            {isEditMode ? '🔒 Exit Edit' : '✏️ Edit Mode'}
          </button>
        </div>
      )}

      {/* Zone Title */}
      <div className="map-title-compact-nightlife" style={{
        color: '#9370DB',
        textShadow: '0 0 20px rgba(147,112,219,0.8), 2px 2px 4px rgba(0,0,0,0.8)',
        border: '1px solid rgba(147,112,219,0.4)'
      }}>
        🏙️ LK METRO
      </div>

      {/* Geographic Labels */}
      {/* Second Road Label */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '5%',
        transform: 'translateY(-50%)',
        color: '#00FFFF',
        fontSize: isMobile ? '10px' : '12px',
        fontWeight: 'bold',
        textShadow: '0 0 12px rgba(0,255,255,0.8), 2px 2px 4px rgba(0,0,0,0.8)',
        zIndex: 15,
        pointerEvents: 'none',
        textAlign: 'center',
        background: 'rgba(0,0,0,0.4)',
        padding: '4px 8px',
        borderRadius: '8px',
        border: '1px solid rgba(0,255,255,0.3)',
        whiteSpace: 'nowrap'
      }}>
        ← Second Road
      </div>

      {/* Soi Buakhao Label */}
      <div style={{
        position: 'absolute',
        bottom: '5%',
        left: '55%',
        transform: 'translateX(-50%)',
        color: '#FFD700',
        fontSize: isMobile ? '10px' : '12px',
        fontWeight: 'bold',
        textShadow: '0 0 12px rgba(255,215,0,0.8), 2px 2px 4px rgba(0,0,0,0.8)',
        zIndex: 15,
        pointerEvents: 'none',
        textAlign: 'center',
        background: 'rgba(0,0,0,0.4)',
        padding: '4px 8px',
        borderRadius: '8px',
        border: '1px solid rgba(255,215,0,0.3)',
        whiteSpace: 'nowrap'
      }}>
        Soi Buakhao ↓
      </div>

      {/* Segment Labels - Only visible in Edit Mode */}
      {isEditMode && !isMobile && (
        <>
          {/* Horizontal Segment Label */}
          <div style={{
            position: 'absolute',
            left: '40%',
            top: '28%',
            transform: 'translateX(-50%)',
            color: '#FFD700',
            fontSize: '11px',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(255,215,0,0.8), 2px 2px 4px rgba(0,0,0,0.8)',
            zIndex: 15,
            pointerEvents: 'none',
            textAlign: 'center',
            background: 'rgba(0,0,0,0.6)',
            padding: '4px 10px',
            borderRadius: '8px',
            border: '1px solid rgba(255,215,0,0.5)',
            whiteSpace: 'nowrap'
          }}>
            ← Horizontal Segment (Rows 1-2) →
          </div>

          {/* Vertical Segment Label */}
          <div style={{
            position: 'absolute',
            left: '58%',
            top: '60%',
            transform: 'rotate(90deg)',
            transformOrigin: 'center',
            color: '#00FFFF',
            fontSize: '11px',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(0,255,255,0.8), 2px 2px 4px rgba(0,0,0,0.8)',
            zIndex: 15,
            pointerEvents: 'none',
            textAlign: 'center',
            background: 'rgba(0,0,0,0.6)',
            padding: '4px 10px',
            borderRadius: '8px',
            border: '1px solid rgba(0,255,255,0.5)',
            whiteSpace: 'nowrap'
          }}>
            ↑ Vertical Segment (Rows 3-4) ↓
          </div>
        </>
      )}

      {/* Debug Grid Overlay (L-shaped colored circles) */}
      {renderGridDebug()}

      {/* Bars */}
      {allBars.map((bar) => {
        const isSelected = selectedEstablishment === bar.id;
        const isHovered = hoveredBar === bar.id;
        const isBeingDragged = isDragging && draggedBar?.id === bar.id;

        return (
          <div
            key={bar.id}
            onClick={() => handleBarClick(bar)}
            onMouseEnter={() => setHoveredBar(bar.id)}
            onMouseLeave={() => setHoveredBar(null)}
            draggable={isEditMode && isAdmin && !isLoading ? true : false}
            onDragStart={(e) => handleDragStart(bar, e)}
            onDragEnd={handleDragEnd}
            style={{
              position: 'absolute',
              left: `${bar.position.x - currentBarSize/2}px`,
              top: `${bar.position.y - currentBarSize/2}px`,
              width: `${currentBarSize}px`,
              height: `${currentBarSize}px`,
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, ${bar.color}FF, ${bar.color}DD 60%, ${bar.color}AA 100%)`,
              border: isSelected ? '3px solid #FFD700' : isEditMode ? '2px solid #00FF00' : '2px solid rgba(255,255,255,0.6)',
              cursor: isLoading ? 'not-allowed' : isEditMode ? (isBeingDragged ? 'grabbing' : 'grab') : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transform: isHovered && !isBeingDragged ? 'scale(1.2)' : 'scale(1)',
              transition: 'all 0.3s ease',
              boxShadow: isHovered
                ? `0 0 25px ${TYPE_STYLES[bar.type].shadow}, 0 0 40px ${TYPE_STYLES[bar.type].shadow}66`
                : isEditMode
                  ? '0 0 15px rgba(0,255,0,0.5), 0 0 25px rgba(0,255,0,0.2)'
                  : `0 0 12px ${bar.color}66, 0 0 20px ${bar.color}33, 0 4px 12px rgba(0,0,0,0.4)`,
              zIndex: isHovered ? 15 : isBeingDragged ? 100 : 10,
              opacity: isBeingDragged ? 0.7 : 1
            }}
          >
            {getEstablishmentIcon(bar.id, establishments, bar.icon)}

            {/* Tooltip */}
            {isHovered && !isDragging && (
              <div style={{
                position: 'absolute',
                bottom: '45px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.9)',
                color: '#fff',
                padding: '5px 10px',
                borderRadius: '5px',
                fontSize: '12px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                zIndex: 20,
                border: '1px solid #9370DB'
              }}>
                {bar.name}
                {isEditMode && (
                  <div style={{ fontSize: '10px', color: '#00FF00' }}>
                    🎯 Drag to move
                  </div>
                )}
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '5px solid #9370DB'
                }} />
              </div>
            )}
          </div>
        );
      })}

      {/* Drag & Drop Visual Indicators */}
      <DragDropIndicator
        isEditMode={isEditMode}
        isDragging={isDragging}
        mousePosition={mousePosition}
        dropAction={dropAction}
        draggedBar={draggedBar}
        dragOverPosition={dragOverPosition}
        currentBarSize={currentBarSize}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9370DB',
          fontSize: '18px',
          fontWeight: 'bold',
          zIndex: 100
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #9370DB',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            Updating position...
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CustomLKMetroMap;
