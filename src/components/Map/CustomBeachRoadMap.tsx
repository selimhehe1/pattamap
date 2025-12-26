/**
 * CustomBeachRoadMap - REFACTORED VERSION
 *
 * Reduced from ~1690 lines by using shared hooks.
 * Zone-specific: Freelance support, CSRF, GirlProfile modal.
 */
import React, { useMemo, useCallback, useRef } from 'react';
import { Check, Pencil } from 'lucide-react';
import { useNavigateWithTransition } from '../../hooks/useNavigateWithTransition';
import { Establishment, CustomBar, Employee } from '../../types';
import { IndependentPosition } from '../../hooks/useFreelances';
import { useCSRF } from '../../contexts/CSRFContext';
import { useModal } from '../../contexts/ModalContext';
import { getZoneConfig } from '../../utils/zoneConfig';
import { MAP_CONFIG } from '../../utils/constants';
import { useContainerSize } from '../../hooks/useContainerSize';
import GenericRoadCanvas from './GenericRoadCanvas';
import DragDropIndicator from './DragDropIndicator';
import { GirlProfile } from '../../routes/lazyComponents';
import toast from '../../utils/toast';
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
  isFreelance?: boolean;
  employeeData?: Employee;
}

interface CustomBeachRoadMapProps {
  establishments: Establishment[];
  freelances?: IndependentPosition[];
  onEstablishmentClick?: (establishment: Establishment) => void;
  selectedEstablishment?: string;
  onBarClick?: (bar: CustomBar) => void;
  onEstablishmentUpdate?: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// ZONE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const ZONE = 'beachroad';
const ZONE_CONFIG = getZoneConfig(ZONE);

const TYPE_STYLES: Record<string, { color: string; icon: string }> = {
  gogo: { color: '#C19A6B', icon: '💃' },
  beer: { color: '#FFD700', icon: '🍺' },
  pub: { color: '#00E5FF', icon: '🍸' },
  massage: { color: '#06FFA5', icon: '💆' },
  nightclub: { color: '#7B2CBF', icon: '🎵' },
  freelance: { color: '#9D4EDD', icon: '👯' }
};

const CATEGORY_TO_TYPE_MAP: { [key: string | number]: 'gogo' | 'beer' | 'pub' | 'massage' | 'nightclub' } = {
  'cat-001': 'beer', 'cat-002': 'gogo', 'cat-003': 'massage', 'cat-004': 'nightclub',
  1: 'beer', 2: 'gogo', 3: 'massage', 4: 'nightclub'
};

// ═══════════════════════════════════════════════════════════════════════════
// POSITION CALCULATION
// ═══════════════════════════════════════════════════════════════════════════
const calculateResponsivePosition = (row: number, col: number, isMobile: boolean, containerElement?: HTMLElement) => {
  if (isMobile) {
    const totalWidth = 350;
    const usableWidth = totalWidth * 0.9;
    const barWidth = Math.min(40, usableWidth / ZONE_CONFIG.maxCols - 4);
    const spacing = (usableWidth - (ZONE_CONFIG.maxCols * barWidth)) / (ZONE_CONFIG.maxCols + 1);
    const x = spacing + (col - 1) * (barWidth + spacing);
    const y = 60 + (row - 1) * 140;
    return { x, y, barWidth };
  }

  const containerWidth = containerElement?.getBoundingClientRect().width || (window.innerWidth > 1200 ? 1200 : window.innerWidth - 40);
  const usableWidth = containerWidth * (ZONE_CONFIG.endX - ZONE_CONFIG.startX) / 100;
  const startX = containerWidth * ZONE_CONFIG.startX / 100;
  const idealBarWidth = Math.min(45, Math.max(25, usableWidth / ZONE_CONFIG.maxCols - 8));
  const totalBarsWidth = ZONE_CONFIG.maxCols * idealBarWidth;
  const spacing = (usableWidth - totalBarsWidth) / (ZONE_CONFIG.maxCols + 1);
  const x = startX + spacing + (col - 1) * (idealBarWidth + spacing);
  const containerHeight = containerElement?.getBoundingClientRect().height || MAP_CONFIG.DEFAULT_HEIGHT;
  const y = row === 1 ? containerHeight * ZONE_CONFIG.startY / 100 : containerHeight * ZONE_CONFIG.endY / 100;
  return { x, y, barWidth: idealBarWidth };
};

const establishmentsToVisualBars = (establishments: Establishment[], isMobile: boolean, containerElement?: HTMLElement): Bar[] => {
  return establishments.filter(est => est.zone === ZONE).map(est => {
    const barType = CATEGORY_TO_TYPE_MAP[est.category_id] || 'beer';
    const style = TYPE_STYLES[barType];
    const { x, y } = calculateResponsivePosition(est.grid_row || 1, est.grid_col || 1, isMobile, containerElement);
    return { id: est.id, name: est.name, type: barType, position: { x, y }, color: style.color, icon: style.icon,
      grid_row: est.grid_row || 1, grid_col: est.grid_col || 1 };
  });
};

const freelancesToVisualBars = (freelances: IndependentPosition[], isMobile: boolean, containerElement?: HTMLElement): Bar[] => {
  if (!freelances?.length) return [];
  const style = TYPE_STYLES.freelance;
  // Filter by zone - hook returns all positions, we need to filter for this zone
  return freelances.filter(f => f.zone === ZONE).map(freelance => {
    // Use grid_x/grid_y from hook (maps to grid_row/grid_col for position calculation)
    const gridRow = freelance.grid_y || 1;
    const gridCol = freelance.grid_x || 1;
    const { x, y } = calculateResponsivePosition(gridRow, gridCol, isMobile, containerElement);
    return {
      id: freelance.employee_id,
      name: freelance.employee_name || 'Freelancer',
      type: 'gogo' as const, position: { x, y }, color: style.color, icon: style.icon,
      grid_row: gridRow, grid_col: gridCol,
      isFreelance: true
    };
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const CustomBeachRoadMap: React.FC<CustomBeachRoadMapProps> = ({
  establishments,
  freelances = [],
  onEstablishmentClick,
  selectedEstablishment,
  onBarClick,
  onEstablishmentUpdate: _onEstablishmentUpdate
}) => {
  const navigate = useNavigateWithTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const { getCSRFHeaders } = useCSRF();
  const { openModal, closeModal } = useModal();

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
    const establishmentBars = establishmentsToVisualBars(establishments, isMobile, containerRef.current || undefined);
    const freelanceBars = freelancesToVisualBars(freelances, isMobile, containerRef.current || undefined);
    const bars = [...establishmentBars, ...freelanceBars];

    if (optimisticPositions.size > 0) {
      const updatedBars = bars.map(bar => {
        const optimisticPos = optimisticPositions.get(bar.id);
        if (optimisticPos) {
          const { x, y } = calculateResponsivePosition(optimisticPos.row, optimisticPos.col, isMobile, containerRef.current || undefined);
          return { ...bar, position: { x, y }, grid_row: optimisticPos.row, grid_col: optimisticPos.col };
        }
        return bar;
      });
      return updatedBars;
    }
    return bars;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- containerDimensions triggers recalculation
  }, [establishments, freelances, isMobile, containerDimensions, optimisticPositions]);

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
    const establishment = establishments.find(est => est.zone === ZONE && est.grid_row === row && est.grid_col === col);
    if (establishment) return allBars.find(bar => bar.id === establishment.id) || null;
    const freelance = freelances.find(f => f.zone === ZONE && f.grid_y === row && f.grid_x === col);
    if (freelance) return allBars.find(bar => bar.id === freelance.employee_id) || null;
    return null;
  }, [allBars, establishments, freelances]);

  const getGridFromMousePosition = useCallback((event: React.DragEvent | React.TouchEvent) => {
    if (!containerRef.current) return null;
    const coords = getEventCoordinates(event);
    if (!coords) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = coords.clientX - rect.left;
    const relativeY = coords.clientY - rect.top;

    if (isMobile) {
      const totalWidth = 350;
      const usableWidth = totalWidth * 0.9;
      const barWidth = Math.min(40, usableWidth / ZONE_CONFIG.maxCols - 4);
      const spacing = (usableWidth - (ZONE_CONFIG.maxCols * barWidth)) / (ZONE_CONFIG.maxCols + 1);
      const col = Math.max(1, Math.min(ZONE_CONFIG.maxCols, Math.floor((relativeX - spacing) / (barWidth + spacing)) + 1));
      const row = Math.max(1, Math.min(ZONE_CONFIG.maxRows, Math.floor((relativeY - 60) / 140) + 1));
      return { row, col };
    }

    const containerWidth = rect.width;
    const containerHeight = rect.height;
    const usableWidth = containerWidth * (ZONE_CONFIG.endX - ZONE_CONFIG.startX) / 100;
    const startX = containerWidth * ZONE_CONFIG.startX / 100;
    const idealBarWidth = Math.min(45, Math.max(25, usableWidth / ZONE_CONFIG.maxCols - 8));
    const spacing = (usableWidth - ZONE_CONFIG.maxCols * idealBarWidth) / (ZONE_CONFIG.maxCols + 1);
    const col = Math.max(1, Math.min(ZONE_CONFIG.maxCols, Math.floor((relativeX - startX - spacing) / (idealBarWidth + spacing)) + 1));
    const topY = containerHeight * ZONE_CONFIG.startY / 100;
    const bottomY = containerHeight * ZONE_CONFIG.endY / 100;
    const midY = (topY + bottomY) / 2;
    const row = relativeY < midY ? 1 : 2;
    return { row, col };
  }, [isMobile]);

  // BAR CLICK HANDLER (with freelance modal support)
  const handleBarClick = useCallback((bar: Bar) => {
    if (isEditMode) return;
    if (bar.isFreelance && bar.employeeData) {
      openModal('girl-profile', GirlProfile, {
        girl: bar.employeeData,
        onClose: () => closeModal('girl-profile')
      }, { size: 'profile', closeOnOverlayClick: true, showCloseButton: false });
      return;
    }
    const establishment = establishments.find(est => est.id === bar.id);
    if (establishment && onEstablishmentClick) {
      onEstablishmentClick(establishment);
    } else if (onBarClick) {
      onBarClick({ id: bar.id, name: bar.name, type: bar.type, position: bar.position, color: bar.color });
    } else {
      navigate(generateEstablishmentUrl(bar.id, bar.name, establishment?.zone || ZONE));
    }
  }, [establishments, onEstablishmentClick, onBarClick, navigate, isEditMode, openModal, closeModal]);

  const getEstablishmentIcon = useCallback((bar: Bar, establishments: Establishment[]) => {
    if (bar.isFreelance && bar.employeeData?.photos?.[0]) {
      return (
        <div className="map-logo-container-nightlife">
          <LazyImage src={bar.employeeData.photos[0]} alt={bar.name}
            cloudinaryPreset="employeePhoto" className="map-logo-image-nightlife" objectFit="cover" />
        </div>
      );
    }
    const establishment = establishments.find(est => est.id === bar.id);
    if (establishment?.logo_url) {
      return (
        <div className="map-logo-container-nightlife">
          <LazyImage src={establishment.logo_url} alt={establishment.name}
            cloudinaryPreset="establishmentLogo" className="map-logo-image-nightlife" objectFit="contain" />
        </div>
      );
    }
    return bar.icon;
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
      case 'ArrowDown':
        targetBar = allBars.filter(b => (b.grid_row || 1) !== currentRow)
          .sort((a, b) => Math.abs((a.grid_col || 1) - currentCol) - Math.abs((b.grid_col || 1) - currentCol))[0] || null;
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
    if (!isEditMode || isLoading || isOperationLocked() || bar.isFreelance) {
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
    if (!isEditMode || isLoading || isOperationLocked() || bar.isFreelance) return;
    triggerHaptic('tap');
    setDraggedBar(bar);
    setIsDragging(true);
  }, [isEditMode, isLoading, isOperationLocked]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isEditMode || !isDragging || !draggedBar) return;
    updateMousePosition(event);
  }, [isEditMode, isDragging, draggedBar, updateMousePosition]);

  // API CALL with CSRF
  const performMoveOrSwap = useCallback(async () => {
    if (!draggedBar || !dragOverPosition || dropAction === 'blocked' || draggedBar.isFreelance) return false;
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
        headers: { 'Content-Type': 'application/json', ...getCSRFHeaders() },
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
  }, [draggedBar, dragOverPosition, dropAction, establishments, applyOptimisticPosition, clearOptimisticPosition, setOperationLock, getCSRFHeaders]);

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
    <div className="custom-map-container beachroad-map" role="region" aria-label="Beach Road Interactive Map"
      onKeyDown={handleKeyboardNavigation}>
      <ScreenReaderEstablishmentList establishments={establishments.filter(est => est.zone === ZONE)} zone={ZONE} />

      {isAdmin && (
        <div className="map-controls">
          <button onClick={toggleEditMode} className={`edit-mode-toggle ${isEditMode ? 'active' : ''}`}
            aria-pressed={isEditMode} disabled={isLoading}>
            {isEditMode ? <><Check size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Editing</> : <><Pencil size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Edit</>}
          </button>
        </div>
      )}

      <div ref={containerRef} className={`map-canvas-container ${isEditMode ? 'edit-mode' : ''}`}
        style={{ position: 'relative', width: '100%', minHeight: isMobile ? '400px' : `${MAP_CONFIG.DEFAULT_HEIGHT}px` }}
        onDragOver={handleDragOver} onDrop={handleDrop}>
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
          style={{ baseColor: '#2d2d2d', overlayColor: '#1a1a1a', edgeColor: '#FFD700' }}
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
                ${isBeingDragged ? 'dragging' : ''} ${isVip ? 'vip' : ''} ${bar.isFreelance ? 'freelance' : ''}`}
              style={{
                position: 'absolute', left: bar.position.x, top: bar.position.y,
                width: currentBarSize, height: currentBarSize, backgroundColor: bar.color,
                borderRadius: bar.isFreelance ? '50%' : '8px',
                transform: `translate(-50%, -50%) ${isBeingDragged ? 'scale(1.1)' : 'scale(1)'}`,
                opacity: isBeingDragged ? 0.7 : 1,
                cursor: isEditMode && canEdit && !bar.isFreelance ? 'grab' : 'pointer',
                zIndex: isBeingDragged ? 1000 : isSelected ? 100 : isHovered ? 50 : 1,
              }}
              role="button" tabIndex={index === focusedBarIndex ? 0 : -1}
              aria-label={`${bar.name}${isVip ? ' (VIP)' : ''}${bar.isFreelance ? ' (Freelance)' : ''}`}
              onClick={() => handleBarClick(bar)}
              onMouseEnter={() => setHoveredBar(bar.id)} onMouseLeave={() => setHoveredBar(null)}
              draggable={isEditMode && canEdit && !isLoading && !bar.isFreelance}
              onDragStart={(e) => handleDragStart(bar, e)} onDragEnd={handleDragEnd}
              onTouchStart={isEditMode && canEdit && !isLoading && !bar.isFreelance ? (e) => handleTouchStart(bar, e) : undefined}
              onTouchMove={isEditMode && canEdit && !isLoading && !bar.isFreelance ? handleTouchMove : undefined}
              onTouchEnd={isEditMode && canEdit && !isLoading && !bar.isFreelance ? handleTouchEnd : undefined}>
              {getEstablishmentIcon(bar, establishments)}
              {isVip && <span className="vip-crown">👑</span>}
              {bar.isFreelance && <span className="freelance-badge" style={{ position: 'absolute', bottom: -4, right: -4, fontSize: 10 }}>💼</span>}
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

export default CustomBeachRoadMap;
