/**
 * CustomWalkingStreetMap - REFACTORED VERSION
 *
 * Reduced from ~1740 lines to ~850 lines by using shared hooks.
 * Zone-specific logic: Street configurations, perpendicular streets positioning.
 */
import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigateWithTransition } from '../../hooks/useNavigateWithTransition';
import { Establishment, CustomBar } from '../../types';
// Auth context is used via useMapEditMode hook
import WalkingStreetRoad from './WalkingStreetRoad';
import DragDropIndicator from './DragDropIndicator';
import ScreenReaderEstablishmentList from './ScreenReaderEstablishmentList';
import { logger } from '../../utils/logger';
import toast from '../../utils/toast';
import { useContainerSize } from '../../hooks/useContainerSize';
import { useMapHeight } from '../../hooks/useMapHeight';
import { getMapContainerStyle } from '../../utils/mapStyles';
import LazyImage from '../Common/LazyImage';
import { generateEstablishmentUrl } from '../../utils/slugify';
import { getZoneConfig } from '../../utils/zoneConfig';
import { MAP_CONFIG } from '../../utils/constants';
// Shared hooks
import { useMapEditMode } from './shared/hooks/useMapEditMode';
import { useOptimisticPositions } from './shared/hooks/useOptimisticPositions';
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

interface CustomWalkingStreetMapProps {
  establishments: Establishment[];
  onEstablishmentClick?: (establishment: Establishment) => void;
  selectedEstablishment?: string;
  onBarClick?: (bar: CustomBar) => void;
  onEstablishmentUpdate?: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// ZONE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const ZONE = 'walkingstreet';
const ZONE_CONFIG = getZoneConfig(ZONE);

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

// ═══════════════════════════════════════════════════════════════════════════
// WALKING STREET CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
interface StreetConfig {
  type: 'main' | 'perpendicular';
  street?: string;
  xPos?: number;
  side?: 'west' | 'east';
  wsSide?: 'north' | 'south';
}

const getStreetConfig = (row: number): StreetConfig => {
  if (row <= 2) return { type: 'main', wsSide: row === 1 ? 'north' : 'south' };

  if (row >= 3 && row <= 8) {
    return { type: 'perpendicular', street: 'Diamond', xPos: 12,
      side: row % 2 === 1 ? 'west' : 'east', wsSide: row % 2 === 1 ? 'north' : 'south' };
  }
  if (row >= 9 && row <= 10) {
    return { type: 'perpendicular', street: 'Republic', xPos: 22, side: 'east',
      wsSide: row === 9 ? 'north' : 'south' };
  }
  if (row >= 11 && row <= 12) {
    return { type: 'perpendicular', street: 'Myst', xPos: 28, side: 'east',
      wsSide: row === 11 ? 'north' : 'south' };
  }
  if (row >= 13 && row <= 18) {
    return { type: 'perpendicular', street: 'Soi 15', xPos: 52,
      side: row % 2 === 1 ? 'west' : 'east', wsSide: row % 2 === 1 ? 'north' : 'south' };
  }
  if (row >= 19 && row <= 24) {
    return { type: 'perpendicular', street: 'Soi 16', xPos: 68,
      side: row % 2 === 1 ? 'west' : 'east', wsSide: row % 2 === 1 ? 'north' : 'south' };
  }
  if (row >= 25 && row <= 30) {
    return { type: 'perpendicular', street: 'BJ Alley', xPos: 82,
      side: row % 2 === 1 ? 'west' : 'east', wsSide: row % 2 === 1 ? 'north' : 'south' };
  }
  return { type: 'main', wsSide: 'north' };
};

const STREET_GROUPS: { [key: string]: { startRow: number; count: number } } = {
  'Diamond': { startRow: 3, count: 6 },
  'Republic': { startRow: 9, count: 2 },
  'Myst': { startRow: 11, count: 2 },
  'Soi 15': { startRow: 13, count: 6 },
  'Soi 16': { startRow: 19, count: 6 },
  'BJ Alley': { startRow: 25, count: 6 }
};

const STREET_WIDTHS: { [key: string]: number } = {
  'Diamond': 35, 'Republic': 12, 'Myst': 6, 'Soi 15': 35, 'Soi 16': 35, 'BJ Alley': 25
};

// ═══════════════════════════════════════════════════════════════════════════
// POSITION CALCULATION (Zone-specific)
// ═══════════════════════════════════════════════════════════════════════════
const calculateResponsivePosition = (row: number, col: number, isMobile: boolean, containerElement?: HTMLElement) => {
  const streetConfig = getStreetConfig(row);
  const containerWidth = containerElement ? containerElement.clientWidth : (window.innerWidth > 1200 ? 1200 : window.innerWidth - 40);
  const containerHeight = containerElement ? containerElement.clientHeight : MAP_CONFIG.DEFAULT_HEIGHT;

  if (isMobile) {
    const centerX = containerWidth * 0.5;
    const mainRoadWidth = 80;
    const barWidth = 35;

    if (streetConfig.type === 'main') {
      const offsetFromCenter = 50;
      const x = streetConfig.wsSide === 'north' ? centerX - offsetFromCenter : centerX + offsetFromCenter;
      const topMargin = 60, bottomMargin = 60;
      const usableHeight = containerHeight - topMargin - bottomMargin;
      const spacing = usableHeight / (ZONE_CONFIG.maxCols + 1);
      const y = topMargin + col * spacing;
      return { x, y, barWidth };
    } else {
      const streetYPositions: { [key: string]: number } = {
        'Diamond': 0.12, 'Republic': 0.22, 'Myst': 0.28, 'Soi 15': 0.52, 'Soi 16': 0.68, 'BJ Alley': 0.82
      };
      const streetY = containerHeight * (streetYPositions[streetConfig.street!] || 0.5);
      const roadWidth = STREET_WIDTHS[streetConfig.street!] || 35;
      const sideOffset = (roadWidth / 2) + 12;
      const y = streetConfig.side === 'west' ? streetY - sideOffset : streetY + sideOffset;
      const leftBoundary = centerX + mainRoadWidth/2 + 10;
      const rightMargin = 20;
      const usableWidth = containerWidth - rightMargin - leftBoundary;
      const group = STREET_GROUPS[streetConfig.street!];
      if (!group) return { x: 100, y: 100, barWidth };
      const indexInStreet = row - group.startRow;

      if (streetConfig.street === 'Republic' || streetConfig.street === 'Myst') {
        const spacing = usableWidth / (group.count + 1);
        const x = leftBoundary + (indexInStreet + 1) * spacing;
        return { x, y, barWidth };
      } else {
        const pairIndex = Math.floor(indexInStreet / 2);
        const numPairs = Math.ceil(group.count / 2);
        const spacing = usableWidth / (numPairs + 1);
        const x = leftBoundary + (pairIndex + 1) * spacing;
        return { x, y, barWidth };
      }
    }
  }

  // DESKTOP
  if (streetConfig.type === 'main') {
    const centerY = containerHeight * 0.5;
    const offsetFromCenter = 70;
    const idealBarWidth = Math.min(45, Math.max(25, containerWidth / ZONE_CONFIG.maxCols - 8));
    const totalBarsWidth = ZONE_CONFIG.maxCols * idealBarWidth;
    const totalSpacing = containerWidth - totalBarsWidth;
    const spacing = totalSpacing / (ZONE_CONFIG.maxCols + 1);
    const x = spacing + (col - 1) * (idealBarWidth + spacing);
    const y = streetConfig.wsSide === 'north' ? centerY - offsetFromCenter : centerY + offsetFromCenter;
    return { x, y, barWidth: idealBarWidth };
  } else {
    const streetX = containerWidth * (streetConfig.xPos! / 100);
    const centerY = containerHeight * 0.5;
    const group = STREET_GROUPS[streetConfig.street!];
    const indexInStreet = row - group.startRow;
    const topMargin = 0;
    const bottomBoundary = centerY - 30;
    const usableHeight = bottomBoundary - topMargin;

    let y: number;
    if (streetConfig.street === 'Republic' || streetConfig.street === 'Myst') {
      const spacing = usableHeight / 3;
      y = topMargin + (indexInStreet + 1) * spacing;
    } else {
      const pairIndex = Math.floor(indexInStreet / 2);
      const numPairs = Math.ceil(group.count / 2);
      const spacing = usableHeight / (numPairs + 1);
      y = topMargin + (pairIndex + 1) * spacing;
    }

    const roadWidth = STREET_WIDTHS[streetConfig.street!] || 35;
    const sideOffset = (roadWidth / 2) + 10;
    const x = streetConfig.side === 'west' ? streetX - sideOffset : streetX + sideOffset;
    return { x, y, barWidth: 45 };
  }
};

const establishmentsToVisualBars = (establishments: Establishment[], isMobile: boolean, containerElement?: HTMLElement): Bar[] => {
  return establishments
    .filter(est => est.zone === ZONE && est.grid_row && est.grid_row >= 1 && est.grid_row <= 30 &&
      est.grid_col && est.grid_col >= 1 && est.grid_col <= 24)
    .map(est => {
      const barType = CATEGORY_TO_TYPE_MAP[est.category_id] || 'gogo';
      const style = TYPE_STYLES[barType];
      const { x, y } = calculateResponsivePosition(est.grid_row || 1, est.grid_col || 1, isMobile, containerElement);
      return { id: est.id, name: est.name, type: barType, position: { x, y }, color: style.color, icon: style.icon,
        grid_row: est.grid_row || 1, grid_col: est.grid_col || 1 };
    });
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const CustomWalkingStreetMap: React.FC<CustomWalkingStreetMapProps> = ({
  establishments,
  onEstablishmentClick,
  selectedEstablishment,
  onBarClick,
  onEstablishmentUpdate: _onEstablishmentUpdate
}) => {
  const navigate = useNavigateWithTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // SHARED HOOKS
  const { isEditMode, toggleEditMode, canEdit, isAdmin } = useMapEditMode();
  const { isMobile, screenHeight } = useMapHeight();
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

  // Reset drag state
  const resetDragState = useCallback(() => {
    setDraggedBar(null);
    setDragOverPosition(null);
    setIsDragging(false);
    setDropAction(null);
    setMousePosition(null);
  }, []);

  // Orientation detection
  useEffect(() => {
    const mediaQuery = window.matchMedia('(orientation: portrait)');
    const handleOrientationChange = (e: MediaQueryListEvent | MediaQueryList) => {
      logger.debug('Orientation changed', { isPortrait: e.matches });
    };
    handleOrientationChange(mediaQuery);
    mediaQuery.addEventListener('change', handleOrientationChange);
    return () => mediaQuery.removeEventListener('change', handleOrientationChange);
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
            const barType = CATEGORY_TO_TYPE_MAP[establishment.category_id] || 'gogo';
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
    return isMobile ? 35 : 50;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- containerDimensions triggers recalculation
  }, [isMobile, containerDimensions]);

  // HELPER FUNCTIONS
  const findBarAtPosition = useCallback((row: number, col: number): Bar | null => {
    const establishment = establishments.find(est =>
      est.zone === ZONE && est.grid_row === row && est.grid_col === col &&
      est.grid_row >= 1 && est.grid_row <= 30 && est.grid_col >= 1 && est.grid_col <= 24
    );
    return establishment ? allBars.find(bar => bar.id === establishment.id) || null : null;
  }, [allBars, establishments]);

  const isInBlockedZone = useCallback((relativeX: number, relativeY: number, containerWidth: number, containerHeight: number): boolean => {
    const xPercent = (relativeX / containerWidth) * 100;
    const yPercent = (relativeY / containerHeight) * 100;

    if (isMobile) {
      if (xPercent >= 48 && xPercent <= 52) return true;
      const perpendicularStreets = [
        { y: 12, tolerance: 2 }, { y: 22, tolerance: 1 }, { y: 28, tolerance: 0.5 },
        { y: 52, tolerance: 2 }, { y: 68, tolerance: 2 }, { y: 82, tolerance: 1.5 }
      ];
      for (const street of perpendicularStreets) {
        if (Math.abs(yPercent - street.y) <= street.tolerance && xPercent >= 52) return true;
      }
    } else {
      if (yPercent >= 49 && yPercent <= 51) return true;
      const verticalIntersections = [15, 35, 50, 65, 85];
      for (const x of verticalIntersections) {
        if (xPercent >= x - 1 && xPercent <= x + 1) return true;
      }
    }
    return false;
  }, [isMobile]);

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
      const centerX = containerWidth * 0.5;
      const mainRoadWidth = 80;
      const yPercent = (relativeY / containerHeight) * 100;

      const perpendicularStreets = [
        { name: 'Diamond', y: 12, tolerance: 2, rowStart: 3, count: 6 },
        { name: 'Republic', y: 22, tolerance: 1, rowStart: 9, count: 2 },
        { name: 'Myst', y: 28, tolerance: 0.5, rowStart: 11, count: 2 },
        { name: 'Soi 15', y: 52, tolerance: 2, rowStart: 13, count: 6 },
        { name: 'Soi 16', y: 68, tolerance: 2, rowStart: 19, count: 6 },
        { name: 'BJ Alley', y: 82, tolerance: 1.5, rowStart: 25, count: 6 }
      ];

      for (const street of perpendicularStreets) {
        if (Math.abs(yPercent - street.y) <= street.tolerance) {
          if (relativeX <= centerX + mainRoadWidth/2) return null;
          const streetY = containerHeight * (street.y / 100);
          const side: 'west' | 'east' = relativeY < streetY ? 'west' : 'east';
          if ((street.name === 'Republic' || street.name === 'Myst') && side === 'west') return null;
          const leftBoundary = centerX + mainRoadWidth/2 + 10;
          const rightMargin = 20;
          const usableWidth = containerWidth - rightMargin - leftBoundary;

          let row: number;
          if (street.name === 'Republic' || street.name === 'Myst') {
            const spacing = usableWidth / (street.count + 1);
            const clickIndex = Math.floor((relativeX - leftBoundary) / spacing);
            row = street.rowStart + Math.max(0, Math.min(street.count - 1, clickIndex));
          } else {
            const numPairs = Math.ceil(street.count / 2);
            const spacing = usableWidth / (numPairs + 1);
            const clickPair = Math.floor((relativeX - leftBoundary) / spacing);
            const pairIndex = Math.max(0, Math.min(numPairs - 1, clickPair));
            row = street.rowStart + pairIndex * 2 + (side === 'west' ? 0 : 1);
          }
          return { row, col: 1 };
        }
      }

      if (relativeX >= centerX - mainRoadWidth/2 && relativeX <= centerX + mainRoadWidth/2) return null;
      const row = relativeX < centerX ? 1 : 2;
      const topMargin = 60, bottomMargin = 60;
      const usableHeight = containerHeight - topMargin - bottomMargin;
      const spacing = usableHeight / (ZONE_CONFIG.maxCols + 1);
      if (relativeY < topMargin || relativeY > containerHeight - bottomMargin) return null;
      const col = Math.max(1, Math.min(ZONE_CONFIG.maxCols, Math.floor((relativeY - topMargin) / spacing) + 1));
      return { row, col };
    }

    // DESKTOP
    const centerY = containerHeight * 0.5;
    const roadWidth = 20;
    let wsSide: 'north' | 'south';
    if (relativeY < centerY - roadWidth) wsSide = 'north';
    else if (relativeY > centerY + roadWidth) wsSide = 'south';
    else return null;

    const verticalZoneTop = containerHeight * 0.05;
    const verticalZoneBottom = centerY - 80;
    const isInVerticalZone = relativeY >= verticalZoneTop && relativeY <= verticalZoneBottom;

    if (isInVerticalZone) {
      const xPercent = (relativeX / containerWidth) * 100;
      const perpendicularStreets = [
        { name: 'Diamond', xPos: 12, tolerance: 3 },
        { name: 'Republic', xPos: 22, tolerance: 3 },
        { name: 'Myst', xPos: 28, tolerance: 3 },
        { name: 'Soi 15', xPos: 52, tolerance: 3 },
        { name: 'Soi 16', xPos: 68, tolerance: 3 },
        { name: 'BJ Alley', xPos: 82, tolerance: 3 }
      ];

      for (const street of perpendicularStreets) {
        if (Math.abs(xPercent - street.xPos) <= street.tolerance) {
          const streetX = containerWidth * (street.xPos / 100);
          const side: 'west' | 'east' = relativeX < streetX ? 'west' : 'east';
          if ((street.name === 'Republic' || street.name === 'Myst') && side === 'west') return null;
          const group = STREET_GROUPS[street.name];
          if (!group) return null;
          const topMargin = 0;
          const bottomBoundary = centerY - 30;
          const usableHeight = bottomBoundary - topMargin;

          let row: number;
          if (street.name === 'Republic' || street.name === 'Myst') {
            const spacing = usableHeight / 3;
            let closestIndex = -1, closestDistance = Infinity;
            for (let idx = 0; idx < group.count; idx++) {
              const posY = topMargin + (idx + 1) * spacing;
              const distance = Math.abs(relativeY - posY);
              if (distance < closestDistance && distance < spacing / 2) {
                closestDistance = distance;
                closestIndex = idx;
              }
            }
            if (closestIndex === -1) return null;
            row = group.startRow + closestIndex;
          } else {
            const numPairs = Math.ceil(group.count / 2);
            const spacing = usableHeight / (numPairs + 1);
            let closestPairIndex = -1, closestDistance = Infinity;
            for (let pairIdx = 0; pairIdx < numPairs; pairIdx++) {
              const posY = topMargin + (pairIdx + 1) * spacing;
              const distance = Math.abs(relativeY - posY);
              if (distance < closestDistance && distance < spacing / 2) {
                closestDistance = distance;
                closestPairIndex = pairIdx;
              }
            }
            if (closestPairIndex === -1) return null;
            row = group.startRow + closestPairIndex * 2 + (side === 'west' ? 0 : 1);
          }
          return { row, col: 1 };
        }
      }
    }

    const row = wsSide === 'north' ? 1 : 2;
    const numCols = 24;
    const idealBarWidth = Math.min(45, Math.max(25, containerWidth / numCols - 8));
    const totalBarsWidth = numCols * idealBarWidth;
    const totalSpacing = containerWidth - totalBarsWidth;
    const spacing = totalSpacing / (numCols + 1);
    const clickSlot = (relativeX - spacing) / (idealBarWidth + spacing);
    const col = Math.max(1, Math.min(numCols, Math.floor(clickSlot) + 1));
    if (relativeX < spacing || relativeX > containerWidth - spacing) return null;
    return { row, col };
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
    const relativeX = coords.clientX - rect.left;
    const relativeY = coords.clientY - rect.top;
    setMousePosition({ x: relativeX, y: relativeY });

    if (isInBlockedZone(relativeX, relativeY, rect.width, rect.height)) {
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
        if (!conflictBar) setDropAction('move');
        else if (conflictBar.id === draggedBar?.id) setDropAction('blocked');
        else setDropAction('swap');
      } else {
        setDropAction('blocked');
      }
    }, 16);
  }, [isInBlockedZone, getGridFromMousePosition, findBarAtPosition, draggedBar]);

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
    if (!isEditMode || !isDragging || !draggedBar || !containerRef.current) return;
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
    if (!isEditMode || !isDragging || !draggedBar || !containerRef.current) return;
    updateMousePosition(event);
  }, [isEditMode, isDragging, draggedBar, updateMousePosition]);

  // API CALL FOR MOVE/SWAP
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
      const errorText = await response.text();
      clearOptimisticPosition(draggedBar.id);
      if (isSwap && conflictEst) clearOptimisticPosition(conflictEst.id);
      toast.error(`Move failed: ${errorText}`);
      return false;
    } catch {
      clearOptimisticPosition(draggedBar.id);
      if (isSwap && conflictEst) clearOptimisticPosition(conflictEst.id);
      toast.error('Network error - please try again');
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
    <div className="custom-map-container walkingstreet-map" role="region" aria-label="Walking Street Interactive Map"
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
        style={getMapContainerStyle(isMobile, screenHeight)}
        onDragOver={handleDragOver} onDrop={handleDrop}>
        <WalkingStreetRoad isEditMode={isEditMode} isMobile={isMobile} />

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

export default CustomWalkingStreetMap;
