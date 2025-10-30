import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zone } from './ZoneSelector';
import '../../styles/components/map-sidebar.css';

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
  viewMode = 'map',
  onViewModeToggle
}) => {
  const { t } = useTranslation();

  // Helper to map zone IDs to translation keys
  const getZoneTranslationKey = (zoneId: string): string => {
    const mapping: Record<string, string> = {
      'jomtiencomplex': 'jomtien',
      'soi78': 'soi7and8'
    };
    return mapping[zoneId] || zoneId;
  };

  return (
    <>
      {/* Sidebar Container */}
      <div className={`map-sidebar-nightlife ${isOpen ? '' : 'collapsed'}`}>
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
          <h3 className="sidebar-section-title-nightlife">🗺️ {t('map.zones').toUpperCase()}</h3>
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
                  <span className="zone-item-badge-nightlife">✓</span>
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
                <h3 className="sidebar-section-title-nightlife">🔍 {t('search.filters').toUpperCase()}</h3>
                <button
                  onClick={onClearFilters}
                  className="clear-filters-btn-nightlife"
                  title={t('search.clearFilters')}
                >
                  🔄 {t('search.clearFilters')}
                </button>
              </div>

              {/* Search */}
              <div className="sidebar-search-container-nightlife">
                <input
                  type="text"
                  placeholder={t('search.placeholder')}
                  value={searchTerm}
                  onChange={(e) => onSearchChange?.(e.target.value)}
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
          {establishmentCount !== undefined && (
            <p className="sidebar-count-nightlife" style={{
              color: '#FFD700',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              marginBottom: '0.5rem',
              textAlign: 'center'
            }}>
              📍 {t('map.establishmentCount', { count: establishmentCount, zone: t(`map.zoneNames.${getZoneTranslationKey(currentZone.id)}`) })}
            </p>
          )}
          <p className="sidebar-legend-nightlife">
            💡 {t('map.clickToView')}
          </p>
        </div>

      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay-nightlife"
          role="button"
          tabIndex={0}
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default MapSidebar;
