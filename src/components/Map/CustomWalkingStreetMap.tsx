import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Establishment, CustomBar } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getZoneConfig } from '../../utils/zoneConfig';
import WalkingStreetRoad from './WalkingStreetRoad';
import DragDropIndicator from './DragDropIndicator';
import { logger } from '../../utils/logger';
import { useContainerSize } from '../../hooks/useContainerSize';

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
 * WALKING STREET TOPOGRAPHY MAPPING - NEW SYSTEM
 *
 * Walking Street has 1 horizontal main road with 6 perpendicular streets:
 * - Soi Diamond (12%)
 * - Republic/Mixx (22%)
 * - Myst (28%)
 * - Soi 15 (52%)
 * - Soi 16 (68%)
 * - BJ Alley (82%)
 *
 * NEW ROW SYSTEM (22 rows total):
 * - Rows 1-2: Main Walking Street (North/South sides)
 * - Rows 3-6: Soi Diamond (2×2 each side = 8 positions)
 * - Rows 7-8: Republic/Mixx (1×2 East only = 2 positions)
 * - Rows 9-10: Myst (1×2 East only = 2 positions)
 * - Rows 11-14: Soi 15 (2×2 each side = 8 positions)
 * - Rows 15-18: Soi 16 (2×2 each side = 8 positions)
 * - Rows 19-22: BJ Alley (2×2 each side = 8 positions)
 * Total: 2 + 8 + 2 + 2 + 8 + 8 + 8 = 38 positions
 */

interface StreetConfig {
  type: 'main' | 'perpendicular';
  street?: string;    // Nom de la rue perpendiculaire
  xPos?: number;      // Position X% de la rue perpendiculaire
  side?: 'west' | 'east';  // Côté de la rue (West/East de la rue perpendiculaire)
  wsSide?: 'north' | 'south';  // Côté de Walking Street (North/South)
  label?: string;
}

const getStreetConfig = (row: number): StreetConfig => {
  // Rows 1-2: Main Walking Street (horizontal)
  if (row <= 2) {
    return {
      type: 'main',
      wsSide: row === 1 ? 'north' : 'south'
    };
  }

  // Rows 3-8: Soi Diamond (3×2 each side = 6 positions, alternating face-to-face)
  if (row >= 3 && row <= 8) {
    const side = row % 2 === 1 ? 'west' : 'east'; // Alternating: 3=west, 4=east, 5=west, 6=east, 7=west, 8=east
    const wsSide = row % 2 === 1 ? 'north' : 'south';
    return {
      type: 'perpendicular',
      street: 'Diamond',
      xPos: 12,
      side,
      wsSide
    };
  }

  // Rows 9-10: Republic/Mixx (1×2 each side = 2 positions)
  if (row >= 9 && row <= 10) {
    return {
      type: 'perpendicular',
      street: 'Republic',
      xPos: 22,
      side: 'east',
      wsSide: row === 9 ? 'north' : 'south'
    };
  }

  // Rows 11-12: Myst (1×2 each side = 2 positions)
  if (row >= 11 && row <= 12) {
    return {
      type: 'perpendicular',
      street: 'Myst',
      xPos: 28,
      side: 'east',
      wsSide: row === 11 ? 'north' : 'south'
    };
  }

  // Rows 13-18: Soi 15 (3×2 each side = 6 positions, alternating face-to-face)
  if (row >= 13 && row <= 18) {
    const side = row % 2 === 1 ? 'west' : 'east'; // Alternating: 13=west, 14=east, 15=west, 16=east, 17=west, 18=east
    const wsSide = row % 2 === 1 ? 'north' : 'south';
    return {
      type: 'perpendicular',
      street: 'Soi 15',
      xPos: 52,
      side,
      wsSide
    };
  }

  // Rows 19-24: Soi 16 (3×2 each side = 6 positions, alternating face-to-face)
  if (row >= 19 && row <= 24) {
    const side = row % 2 === 1 ? 'west' : 'east'; // Alternating: 19=west, 20=east, 21=west, 22=east, 23=west, 24=east
    const wsSide = row % 2 === 1 ? 'north' : 'south';
    return {
      type: 'perpendicular',
      street: 'Soi 16',
      xPos: 68,
      side,
      wsSide
    };
  }

  // Rows 25-30: BJ Alley (3×2 each side = 6 positions, alternating face-to-face)
  if (row >= 25 && row <= 30) {
    const side = row % 2 === 1 ? 'west' : 'east'; // Alternating: 25=west, 26=east, 27=west, 28=east, 29=west, 30=east
    const wsSide = row % 2 === 1 ? 'north' : 'south';
    return {
      type: 'perpendicular',
      street: 'BJ Alley',
      xPos: 82,
      side,
      wsSide
    };
  }

  // Fallback: Main Walking Street North
  return {
    type: 'main',
    wsSide: 'north'
  };
};

const calculateResponsivePosition = (row: number, col: number, isMobile: boolean, containerElement?: HTMLElement) => {
  const zoneConfig = getZoneConfig('walkingstreet');
  const streetConfig = getStreetConfig(row);

  const containerWidth = containerElement ? containerElement.clientWidth : (window.innerWidth > 1200 ? 1200 : window.innerWidth - 40);
  const containerHeight = containerElement ? containerElement.clientHeight : 600;

  if (isMobile) {
    // Mobile: Simple layout for now (will be improved later)
    const totalWidth = 350, usableWidth = totalWidth * 0.9;
    const barWidth = Math.min(40, usableWidth / zoneConfig.maxCols - 4);
    const spacing = (usableWidth - (zoneConfig.maxCols * barWidth)) / (zoneConfig.maxCols + 1);
    const x = spacing + (col - 1) * (barWidth + spacing);

    const topMargin = containerHeight * 0.15;
    const bottomMargin = containerHeight * 0.15;
    const usableHeight = containerHeight - topMargin - bottomMargin;
    const rowHeight = usableHeight / zoneConfig.maxRows;
    const y = topMargin + (row - 1) * rowHeight;

    return { x, y, barWidth };
  }

  // DESKTOP: Use street-based positioning
  if (streetConfig.type === 'main') {
    // Main Walking Street (Rows 1-2): Horizontal layout
    const centerY = containerHeight * 0.5;
    // Main road width is 120px on Canvas, offset reduced to stick grids closer to road
    const offsetFromCenter = 70; // Reduced from 110 to bring grids closer to horizontal road

    const idealBarWidth = Math.min(45, Math.max(25, containerWidth / zoneConfig.maxCols - 8));
    const totalBarsWidth = zoneConfig.maxCols * idealBarWidth;
    const totalSpacing = containerWidth - totalBarsWidth;
    const spacing = totalSpacing / (zoneConfig.maxCols + 1);
    const x = spacing + (col - 1) * (idealBarWidth + spacing);

    const y = streetConfig.wsSide === 'north'
      ? centerY - offsetFromCenter
      : centerY + offsetFromCenter;

    return { x, y, barWidth: idealBarWidth };

  } else {
    // Perpendicular streets (Rows 3-22): Positioned along vertical streets
    // DISTRIBUTION SYSTEM: Like Tree Town, each street has its positions distributed vertically along that street

    const streetX = containerWidth * (streetConfig.xPos! / 100);
    const centerY = containerHeight * 0.5;

    // Street groups: Define which rows belong to each street (NEW DISTRIBUTION)
    const streetGroups: { [key: string]: { startRow: number; count: number } } = {
      'Diamond': { startRow: 3, count: 6 },      // Rows 3-8 (6 positions: 3 west + 3 east)
      'Republic': { startRow: 9, count: 2 },     // Rows 9-10 (2 positions: 1 west + 1 east)
      'Myst': { startRow: 11, count: 2 },        // Rows 11-12 (2 positions: 1 west + 1 east)
      'Soi 15': { startRow: 13, count: 6 },      // Rows 13-18 (6 positions: 3 west + 3 east)
      'Soi 16': { startRow: 19, count: 6 },      // Rows 19-24 (6 positions: 3 west + 3 east)
      'BJ Alley': { startRow: 25, count: 6 }     // Rows 25-30 (6 positions: 3 west + 3 east)
    };

    const group = streetGroups[streetConfig.street!];
    const indexInStreet = row - group.startRow; // 0 to (count-1)

    // Vertical distribution along the perpendicular street (like Tree Town branches)
    // Streets go from top to centerY (Walking Street)
    const topMargin = 0;                          // No margin - grids start at the very top
    const bottomBoundary = centerY - 30;          // Stop 30px before Walking Street
    const usableHeight = bottomBoundary - topMargin;

    let y: number;

    // SPECIAL CASE: Republic and Myst should be stacked vertically (one above the other)
    // instead of face-to-face
    if (streetConfig.street === 'Republic' || streetConfig.street === 'Myst') {
      // Vertical stacking: 2 positions distributed vertically
      const spacing = usableHeight / 3; // 3 gaps for 2 positions (before, between, after)
      y = topMargin + (indexInStreet + 1) * spacing;
    } else {
      // FACE-TO-FACE POSITIONING: Group rows into pairs that share the same Y position
      // Example for count=6: rows (0,1), (2,3), (4,5) → 3 pairs at 3 different Y positions
      const pairIndex = Math.floor(indexInStreet / 2); // 0,0,1,1,2,2 for count=6
      const numPairs = Math.ceil(group.count / 2);     // 3 pairs for count=6
      const spacing = usableHeight / (numPairs + 1);   // +1 for gaps before/after
      y = topMargin + (pairIndex + 1) * spacing;
    }

    // X position: Offset from street centerline based on side (West/East)
    // DYNAMIC CALCULATION: Based on actual Canvas road widths
    const streetWidths: { [key: string]: number } = {
      'Diamond': 35,    // Major road
      'Republic': 12,   // Pathway
      'Myst': 6,        // Pathway (thin)
      'Soi 15': 35,     // Major road
      'Soi 16': 35,     // Major road
      'BJ Alley': 25    // Secondary road
    };

    const roadWidth = streetWidths[streetConfig.street!] || 35;
    const sideOffset = (roadWidth / 2) + 10;
    const x = streetConfig.side === 'west' ? streetX - sideOffset : streetX + sideOffset;

    return { x, y, barWidth: 45 };
  }
};

const establishmentsToVisualBars = (establishments: Establishment[], isMobile: boolean, containerElement?: HTMLElement): Bar[] => {
  return establishments
    .filter(est =>
      est.zone === 'walkingstreet' &&
      est.grid_row && est.grid_row >= 1 && est.grid_row <= 30 &&  // NEW SYSTEM: Rows 1-2: Main WS (24 cols), Rows 3-30: Perpendicular streets
      est.grid_col && est.grid_col >= 1 && est.grid_col <= 24     // 24 columns max for Main WS
    )
    .map(est => {
      const barType = CATEGORY_TO_TYPE_MAP[est.category_id] || 'gogo';
      const style = TYPE_STYLES[barType];
      const { x, y } = calculateResponsivePosition(est.grid_row || 1, est.grid_col || 1, isMobile, containerElement);
      return { id: est.id, name: est.name, type: barType, position: { x, y }, color: style.color, icon: style.icon, grid_row: est.grid_row || 1, grid_col: est.grid_col || 1 };
    });
};

const CustomWalkingStreetMap: React.FC<CustomWalkingStreetMapProps> = ({ establishments, onEstablishmentClick, selectedEstablishment, onBarClick, onEstablishmentUpdate }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Monitor container size changes to recalculate positions
  const containerDimensions = useContainerSize(containerRef, 150);

  // Drag and drop states
  const [isLoading, setIsLoading] = useState(false);
  const [operationLockUntil, setOperationLockUntil] = useState<number>(0);
  const [draggedBar, setDraggedBar] = useState<Bar | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<{ row: number; col: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropAction, setDropAction] = useState<'move' | 'swap' | 'blocked' | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [waitingForDataUpdate, setWaitingForDataUpdate] = useState(false);

  // OPTIMISTIC UI: Store temporary positions during API calls
  const [optimisticPositions, setOptimisticPositions] = useState<Map<string, { row: number; col: number }>>(new Map());

  // Throttle reference
  const throttleTimeout = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const allBars = useMemo(() => {
    const bars = establishmentsToVisualBars(establishments, isMobile, containerRef.current || undefined);

    // OPTIMISTIC UI: Apply temporary positions during API calls
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
          return {
            ...bar,
            position: { x, y },
            grid_row: optimisticPos.row,
            grid_col: optimisticPos.col
          };
        }
        return bar;
      });

      // Step 2: CRITICAL - Create missing bars
      // Handles case where backend hasn't updated yet so bar is filtered out
      const existingBarIds = new Set(bars.map(b => b.id));
      const missingBars: Bar[] = [];

      optimisticPositions.forEach((pos, establishmentId) => {
        if (!existingBarIds.has(establishmentId)) {
          const establishment = establishments.find(est => est.id === establishmentId);
          if (establishment) {
            const barType = CATEGORY_TO_TYPE_MAP[establishment.category_id] || 'gogo';
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

  // Check if position is in blocked zone (roads + intersections)
  const isInBlockedZone = useCallback((relativeX: number, relativeY: number, containerWidth: number, containerHeight: number): boolean => {
    const xPercent = (relativeX / containerWidth) * 100;
    const yPercent = (relativeY / containerHeight) * 100;

    if (isMobile) {
      // Mobile: Vertical CentralRoad + 7 horizontal intersections
      // CentralRoad vertical (x: 48%-52%)
      if (xPercent >= 48 && xPercent <= 52) {
        return true;
      }

      // 7 horizontal Sois cutting through Walking Street
      const horizontalIntersections = [
        { name: 'Soi JP', y: 10 },
        { name: 'Soi VC', y: 22 },
        { name: 'Soi 16', y: 30 },
        { name: 'Soi 15', y: 45 },
        { name: 'Soi Marine', y: 60 },
        { name: 'Soi Diamond', y: 75 },
        { name: 'Soi 13', y: 90 }
      ];

      for (const intersection of horizontalIntersections) {
        if (yPercent >= intersection.y - 2 && yPercent <= intersection.y + 2) {
          return true;
        }
      }
    } else {
      // Desktop: Horizontal CentralRoad + 5 vertical intersections
      // CentralRoad horizontal (y: 49%-51%) - MUCH NARROWER to allow drop zones above/below
      if (yPercent >= 49 && yPercent <= 51) {
        return true;
      }

      // 5 vertical Sois cutting through Walking Street
      // REDUCED from ±2% to ±1% for better drag and drop precision
      const verticalIntersections = [
        { name: 'Soi JP', x: 15 },
        { name: 'Soi Marine', x: 35 },
        { name: 'Soi 15', x: 50 },
        { name: 'Soi 14', x: 65 },
        { name: 'Soi Diamond', x: 85 }
      ];

      for (const intersection of verticalIntersections) {
        if (xPercent >= intersection.x - 1 && xPercent <= intersection.x + 1) {
          return true;
        }
      }
    }

    return false;
  }, [isMobile]);

  const isAdmin = user && (user.role === 'admin' || user.role === 'moderator');
  const currentBarSize = useMemo(() => {
    if (containerRef.current) {
      const { barWidth } = calculateResponsivePosition(1, 1, isMobile, containerRef.current);
      return barWidth;
    }
    return isMobile ? 35 : 50; // Desktop plus gros: 50px au lieu de 40px
  }, [isMobile]);

  const getEstablishmentIcon = useCallback((barId: string, establishments: Establishment[], fallbackIcon: string) => {
    const establishment = establishments.find(est => est.id === barId);
    if (establishment?.logo_url) {
      return (
        <div className="map-logo-container-nightlife">
          <img src={establishment.logo_url} alt={establishment.name} className="map-logo-image-nightlife"
            onError={(e) => {
              const target = e.target as HTMLElement;
              target.style.display = 'none';
              if (target.parentElement) {
                target.parentElement.textContent = fallbackIcon;
                target.parentElement.style.background = 'transparent';
                target.parentElement.style.fontSize = '16px';
              }
            }}
          />
        </div>
      );
    }
    return fallbackIcon;
  }, []);

  // Find bar at specific grid position
  const findBarAtPosition = useCallback((row: number, col: number): Bar | null => {
    // CRITICAL FIX: Use SAME filter as establishmentsToVisualBars to avoid ghost establishments
    // Only consider establishments that are actually visible on the map
    const establishment = establishments.find(est =>
      est.zone === 'walkingstreet' &&
      est.grid_row === row &&
      est.grid_col === col &&
      est.grid_row && est.grid_row >= 1 && est.grid_row <= 30 && // NEW SYSTEM: Rows 1-30
      est.grid_col && est.grid_col >= 1 && est.grid_col <= 24   // 24 columns max for Main WS
    );

    if (establishment) {
      // Find the corresponding bar in allBars
      return allBars.find(bar => bar.id === establishment.id) || null;
    }

    return null;
  }, [allBars, establishments]);

  // Convert mouse position to grid position with NEW STREET-BASED DETECTION
  const getGridFromMousePosition = useCallback((event: React.DragEvent) => {
    if (!containerRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;

    const containerWidth = rect.width;
    const containerHeight = rect.height;
    const zoneConfig = getZoneConfig('walkingstreet');

    if (isMobile) {
      // Mobile: Simple layout (à améliorer plus tard)
      const totalWidth = 350, usableWidth = totalWidth * 0.9;
      const barWidth = Math.min(40, usableWidth / zoneConfig.maxCols - 4);
      const spacing = (usableWidth - (zoneConfig.maxCols * barWidth)) / (zoneConfig.maxCols + 1);

      let col = 1;
      for (let testCol = 1; testCol <= zoneConfig.maxCols; testCol++) {
        const barCenterX = spacing + (testCol - 1) * (barWidth + spacing);
        if (Math.abs(relativeX - barCenterX) < barWidth / 2) {
          col = testCol;
          break;
        }
      }

      const topMargin = containerHeight * 0.15;
      const usableHeight = containerHeight * 0.70;
      const rowHeight = usableHeight / zoneConfig.maxRows;
      const row = Math.max(1, Math.min(zoneConfig.maxRows, Math.floor((relativeY - topMargin) / rowHeight) + 1));

      return { row, col };
    }

    // DESKTOP: NEW STREET-BASED DETECTION

    // Step 1: Déterminer si on est North ou South de Walking Street
    const centerY = containerHeight * 0.5;
    const roadWidth = 20; // Just the road itself, not the drop zones (establishments are at ±80px)

    let wsSide: 'north' | 'south';
    if (relativeY < centerY - roadWidth) {
      wsSide = 'north';
    } else if (relativeY > centerY + roadWidth) {
      wsSide = 'south';
    } else {
      // Mouse sur la route Walking Street (blocked)
      return null;
    }

    // Step 2: Check if we're in the VERTICAL ZONE (above/below Main WS)
    // Perpendicular streets only exist in the vertical zone (rows 3-30), not on Main WS (rows 1-2)
    const verticalZoneTop = containerHeight * 0.05;    // Top 5%
    const verticalZoneBottom = centerY - 80;           // Just above Main WS establishments

    const isInVerticalZone = relativeY >= verticalZoneTop && relativeY <= verticalZoneBottom;

    if (isInVerticalZone) {
      // We're in the vertical zone, check for perpendicular streets
      const xPercent = (relativeX / containerWidth) * 100;

      // Définition des rues perpendiculaires avec tolérance RÉDUITE
      const perpendicularStreets = [
        { name: 'Diamond', xPos: 12, tolerance: 3, rowOffset: 3 },     // Rows 3-8 (6 positions)
        { name: 'Republic', xPos: 22, tolerance: 3, rowOffset: 9 },    // Rows 9-10 (2 positions)
        { name: 'Myst', xPos: 28, tolerance: 3, rowOffset: 11 },       // Rows 11-12 (2 positions)
        { name: 'Soi 15', xPos: 52, tolerance: 3, rowOffset: 13 },     // Rows 13-18 (6 positions)
        { name: 'Soi 16', xPos: 68, tolerance: 3, rowOffset: 19 },     // Rows 19-24 (6 positions)
        { name: 'BJ Alley', xPos: 82, tolerance: 3, rowOffset: 25 }    // Rows 25-30 (6 positions)
      ];

      // Vérifier si on est sur une rue perpendiculaire
      for (const street of perpendicularStreets) {
      if (Math.abs(xPercent - street.xPos) <= street.tolerance) {
        // On est sur une rue perpendiculaire !

        // Déterminer le côté (West/East)
        const streetX = containerWidth * (street.xPos / 100);
        const side: 'west' | 'east' = relativeX < streetX ? 'west' : 'east';

        // Cas spéciaux: Republic et Myst sont East-only
        if ((street.name === 'Republic' || street.name === 'Myst') && side === 'west') {
          return null; // Pas de grille à l'ouest de Republic/Myst
        }

        // NEW SYSTEM: Detect row based on Y position within this specific street
        // Each street has its own vertical distribution (like Tree Town branches)

        const centerY = containerHeight * 0.5;

        // Street groups matching calculateResponsivePosition()
        const streetGroups: { [key: string]: { startRow: number; count: number } } = {
          'Diamond': { startRow: 3, count: 6 },      // Rows 3-8 (6 positions: 3 pairs)
          'Republic': { startRow: 9, count: 2 },     // Rows 9-10 (2 positions: 1 pair)
          'Myst': { startRow: 11, count: 2 },        // Rows 11-12 (2 positions: 1 pair)
          'Soi 15': { startRow: 13, count: 6 },      // Rows 13-18 (6 positions: 3 pairs)
          'Soi 16': { startRow: 19, count: 6 },      // Rows 19-24 (6 positions: 3 pairs)
          'BJ Alley': { startRow: 25, count: 6 }     // Rows 25-30 (6 positions: 3 pairs)
        };

        const group = streetGroups[street.name];
        if (!group) return null;

        // Vertical detection within this street's segment
        const topMargin = 0; // Match calculateResponsivePosition (no margin - at the very top)
        const bottomBoundary = centerY - 30;
        const usableHeight = bottomBoundary - topMargin;

        let row: number;
        let indexInStreet: number;

        // SPECIAL CASE: Republic and Myst are stacked vertically, not face-to-face
        if (street.name === 'Republic' || street.name === 'Myst') {
          // Vertical stacking: Find closest vertical position
          const spacing = usableHeight / 3; // 3 gaps for 2 positions
          let closestIndex = -1;
          let closestDistance = Infinity;

          for (let idx = 0; idx < group.count; idx++) {
            const posY = topMargin + (idx + 1) * spacing;
            const distance = Math.abs(relativeY - posY);

            if (distance < closestDistance && distance < spacing / 2) {
              closestDistance = distance;
              closestIndex = idx;
            }
          }

          if (closestIndex === -1) return null; // No position close enough
          indexInStreet = closestIndex;
          row = group.startRow + indexInStreet;

        } else {
          // FACE-TO-FACE POSITIONING: Use pair-based positioning
          const numPairs = Math.ceil(group.count / 2);
          const spacing = usableHeight / (numPairs + 1);

          // Find closest PAIR position within this street
          let closestPairIndex = -1;
          let closestDistance = Infinity;

          for (let pairIdx = 0; pairIdx < numPairs; pairIdx++) {
            const posY = topMargin + (pairIdx + 1) * spacing;
            const distance = Math.abs(relativeY - posY);

            if (distance < closestDistance && distance < spacing / 2) {
              closestDistance = distance;
              closestPairIndex = pairIdx;
            }
          }

          if (closestPairIndex === -1) return null; // No position close enough

          // Calculate actual row number based on side (west=odd, east=even)
          indexInStreet = closestPairIndex * 2 + (side === 'west' ? 0 : 1);
          row = group.startRow + indexInStreet;
        }

        // Col = 1 pour les rues perpendiculaires (simple pour l'instant)
        const col = 1;

        return { row, col };
      }
      }
    }

    // Si on n'est pas sur une rue perpendiculaire, on est sur Main Walking Street (rows 1-2)
    const row = wsSide === 'north' ? 1 : 2;

    // Calculer la colonne sur Main Walking Street (24 columns)
    // Use fixed 24 columns for horizontal Main WS
    const numCols = 24;
    const idealBarWidth = Math.min(45, Math.max(25, containerWidth / numCols - 8));
    const totalBarsWidth = numCols * idealBarWidth;
    const totalSpacing = containerWidth - totalBarsWidth;
    const spacing = totalSpacing / (numCols + 1);

    // SIMPLER APPROACH: Find which slot the mouse is in
    const clickSlot = (relativeX - spacing) / (idealBarWidth + spacing);
    let col = Math.max(1, Math.min(numCols, Math.floor(clickSlot) + 1));

    // Verify we're actually in a valid position (not in spacing gap)
    const barLeftEdge = spacing + (col - 1) * (idealBarWidth + spacing);
    const barRightEdge = barLeftEdge + idealBarWidth;

    // If mouse is before the first bar or after the last bar, invalid
    if (relativeX < spacing || relativeX > containerWidth - spacing) {
      return null;
    }

    return { row, col };
  }, [isMobile, containerRef]);

  // Throttled version of handleDragOver for performance
  const updateMousePosition = useCallback((event: React.DragEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;

    // Update mouse position immediately for smooth tracking
    setMousePosition({ x: relativeX, y: relativeY });

    // Instant validation for blocked zones (roads + intersections)
    if (isInBlockedZone(relativeX, relativeY, rect.width, rect.height)) {
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
  }, [isInBlockedZone, getGridFromMousePosition, findBarAtPosition, draggedBar, containerRef]);

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
  }, [isEditMode, isDragging, draggedBar, updateMousePosition, containerRef]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedBar(null);
    setDragOverPosition(null);
    setIsDragging(false);
    setDropAction(null);
    setMousePosition(null);
  }, []);

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

    // RE-CHECK position at drop time
    const conflictBar = findBarAtPosition(row, col);

    // Determine action: move to empty or swap with existing
    const actualAction = conflictBar ? 'swap' : 'move';

    // Get original position of dragged establishment
    const draggedEstablishment = establishments.find(est => est.id === draggedBar.id);
    const originalPosition = draggedEstablishment ? {
      row: draggedEstablishment.grid_row,
      col: draggedEstablishment.grid_col
    } : null;

    // Safety check: If trying to drop on same position, cancel
    if (originalPosition && originalPosition.row === row && originalPosition.col === col) {
      logger.warn('⚠️ Dropping on same position, cancelling');
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);
      return;
    }

    // Add timeout safety measure for loading state (10 seconds)
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
        // Simple move to empty position
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
            zone: 'walkingstreet'
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
            const lockUntil = Date.now() + 500;
            setOperationLockUntil(lockUntil);
          } else {
            const errorText = await response.text();
            logger.error('Move failed', { status: response.status, error: errorText });

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
        // Swap positions between two bars
        const draggedEstablishment = establishments.find(est => est.id === draggedBar.id);
        const conflictEstablishment = establishments.find(est => est.id === conflictBar.id);

        if (draggedEstablishment && conflictEstablishment) {
          const draggedOriginalPos = {
            row: draggedEstablishment.grid_row || 1,
            col: draggedEstablishment.grid_col || 1
          };

          // OPTIMISTIC UI: Store BOTH swapped positions immediately for instant feedback
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
            zone: 'walkingstreet',
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
            // Success - keep optimistic position, no need to reload all data
            logger.debug('✅ Position updated successfully on server');
            setWaitingForDataUpdate(false);
            const lockUntil = Date.now() + 500;
            setOperationLockUntil(lockUntil);
          } else {
            const errorText = await response.text();
            logger.error('Atomic swap failed', { status: response.status, error: errorText });

            // OPTIMISTIC UI: Clear both failed positions (automatic rollback)
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
      logger.error('Drop operation failed', error);
      alert(`❌ Operation failed: ${error}`);
    } finally {
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      setDraggedBar(null);
      setDragOverPosition(null);
      setIsDragging(false);
      setDropAction(null);
      setMousePosition(null);
    }
  }, [
    isEditMode,
    isDragging,
    dragOverPosition,
    draggedBar,
    dropAction,
    findBarAtPosition,
    establishments,
    isMobile,
    containerRef,
    onEstablishmentUpdate
  ]);

  // Generate grid visualization for debugging (Walking Street)
  const renderGridDebug = () => {
    if (!isEditMode || !containerRef.current) return null;

    const zoneConfig = getZoneConfig('walkingstreet');
    const gridCells: React.ReactElement[] = [];

    const fixedGridSize = 40; // Taille fixe uniforme pour toutes les grilles (TREE TOWN SYSTEM)

    for (let row = 1; row <= zoneConfig.maxRows; row++) {
      const streetConfig = getStreetConfig(row);

      // Perpendicular streets only use col=1, main street uses cols 1-10
      const maxCol = streetConfig.type === 'main' ? zoneConfig.maxCols : 1;

      for (let col = 1; col <= maxCol; col++) {
        const { x, y } = calculateResponsivePosition(row, col, isMobile, containerRef.current);

        // Generate debug label
        let debugLabel = `Row ${row}, Col ${col}`;
        if (streetConfig.type === 'main') {
          debugLabel = `Main WS ${streetConfig.wsSide?.toUpperCase()}`;
        } else if (streetConfig.street) {
          debugLabel = `${streetConfig.street} ${streetConfig.side?.toUpperCase()} ${streetConfig.wsSide?.toUpperCase()}`;
        }

        // Color by street type for better visual identification
        let gridColor = '#FFD700'; // Gold for main street
        let bgColor = 'rgba(255, 215, 0, 0.1)';

        if (streetConfig.type === 'perpendicular') {
          if (streetConfig.street === 'Diamond' || streetConfig.street === 'Soi 15' || streetConfig.street === 'Soi 16') {
            // Major roads: Gold
            gridColor = '#FFD700';
            bgColor = 'rgba(255, 215, 0, 0.15)';
          } else if (streetConfig.street === 'BJ Alley') {
            // Secondary road: Orange
            gridColor = '#FFA500';
            bgColor = 'rgba(255, 165, 0, 0.15)';
          } else if (streetConfig.street === 'Republic' || streetConfig.street === 'Myst') {
            // Pathways: Light gray
            gridColor = '#AAAAAA';
            bgColor = 'rgba(170, 170, 170, 0.15)';
          }
        }

        gridCells.push(
          <div
            key={`grid-${row}-${col}`}
            style={{
              position: 'absolute',
              left: `${x - fixedGridSize/2}px`,
              top: `${y - fixedGridSize/2}px`,
              width: `${fixedGridSize}px`,
              height: `${fixedGridSize}px`,
              border: `2px dashed ${gridColor}`,
              background: bgColor,
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              color: gridColor,
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
            }}
            title={debugLabel}
          >
            {row},{col}
          </div>
        );
      }
    }

    return gridCells;
  };

  return (
    <div ref={containerRef}
      className={`map-container-nightlife ${isEditMode ? 'edit-mode' : ''}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        position: 'relative', width: '100%',
        background: 'linear-gradient(135deg, rgba(255,0,64,0.3) 0%, rgba(220,20,60,0.4) 50%, rgba(139,0,0,0.3) 100%), linear-gradient(135deg, rgba(13,0,25,0.95), rgba(26,0,51,0.95))',
        overflow: 'hidden'
      }}
    >
      {isAdmin && (
        <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 20 }}>
          <button onClick={() => setIsEditMode(!isEditMode)}
            style={{
              background: isEditMode ? 'linear-gradient(135deg, #FF6B6B, #FF8E53)' : 'linear-gradient(135deg, #4ECDC4, #44A08D)',
              color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px',
              fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
            {isEditMode ? '🔒 Exit Edit' : '✏️ Edit Mode'}
          </button>
        </div>
      )}

      <div className="map-title-compact-nightlife" style={{
        color: '#FF0040',
        textShadow: '0 0 20px rgba(255,0,64,0.8), 2px 2px 4px rgba(0,0,0,0.8)',
        border: '1px solid rgba(255,0,64,0.4)'
      }}>
        🌃 WALKING STREET
      </div>

      {/* Visual Road System - Canvas Rendering with all intersections */}
      <WalkingStreetRoad isEditMode={isEditMode} isMobile={isMobile} />

      {/* GRID DEBUG VISUALIZATION - Shows all grid positions with dynamic offsets */}
      {renderGridDebug()}

      {/* Directional Labels - Responsive */}
      {!isMobile ? (
        <>
          {/* Desktop - Horizontal orientation */}
          <div style={{
            position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
            color: '#FFD700', fontSize: '14px', fontWeight: 'bold',
            textShadow: '0 0 10px rgba(255,215,0,0.6)', zIndex: 14,
            pointerEvents: 'none', background: 'rgba(0,0,0,0.4)', padding: '4px 10px',
            borderRadius: '8px'
          }}>
            ↑ NORTH (Inland/Second Road)
          </div>

          <div style={{
            position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
            color: '#FFD700', fontSize: '14px', fontWeight: 'bold',
            textShadow: '0 0 10px rgba(255,215,0,0.6)', zIndex: 14,
            pointerEvents: 'none', background: 'rgba(0,0,0,0.4)', padding: '4px 10px',
            borderRadius: '8px'
          }}>
            ↓ SOUTH (Beach Road/Sea 🌊)
          </div>
        </>
      ) : (
        <>
          {/* Mobile - Vertical orientation */}
          <div style={{
            position: 'absolute', top: '50px', left: '50%', transform: 'translateX(-50%)',
            color: '#FFD700', fontSize: '12px', fontWeight: 'bold',
            textShadow: '0 0 10px rgba(255,215,0,0.6)', zIndex: 14,
            pointerEvents: 'none', background: 'rgba(0,0,0,0.4)', padding: '4px 10px',
            borderRadius: '8px'
          }}>
            ↑ NORTH (South Pattaya Rd)
          </div>

          <div style={{
            position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
            color: '#FFD700', fontSize: '12px', fontWeight: 'bold',
            textShadow: '0 0 10px rgba(255,215,0,0.6)', zIndex: 14,
            pointerEvents: 'none', background: 'rgba(0,0,0,0.4)', padding: '4px 10px',
            borderRadius: '8px'
          }}>
            ↓ SOUTH (Bali Hai Pier 🌊)
          </div>
        </>
      )}

      {allBars.map((bar) => {
        const isSelected = selectedEstablishment === bar.id;
        const isHovered = hoveredBar === bar.id;
        const isBeingDragged = isDragging && draggedBar?.id === bar.id;
        return (
          <div key={bar.id}
            onClick={() => handleBarClick(bar)}
            onMouseEnter={() => setHoveredBar(bar.id)}
            onMouseLeave={() => setHoveredBar(null)}
            draggable={!!(isEditMode && isAdmin && !isLoading)}
            onDragStart={(e) => handleDragStart(bar, e)}
            onDragEnd={handleDragEnd}
            style={{
              position: 'absolute',
              left: `${bar.position.x - currentBarSize/2}px`,
              top: `${bar.position.y - currentBarSize/2}px`,
              width: `${currentBarSize}px`, height: `${currentBarSize}px`, borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, ${bar.color}FF, ${bar.color}DD 60%, ${bar.color}AA 100%)`,
              border: isSelected ? '3px solid #FFD700' : isEditMode ? '2px solid #00FF00' : '2px solid rgba(255,255,255,0.6)',
              cursor: isLoading ? 'not-allowed' : isEditMode ? (isBeingDragged ? 'grabbing' : 'grab') : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', transform: isHovered && !isBeingDragged ? 'scale(1.2)' : 'scale(1)',
              transition: 'all 0.3s ease',
              boxShadow: isHovered
                ? `0 0 25px ${TYPE_STYLES[bar.type].shadow}`
                : isEditMode
                  ? '0 0 15px rgba(0,255,0,0.5)'
                  : `0 0 12px ${bar.color}66`,
              zIndex: isHovered ? 15 : isBeingDragged ? 100 : 10,
              opacity: isBeingDragged ? 0.7 : 1
            }}
          >
            {getEstablishmentIcon(bar.id, establishments, bar.icon)}
            {isHovered && (
              <div style={{
                position: 'absolute', bottom: '45px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.9)', color: '#fff', padding: '5px 10px',
                borderRadius: '5px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap',
                zIndex: 20, border: '1px solid #FF0040'
              }}>
                {bar.name}
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
    </div>
  );
};

export default CustomWalkingStreetMap;