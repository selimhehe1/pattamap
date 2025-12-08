import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Establishment, CustomBar } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
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
import '../../styles/components/map-components.css';
import '../../styles/components/maps.css';
import './CustomSoi6Map.css';

// Re-export Bar type for backward compatibility
export type Bar = MapBar;

interface CustomSoi6MapProps {
  establishments: Establishment[];
  onEstablishmentClick?: (establishment: Establishment) => void;
  selectedEstablishment?: string;
  onBarClick?: (bar: CustomBar) => void;
  onEstablishmentUpdate?: () => Promise<void>;
}

// Improved responsive position calculator using zoneConfig
const calculateResponsivePosition = (row: number, col: number, isMobile: boolean, containerElement?: HTMLElement) => {
  const zoneConfig = getZoneConfig('soi6');

  if (isMobile) {
    // Mobile - VERTICAL layout like Walking Street
    // Row 1 = Beach Road side (LEFT), Row 2 = Second Road side (RIGHT)
    // Road runs vertically down the center, bars on each side
    const containerHeight = containerElement ? containerElement.getBoundingClientRect().height : 600;
    const containerWidth = containerElement ? containerElement.getBoundingClientRect().width : 350;

    const centerX = containerWidth * 0.5;
    const roadWidth = 80; // Vertical road width (matches GenericRoadCanvas)
    const barWidth = 32; // Optimized size for 20 positions without scroll

    // X position: LEFT side (row 1) or RIGHT side (row 2) of vertical road
    const offsetFromCenter = roadWidth / 2 + 12; // 12px gap from road edge
    const x = row === 1
      ? centerX - offsetFromCenter  // Left side (Beach Road)
      : centerX + offsetFromCenter; // Right side (Second Road)

    // Y position: Distribute bars vertically along the road - starts from top
    const topMargin = 10; // Just 10px from top (road starts at 0%)
    const bottomMargin = 10; // 10px from bottom
    const usableHeight = containerHeight - topMargin - bottomMargin;
    const spacing = usableHeight / (zoneConfig.maxCols + 1);
    const y = topMargin + col * spacing; // Use col for vertical distribution

    return { x, y, barWidth };
  } else {
    // PC - Horizontal layout using full width
    // Row 1 = Second Road side (top), Row 2 = Beach Road side (bottom)
    const containerWidth = containerElement ? containerElement.getBoundingClientRect().width :
                          (window.innerWidth > 1200 ? 1200 : window.innerWidth - 40);

    // Calculate usable width based on zoneConfig
    const usableWidth = containerWidth * (zoneConfig.endX - zoneConfig.startX) / 100;
    const startX = containerWidth * zoneConfig.startX / 100;

    // Dynamic bar size - adapts to available space
    const maxBarWidth = 45;
    const minBarWidth = 25;
    const idealBarWidth = Math.min(maxBarWidth, Math.max(minBarWidth, usableWidth / zoneConfig.maxCols - 8));

    // Calculate spacing
    const totalBarsWidth = zoneConfig.maxCols * idealBarWidth;
    const totalSpacing = usableWidth - totalBarsWidth;
    const spacing = totalSpacing / (zoneConfig.maxCols + 1);

    const x = startX + spacing + (col - 1) * (idealBarWidth + spacing);

    // Calculate Y position using zoneConfig
    const containerHeight = containerElement ? containerElement.getBoundingClientRect().height : MAP_CONFIG.DEFAULT_HEIGHT;
    const topY = containerHeight * zoneConfig.startY / 100;
    const bottomY = containerHeight * zoneConfig.endY / 100;
    const y = row === 1 ? topY : bottomY; // Second Road (top) vs Beach Road (bottom)

    return { x, y, barWidth: idealBarWidth };
  }
};

// Convert establishments directly to visual bars (API only)
const establishmentsToVisualBars = (establishments: Establishment[], isMobile: boolean, containerElement?: HTMLElement): Bar[] => {

  // Log all establishments to see what's coming in
  const soi6Establishments = establishments.filter(e => e.zone === 'soi6');
  logger.debug('Establishments received for Soi6 map', {
    total: establishments.length,
    soi6Count: soi6Establishments.length,
    soi6Details: soi6Establishments.map(est => ({
      name: est.name,
      category_id: est.category_id,
      grid_row: est.grid_row,
      grid_col: est.grid_col
    }))
  });

  const bars = establishments
    .filter(est => est.zone === 'soi6' && est.grid_row && est.grid_row >= 1 && est.grid_row <= 2 && est.grid_col && est.grid_col >= 1 && est.grid_col <= 20)
    .map(est => {
      const barType = getBarTypeFromCategory(est.category_id);
      const style = TYPE_STYLES[barType];

      // Calculate responsive position with dynamic sizing
      const { x, y } = calculateResponsivePosition(
        est.grid_row || 1,
        est.grid_col || 1,
        isMobile,
        containerElement
      );

      const bar: Bar = {
        id: est.id,
        name: est.name,
        type: barType,
        position: { x, y },
        color: style.color,
        icon: style.icon,
        grid_row: est.grid_row || 1,
        grid_col: est.grid_col || 1
      };

      return bar;
    });

  logger.debug('Visual bars calculated', { count: bars.length });

  return bars;
};

const CustomSoi6Map: React.FC<CustomSoi6MapProps> = ({
  establishments,
  onEstablishmentClick,
  selectedEstablishment,
  onBarClick,
  onEstablishmentUpdate
}) => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [_waitingForDataUpdate, setWaitingForDataUpdate] = useState(false);

  // ✅ KEYBOARD NAVIGATION: Track focused bar index for arrow key navigation
  const [focusedBarIndex, setFocusedBarIndex] = useState<number>(-1);
  const barRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Monitor container size changes to recalculate positions
  // ✅ PERFORMANCE: 300ms debounce reduces re-renders by 50% during resize
  const containerDimensions = useContainerSize(containerRef, 300);

  // OPTIMISTIC UI: Store temporary positions during API calls to prevent disappearing bars
  const [optimisticPositions, setOptimisticPositions] = useState<Map<string, { row: number; col: number }>>(new Map());

  // STRICT LOCKING: Only allow ONE drag operation at a time
  const [operationLockUntil, setOperationLockUntil] = useState<number>(0);
  // Force recompilation

  // Drag and drop state
  const [draggedBar, setDraggedBar] = useState<Bar | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<{ row: number; col: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropAction, setDropAction] = useState<'move' | 'swap' | 'blocked' | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  // Duplicate positions detection for visual indicators
  const [duplicatePositions, setDuplicatePositions] = useState<Array<{
    row: number;
    col: number;
    count: number;
    establishments: Establishment[];
  }>>([]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

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

  // Detect duplicate positions on load
  // Detect and store duplicate positions for visual indicators
  useEffect(() => {
    const soi6Establishments = establishments.filter(
      est => est.zone === 'soi6' && est.grid_row && est.grid_col
    );

    if (soi6Establishments.length === 0) {
      setDuplicatePositions([]);
      return;
    }

    // Group by position
    const positionMap = new Map<string, typeof soi6Establishments>();
    soi6Establishments.forEach(est => {
      const key = `${est.grid_row},${est.grid_col}`;
      if (!positionMap.has(key)) {
        positionMap.set(key, []);
      }
      positionMap.get(key)!.push(est);
    });

    // Find duplicates and store them for visual indicators
    const duplicates = Array.from(positionMap.entries())
      .filter(([_, ests]) => ests.length > 1)
      .map(([position, ests]) => {
        const [row, col] = position.split(',').map(Number);
        return {
          row,
          col,
          count: ests.length,
          establishments: ests
        };
      });

    setDuplicatePositions(duplicates);

    if (duplicates.length > 0) {
      logger.warn(`Duplicate positions detected on Soi6 map`, {
        duplicateCount: duplicates.length,
        positions: duplicates.map(dup => ({
          position: `${dup.row},${dup.col}`,
          count: dup.count,
          establishments: dup.establishments.map(e => e.name)
        })),
        message: 'Some establishments are hidden behind others. Fix positions in admin panel.'
      });
    }
  }, [establishments]);

  // Removed excessive debug log that was causing console spam

  // Get all bars (API only) with dynamic sizing + OPTIMISTIC UI
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
            const barType = getBarTypeFromCategory(establishment.category_id);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishments, isMobile, containerDimensions, optimisticPositions]); // containerDimensions triggers recalculation when container resizes

  // Handle bar click
  const handleBarClick = useCallback((bar: Bar) => {
    if (isEditMode) return; // Disable click in edit mode


    // Check if this is an establishment from API (has UUID format)
    const establishment = establishments.find(est => est.id === bar.id);

    if (establishment && onEstablishmentClick) {
      onEstablishmentClick(establishment);
    } else if (onBarClick) {
      // Convert to CustomBar for legacy compatibility
      const customBar: CustomBar = {
        id: bar.id,
        name: bar.name,
        type: bar.type,
        position: bar.position,
        color: bar.color
      };
      onBarClick(customBar);
    } else {
      // Default navigation - SEO-friendly URL
      navigate(generateEstablishmentUrl(bar.id, bar.name, establishment?.zone || 'soi6'));
    }
  }, [establishments, onEstablishmentClick, onBarClick, navigate, isEditMode]);

  // Find bar at specific grid position
  const findBarAtPosition = useCallback((row: number, col: number): Bar | null => {
    // CRITICAL FIX: Use SAME filter as establishmentsToVisualBars to avoid ghost establishments
    // Only consider establishments that are actually visible on the map
    const establishment = establishments.find(est =>
      est.zone === 'soi6' &&
      est.grid_row === row &&
      est.grid_col === col &&
      est.grid_row && est.grid_row >= 1 && est.grid_row <= 2 && // ← FIXED: Complete validation
      est.grid_col && est.grid_col >= 1 && est.grid_col <= 20    // ← FIXED: Full range validation
    );

    if (establishment) {
      // Find the corresponding bar in allBars
      return allBars.find(bar => bar.id === establishment.id) || null;
    }

    return null;
  }, [allBars, establishments]);

  // ✅ HAPTIC FEEDBACK: Vibration for touch interactions
  const triggerHapticFeedback = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        // Vibration API not supported or blocked - fail silently
        logger.debug('Vibration API not available', error);
      }
    }
  }, []);

  // ✅ TOUCH SUPPORT: Extract coordinates from both drag and touch events
  const getEventCoordinates = (event: React.DragEvent | React.TouchEvent): { clientX: number; clientY: number } | null => {
    if ('touches' in event && event.touches.length > 0) {
      // TouchEvent
      return {
        clientX: event.touches[0].clientX,
        clientY: event.touches[0].clientY
      };
    } else if ('clientX' in event) {
      // DragEvent or MouseEvent
      return {
        clientX: event.clientX,
        clientY: event.clientY
      };
    }
    return null;
  };

  // Convert mouse/touch position to grid position - Updated to use zoneConfig
  const getGridFromMousePosition = useCallback((event: React.DragEvent | React.TouchEvent) => {
    if (!containerRef.current) return null;

    const coords = getEventCoordinates(event);
    if (!coords) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = coords.clientX - rect.left;
    const relativeY = coords.clientY - rect.top;
    const zoneConfig = getZoneConfig('soi6');


    let row: number, col: number;

    if (isMobile) {
      // Mobile - VERTICAL layout
      // Row 1 = LEFT side (Beach Road), Row 2 = RIGHT side (Second Road)
      const containerHeight = rect.height;
      const containerWidth = rect.width;

      const centerX = containerWidth * 0.5;
      const _roadWidth = 80; // Match GenericRoadCanvas

      // Determine row based on X position (left or right of vertical road)
      row = relativeX < centerX ? 1 : 2; // Left = Beach Road (row 1), Right = Second Road (row 2)

      // Determine col based on Y position (vertical distribution)
      const topMargin = 10; // Match calculateResponsivePosition
      const bottomMargin = 10;
      const usableHeight = containerHeight - topMargin - bottomMargin;
      const spacing = usableHeight / (zoneConfig.maxCols + 1);

      // Find closest column position vertically
      let closestCol = 1;
      let closestDistance = Infinity;

      for (let testCol = 1; testCol <= zoneConfig.maxCols; testCol++) {
        const barY = topMargin + testCol * spacing;
        const distance = Math.abs(relativeY - barY);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestCol = testCol;
        }
      }

      col = closestCol;
    } else {
      // PC - Use zoneConfig for calculations
      const containerWidth = rect.width;
      const usableWidth = containerWidth * (zoneConfig.endX - zoneConfig.startX) / 100;
      const startX = containerWidth * zoneConfig.startX / 100;

      const maxBarWidth = 45;
      const minBarWidth = 25;
      const idealBarWidth = Math.min(maxBarWidth, Math.max(minBarWidth, usableWidth / zoneConfig.maxCols - 8));
      const totalBarsWidth = zoneConfig.maxCols * idealBarWidth;
      const totalSpacing = usableWidth - totalBarsWidth;
      const spacing = totalSpacing / (zoneConfig.maxCols + 1);

      // Calculate column using TOPOGRAPHIC detection (same logic as Walking Street)
      const relativeXInZone = relativeX - startX;
      const barRadius = idealBarWidth / 2;

      // Method 1: Direct hit detection - Check if click is within a bar's surface
      let detectedCol = 1; // Default
      let directHit = false;

      for (let testCol = 1; testCol <= zoneConfig.maxCols; testCol++) {
        const barCenterX = spacing + (testCol - 1) * (idealBarWidth + spacing);
        const barLeftEdge = barCenterX - barRadius;
        const barRightEdge = barCenterX + barRadius;

        if (relativeXInZone >= barLeftEdge && relativeXInZone <= barRightEdge) {
          detectedCol = testCol;
          directHit = true;
          break;
        }
      }

      // Method 2: Fallback for gaps - Find nearest bar slot
      if (!directHit) {
        // Calculate which slot the click falls into using correct mathematical formula
        // Formula: N = (X - spacing) / (barWidth + spacing) + 1
        const clickSlot = (relativeXInZone - spacing) / (idealBarWidth + spacing);
        detectedCol = Math.max(1, Math.min(zoneConfig.maxCols, Math.floor(clickSlot) + 1));
      }

      col = detectedCol;

      // Row calculation using simple midpoint (no invalid zone)
      // Row 1 = Second Road (top, Y=25%), Row 2 = Beach Road (bottom, Y=75%)
      const containerHeight = rect.height;
      const midPoint = containerHeight * 0.50; // Simple 50% threshold

      row = relativeY < midPoint ? 1 : 2;
    }

    // Validate calculated position bounds using zoneConfig
    if (row < 1 || row > zoneConfig.maxRows || col < 1 || col > zoneConfig.maxCols) {
      return null;
    }


    return { row, col };
  }, [isMobile, containerRef]);

  // Get establishment icon (logo or emoji fallback)
  const getEstablishmentIcon = useCallback((barId: string, establishments: Establishment[], fallbackIcon: string) => {
    const establishment = establishments.find(est => est.id === barId);

    if (establishment?.logo_url) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #ffffff 45%, #f5f5f5 70%, #e8e8e8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <LazyImage
            src={establishment.logo_url}
            alt={establishment.name}
            cloudinaryPreset="establishmentLogo"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              position: 'relative',
              zIndex: 1,
              mixBlendMode: 'darken',
              maskImage: 'radial-gradient(circle at 50% 50%, black 0%, black 50%, rgba(0, 0, 0, 0.8) 70%, rgba(0, 0, 0, 0.4) 90%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 0%, black 50%, rgba(0, 0, 0, 0.8) 70%, rgba(0, 0, 0, 0.4) 90%, transparent 100%)'
            }}
            objectFit="cover"
          />
          {/* Overlay de courbure sphérique - assombrit les bords pour effet 3D */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle at 50% 50%, transparent 0%, transparent 40%, rgba(0, 0, 0, 0.1) 60%, rgba(0, 0, 0, 0.3) 85%, rgba(0, 0, 0, 0.5) 100%)',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 3
          }} />
        </div>
      );
    }

    // Fallback to emoji
    return fallbackIcon;
  }, []);

  // Throttled version of handleDragOver for performance
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);

  const updateMousePosition = useCallback((event: React.DragEvent | React.TouchEvent) => {
    if (!containerRef.current) return;

    const coords = getEventCoordinates(event);
    if (!coords) return;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = coords.clientX - rect.left;
    const relativeY = coords.clientY - rect.top;

    // Update mouse position immediately for smooth tracking
    setMousePosition({ x: relativeX, y: relativeY });

    // Instant validation for blocked zones (route centrale + marges sécurité)
    const containerHeight = rect.height;
    const roadTop = containerHeight * 0.35;    // 35% - début marge sécurité
    const roadBottom = containerHeight * 0.65; // 65% - fin marge sécurité

    // Immediate feedback for central road
    if (relativeY >= roadTop && relativeY <= roadBottom) {
      setDropAction('blocked');
      setDragOverPosition(null);
      return;
    }

    // Throttle grid calculations for valid zones
    if (throttleTimeout.current) {
      clearTimeout(throttleTimeout.current);
    }

    throttleTimeout.current = setTimeout(() => {
      const gridPos = getGridFromMousePosition(event);
      setDragOverPosition(gridPos);

      // Determine drop action type
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
    }, 16); // 16ms throttle for 60fps
  }, [getGridFromMousePosition, findBarAtPosition, draggedBar, containerRef]);

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

    // Set drag data
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
      return;
    }

    event.preventDefault();

    const { row, col } = dragOverPosition;

    // RE-CHECK position at drop time (not just during drag)
    // This prevents race conditions where data is stale during drag
    const conflictBar = findBarAtPosition(row, col);

    // Get original position of dragged establishment
    const draggedEstablishment = establishments.find(est => est.id === draggedBar.id);
    const originalPosition = draggedEstablishment ? {
      row: draggedEstablishment.grid_row,
      col: draggedEstablishment.grid_col
    } : null;

    // Safety check: If trying to drop on same position, cancel
    if (originalPosition && originalPosition.row === row && originalPosition.col === col) {
      logger.debug('Dropping on same position, cancelling');
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);
      return;
    }

    // Calculate visual positions for comparison
    const _originalVisualPos = originalPosition ? calculateResponsivePosition(
      originalPosition.row || 1,
      originalPosition.col || 1,
      isMobile,
      containerRef.current || undefined
    ) : null;

    const _targetVisualPos = calculateResponsivePosition(
      row,
      col,
      isMobile,
      containerRef.current || undefined
    );

    // Add timeout safety measure for loading state (10 seconds)
    const loadingTimeout = setTimeout(() => {
      logger.warn('Loading timeout - resetting drag states');
      setIsLoading(false);
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);
    }, 10000);

    try {
      setIsLoading(true);

      // Determine actual action based on RE-CHECKED position
      const actualAction = conflictBar ? 'swap' : 'move';

      if (actualAction === 'move') {
        // Simple move to empty position
        const establishment = establishments.find(est => est.id === draggedBar.id);

        if (establishment) {
          // OPTIMISTIC UI: Store the new position immediately
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
            zone: 'soi6'
          };

          const response = await fetch(requestUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          if (response.ok) {
            // Success - keep optimistic position, no need to reload all data
            logger.debug('Position updated successfully on server');
            setWaitingForDataUpdate(false);
            const lockUntil = Date.now() + 500;
            setOperationLockUntil(lockUntil);
          } else {
            const errorText = await response.text();
            logger.error('Move failed', {
              status: response.status,
              error: errorText
            });

            // OPTIMISTIC UI: Clear failed position
            setOptimisticPositions(prev => {
              const newMap = new Map(prev);
              newMap.delete(establishment.id);
              return newMap;
            });
            setWaitingForDataUpdate(false);

            // Show user-friendly error with specific messages
            let userMessage = 'Failed to move establishment';
            if (response.status === 400 && errorText.includes('Column position out of bounds')) {
              userMessage = `❌ Invalid position: Column ${col} is out of bounds (1-20 allowed)`;
            } else if (response.status === 400 && errorText.includes('Database constraint')) {
              userMessage = '❌ Database constraint error - please try a different position';
            } else {
              userMessage = `❌ Move failed: ${response.status} ${response.statusText}`;
            }

            toast.error(userMessage);
          }
        } else {
          logger.error('Move failed - missing establishment or token');
        }

      } else if (actualAction === 'swap' && conflictBar) {
        // Swap positions between two bars using atomic backend swap API
        const draggedEstablishment = establishments.find(est => est.id === draggedBar.id);
        const conflictEstablishment = establishments.find(est => est.id === conflictBar.id);

        if (draggedEstablishment && conflictEstablishment) {
          // Get original positions from the database (establishments data)
          const draggedOriginalPos = {
            row: draggedEstablishment.grid_row || 1,
            col: draggedEstablishment.grid_col || 1
          };

          // OPTIMISTIC UI: Store both swapped positions immediately
          setWaitingForDataUpdate(true);
          setOptimisticPositions(prev => {
            const newMap = new Map(prev);
            newMap.set(draggedEstablishment.id, { row, col });
            newMap.set(conflictEstablishment.id, { row: draggedOriginalPos.row, col: draggedOriginalPos.col });
            return newMap;
          });

          const requestUrl = `${process.env.REACT_APP_API_URL}/api/grid-move-workaround`;
          const requestBody = {
            establishmentId: draggedEstablishment.id,
            grid_row: row,
            grid_col: col,
            zone: 'soi6',
            swap_with_id: conflictEstablishment.id
          };

          // Use single atomic swap API call instead of parallel calls
          const response = await fetch(requestUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          if (response.ok) {
            // Success - keep optimistic position, no need to reload all data
            logger.debug('Position updated successfully on server');
            setWaitingForDataUpdate(false);
            const lockUntil = Date.now() + 500;
            setOperationLockUntil(lockUntil);
          } else {
            const errorText = await response.text();
            logger.error('Atomic swap failed', {
              status: response.status,
              error: errorText
            });

            // OPTIMISTIC UI: Clear failed swap positions
            setOptimisticPositions(prev => {
              const newMap = new Map(prev);
              newMap.delete(draggedEstablishment.id);
              newMap.delete(conflictEstablishment.id);
              return newMap;
            });
            setWaitingForDataUpdate(false);

            // Show user-friendly error with specific messages for swap
            let userMessage = 'Failed to swap establishments';
            if (response.status === 400 && errorText.includes('Column position out of bounds')) {
              userMessage = `❌ Invalid swap position: Column ${col} is out of bounds (1-20 allowed)`;
            } else if (response.status === 400 && errorText.includes('Database constraint')) {
              userMessage = '❌ Database constraint error - swap not possible at this position';
            } else if (response.status === 500) {
              userMessage = '❌ Swap failed due to server error - please try again';
            } else {
              userMessage = `❌ Swap failed: ${response.status} ${response.statusText}`;
            }

            toast.error(userMessage);
          }
        } else {
          logger.error('Swap failed - missing establishments or token');
        }
      }

    } catch (error) {
      logger.error('Drop operation error', error);
    } finally {
      // Clear the timeout to prevent it from triggering
      clearTimeout(loadingTimeout);

      // Clear loading state
      setIsLoading(false);

      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);

      // Clear throttle timeout
      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current);
        throttleTimeout.current = null;
      }
    }
  }, [isEditMode, isDragging, dragOverPosition, draggedBar, dropAction, findBarAtPosition, establishments, onEstablishmentUpdate, user, token, containerRef, isMobile]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedBar(null);
    setDragOverPosition(null);
    setIsDragging(false);
    setDropAction(null);
    setMousePosition(null);

    // Clear throttle timeout
    if (throttleTimeout.current) {
      clearTimeout(throttleTimeout.current);
      throttleTimeout.current = null;
    }
  }, []);

  // ✅ TOUCH SUPPORT: Touch event handlers for mobile/tablet drag&drop
  const handleTouchStart = useCallback((bar: Bar, event: React.TouchEvent) => {
    const now = Date.now();

    // STRICT CHECK: Block if locked OR loading
    if (!isEditMode || isLoading || now < operationLockUntil) {
      event.preventDefault();
      return;
    }

    // Prevent default to avoid scrolling during drag
    event.preventDefault();

    // ✅ HAPTIC FEEDBACK: Short vibration on drag start
    triggerHapticFeedback(10);

    setDraggedBar(bar);
    setIsDragging(true);
  }, [isEditMode, isLoading, operationLockUntil, triggerHapticFeedback]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isEditMode || !isDragging || !draggedBar || !containerRef.current) return;

    event.preventDefault(); // Prevent scrolling

    updateMousePosition(event);
  }, [isEditMode, isDragging, draggedBar, updateMousePosition]);

  const handleTouchEnd = useCallback(async (event: React.TouchEvent) => {
    if (!isEditMode || !isDragging || !dragOverPosition || !draggedBar || dropAction === 'blocked') {
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      return;
    }

    event.preventDefault();

    // ✅ HAPTIC FEEDBACK: Double vibration pattern on successful drop
    triggerHapticFeedback([20, 10, 20]);

    const { row, col } = dragOverPosition;

    // RE-CHECK position at drop time
    const conflictBar = findBarAtPosition(row, col);

    // Get original position of dragged establishment
    const draggedEstablishment = establishments.find(est => est.id === draggedBar.id);
    const originalPosition = draggedEstablishment ? {
      row: draggedEstablishment.grid_row,
      col: draggedEstablishment.grid_col
    } : null;

    // Safety check: If trying to drop on same position, cancel
    if (originalPosition && originalPosition.row === row && originalPosition.col === col) {
      logger.debug('Dropping on same position, cancelling');
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);
      return;
    }

    // Add timeout safety measure for loading state (10 seconds)
    const loadingTimeout = setTimeout(() => {
      logger.warn('Loading timeout - resetting drag states');
      setIsLoading(false);
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);
    }, 10000);

    try {
      setIsLoading(true);

      // Determine actual action based on RE-CHECKED position
      const actualAction = conflictBar ? 'swap' : 'move';

      if (actualAction === 'move') {
        // Simple move to empty position
        const establishment = establishments.find(est => est.id === draggedBar.id);

        if (establishment) {
          // OPTIMISTIC UI: Store the new position immediately
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
            zone: 'soi6'
          };

          const response = await fetch(requestUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          if (response.ok) {
            logger.debug('Position updated successfully on server');
            setWaitingForDataUpdate(false);
            const lockUntil = Date.now() + 500;
            setOperationLockUntil(lockUntil);
          } else {
            const errorText = await response.text();
            logger.error('Move failed', {
              status: response.status,
              error: errorText
            });

            // OPTIMISTIC UI: Clear failed position
            setOptimisticPositions(prev => {
              const newMap = new Map(prev);
              newMap.delete(establishment.id);
              return newMap;
            });
            setWaitingForDataUpdate(false);

            let userMessage = 'Failed to move establishment';
            if (response.status === 400 && errorText.includes('Column position out of bounds')) {
              userMessage = `❌ Invalid position: Column ${col} is out of bounds (1-20 allowed)`;
            } else if (response.status === 400 && errorText.includes('Database constraint')) {
              userMessage = '❌ Database constraint error - please try a different position';
            } else {
              userMessage = `❌ Move failed: ${response.status} ${response.statusText}`;
            }

            toast.error(userMessage);
          }
        } else {
          logger.error('Move failed - missing establishment');
        }

      } else if (actualAction === 'swap' && conflictBar) {
        // Swap positions between two bars using atomic backend swap API
        const draggedEstablishment = establishments.find(est => est.id === draggedBar.id);
        const conflictEstablishment = establishments.find(est => est.id === conflictBar.id);

        if (draggedEstablishment && conflictEstablishment) {
          const draggedOriginalPos = {
            row: draggedEstablishment.grid_row || 1,
            col: draggedEstablishment.grid_col || 1
          };

          // OPTIMISTIC UI: Store both swapped positions immediately
          setWaitingForDataUpdate(true);
          setOptimisticPositions(prev => {
            const newMap = new Map(prev);
            newMap.set(draggedEstablishment.id, { row, col });
            newMap.set(conflictEstablishment.id, { row: draggedOriginalPos.row, col: draggedOriginalPos.col });
            return newMap;
          });

          const requestUrl = `${process.env.REACT_APP_API_URL}/api/grid-move-workaround`;
          const requestBody = {
            establishmentId: draggedEstablishment.id,
            grid_row: row,
            grid_col: col,
            zone: 'soi6',
            swap_with_id: conflictEstablishment.id
          };

          const response = await fetch(requestUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          if (response.ok) {
            logger.debug('Swap updated successfully on server');
            setWaitingForDataUpdate(false);
            const lockUntil = Date.now() + 500;
            setOperationLockUntil(lockUntil);
          } else {
            const errorText = await response.text();
            logger.error('Atomic swap failed', {
              status: response.status,
              error: errorText
            });

            // OPTIMISTIC UI: Clear failed swap positions
            setOptimisticPositions(prev => {
              const newMap = new Map(prev);
              newMap.delete(draggedEstablishment.id);
              newMap.delete(conflictEstablishment.id);
              return newMap;
            });
            setWaitingForDataUpdate(false);

            let userMessage = 'Failed to swap establishments';
            if (response.status === 400 && errorText.includes('Column position out of bounds')) {
              userMessage = `❌ Invalid swap position: Column ${col} is out of bounds (1-20 allowed)`;
            } else if (response.status === 400 && errorText.includes('Database constraint')) {
              userMessage = '❌ Database constraint error - swap not possible at this position';
            } else if (response.status === 500) {
              userMessage = '❌ Swap failed due to server error - please try again';
            } else {
              userMessage = `❌ Swap failed: ${response.status} ${response.statusText}`;
            }

            toast.error(userMessage);
          }
        } else {
          logger.error('Swap failed - missing establishments');
        }
      }

    } catch (error) {
      logger.error('Touch drop operation error', error);
    } finally {
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);

      // Clear throttle timeout
      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current);
        throttleTimeout.current = null;
      }
    }
  }, [isEditMode, isDragging, dragOverPosition, draggedBar, dropAction, findBarAtPosition, establishments]);

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setIsEditMode(!isEditMode);
    // Reset drag state when toggling
    setDraggedBar(null);
    setDragOverPosition(null);
    setIsDragging(false);
    setDropAction(null);
    setMousePosition(null);

    // Clear throttle timeout
    if (throttleTimeout.current) {
      clearTimeout(throttleTimeout.current);
      throttleTimeout.current = null;
    }
  }, [isEditMode]);

  // ✅ KEYBOARD NAVIGATION: Arrow key handler for navigating between establishments
  const handleKeyboardNavigation = useCallback((e: React.KeyboardEvent) => {
    // Only handle arrow keys
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      return;
    }

    // Don't interfere with edit mode or if no bars exist
    if (isEditMode || allBars.length === 0) {
      return;
    }

    e.preventDefault();

    // Initialize focus if not set
    let currentIndex = focusedBarIndex;
    if (currentIndex === -1 || currentIndex >= allBars.length) {
      currentIndex = 0;
      setFocusedBarIndex(0);
      const firstBar = allBars[0];
      barRefs.current.get(firstBar.id)?.focus();
      return;
    }

    const currentBar = allBars[currentIndex];
    const currentRow = currentBar.grid_row || 1;
    const currentCol = currentBar.grid_col || 1;

    let targetBar: Bar | null = null;
    let targetIndex = -1;

    switch (e.key) {
      case 'ArrowRight':
        // Find next bar in same row (higher column)
        targetBar = allBars
          .map((bar, idx) => ({ bar, idx }))
          .filter(({ bar }) => bar.grid_row === currentRow && (bar.grid_col || 1) > currentCol)
          .sort((a, b) => (a.bar.grid_col || 1) - (b.bar.grid_col || 1))[0]?.bar || null;
        targetIndex = targetBar ? allBars.findIndex(b => b.id === targetBar!.id) : -1;
        break;

      case 'ArrowLeft':
        // Find previous bar in same row (lower column)
        targetBar = allBars
          .map((bar, idx) => ({ bar, idx }))
          .filter(({ bar }) => bar.grid_row === currentRow && (bar.grid_col || 1) < currentCol)
          .sort((a, b) => (b.bar.grid_col || 1) - (a.bar.grid_col || 1))[0]?.bar || null;
        targetIndex = targetBar ? allBars.findIndex(b => b.id === targetBar!.id) : -1;
        break;

      case 'ArrowUp':
        // Find bar in row above (row 2 if currently row 1), closest column
        targetBar = allBars
          .filter(bar => (bar.grid_row || 1) !== currentRow)
          .sort((a, b) => {
            const aDist = Math.abs((a.grid_col || 1) - currentCol);
            const bDist = Math.abs((b.grid_col || 1) - currentCol);
            return aDist - bDist;
          })[0] || null;
        targetIndex = targetBar ? allBars.findIndex(b => b.id === targetBar!.id) : -1;
        break;

      case 'ArrowDown':
        // Find bar in row below (row 1 if currently row 2), closest column
        targetBar = allBars
          .filter(bar => (bar.grid_row || 1) !== currentRow)
          .sort((a, b) => {
            const aDist = Math.abs((a.grid_col || 1) - currentCol);
            const bDist = Math.abs((b.grid_col || 1) - currentCol);
            return aDist - bDist;
          })[0] || null;
        targetIndex = targetBar ? allBars.findIndex(b => b.id === targetBar!.id) : -1;
        break;
    }

    // Focus target bar if found
    if (targetBar && targetIndex !== -1) {
      setFocusedBarIndex(targetIndex);
      barRefs.current.get(targetBar.id)?.focus();
    }
  }, [allBars, focusedBarIndex, isEditMode]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clean up all drag states and timeouts on unmount
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);
      setIsLoading(false);

      // Clear any remaining timeouts
      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current);
        throttleTimeout.current = null;
      }
    };
  }, []);

  // Check if user is admin
  const isAdmin = user && (user.role === 'admin' || user.role === 'moderator');

  // Calculate dynamic bar size for current container
  const currentBarSize = useMemo(() => {
    if (containerRef.current) {
      const { barWidth } = calculateResponsivePosition(1, 1, isMobile, containerRef.current);
      return barWidth;
    }
    return isMobile ? 32 : 40; // fallback sizes
  }, [isMobile, containerDimensions]);

  // Render debug grid overlay (yellow squares)
  const renderGridDebug = () => {
    if (!isEditMode || !containerRef.current) return null;

    const zoneConfig = getZoneConfig('soi6');
    const gridCells: React.ReactElement[] = [];
    // Responsive grid size: match bar size
    const fixedGridSize = isMobile ? 32 : 40;

    for (let row = 1; row <= zoneConfig.maxRows; row++) {
      for (let col = 1; col <= zoneConfig.maxCols; col++) {
        const { x, y } = calculateResponsivePosition(row, col, isMobile, containerRef.current!);

        gridCells.push(
          <div
            key={`grid-${row}-${col}`}
            style={{
              position: 'absolute',
              left: `${x - fixedGridSize/2}px`,
              top: `${y - fixedGridSize/2}px`,
              width: `${fixedGridSize}px`,
              height: `${fixedGridSize}px`,
              border: isMobile ? '2px dashed rgba(0, 255, 255, 0.4)' : '2px dashed #FFD700',
              background: isMobile ? 'rgba(0, 255, 255, 0.05)' : 'rgba(255, 215, 0, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '10px' : '8px',
              color: isMobile ? '#00E5FF' : '#FFD700',
              fontWeight: 'bold',
              pointerEvents: 'none',
              zIndex: 5,
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
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
      className={`map-container-nightlife map-bg-soi6 ${isEditMode ? 'edit-mode' : ''}`}
      onDragOver={isEditMode ? handleDragOver : undefined}
      onDrop={isEditMode ? handleDrop : undefined}
      onKeyDown={handleKeyboardNavigation}
      role="region"
      aria-label="Interactive map of Soi 6 establishments"
      aria-describedby="soi6-map-description"
    >
      {/* Screen Reader Accessible Description */}
      <p id="soi6-map-description" className="sr-only">
        Interactive map displaying {allBars.length} establishments in Soi 6.
        {isEditMode ? ' Edit mode active: drag establishments to reposition them.' : ' Click on establishments to view details.'}
        For keyboard navigation, press Tab to focus establishments, then use Arrow keys to navigate between them, Enter or Space to select.
      </p>

      {/* Screen Reader Only Establishment List */}
      <ScreenReaderEstablishmentList
        establishments={establishments}
        zone="soi6"
        onEstablishmentSelect={(est) => onEstablishmentClick?.(est)}
      />
      {/* Central Road Component - Canvas Rendering */}
      <GenericRoadCanvas
        config={{
          shape: isMobile ? 'vertical' : 'horizontal',
          width: isMobile ? 80 : 200,
          // Horizontal road (desktop): full width centered
          startX: 1,
          endX: 99,
          // Vertical road (mobile): starts from top (0%) to bottom (100%)
          startY: 0,
          endY: 100
        }}
        style={{
          baseColor: '#2d2d2d',
          overlayColor: '#1a1a1a',
          edgeColor: '#FFD700',
          centerLineColor: '#FFD700'
        }}
        isEditMode={isEditMode}
        grainCount={1500}
      />

      {/* Admin controls */}
      {isAdmin && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 20
        }}>
          <button
            onClick={toggleEditMode}
            aria-label={isEditMode ? 'Exit edit mode and save changes' : 'Enter edit mode to reposition establishments'}
            aria-pressed={isEditMode}
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
            {isEditMode ? (<>🔒<span className="edit-mode-text"> Exit Edit</span></>) : (<>✏️<span className="edit-mode-text"> Edit Mode</span></>)}
          </button>
        </div>
      )}







      {/* Debug Grid Overlay (Yellow Circles) */}
      {renderGridDebug()}

      {/* Edit Mode Indicator (if needed) */}
      {isEditMode && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '10px',
          color: '#00FF00',
          background: 'rgba(0,0,0,0.6)',
          padding: '3px 8px',
          borderRadius: '10px',
          zIndex: 20,
          pointerEvents: 'none'
        }}>
          🎯 EDIT MODE
        </div>
      )}

      {/* Bars */}
      {allBars.map((bar, index) => {
        const isSelected = selectedEstablishment === bar.id;
        const isHovered = hoveredBar === bar.id;
        const isBeingDragged = isDragging && draggedBar?.id === bar.id;

        // Get establishment details for aria-label
        const establishment = establishments.find(est => est.id === bar.id);
        const categoryName = establishment?.category_id === 2 ? 'GoGo Bar'
          : establishment?.category_id === 1 ? 'Bar'
          : establishment?.category_id === 3 ? 'Massage Salon'
          : establishment?.category_id === 4 ? 'Nightclub'
          : 'Establishment';

        // 🆕 v10.3 Phase 6 - Check VIP status
        const isVIP = establishment?.is_vip && establishment?.vip_expires_at &&
          new Date(establishment.vip_expires_at) > new Date();

        const ariaLabel = `${bar.name}, ${categoryName}${isVIP ? ', VIP establishment' : ''}, click to view details`;

        // 🆕 v10.3 Ultra Premium - VIP establishments are larger (responsive)
        // Desktop: +35%, Tablet: +25%, Mobile: +15%
        const vipSizeMultiplier = window.innerWidth < 480 ? 1.15
                                : window.innerWidth < 768 ? 1.25
                                : 1.35;
        const vipBarSize = Math.round(currentBarSize * vipSizeMultiplier);
        const finalBarSize = isVIP ? vipBarSize : currentBarSize;

        return (
          <div
            key={bar.id}
            ref={(el) => {
              if (el) {
                barRefs.current.set(bar.id, el);
              } else {
                barRefs.current.delete(bar.id);
              }
            }}
            className={`soi6-bar-circle ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${isBeingDragged ? 'dragging' : ''} ${isVIP ? 'vip-establishment-marker' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={ariaLabel}
            aria-pressed={isSelected}
            aria-describedby={isHovered ? `tooltip-${bar.id}` : undefined}
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
            draggable={isEditMode && isAdmin && !isLoading ? true : false}
            onDragStart={(e) => handleDragStart(bar, e)}
            onDragEnd={handleDragEnd}
            onTouchStart={isEditMode && isAdmin && !isLoading ? (e) => handleTouchStart(bar, e) : undefined}
            onTouchMove={isEditMode && isAdmin && !isLoading ? handleTouchMove : undefined}
            onTouchEnd={isEditMode && isAdmin && !isLoading ? handleTouchEnd : undefined}
            style={{
              touchAction: isEditMode ? 'none' : 'auto',
              position: 'absolute',
              left: `${bar.position.x - finalBarSize/2}px`,
              top: `${bar.position.y - finalBarSize/2}px`,
              width: `${finalBarSize}px`,
              height: `${finalBarSize}px`,
              borderRadius: '50%',
              background: `
                radial-gradient(circle at 30% 30%, ${bar.color}FF, ${bar.color}DD 60%, ${bar.color}AA 100%),
                linear-gradient(45deg, ${bar.color}22, ${bar.color}44)
              `,
              border: isVIP
                ? '5px solid #FFD700'  // VIP: Ultra thick gold border
                : isSelected
                ? '3px solid #FFD700'
                : isEditMode
                  ? '2px solid #00FF00'
                  : '2px solid rgba(255,255,255,0.6)',
              cursor: isLoading ? 'not-allowed' : isEditMode ? (isBeingDragged ? 'grabbing' : 'grab') : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transform: isHovered && !isBeingDragged ? 'scale(1.2)' : 'scale(1)',
              transition: isVIP ? 'none' : 'all 0.3s ease', // VIP animation handled by CSS
              boxShadow: isVIP
                ? undefined  // VIP: Glow handled by CSS animation
                : isHovered
                ? `
                    0 0 25px ${TYPE_STYLES[bar.type].shadow},
                    0 0 40px ${TYPE_STYLES[bar.type].shadow}66,
                    inset 0 0 10px rgba(255,255,255,0.2)
                  `
                : isEditMode
                  ? '0 0 15px rgba(0,255,0,0.5), 0 0 25px rgba(0,255,0,0.2)'
                  : `
                      0 0 12px ${bar.color}66,
                      0 0 20px ${bar.color}33,
                      0 4px 12px rgba(0,0,0,0.4)
                    `,
              zIndex: isHovered ? 15 : isBeingDragged ? 100 : 10,
              opacity: isBeingDragged ? 0.7 : 1
            }}
          >
            {/* Logo ou emoji fallback */}
            {getEstablishmentIcon(bar.id, establishments, bar.icon)}

            {/* 🆕 v10.3 Ultra Premium - VIP Grande Couronne (x3 taille) */}
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

            {/* 🆕 v10.3 Ultra Premium - VIP Badge texte */}
            {isVIP && (
              <div className="vip-badge">
                VIP
              </div>
            )}

            {/* Tooltip */}
            {isHovered && !isDragging && (
              <div
                id={`tooltip-${bar.id}`}
                role="tooltip"
                style={{
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
                  border: '1px solid #FFD700'
                }}
              >
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
                  borderTop: '5px solid #FFD700'
                }} />
              </div>
            )}
          </div>
        );
      })}

      {/* Duplicate Position Indicators - Visual Warning for Overlapping Establishments */}
      {isAdmin && isEditMode && duplicatePositions.map((dup) => {
        // Calculate visual position for the duplicate indicator
        const { x, y } = calculateResponsivePosition(
          dup.row,
          dup.col,
          isMobile,
          containerRef.current || undefined
        );

        return (
          <div
            key={`duplicate-${dup.row}-${dup.col}`}
            className="duplicate-indicator-wrapper"
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 18
            }}
          >
            {/* Pulsing Warning Circle */}
            <div
              className="duplicate-pulse-circle"
              style={{
                width: `${currentBarSize * 1.8}px`,
                height: `${currentBarSize * 1.8}px`,
                borderRadius: '50%',
                border: '3px solid #FF4444',
                background: 'rgba(255, 68, 68, 0.15)',
                animation: 'duplicatePulse 2s infinite',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {/* Count Badge */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #FF4444, #FF6B6B)',
                  color: 'white',
                  borderRadius: '50%',
                  width: `${currentBarSize * 0.6}px`,
                  height: `${currentBarSize * 0.6}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: `${currentBarSize * 0.35}px`,
                  fontWeight: 'bold',
                  boxShadow: '0 2px 8px rgba(255, 68, 68, 0.5)',
                  border: '2px solid white'
                }}
                title={`${dup.count} establishments at same position: ${dup.establishments.map(e => e.name).join(', ')}`}
              >
                ⚠️{dup.count}
              </div>
            </div>
          </div>
        );
      })}

      {/* Drop Zone Indicator - Shows where bar will land */}
      {isEditMode && isDragging && dragOverPosition && dropAction !== 'blocked' && containerRef.current && (
        (() => {
          const { x, y } = calculateResponsivePosition(
            dragOverPosition.row,
            dragOverPosition.col,
            isMobile,
            containerRef.current!
          );
          const size = isMobile ? 32 : 40;
          const isSwap = dropAction === 'swap';

          return (
            <div
              style={{
                position: 'absolute',
                left: `${x - size/2}px`,
                top: `${y - size/2}px`,
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                border: isSwap ? '3px solid rgba(255, 215, 0, 0.8)' : '3px solid rgba(0, 255, 255, 0.8)',
                background: isSwap ? 'rgba(255, 215, 0, 0.15)' : 'rgba(0, 255, 255, 0.15)',
                boxShadow: isSwap
                  ? '0 0 20px rgba(255, 215, 0, 0.6), inset 0 0 15px rgba(255, 215, 0, 0.2)'
                  : '0 0 20px rgba(0, 255, 255, 0.6), inset 0 0 15px rgba(0, 255, 255, 0.2)',
                pointerEvents: 'none',
                zIndex: 8,
                animation: 'dropZonePulse 1s ease-in-out infinite'
              }}
            />
          );
        })()
      )}

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
          color: '#FFD700',
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
              border: '2px solid #FFD700',
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

        @keyframes dropZonePulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.15);
            opacity: 1;
          }
        }

        @keyframes duplicatePulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.4;
            box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7);
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
            box-shadow: 0 0 20px 10px rgba(255, 68, 68, 0);
          }
        }

        /* 🆕 v10.3 Phase 6 - VIP Crown Pulse Animation */
        @keyframes vipPulse {
          0%, 100% {
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
          }
          50% {
            box-shadow: 0 0 20px rgba(255, 215, 0, 1);
          }
        }

        /* Accessibility: Focus visible for keyboard navigation */
        .soi6-bar-circle:focus {
          outline: 3px solid #FFD700;
          outline-offset: 4px;
          box-shadow:
            0 0 25px rgba(255, 215, 0, 0.8),
            0 0 40px rgba(255, 215, 0, 0.5),
            inset 0 0 15px rgba(255, 255, 255, 0.3) !important;
        }

        .soi6-bar-circle:focus-visible {
          outline: 3px solid #FFD700;
          outline-offset: 4px;
        }

        /* Screen reader only class */
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

        @keyframes neonFlicker {
          0%, 100% {
            filter: brightness(1) saturate(1.2);
            box-shadow:
              0 0 12px currentColor,
              0 0 20px currentColor,
              0 4px 12px rgba(0,0,0,0.4);
          }
          5% {
            filter: brightness(0.8) saturate(1);
            box-shadow:
              0 0 8px currentColor,
              0 0 15px currentColor,
              0 4px 12px rgba(0,0,0,0.4);
          }
          10% {
            filter: brightness(1.3) saturate(1.4);
            box-shadow:
              0 0 16px currentColor,
              0 0 25px currentColor,
              0 4px 12px rgba(0,0,0,0.4);
          }
        }

        @keyframes selectedPulse {
          0%, 100% {
            box-shadow:
              0 0 25px rgba(255, 215, 0, 0.8),
              0 0 40px rgba(255, 215, 0, 0.4),
              0 0 60px rgba(255, 215, 0, 0.2);
          }
          50% {
            box-shadow:
              0 0 35px rgba(255, 215, 0, 1),
              0 0 50px rgba(255, 215, 0, 0.6),
              0 0 80px rgba(255, 215, 0, 0.3);
          }
        }

        .soi6-map-container {
          background-attachment: fixed;
        }

        .soi6-map-container .soi6-bar-circle {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: neonFlicker 4s infinite;
          animation-delay: calc(var(--bar-index) * 0.2s);
        }

        .soi6-map-container .soi6-bar-circle:hover {
          transform: scale(1.2) !important;
          z-index: 15 !important;
          animation: neonFlicker 1.5s infinite;
          filter: brightness(1.4) saturate(1.3) !important;
        }

        .soi6-map-container .soi6-bar-circle.selected {
          animation: selectedPulse 2s infinite;
        }

        .soi6-map-container .soi6-bar-circle.dragging {
          cursor: grabbing !important;
          z-index: 100 !important;
          animation: none;
          filter: brightness(1.2) saturate(1.1);
        }

        .soi6-map-container .soi6-bar-circle[draggable="true"]:hover {
          cursor: grab !important;
        }

        /* Reduce animations on low-performance devices */
        @media (prefers-reduced-motion: reduce) {
          .soi6-bar-circle {
            animation: none !important;
          }
        }

        /* Thai-style background pattern */
        .soi6-map-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image:
            radial-gradient(circle at 25% 25%, rgba(193, 154, 107, 0.05) 0%, transparent 25%),
            radial-gradient(circle at 75% 75%, rgba(0, 255, 255, 0.05) 0%, transparent 25%);
          background-size: 200px 200px, 150px 150px;
          background-position: 0 0, 100px 100px;
          animation: backgroundShift 20s linear infinite;
          pointer-events: none;
          z-index: 1;
        }

        @keyframes backgroundShift {
          0% { background-position: 0 0, 100px 100px; }
          100% { background-position: 200px 200px, 300px 300px; }
        }
      `}</style>

    </div>
  );
};

export default CustomSoi6Map;
