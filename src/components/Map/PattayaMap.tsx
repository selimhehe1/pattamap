import React, { useState, useMemo, useEffect, Component, ReactNode, ErrorInfo } from 'react';
import { useTranslation } from 'react-i18next';
import { useModal } from '../../contexts/ModalContext';
import { useMapControls } from '../../contexts/MapControlsContext';
import { GirlProfile } from '../../routes/lazyComponents';
import { ZONES, Zone } from './ZoneSelector';
import ZoneMapRenderer from './ZoneMapRenderer';
import MapSidebar from './MapSidebar';
import MobileMapMenu from './MobileMapMenu';
import MobileBottomNav from './MobileBottomNav';
import EstablishmentListView from './EstablishmentListView';
import EmployeesGridView from './EmployeesGridView';

/**
 * MapErrorBoundary - Auto-retry wrapper for ZoneMapRenderer
 *
 * Handles the HMR-related "useContext is null" error by automatically
 * retrying with a new key to force a clean remount.
 */
interface MapErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

interface MapErrorBoundaryState {
  hasError: boolean;
  retryCount: number;
}

class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  constructor(props: MapErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(): Partial<MapErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo): void {
    // Auto-retry on useContext errors (HMR-related)
    if (error.message.includes('useContext') && this.state.retryCount < 3) {
      setTimeout(() => {
        this.setState(prev => ({
          hasError: false,
          retryCount: prev.retryCount + 1
        }));
        this.props.onRetry?.();
      }, 100);
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.retryCount >= 3) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <div style={{ fontSize: '18px', marginBottom: '12px' }}>Map failed to load</div>
          <button
            onClick={() => this.setState({ hasError: false, retryCount: 0 })}
            style={{
              padding: '10px 20px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🔄 Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Note: Leaflet replaced by custom zone maps

import { Establishment, EstablishmentCategory } from '../../types';
import { IndependentPosition } from '../../hooks/useFreelances';
import { logger } from '../../utils/logger';

type ViewMode = 'map' | 'list' | 'employees';

interface PattayaMapProps {
  establishments: Establishment[];
  freelances?: IndependentPosition[]; // Independent position employees
  onEstablishmentClick?: (establishment: Establishment) => void;
  selectedEstablishment?: string;
  currentZone?: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  isError?: boolean; // API error state
  onRetry?: () => void; // Retry callback for error state
  onEstablishmentUpdate?: () => Promise<void>;
}

const PattayaMap: React.FC<PattayaMapProps> = ({
  establishments,
  freelances = [],
  onEstablishmentClick,
  selectedEstablishment,
  currentZone: propCurrentZone,
  sidebarOpen,
  onToggleSidebar,
  isError,
  onRetry,
  onEstablishmentUpdate
}) => {
  const { t: _t } = useTranslation();
  const { openModal, closeModal } = useModal();
  const [currentZone, setCurrentZone] = useState<string>(propCurrentZone || 'soi6'); // Default to Soi 6
  const [categories, setCategories] = useState<EstablishmentCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [mapKey, setMapKey] = useState(0); // Force re-render on sidebar toggle
  const [mapRetryKey, setMapRetryKey] = useState(0); // Force re-render on error retry
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // Local search state (sidebar/menu only)

  // Get view mode from context (shared with Header)
  const { viewMode, setViewMode } = useMapControls();

  // Detect mobile viewport (portrait OR landscape)
  useEffect(() => {
    const checkMobile = () => {
      // Detect mobile portrait (width ≤ 768) OR landscape (height ≤ 500)
      setIsMobile(window.innerWidth <= 768 || window.innerHeight <= 500);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/establishments/categories`);
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
          // Select all categories by default - Convert INTEGER id to STRING format 'cat-XXX'
          setSelectedCategories((data.categories || []).map((cat: EstablishmentCategory) => `cat-${String(cat.id).padStart(3, '0')}`));
        }
      } catch (error) {
        logger.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Handle zone changes
  const handleZoneChange = (zone: Zone) => {
    setCurrentZone(zone.id);
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleClearFilters = () => {
    // Reset categories to all selected
    setSelectedCategories(categories.map((cat) => `cat-${String(cat.id).padStart(3, '0')}`));
    // Clear search term
    setSearchTerm('');
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode); // This updates the context which also updates localStorage
    logger.debug('View mode changed', { mode });
  };

  // Filter establishments based on selected categories and search term
  const filteredEstablishments = useMemo(() => {
    logger.debug('🟢 PATTAYAMAP - Received establishments:', establishments.length);
    logger.debug('🟢 PATTAYAMAP - Soi 6 received:', establishments.filter(e => e.zone === 'soi6').length);
    logger.debug('🟢 PATTAYAMAP - selectedCategories:', selectedCategories);

    const filtered = establishments.filter(establishment => {
      // Filter by category
      const categoryMatch = selectedCategories.length === 0 ||
                           selectedCategories.includes(`cat-${String(establishment.category_id).padStart(3, '0')}`);

      // Filter by search term
      const searchMatch = searchTerm === '' ||
                         establishment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (establishment.address && establishment.address.toLowerCase().includes(searchTerm.toLowerCase()));

      return categoryMatch && searchMatch;
    });

    logger.debug('🟢 PATTAYAMAP - After filtering:', filtered.length);
    logger.debug('🟢 PATTAYAMAP - Filtered Soi 6:', filtered.filter(e => e.zone === 'soi6').length);

    return filtered;
  }, [establishments, selectedCategories, searchTerm]);

  // Show controls on all zones including Soi 6
  const showControls = true;

  return (
    <div className="map-layout-nightlife">
      {/* Always render sidebar (visible on desktop, hidden on mobile) */}
      <MapSidebar
        isOpen={!isMobile ? sidebarOpen : false}
        onToggle={() => {
          onToggleSidebar();
          setMapKey(prev => prev + 1);
        }}
        currentZone={ZONES.find(z => z.id === currentZone) || ZONES[0]}
        zones={ZONES}
        onZoneChange={handleZoneChange}
        showControls={showControls}
        categories={categories}
        selectedCategories={selectedCategories}
        onCategoryToggle={handleCategoryToggle}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onClearFilters={handleClearFilters}
        establishmentCount={filteredEstablishments.filter(e => e.zone === currentZone).length}
        isError={isError}
        onRetry={onRetry}
        viewMode={viewMode}
        onViewModeToggle={(mode) => {
          setViewMode(mode);
          localStorage.setItem('pattamap-view-mode', mode);
          logger.debug('View mode toggled', { mode });
        }}
      />

      <div className={`map-content-area-nightlife ${!isMobile && sidebarOpen ? '' : 'sidebar-closed'}`}>
        {/* Mobile: Bottom navigation (thumb-friendly) */}
        {isMobile && (
          <MobileBottomNav
            viewMode={viewMode}
            onViewChange={handleViewModeChange}
          />
        )}

        {/* Mobile: Map Menu */}
        {isMobile && (
          <MobileMapMenu
            isOpen={showMobileMenu}
            onClose={() => setShowMobileMenu(false)}
            currentZone={ZONES.find(z => z.id === currentZone) || ZONES[0]}
            zones={ZONES}
            onZoneChange={handleZoneChange}
            categories={categories}
            selectedCategories={selectedCategories}
            onCategoryToggle={handleCategoryToggle}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onClearFilters={handleClearFilters}
            establishmentCount={filteredEstablishments.filter(e => e.zone === currentZone).length}
          />
        )}

        {/* Conditional rendering: Map View, List View, or Employees View */}
        {viewMode === 'map' ? (
          <MapErrorBoundary onRetry={() => setMapRetryKey(k => k + 1)}>
            <ZoneMapRenderer
              key={`map-${mapKey}-${mapRetryKey}-${currentZone}`}
              currentZone={currentZone}
              establishments={filteredEstablishments}
              freelances={freelances}
              onEstablishmentClick={onEstablishmentClick}
              selectedEstablishment={selectedEstablishment}
              onEstablishmentUpdate={onEstablishmentUpdate}
            />
          </MapErrorBoundary>
        ) : viewMode === 'list' ? (
          <EstablishmentListView
            establishments={filteredEstablishments.filter(e => e.zone === currentZone)}
            onEstablishmentClick={onEstablishmentClick}
            selectedEstablishment={selectedEstablishment}
          />
        ) : (
          <EmployeesGridView
            zoneId={currentZone}
            zoneName={ZONES.find(z => z.id === currentZone)?.name}
            onEmployeeClick={(employee) => {
              openModal('employee-profile', GirlProfile, {
                girl: employee,
                onClose: () => closeModal('employee-profile')
              }, {
                size: 'fullscreen',
                showCloseButton: false
              });
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PattayaMap;
