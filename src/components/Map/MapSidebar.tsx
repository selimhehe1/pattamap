import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Map, Check, Search, RefreshCw, MapPin, Lightbulb, AlertTriangle } from 'lucide-react';
import { Zone } from './ZoneSelector';
import '../../styles/components/map-sidebar.css';

// 🔧 FIX M14: Debounce delay in milliseconds
const SEARCH_DEBOUNCE_MS = 300;

interface EstablishmentCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

type ViewMode = 'map' | 'list' | 'employees';

interface MapSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentZone: Zone;
  zones: Zone[];
  onZoneChange: (zone: Zone) => void;
  showControls: boolean;
  categories?: EstablishmentCategory[];
  selectedCategories?: string[];
  onCategoryToggle?: (categoryId: string) => void;
  searchTerm?: string;
  onSearchChange?: (search: string) => void;
  onClearFilters?: () => void;
  establishmentCount?: number;
  isError?: boolean; // API error state
  onRetry?: () => void; // Retry callback
  viewMode?: ViewMode;
  onViewModeToggle?: (mode: ViewMode) => void;
}

const MapSidebar: React.FC<MapSidebarProps> = ({
  isOpen,
  onToggle,
  currentZone,
  zones,
  onZoneChange,
  showControls,
  categories = [],
  selectedCategories = [],
  onCategoryToggle,
  searchTerm = '',
  onSearchChange,
  onClearFilters,
  establishmentCount,
  isError,
  onRetry,
  viewMode: _viewMode = 'map',
  onViewModeToggle: _onViewModeToggle
}) => {
  const { t } = useTranslation();

  // 🔧 FIX M14: Local state for immediate input feedback + debounced callback
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state when external searchTerm changes (e.g., on clear filters)
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  // Debounced search handler
  const handleSearchChange = (value: string) => {
    setLocalSearchTerm(value); // Immediate visual update

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounced callback
    debounceTimerRef.current = setTimeout(() => {
      onSearchChange?.(value);
    }, SEARCH_DEBOUNCE_MS);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Helper to map zone IDs to translation keys
  const getZoneTranslationKey = (zoneId: string): string => {
    return zoneId;
  };

  return (
    <>
      {/* Sidebar Container */}
      <div className={`map-sidebar-nightlife ${isOpen ? '' : 'collapsed'}`} data-testid="map-sidebar">
        {/* Header avec titre */}
        <div className="sidebar-header-nightlife">
          <div className="sidebar-title-nightlife">
            <span className="sidebar-zone-icon-nightlife">{currentZone.icon}</span>
            <div>
              <h2 className="sidebar-zone-name-nightlife">{t(`map.zoneNames.${getZoneTranslationKey(currentZone.id)}`)}</h2>
              <p className="sidebar-zone-subtitle-nightlife">{t('map.selectZone')}</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="sidebar-divider-nightlife"></div>

        {/* Zone Selector List */}
        <div className="sidebar-section-nightlife">
          <h3 className="sidebar-section-title-nightlife"><Map size={16} /> {t('map.zones').toUpperCase()}</h3>
          <div className="zone-list-nightlife">
            {zones.map((zone) => (
              <button
                key={zone.id}
                onClick={() => onZoneChange(zone)}
                className={`zone-list-item-nightlife ${currentZone.id === zone.id ? 'active' : ''}`}
                style={{
                  '--zone-color': zone.color
                } as React.CSSProperties}
              >
                <span className="zone-item-icon-nightlife">{zone.icon}</span>
                <span className="zone-item-name-nightlife">{t(`map.zoneNames.${getZoneTranslationKey(zone.id)}`)}</span>
                {currentZone.id === zone.id && (
                  <span className="zone-item-badge-nightlife"><Check size={14} /></span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Map Controls (conditional) */}
        {showControls && (
          <>
            <div className="sidebar-divider-nightlife"></div>
            <div className="sidebar-section-nightlife">
              <div className="filters-header-nightlife">
                <h3 className="sidebar-section-title-nightlife"><Search size={16} /> {t('search.filters').toUpperCase()}</h3>
                <button
                  onClick={onClearFilters}
                  className="clear-filters-btn-nightlife"
                  title={t('search.clearFilters')}
                >
                  <RefreshCw size={14} /> {t('search.clearFilters')}
                </button>
              </div>

              {/* Search - 🔧 FIX M14: Now uses debounced local state */}
              <div className="sidebar-search-container-nightlife">
                <input
                  type="text"
                  placeholder={t('search.placeholder')}
                  value={localSearchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="sidebar-search-input-nightlife"
                />
              </div>

              {/* Category Filters */}
              {categories.length > 0 && (
                <div className="sidebar-categories-nightlife">
                  <h4 className="sidebar-subsection-title-nightlife">{t('search.types')}:</h4>
                  <div className="category-list-nightlife">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className="category-item-nightlife"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(`cat-${String(category.id).padStart(3, '0')}`)}
                          onChange={() => onCategoryToggle?.(`cat-${String(category.id).padStart(3, '0')}`)}
                          className="category-checkbox-nightlife"
                        />
                        <div
                          className="category-color-badge-nightlife"
                          style={{ backgroundColor: category.color }}
                        >
                          {category.icon}
                        </div>
                        <span className="category-name-nightlife">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer Legend */}
        <div className="sidebar-footer-nightlife">
          {isError ? (
            <div className="sidebar-error-nightlife" role="alert" aria-live="assertive" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <p style={{
                color: '#EF4444',
                fontWeight: 'bold',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: 0
              }}>
                <AlertTriangle size={16} /> {t('errors.failedToFetch', 'Failed to load data')}
              </p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="retry-btn-nightlife"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: 'var(--color-primary, #C19A6B)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  <RefreshCw size={14} /> {t('common.retry', 'Retry')}
                </button>
              )}
            </div>
          ) : establishmentCount !== undefined && (
            <p className="sidebar-count-nightlife" style={{
              color: '#FFD700',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              marginBottom: '0.5rem',
              textAlign: 'center'
            }}>
              <MapPin size={14} /> {t('map.establishmentCount', { count: establishmentCount, zone: t(`map.zoneNames.${getZoneTranslationKey(currentZone.id)}`) })}
            </p>
          )}
          {!isError && (
            <p className="sidebar-legend-nightlife">
              <Lightbulb size={14} /> {t('map.clickToView')}
            </p>
          )}
        </div>

      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay-nightlife"
          role="button"
          tabIndex={0}
          onClick={onToggle}
          data-testid="sidebar-overlay"
        />
      )}
    </>
  );
};

export default MapSidebar;
