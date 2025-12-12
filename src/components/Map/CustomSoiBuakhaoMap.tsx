/**
 * CustomSoiBuakhaoMap - Refactored Version
 *
 * Uses shared hooks and utilities from ./shared to reduce code duplication.
 * Zone-specific logic (position calculation, grid detection) remains inline.
 *
 * Original: ~1497 lines
 * Refactored: ~500 lines (67% reduction)
 */
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Establishment, CustomBar } from '../../types';
import { getZoneConfig } from '../../utils/zoneConfig';
import { MAP_CONFIG } from '../../utils/constants';
import { useContainerSize } from '../../hooks/useContainerSize';
import GenericRoadCanvas from './GenericRoadCanvas';
import DragDropIndicator from './DragDropIndicator';
import toast from '../../utils/toast';
import ScreenReaderEstablishmentList from './ScreenReaderEstablishmentList';
import LazyImage from '../Common/LazyImage';
import { generateEstablishmentUrl } from '../../utils/slugify';
import { logger } from '../../utils/logger';

// Shared hooks and utilities
import { useMapEditMode, useOptimisticPositions, useResponsiveMap } from './shared/hooks';
import { triggerHaptic, getEventCoordinates } from './shared/utils';

// ============================================================================
// TYPES
// ============================================================================
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

type BarType = 'gogo' | 'beer' | 'pub' | 'massage' | 'nightclub';

interface CustomSoiBuakhaoMapProps {
  establishments: Establishment[];
  onEstablishmentClick?: (establishment: Establishment) => void;
  selectedEstablishment?: string;
  onBarClick?: (bar: CustomBar) => void;
  onEstablishmentUpdate?: () => Promise<void>;
}

// ============================================================================
// CONSTANTS
// ============================================================================
const ZONE = 'soibuakhao' as const;
const ZONE_CONFIG = getZoneConfig(ZONE);

const TYPE_STYLES: Record<BarType, { color: string; icon: string; shadow: string }> = {
  gogo: { color: '#C19A6B', icon: '💃', shadow: 'rgba(193, 154, 107, 0.5)' },
  beer: { color: '#FFD700', icon: '🍺', shadow: 'rgba(255, 215, 0, 0.5)' },
  pub: { color: '#00E5FF', icon: '🍸', shadow: 'rgba(0, 255, 255, 0.5)' },
  massage: { color: '#06FFA5', icon: '💆', shadow: 'rgba(6, 255, 165, 0.5)' },
  nightclub: { color: '#7B2CBF', icon: '🎵', shadow: 'rgba(123, 44, 191, 0.5)' }
};

const CATEGORY_TO_TYPE_MAP: { [key: string | number]: BarType } = {
  'cat-001': 'beer', 'cat-002': 'gogo', 'cat-003': 'massage', 'cat-004': 'nightclub',
  1: 'beer', 2: 'gogo', 3: 'massage', 4: 'nightclub'
};

// ============================================================================
// ZONE-SPECIFIC POSITION CALCULATION
// ============================================================================
const calculateResponsivePosition = (row: number, col: number, isMobile: boolean, containerElement?: HTMLElement) => {
  const zoneConfig = getZoneConfig(ZONE);

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
    const containerWidth = containerElement?.getBoundingClientRect().width ||
                          (window.innerWidth > 1200 ? 1200 : window.innerWidth - 40);
    const usableWidth = containerWidth * (zoneConfig.endX - zoneConfig.startX) / 100;
    const startX = containerWidth * zoneConfig.startX / 100;

    const maxBarWidth = 45, minBarWidth = 25;
    const idealBarWidth = Math.min(maxBarWidth, Math.max(minBarWidth, usableWidth / zoneConfig.maxCols - 8));
    const totalBarsWidth = zoneConfig.maxCols * idealBarWidth;
    const totalSpacing = usableWidth - totalBarsWidth;
    const spacing = totalSpacing / (zoneConfig.maxCols + 1);
    const x = startX + spacing + (col - 1) * (idealBarWidth + spacing);

    const containerHeight = containerElement?.getBoundingClientRect().height || MAP_CONFIG.DEFAULT_HEIGHT;
    const topY = containerHeight * zoneConfig.startY / 100;
    const bottomY = containerHeight * zoneConfig.endY / 100;
    const y = row === 1 ? topY : bottomY;

    return { x, y, barWidth: idealBarWidth };
  }
};

const establishmentsToVisualBars = (establishments: Establishment[], isMobile: boolean, containerElement?: HTMLElement): Bar[] => {
  return establishments.filter(est => est.zone === ZONE).map(est => {
    const barType = CATEGORY_TO_TYPE_MAP[est.category_id] || 'beer';
    const style = TYPE_STYLES[barType];
    const { x, y } = calculateResponsivePosition(est.grid_row || 1, est.grid_col || 1, isMobile, containerElement);
    return {
      id: est.id, name: est.name, type: barType, position: { x, y },
      color: style.color, icon: style.icon, grid_row: est.grid_row || 1, grid_col: est.grid_col || 1
    };
  });
};

// ============================================================================
// COMPONENT
// ============================================================================
const CustomSoiBuakhaoMap: React.FC<CustomSoiBuakhaoMapProps> = ({
  establishments, onEstablishmentClick, selectedEstablishment, onBarClick
}) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);
  const barRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Shared hooks
  const { isEditMode, toggleEditMode, isAdmin } = useMapEditMode();
  const { isMobile, viewportHeight } = useResponsiveMap();
  const {
    optimisticPositions, applyOptimisticPosition, clearOptimisticPosition,
    setOperationLock, isOperationLocked
  } = useOptimisticPositions();

  // Local state
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [draggedBar, setDraggedBar] = useState<Bar | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<{ row: number; col: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropAction, setDropAction] = useState<'move' | 'swap' | 'blocked' | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  const containerDimensions = useContainerSize(containerRef, 300);

  // Bars with optimistic positions
  const allBars = useMemo(() => {
    const bars = establishmentsToVisualBars(establishments, isMobile, containerRef.current || undefined);
    if (optimisticPositions.size === 0) return bars;

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
          missingBars.push({
            id: establishment.id, name: establishment.name, type: barType, position: { x, y },
            color: style.color, icon: style.icon, grid_row: pos.row, grid_col: pos.col
          });
        }
      }
    });
    return [...updatedBars, ...missingBars];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishments, isMobile, containerDimensions, optimisticPositions]);

  // Bar click handler
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
          <LazyImage src={establishment.logo_url} alt={establishment.name}
            cloudinaryPreset="establishmentLogo" className="map-logo-image-nightlife" objectFit="contain" />
        </div>
      );
    }
    return fallbackIcon;
  }, []);

  const findBarAtPosition = useCallback((row: number, col: number): Bar | null => {
    let foundBar: Bar | null = null;
    optimisticPositions.forEach((pos, establishmentId) => {
      if (pos.row === row && pos.col === col) {
        const bar = allBars.find(b => b.id === establishmentId);
        if (bar) foundBar = bar;
      }
    });
    if (foundBar) return foundBar;

    const establishment = establishments.find(est => est.zone === ZONE && est.grid_row === row && est.grid_col === col);
    if (establishment) {
      if (optimisticPositions.has(establishment.id)) return null;
      return allBars.find(bar => bar.id === establishment.id) || null;
    }
    return null;
  }, [allBars, establishments, optimisticPositions]);

  // Grid position detection
  const getGridFromMousePosition = useCallback((event: React.DragEvent | React.TouchEvent) => {
    if (!containerRef.current) return null;
    const coords = getEventCoordinates(event);
    if (!coords) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = coords.clientX - rect.left;
    const relativeY = coords.clientY - rect.top;
    const zoneConfig = getZoneConfig(ZONE);
    let row: number, col: number;

    if (isMobile) {
      const totalWidth = rect.width;
      const usableWidth = totalWidth * 0.9;
      const barWidth = Math.min(40, usableWidth / zoneConfig.maxCols - 4);
      const spacing = (usableWidth - (zoneConfig.maxCols * barWidth)) / (zoneConfig.maxCols + 1);
      const barRadius = barWidth / 2;
      let detectedCol = 1;

      for (let testCol = 1; testCol <= zoneConfig.maxCols; testCol++) {
        const barCenterX = spacing + (testCol - 1) * (barWidth + spacing);
        if (relativeX >= barCenterX - barRadius && relativeX <= barCenterX + barRadius) {
          detectedCol = testCol;
          break;
        }
      }
      if (detectedCol === 1 && relativeX > spacing + barRadius) {
        const clickSlot = (relativeX - spacing) / (barWidth + spacing);
        detectedCol = Math.max(1, Math.min(zoneConfig.maxCols, Math.floor(clickSlot) + 1));
      }
      col = detectedCol;
      const row1Y = 60, row2Y = 200;
      row = relativeY < (row1Y + row2Y) / 2 ? 1 : 2;
    } else {
      const containerWidth = rect.width;
      const usableWidth = containerWidth * (zoneConfig.endX - zoneConfig.startX) / 100;
      const startX = containerWidth * zoneConfig.startX / 100;
      const maxBarWidth = 45, minBarWidth = 25;
      const idealBarWidth = Math.min(maxBarWidth, Math.max(minBarWidth, usableWidth / zoneConfig.maxCols - 8));
      const totalBarsWidth = zoneConfig.maxCols * idealBarWidth;
      const totalSpacing = usableWidth - totalBarsWidth;
      const spacing = totalSpacing / (zoneConfig.maxCols + 1);
      const relativeXInZone = relativeX - startX;
      const barRadius = idealBarWidth / 2;
      let detectedCol = 1;

      for (let testCol = 1; testCol <= zoneConfig.maxCols; testCol++) {
        const barCenterX = spacing + (testCol - 1) * (idealBarWidth + spacing);
        if (relativeXInZone >= barCenterX - barRadius && relativeXInZone <= barCenterX + barRadius) {
          detectedCol = testCol;
          break;
        }
      }
      if (detectedCol === 1 && relativeXInZone > spacing + barRadius) {
        const clickSlot = (relativeXInZone - spacing) / (idealBarWidth + spacing);
        detectedCol = Math.max(1, Math.min(zoneConfig.maxCols, Math.floor(clickSlot) + 1));
      }
      col = detectedCol;
      const containerHeight = rect.height;
      const midPoint = containerHeight * ((zoneConfig.startY + zoneConfig.endY) / 2) / 100;
      row = relativeY < midPoint ? 1 : 2;
    }

    if (row < 1 || row > zoneConfig.maxRows || col < 1 || col > zoneConfig.maxCols) return null;
    return { row, col };
  }, [isMobile]);

  // Mouse position update
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

  const resetDragState = useCallback(() => {
    setDraggedBar(null);
    setDragOverPosition(null);
    setIsDragging(false);
    setDropAction(null);
    setMousePosition(null);
    if (throttleTimeout.current) { clearTimeout(throttleTimeout.current); throttleTimeout.current = null; }
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((bar: Bar, event: React.DragEvent) => {
    if (!isEditMode || isLoading || isOperationLocked()) { event.preventDefault(); return; }
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

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    if (!isEditMode || !isDragging || !dragOverPosition || !draggedBar || dropAction === 'blocked') {
      resetDragState();
      return;
    }
    event.preventDefault();

    const { row, col } = dragOverPosition;
    const conflictBar = findBarAtPosition(row, col);
    const draggedEstablishment = establishments.find(est => est.id === draggedBar.id);
    const originalPosition = draggedEstablishment ? { row: draggedEstablishment.grid_row, col: draggedEstablishment.grid_col } : null;

    if (originalPosition && originalPosition.row === row && originalPosition.col === col) {
      resetDragState();
      return;
    }

    setIsLoading(true);
    try {
      const actualAction = (conflictBar && conflictBar.id !== draggedBar.id) ? 'swap' : 'move';

      if (actualAction === 'move' && draggedEstablishment) {
        applyOptimisticPosition(draggedEstablishment.id, { row, col });
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/grid-move-workaround`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ establishmentId: draggedEstablishment.id, grid_row: row, grid_col: col, zone: ZONE })
        });

        if (response.ok) {
          setOperationLock(500);
          clearOptimisticPosition(draggedEstablishment.id);
        } else {
          clearOptimisticPosition(draggedEstablishment.id);
          toast.error('Failed to move establishment');
        }
      } else if (actualAction === 'swap' && conflictBar) {
        const conflictEstablishment = establishments.find(est => est.id === conflictBar.id);
        if (draggedEstablishment && conflictEstablishment) {
          const draggedOptimisticPos = optimisticPositions.get(draggedEstablishment.id);
          const draggedOriginalPos = draggedOptimisticPos || { row: draggedEstablishment.grid_row || 1, col: draggedEstablishment.grid_col || 1 };

          applyOptimisticPosition(draggedEstablishment.id, { row, col });
          applyOptimisticPosition(conflictEstablishment.id, { row: draggedOriginalPos.row, col: draggedOriginalPos.col });

          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/grid-move-workaround`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ establishmentId: draggedEstablishment.id, grid_row: row, grid_col: col, zone: ZONE, swap_with_id: conflictEstablishment.id })
          });

          if (response.ok) {
            setOperationLock(500);
            clearOptimisticPosition(draggedEstablishment.id);
            clearOptimisticPosition(conflictEstablishment.id);
          } else {
            clearOptimisticPosition(draggedEstablishment.id);
            clearOptimisticPosition(conflictEstablishment.id);
            toast.error('Failed to swap establishments');
          }
        }
      }
    } catch (error) {
      logger.error('Drop operation error', error);
    } finally {
      setIsLoading(false);
      resetDragState();
    }
  }, [isEditMode, isDragging, dragOverPosition, draggedBar, dropAction, findBarAtPosition, establishments, optimisticPositions, resetDragState, applyOptimisticPosition, clearOptimisticPosition, setOperationLock]);

  // Touch handlers
  const handleTouchStart = useCallback((bar: Bar, event: React.TouchEvent) => {
    if (!isEditMode || isLoading || isOperationLocked()) { event.preventDefault(); return; }
    event.preventDefault();
    triggerHaptic('tap');
    setDraggedBar(bar);
    setIsDragging(true);
  }, [isEditMode, isLoading, isOperationLocked]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    updateMousePosition(event);
  }, [updateMousePosition]);

  const handleTouchEnd = useCallback(async (event: React.TouchEvent) => {
    if (!isEditMode || !isDragging || !dragOverPosition || !draggedBar || dropAction === 'blocked') {
      resetDragState();
      return;
    }
    event.preventDefault();

    const { row, col } = dragOverPosition;
    const conflictBar = findBarAtPosition(row, col);
    const draggedEstablishment = establishments.find(est => est.id === draggedBar.id);
    const originalPosition = draggedEstablishment ? { row: draggedEstablishment.grid_row, col: draggedEstablishment.grid_col } : null;

    if (originalPosition && originalPosition.row === row && originalPosition.col === col) {
      resetDragState();
      return;
    }

    triggerHaptic('success');
    setIsLoading(true);

    try {
      const actualAction = (conflictBar && conflictBar.id !== draggedBar.id) ? 'swap' : 'move';

      if (actualAction === 'move' && draggedEstablishment) {
        applyOptimisticPosition(draggedEstablishment.id, { row, col });
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/grid-move-workaround`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ establishmentId: draggedEstablishment.id, grid_row: row, grid_col: col, zone: ZONE })
        });

        if (response.ok) {
          setOperationLock(500);
          clearOptimisticPosition(draggedEstablishment.id);
        } else {
          clearOptimisticPosition(draggedEstablishment.id);
          toast.error('Failed to move establishment');
        }
      } else if (actualAction === 'swap' && conflictBar) {
        const conflictEstablishment = establishments.find(est => est.id === conflictBar.id);
        if (draggedEstablishment && conflictEstablishment) {
          const draggedOptimisticPos = optimisticPositions.get(draggedEstablishment.id);
          const draggedOriginalPos = draggedOptimisticPos || { row: draggedEstablishment.grid_row || 1, col: draggedEstablishment.grid_col || 1 };

          applyOptimisticPosition(draggedEstablishment.id, { row, col });
          applyOptimisticPosition(conflictEstablishment.id, { row: draggedOriginalPos.row, col: draggedOriginalPos.col });

          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/grid-move-workaround`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ establishmentId: draggedEstablishment.id, grid_row: row, grid_col: col, zone: ZONE, swap_with_id: conflictEstablishment.id })
          });

          if (response.ok) {
            setOperationLock(500);
            clearOptimisticPosition(draggedEstablishment.id);
            clearOptimisticPosition(conflictEstablishment.id);
          } else {
            clearOptimisticPosition(draggedEstablishment.id);
            clearOptimisticPosition(conflictEstablishment.id);
            toast.error('Failed to swap establishments');
          }
        }
      }
    } catch (error) {
      logger.error('Touch drop error', error);
    } finally {
      setIsLoading(false);
      resetDragState();
    }
  }, [isEditMode, isDragging, dragOverPosition, draggedBar, dropAction, findBarAtPosition, establishments, optimisticPositions, resetDragState, applyOptimisticPosition, clearOptimisticPosition, setOperationLock]);

  const getMapContainerStyle = (isMobile: boolean, screenHeight: number): React.CSSProperties => ({
    width: '100%', margin: '0 auto', position: 'relative',
    minHeight: isMobile ? `${Math.min(600, screenHeight * 0.7)}px` : `${MAP_CONFIG.DEFAULT_HEIGHT}px`,
    maxWidth: isMobile ? '400px' : '100%'
  });

  return (
    <div className="soibuakhao-map-wrapper" style={getMapContainerStyle(isMobile, viewportHeight)}>
      <ScreenReaderEstablishmentList establishments={establishments} zone={ZONE} />

      {isAdmin && (
        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 50 }}>
          <button onClick={toggleEditMode} disabled={isLoading}
            style={{
              padding: '8px 16px', borderRadius: '20px', border: 'none', fontWeight: 'bold',
              background: isEditMode ? 'linear-gradient(135deg, #00FF00 0%, #00CC00 100%)' : 'linear-gradient(135deg, #333 0%, #555 100%)',
              color: isEditMode ? '#000' : '#fff', cursor: isLoading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
            }}>
            {isEditMode ? '✓ Editing' : '✎ Edit'}
          </button>
        </div>
      )}

      <div ref={containerRef} className={`map-canvas-container ${isEditMode ? 'edit-mode' : ''}`}
        style={{ position: 'relative', width: '100%', minHeight: isMobile ? '400px' : `${MAP_CONFIG.DEFAULT_HEIGHT}px` }}
        onDragOver={handleDragOver} onDrop={handleDrop}>

        <GenericRoadCanvas
          config={isMobile ? { shape: 'vertical', width: 60, startY: 0, endY: 100 } : { shape: 'horizontal', width: 80, startX: 10, endX: 90 }}
          style={{ baseColor: '#2d2d2d', overlayColor: '#1a1a1a', edgeColor: '#FFD700' }}
          isEditMode={isEditMode}
        />

        {/* Debug Grid */}
        {isEditMode && !isMobile && containerRef.current && (() => {
          const gridCells: React.ReactElement[] = [];
          const fixedGridSize = 40;
          for (let row = 1; row <= ZONE_CONFIG.maxRows; row++) {
            for (let col = 1; col <= ZONE_CONFIG.maxCols; col++) {
              const { x, y } = calculateResponsivePosition(row, col, isMobile, containerRef.current!);
              gridCells.push(
                <div key={`grid-${row}-${col}`}
                  style={{
                    position: 'absolute', left: `${x - fixedGridSize/2}px`, top: `${y - fixedGridSize/2}px`,
                    width: `${fixedGridSize}px`, height: `${fixedGridSize}px`, border: '2px dashed #FFD700',
                    background: 'rgba(255, 215, 0, 0.1)', borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#FFD700',
                    fontWeight: 'bold', pointerEvents: 'none', zIndex: 5, textShadow: '0 0 4px rgba(0,0,0,0.8)'
                  }}>
                  {row},{col}
                </div>
              );
            }
          }
          return gridCells;
        })()}

        {allBars.map((bar) => {
          const establishment = establishments.find(est => est.id === bar.id);
          const isVip = establishment?.is_vip && establishment?.vip_expires_at && new Date(establishment.vip_expires_at) > new Date();
          const isSelected = selectedEstablishment === bar.id;
          const isHovered = hoveredBar === bar.id;
          const isBeingDragged = isDragging && draggedBar?.id === bar.id;

          const vipSizeMultiplier = window.innerWidth < 480 ? 1.15 : window.innerWidth < 768 ? 1.25 : 1.35;
          const finalBarSize = isVip ? Math.round(currentBarSize * vipSizeMultiplier) : currentBarSize;
          const categoryName = establishment?.category_id === 2 ? 'GoGo Bar' : establishment?.category_id === 1 ? 'Bar'
            : establishment?.category_id === 3 ? 'Massage Salon' : establishment?.category_id === 4 ? 'Nightclub' : 'Establishment';

          return (
            <div key={bar.id}
              ref={(el) => { if (el) barRefs.current.set(bar.id, el); else barRefs.current.delete(bar.id); }}
              className={`soibuakhao-bar-circle ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${isBeingDragged ? 'dragging' : ''} ${isVip ? 'vip-establishment-marker' : ''}`}
              role="button" tabIndex={0}
              aria-label={`${bar.name}, ${categoryName}${isVip ? ', VIP' : ''}, click to view`}
              onClick={() => handleBarClick(bar)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBarClick(bar); } }}
              onMouseEnter={() => setHoveredBar(bar.id)}
              onMouseLeave={() => setHoveredBar(null)}
              onFocus={() => setHoveredBar(bar.id)}
              onBlur={() => setHoveredBar(null)}
              draggable={isEditMode && isAdmin && !isLoading}
              onDragStart={(e) => handleDragStart(bar, e)}
              onDragEnd={resetDragState}
              onTouchStart={isEditMode ? (e) => handleTouchStart(bar, e) : undefined}
              onTouchMove={isEditMode ? handleTouchMove : undefined}
              onTouchEnd={isEditMode ? handleTouchEnd : undefined}
              style={{
                position: 'absolute', left: `${bar.position.x - finalBarSize/2}px`, top: `${bar.position.y - finalBarSize/2}px`,
                width: `${finalBarSize}px`, height: `${finalBarSize}px`, borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, ${bar.color}FF, ${bar.color}DD 60%, ${bar.color}AA 100%)`,
                border: isVip ? '5px solid #FFD700' : isSelected ? '3px solid #FFD700' : isEditMode ? '2px solid #00FF00' : '2px solid rgba(255,255,255,0.6)',
                cursor: isEditMode ? (isBeingDragged ? 'grabbing' : 'grab') : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                transform: isHovered && !isBeingDragged ? 'scale(1.2)' : 'scale(1)',
                transition: isVip ? 'none' : 'all 0.3s ease', touchAction: isEditMode ? 'none' : 'auto',
                boxShadow: isVip ? undefined : isHovered ? `0 0 25px ${TYPE_STYLES[bar.type].shadow}` : isEditMode ? '0 0 15px rgba(0,255,0,0.5)' : `0 0 12px ${bar.color}66`,
                zIndex: isHovered ? 15 : isBeingDragged ? 100 : 10, opacity: isBeingDragged ? 0.7 : 1
              }}>
              {getEstablishmentIcon(bar.id, establishments, bar.icon)}

              {isVip && (
                <>
                  <div className="vip-crown" style={{ position: 'absolute', top: '-35px', left: '50%', transform: 'translateX(-50%)', zIndex: 5, pointerEvents: 'none' }}>👑</div>
                  <div className="vip-badge">VIP</div>
                </>
              )}

              {isHovered && !isDragging && (
                <div role="tooltip" style={{
                  position: 'absolute', bottom: '45px', left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.9)', color: '#fff', padding: '5px 10px', borderRadius: '5px',
                  fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', zIndex: 20, border: '1px solid #FFD700'
                }}>
                  {bar.name}
                  {isEditMode && <div style={{ fontSize: '10px', color: '#00FF00' }}>🎯 Drag to move</div>}
                </div>
              )}
            </div>
          );
        })}

        <DragDropIndicator isEditMode={isEditMode} isDragging={isDragging} mousePosition={mousePosition}
          dropAction={dropAction} draggedBar={draggedBar} dragOverPosition={dragOverPosition} currentBarSize={currentBarSize} />

        {isLoading && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFD700', fontSize: '18px', fontWeight: 'bold', zIndex: 100
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '20px', height: '20px', border: '2px solid #FFD700', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Updating position...
            </div>
          </div>
        )}
      </div>

      <style>{`
        .soibuakhao-bar-circle:focus { outline: 3px solid #FFD700; outline-offset: 4px; }
        .soibuakhao-bar-circle:focus-visible { outline: 3px solid #FFD700; outline-offset: 4px; }
      `}</style>
    </div>
  );
};

export default CustomSoiBuakhaoMap;
