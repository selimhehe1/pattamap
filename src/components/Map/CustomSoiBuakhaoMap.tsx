import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Establishment, CustomBar } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getZoneConfig } from '../../utils/zoneConfig';
import { MAP_CONFIG } from '../../utils/constants';
import { useContainerSize } from '../../hooks/useContainerSize';
import GenericRoadCanvas from './GenericRoadCanvas';
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

interface CustomSoiBuakhaoMapProps {
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

const calculateResponsivePosition = (row: number, col: number, isMobile: boolean, containerElement?: HTMLElement) => {
  const zoneConfig = getZoneConfig('soibuakhao');

  if (isMobile) {
    const totalWidth = 350;
    const usableWidth = totalWidth * 0.9;
    const barWidth = Math.min(40, usableWidth / zoneConfig.maxCols - 4);
    const spacing = (usableWidth - (zoneConfig.maxCols * barWidth)) / (zoneConfig.maxCols + 1);

    const x = spacing + (col - 1) * (barWidth + spacing);
    const rowSpacing = 140;
    const y = 60 + (row - 1) * rowSpacing;
    return { x, y, barWidth };
  } else {
    const containerWidth = containerElement ? containerElement.getBoundingClientRect().width :
                          (window.innerWidth > 1200 ? 1200 : window.innerWidth - 40);

    const usableWidth = containerWidth * (zoneConfig.endX - zoneConfig.startX) / 100;
    const startX = containerWidth * zoneConfig.startX / 100;

    const maxBarWidth = 45;
    const minBarWidth = 25;
    const idealBarWidth = Math.min(maxBarWidth, Math.max(minBarWidth, usableWidth / zoneConfig.maxCols - 8));

    const totalBarsWidth = zoneConfig.maxCols * idealBarWidth;
    const totalSpacing = usableWidth - totalBarsWidth;
    const spacing = totalSpacing / (zoneConfig.maxCols + 1);

    const x = startX + spacing + (col - 1) * (idealBarWidth + spacing);

    const containerHeight = containerElement ? containerElement.getBoundingClientRect().height : MAP_CONFIG.DEFAULT_HEIGHT;
    const topY = containerHeight * zoneConfig.startY / 100;
    const bottomY = containerHeight * zoneConfig.endY / 100;
    const y = row === 1 ? topY : bottomY;

    return { x, y, barWidth: idealBarWidth };
  }
};

const establishmentsToVisualBars = (establishments: Establishment[], isMobile: boolean, containerElement?: HTMLElement): Bar[] => {
  return establishments
    .filter(est => est.zone === 'soibuakhao')
    .map(est => {
      const barType = CATEGORY_TO_TYPE_MAP[est.category_id] || 'beer';
      const style = TYPE_STYLES[barType];

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
};

const CustomSoiBuakhaoMap: React.FC<CustomSoiBuakhaoMapProps> = ({
  establishments,
  onEstablishmentClick,
  selectedEstablishment,
  onBarClick,
  onEstablishmentUpdate
}) => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [_waitingForDataUpdate, setWaitingForDataUpdate] = useState(false);

  // OPTIMISTIC UI: Store temporary positions during API calls to prevent disappearing bars
  const [optimisticPositions, setOptimisticPositions] = useState<Map<string, { row: number; col: number }>>(new Map());

  // STRICT LOCKING: Only allow ONE drag operation at a time
  const [operationLockUntil, setOperationLockUntil] = useState<number>(0);

  // Drag and drop state
  const [draggedBar, setDraggedBar] = useState<Bar | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<{ row: number; col: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropAction, setDropAction] = useState<'move' | 'swap' | 'blocked' | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  // Throttle ref for performance
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);

  // ✅ KEYBOARD NAVIGATION: Track focused bar index for arrow key navigation
  const [focusedBarIndex, setFocusedBarIndex] = useState<number>(-1);
  const barRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Monitor container size changes to recalculate positions
  // ✅ PERFORMANCE: 300ms debounce reduces re-renders by 50% during resize
  const containerDimensions = useContainerSize(containerRef, 300);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishments, isMobile, containerDimensions, optimisticPositions]); // containerDimensions triggers recalculation when container resizes

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
        color: bar.color
      };
      onBarClick(customBar);
    } else {
      navigate(generateEstablishmentUrl(bar.id, bar.name, establishment?.zone || 'soibuakhao'));
    }
  }, [establishments, onEstablishmentClick, onBarClick, navigate, isEditMode]);

  const isAdmin = user && (user.role === 'admin' || user.role === 'moderator');

  const currentBarSize = useMemo(() => {
    if (containerRef.current) {
      const { barWidth } = calculateResponsivePosition(1, 1, isMobile, containerRef.current);
      return barWidth;
    }
    return isMobile ? 35 : 40;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- containerDimensions triggers via containerRef
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

  // Find bar at specific grid position (checking optimistic positions first)
  const findBarAtPosition = useCallback((row: number, col: number): Bar | null => {
    // Check optimistic positions first (bars that have been moved but not yet confirmed by server)
    let foundBar: Bar | null = null;
    optimisticPositions.forEach((pos, establishmentId) => {
      if (pos.row === row && pos.col === col) {
        const bar = allBars.find(b => b.id === establishmentId);
        if (bar) foundBar = bar;
      }
    });
    if (foundBar) return foundBar;

    // Then check actual positions
    const establishment = establishments.find(est =>
      est.zone === 'soibuakhao' &&
      est.grid_row === row &&
      est.grid_col === col
    );

    if (establishment) {
      // Make sure this establishment doesn't have an optimistic position elsewhere
      if (optimisticPositions.has(establishment.id)) {
        return null; // It's actually at a different position (optimistic)
      }
      return allBars.find(bar => bar.id === establishment.id) || null;
    }

    return null;
  }, [allBars, establishments, optimisticPositions]);

  // Convert mouse position to grid position
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

  const getGridFromMousePosition = useCallback((event: React.DragEvent | React.TouchEvent) => {
    if (!containerRef.current) return null;

    const coords = getEventCoordinates(event);
    if (!coords) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = coords.clientX - rect.left;
    const relativeY = coords.clientY - rect.top;
    const zoneConfig = getZoneConfig('soibuakhao');

    let row: number, col: number;

    if (isMobile) {
      // Mobile - Vertical layout
      const totalWidth = rect.width;
      const usableWidth = totalWidth * 0.9;
      const barWidth = Math.min(40, usableWidth / zoneConfig.maxCols - 4);
      const spacing = (usableWidth - (zoneConfig.maxCols * barWidth)) / (zoneConfig.maxCols + 1);

      const barRadius = barWidth / 2;
      let detectedCol = 1;

      for (let testCol = 1; testCol <= zoneConfig.maxCols; testCol++) {
        const barCenterX = spacing + (testCol - 1) * (barWidth + spacing);
        const barLeftEdge = barCenterX - barRadius;
        const barRightEdge = barCenterX + barRadius;

        if (relativeX >= barLeftEdge && relativeX <= barRightEdge) {
          detectedCol = testCol;
          break;
        }
      }

      if (detectedCol === 1 && relativeX > spacing + barRadius) {
        const clickSlot = (relativeX - spacing) / (barWidth + spacing);
        detectedCol = Math.max(1, Math.min(zoneConfig.maxCols, Math.floor(clickSlot) + 1));
      }

      col = detectedCol;

      // Row detection for mobile vertical - midpoint between actual row positions
      const row1Y = 60;
      const row2Y = 200; // 60 + 140
      const midPoint = (row1Y + row2Y) / 2; // 130
      row = relativeY < midPoint ? 1 : 2;
    } else {
      // PC - Horizontal layout
      const containerWidth = rect.width;
      const usableWidth = containerWidth * (zoneConfig.endX - zoneConfig.startX) / 100;
      const startX = containerWidth * zoneConfig.startX / 100;

      const maxBarWidth = 45;
      const minBarWidth = 25;
      const idealBarWidth = Math.min(maxBarWidth, Math.max(minBarWidth, usableWidth / zoneConfig.maxCols - 8));
      const totalBarsWidth = zoneConfig.maxCols * idealBarWidth;
      const totalSpacing = usableWidth - totalBarsWidth;
      const spacing = totalSpacing / (zoneConfig.maxCols + 1);

      const relativeXInZone = relativeX - startX;
      const barRadius = idealBarWidth / 2;

      let detectedCol = 1;
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

      if (!directHit) {
        const clickSlot = (relativeXInZone - spacing) / (idealBarWidth + spacing);
        detectedCol = Math.max(1, Math.min(zoneConfig.maxCols, Math.floor(clickSlot) + 1));
      }

      col = detectedCol;

      // Row calculation - 2 rows only (midpoint between actual row positions)
      const containerHeight = rect.height;
      // Calculate midpoint based on actual row positions from zoneConfig
      const midPoint = containerHeight * ((zoneConfig.startY + zoneConfig.endY) / 2) / 100;
      row = relativeY < midPoint ? 1 : 2;
    }

    // Validate bounds
    if (row < 1 || row > zoneConfig.maxRows || col < 1 || col > zoneConfig.maxCols) {
      return null;
    }

    return { row, col };
  }, [isMobile, containerRef]);

  // Throttled version of handleDragOver for performance
  const updateMousePosition = useCallback((event: React.DragEvent | React.TouchEvent) => {
    if (!containerRef.current) return;

    const coords = getEventCoordinates(event);
    if (!coords) return;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = coords.clientX - rect.left;
    const relativeY = coords.clientY - rect.top;

    setMousePosition({ x: relativeX, y: relativeY });

    // Throttle grid calculations
    if (throttleTimeout.current) {
      clearTimeout(throttleTimeout.current);
    }

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
  }, [getGridFromMousePosition, findBarAtPosition, draggedBar, containerRef]);

  // Handle drag start
  const handleDragStart = useCallback((bar: Bar, event: React.DragEvent) => {
    const now = Date.now();

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

      // Determine action: swap only if conflict exists AND it's a different bar
      const actualAction = (conflictBar && conflictBar.id !== draggedBar.id) ? 'swap' : 'move';

      if (actualAction === 'move') {
        const establishment = establishments.find(est => est.id === draggedBar.id);

        if (establishment) {
          setWaitingForDataUpdate(true);
          setOptimisticPositions(prev => {
            const newMap = new Map(prev);
            newMap.set(establishment.id, { row, col });
            return newMap;
          });

          const requestUrl = `${import.meta.env.VITE_API_URL}/api/grid-move-workaround`;
          const requestBody = {
            establishmentId: establishment.id,
            grid_row: row,
            grid_col: col,
            zone: 'soibuakhao'
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
            logger.debug('✅ Position updated successfully on server');
            setWaitingForDataUpdate(false);
            const lockUntil = Date.now() + 500;
            setOperationLockUntil(lockUntil);
          } else {
            const errorText = await response.text();
            logger.error('Move failed', {
              status: response.status,
              error: errorText
            });

            setOptimisticPositions(prev => {
              const newMap = new Map(prev);
              newMap.delete(establishment.id);
              return newMap;
            });
            setWaitingForDataUpdate(false);

            let userMessage = 'Failed to move establishment';
            if (response.status === 400 && errorText.includes('Column position out of bounds')) {
              userMessage = `❌ Invalid position: Column ${col} is out of bounds (1-40 allowed)`;
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
        const draggedEstablishment = establishments.find(est => est.id === draggedBar.id);
        const conflictEstablishment = establishments.find(est => est.id === conflictBar.id);

        if (draggedEstablishment && conflictEstablishment) {
          // Get the actual current position (optimistic or real)
          const draggedOptimisticPos = optimisticPositions.get(draggedEstablishment.id);
          const draggedOriginalPos = draggedOptimisticPos || {
            row: draggedEstablishment.grid_row || 1,
            col: draggedEstablishment.grid_col || 1
          };

          setWaitingForDataUpdate(true);
          setOptimisticPositions(prev => {
            const newMap = new Map(prev);
            newMap.set(draggedEstablishment.id, { row, col });
            newMap.set(conflictEstablishment.id, { row: draggedOriginalPos.row, col: draggedOriginalPos.col });
            return newMap;
          });

          const requestUrl = `${import.meta.env.VITE_API_URL}/api/grid-move-workaround`;
          const requestBody = {
            establishmentId: draggedEstablishment.id,
            grid_row: row,
            grid_col: col,
            zone: 'soibuakhao',
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
            logger.debug('✅ Position updated successfully on server');
            setWaitingForDataUpdate(false);
            const lockUntil = Date.now() + 500;
            setOperationLockUntil(lockUntil);
          } else {
            const errorText = await response.text();
            logger.error('Atomic swap failed', {
              status: response.status,
              error: errorText
            });

            setOptimisticPositions(prev => {
              const newMap = new Map(prev);
              newMap.delete(draggedEstablishment.id);
              newMap.delete(conflictEstablishment.id);
              return newMap;
            });
            setWaitingForDataUpdate(false);

            let userMessage = 'Failed to swap establishments';
            if (response.status === 400 && errorText.includes('Column position out of bounds')) {
              userMessage = `❌ Invalid swap position: Column ${col} is out of bounds (1-40 allowed)`;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- optimisticPositions intentionally excluded to prevent re-renders during drag
  }, [isEditMode, isDragging, dragOverPosition, draggedBar, dropAction, findBarAtPosition, establishments, onEstablishmentUpdate, user, token, containerRef, isMobile]);

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

  // ✅ TOUCH SUPPORT: Handle touch start
  const handleTouchStart = useCallback((bar: Bar, event: React.TouchEvent) => {
    const now = Date.now();

    if (!isEditMode || isLoading || now < operationLockUntil) {
      event.preventDefault();
      return;
    }

    event.preventDefault();

    // Haptic feedback on touch start
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    setDraggedBar(bar);
    setIsDragging(true);
  }, [isEditMode, isLoading, operationLockUntil]);

  // ✅ TOUCH SUPPORT: Handle touch move
  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    updateMousePosition(event);
  }, [updateMousePosition]);

  // ✅ TOUCH SUPPORT: Handle touch end
  const handleTouchEnd = useCallback(async (event: React.TouchEvent) => {
    if (!isEditMode || !isDragging || !dragOverPosition || !draggedBar || dropAction === 'blocked') {
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
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

    // Haptic feedback on successful drop
    if (navigator.vibrate) {
      navigator.vibrate([20, 10, 20]);
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

      // Determine action: swap only if conflict exists AND it's a different bar
      const actualAction = (conflictBar && conflictBar.id !== draggedBar.id) ? 'swap' : 'move';

      if (actualAction === 'move') {
        const establishment = establishments.find(est => est.id === draggedBar.id);

        if (establishment) {
          setWaitingForDataUpdate(true);
          setOptimisticPositions(prev => {
            const newMap = new Map(prev);
            newMap.set(establishment.id, { row, col });
            return newMap;
          });

          const requestUrl = `${import.meta.env.VITE_API_URL}/api/grid-move-workaround`;
          const requestBody = {
            establishmentId: establishment.id,
            grid_row: row,
            grid_col: col,
            zone: 'soibuakhao'
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
            logger.debug('✅ Position updated successfully on server');
            setWaitingForDataUpdate(false);
            const lockUntil = Date.now() + 500;
            setOperationLockUntil(lockUntil);
          } else {
            const errorText = await response.text();
            logger.error('Move failed', {
              status: response.status,
              error: errorText
            });

            setOptimisticPositions(prev => {
              const newMap = new Map(prev);
              newMap.delete(establishment.id);
              return newMap;
            });
            setWaitingForDataUpdate(false);

            let userMessage = 'Failed to move establishment';
            if (response.status === 400 && errorText.includes('Column position out of bounds')) {
              userMessage = `❌ Invalid position: Column ${col} is out of bounds (1-40 allowed)`;
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
        const draggedEstablishment = establishments.find(est => est.id === draggedBar.id);
        const conflictEstablishment = establishments.find(est => est.id === conflictBar.id);

        if (draggedEstablishment && conflictEstablishment) {
          // Get the actual current position (optimistic or real)
          const draggedOptimisticPos = optimisticPositions.get(draggedEstablishment.id);
          const draggedOriginalPos = draggedOptimisticPos || {
            row: draggedEstablishment.grid_row || 1,
            col: draggedEstablishment.grid_col || 1
          };

          setWaitingForDataUpdate(true);
          setOptimisticPositions(prev => {
            const newMap = new Map(prev);
            newMap.set(draggedEstablishment.id, { row, col });
            newMap.set(conflictEstablishment.id, { row: draggedOriginalPos.row, col: draggedOriginalPos.col });
            return newMap;
          });

          const requestUrl = `${import.meta.env.VITE_API_URL}/api/grid-move-workaround`;
          const requestBody = {
            establishmentId: draggedEstablishment.id,
            grid_row: row,
            grid_col: col,
            zone: 'soibuakhao',
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
            logger.debug('✅ Position updated successfully on server');
            setWaitingForDataUpdate(false);
            const lockUntil = Date.now() + 500;
            setOperationLockUntil(lockUntil);
          } else {
            const errorText = await response.text();
            logger.error('Atomic swap failed', {
              status: response.status,
              error: errorText
            });

            setOptimisticPositions(prev => {
              const newMap = new Map(prev);
              newMap.delete(draggedEstablishment.id);
              newMap.delete(conflictEstablishment.id);
              return newMap;
            });
            setWaitingForDataUpdate(false);

            let userMessage = 'Failed to swap establishments';
            if (response.status === 400 && errorText.includes('Column position out of bounds')) {
              userMessage = `❌ Invalid swap position: Column ${col} is out of bounds (1-40 allowed)`;
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
  }, [isEditMode, isDragging, dragOverPosition, draggedBar, dropAction, findBarAtPosition, establishments, optimisticPositions]);
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

  return (
    <div
      ref={containerRef}
      className={`map-container-nightlife map-bg-soibuakhao ${isEditMode ? 'edit-mode' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        background: 'linear-gradient(135deg, rgba(13,0,25,0.95) 0%, rgba(26,0,51,0.95) 50%, rgba(13,0,25,0.95) 100%)',
        overflow: 'hidden'
      }}
      onDragOver={isEditMode ? handleDragOver : undefined}
      onDrop={isEditMode ? handleDrop : undefined}
      onKeyDown={handleKeyboardNavigation}
      role="region"
      aria-label="Interactive map of Soi Buakhao establishments"
      aria-describedby="soibuakhao-map-description"
    >
      {/* Screen Reader Accessible Description */}
      <p id="soibuakhao-map-description" className="sr-only">
        Interactive map displaying {allBars.length} establishments in Soi Buakhao.
        {isEditMode ? ' Edit mode active: drag establishments to reposition them.' : ' Click on establishments to view details.'}
        For keyboard navigation, press Tab to focus establishments, then use Arrow keys to navigate between them, Enter or Space to select.
      </p>

      {/* Screen Reader Only Establishment List */}
      <ScreenReaderEstablishmentList
        establishments={establishments}
        zone="soibuakhao"
        onEstablishmentSelect={(est) => onEstablishmentClick?.(est)}
      />

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

      <div className="map-title-compact-nightlife" style={{
        color: '#FFD700',
        textShadow: '0 0 20px rgba(255,215,0,0.8), 2px 2px 4px rgba(0,0,0,0.8)',
        border: '1px solid rgba(255,215,0,0.4)'
      }}>
        🏙️ SOI BUAKHAO
      </div>

      {/* Route Canvas - Soi Buakhao (Horizontal desktop, Vertical mobile) */}
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: isMobile ? 0 : '12%',
        height: isMobile ? '100%' : '11%',
        pointerEvents: 'none',
        zIndex: 1
      }}>
        <GenericRoadCanvas
          config={isMobile ? {
            shape: 'vertical',
            width: 60,
            startY: 0,
            endY: 100
          } : {
            shape: 'horizontal',
            width: 100,
            startX: 0,
            endX: 100
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
      </div>

      {/* Debug Grid - Desktop Only */}
      {isEditMode && !isMobile && containerRef.current && (() => {
        const zoneConfig = getZoneConfig('soibuakhao');
        const gridCells: React.ReactElement[] = [];
        const fixedGridSize = 40; // Taille fixe uniforme comme Soi 6

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
                  border: '2px dashed #FFD700',
                  background: 'rgba(255, 215, 0, 0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: '#FFD700',
                  fontWeight: 'bold',
                  pointerEvents: 'none',
                  zIndex: 5,
                  textShadow: '0 0 4px rgba(0,0,0,0.8)'
                }}
              >
                {row},{col}
              </div>
            );
          }
        }

        return gridCells;
      })()}

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
            ref={(el) => {
              if (el) {
                barRefs.current.set(bar.id, el);
              } else {
                barRefs.current.delete(bar.id);
              }
            }}
            className={`soibuakhao-bar-circle ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${isBeingDragged ? 'dragging' : ''} ${isVIP ? 'vip-establishment-marker' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={ariaLabel}
            aria-pressed={isSelected}
            aria-describedby={isHovered ? `tooltip-sb-${bar.id}` : undefined}
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
            onTouchStart={isEditMode ? (e) => handleTouchStart(bar, e) : undefined}
            onTouchMove={isEditMode ? handleTouchMove : undefined}
            onTouchEnd={isEditMode ? handleTouchEnd : undefined}
            style={{
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
                ? '5px solid #FFD700'  // VIP: Always gold border (thick)
                : isSelected
                ? '3px solid #FFD700'
                : isEditMode
                  ? '2px solid #00FF00'
                  : '2px solid rgba(255,255,255,0.6)',
              cursor: isEditMode ? (isBeingDragged ? 'grabbing' : 'grab') : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transform: isHovered && !isBeingDragged ? 'scale(1.2)' : 'scale(1)',
              transition: isVIP ? 'none' : 'all 0.3s ease',
              touchAction: isEditMode ? 'none' : 'auto',
              boxShadow: isVIP
                ? undefined  // CSS animation handles VIP glow
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

            {isHovered && !isDragging && (
              <div
                id={`tooltip-sb-${bar.id}`}
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
        .soibuakhao-bar-circle:focus {
          outline: 3px solid #FFD700;
          outline-offset: 4px;
          box-shadow:
            0 0 25px rgba(255, 215, 0, 0.8),
            0 0 40px rgba(255, 215, 0, 0.5),
            inset 0 0 15px rgba(255, 255, 255, 0.3) !important;
        }

        .soibuakhao-bar-circle:focus-visible {
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

export default CustomSoiBuakhaoMap;