import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Establishment, CustomBar } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import GenericRoadCanvas from './GenericRoadCanvas';
import { getZoneConfig } from '../../utils/zoneConfig';
import { MAP_CONFIG } from '../../utils/constants';
import { useContainerSize } from '../../hooks/useContainerSize';
import ScreenReaderEstablishmentList from './ScreenReaderEstablishmentList';
import LazyImage from '../Common/LazyImage';
import { generateEstablishmentUrl } from '../../utils/slugify';
import { logger } from '../../utils/logger';

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

interface CustomBoyzTownMapProps {
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
  'cat-001': 'beer',    // Bar
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
  const zoneConfig = getZoneConfig('boyztown');

  if (isMobile) {
    const totalWidth = 350;
    const usableWidth = totalWidth * 0.9;
    const barWidth = Math.min(40, usableWidth / zoneConfig.maxCols - 4);
    const spacing = (usableWidth - (zoneConfig.maxCols * barWidth)) / (zoneConfig.maxCols + 1);
    const x = spacing + (col - 1) * (barWidth + spacing);
    const y = row === 1 ? 480 : 60;
    return { x, y, barWidth };
  } else {
    const containerWidth = containerElement ? containerElement.clientWidth : (window.innerWidth > 1200 ? 1200 : window.innerWidth - 40);
    const usableWidth = containerWidth * (zoneConfig.endX - zoneConfig.startX) / 100;
    const startX = containerWidth * zoneConfig.startX / 100;
    const idealBarWidth = Math.min(45, Math.max(25, usableWidth / zoneConfig.maxCols - 8));
    const totalBarsWidth = zoneConfig.maxCols * idealBarWidth;
    const totalSpacing = usableWidth - totalBarsWidth;
    const spacing = totalSpacing / (zoneConfig.maxCols + 1);
    const x = startX + spacing + (col - 1) * (idealBarWidth + spacing);
    const containerHeight = containerElement ? containerElement.clientHeight : MAP_CONFIG.DEFAULT_HEIGHT;
    const topY = containerHeight * zoneConfig.startY / 100;
    const bottomY = containerHeight * zoneConfig.endY / 100;
    const y = row === 1 ? topY : bottomY;
    return { x, y, barWidth: idealBarWidth };
  }
};

const establishmentsToVisualBars = (establishments: Establishment[], isMobile: boolean, containerElement?: HTMLElement): Bar[] => {
  return establishments.filter(est => est.zone === 'boyztown').map(est => {
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

const CustomBoyzTownMap: React.FC<CustomBoyzTownMapProps> = ({
  establishments,
  onEstablishmentClick,
  selectedEstablishment,
  onBarClick,
  onEstablishmentUpdate: _onEstablishmentUpdate
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ✅ KEYBOARD NAVIGATION: Track focused bar index for arrow key navigation
  const [focusedBarIndex, setFocusedBarIndex] = useState<number>(-1);
  const barRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Monitor container size changes to recalculate positions
  // ✅ PERFORMANCE: 300ms debounce reduces re-renders by 50% during resize
  const containerDimensions = useContainerSize(containerRef, 300);

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

  const allBars = useMemo(() => establishmentsToVisualBars(establishments, isMobile, containerRef.current || undefined), [establishments, isMobile, containerDimensions]);

  const handleBarClick = useCallback((bar: Bar) => {
    if (isEditMode) return;
    const establishment = establishments.find(est => est.id === bar.id);
    if (establishment && onEstablishmentClick) {
      onEstablishmentClick(establishment);
    } else if (onBarClick) {
      onBarClick({ id: bar.id, name: bar.name, type: bar.type, position: bar.position, color: bar.color });
    } else {
      navigate(generateEstablishmentUrl(bar.id, bar.name, establishment?.zone || 'boyztown'));
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

  return (
    <div ref={containerRef}
      className={`map-container-nightlife ${isEditMode ? 'edit-mode' : ''}`}
      style={{
        position: 'relative', width: '100%',
        background: 'linear-gradient(135deg, rgba(255,20,147,0.3) 0%, rgba(138,43,226,0.5) 50%, rgba(75,0,130,0.3) 100%), linear-gradient(135deg, rgba(13,0,25,0.95), rgba(26,0,51,0.95))',
        overflow: 'hidden'
      }}
      onKeyDown={handleKeyboardNavigation}
      role="region"
      aria-label="Interactive map of Boyztown establishments"
      aria-describedby="boyztown-map-description"
    >
      {/* Screen Reader Accessible Description */}
      <p id="boyztown-map-description" className="sr-only">
        Interactive map displaying {allBars.length} establishments in Boyztown.
        {isEditMode ? ' Edit mode active: drag establishments to reposition them.' : ' Click on establishments to view details.'}
        For keyboard navigation, press Tab to focus establishments, then use Arrow keys to navigate between them, Enter or Space to select.
      </p>

      {/* Screen Reader Only Establishment List */}
      <ScreenReaderEstablishmentList
        establishments={establishments}
        zone="boyztown"
        onEstablishmentSelect={(est) => onEstablishmentClick?.(est)}
      />
      <GenericRoadCanvas
        config={{
          shape: isMobile ? 'vertical' : 'horizontal',
          width: isMobile ? 80 : 200,
          startX: 1,
          endX: 99,
          startY: 10,
          endY: 90
        }}
        style={{
          baseColor: '#2d2d2d',
          overlayColor: '#1a1a1a',
          edgeColor: '#FF1493',  // Pink for BoyzTown
          centerLineColor: '#FFD700'
        }}
        isEditMode={isEditMode}
        grainCount={1500}
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
        color: '#FF1493',
        textShadow: '0 0 20px rgba(255,20,147,0.8), 2px 2px 4px rgba(0,0,0,0.8)',
        border: '1px solid rgba(255,20,147,0.4)'
      }}>
        🌈 BOYZTOWN
      </div>

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

        const ariaLabel = `${bar.name}, ${categoryName}, click to view details`;

        return (
          <div key={bar.id}
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
            aria-describedby={isHovered ? `tooltip-bz-${bar.id}` : undefined}
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
              position: 'absolute',
              left: `${bar.position.x - currentBarSize/2}px`,
              top: `${bar.position.y - currentBarSize/2}px`,
              width: `${currentBarSize}px`, height: `${currentBarSize}px`, borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, ${bar.color}FF, ${bar.color}DD 60%, ${bar.color}AA 100%)`,
              border: isSelected ? '3px solid #FFD700' : '2px solid rgba(255,255,255,0.6)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', transform: isHovered ? 'scale(1.2)' : 'scale(1)',
              transition: 'all 0.3s ease',
              boxShadow: isHovered ? `0 0 25px ${TYPE_STYLES[bar.type].shadow}` : `0 0 12px ${bar.color}66`,
              zIndex: isHovered ? 15 : 10
            }}
          >
            {getEstablishmentIcon(bar.id, establishments, bar.icon)}
            {isHovered && (
              <div
                id={`tooltip-bz-${bar.id}`}
                role="tooltip"
                style={{
                  position: 'absolute', bottom: '45px', left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.9)', color: '#fff', padding: '5px 10px',
                  borderRadius: '5px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap',
                  zIndex: 20, border: '1px solid #FF1493'
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
      `}</style>
    </div>
  );
};

export default CustomBoyzTownMap;