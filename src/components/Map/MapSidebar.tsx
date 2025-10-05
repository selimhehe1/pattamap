import React from 'react';
import { Zone } from './ZoneSelector';

interface EstablishmentCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

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
  onClearFilters
}) => {
  return (
    <>
      {/* Sidebar Container */}
      <div className={`map-sidebar-nightlife ${isOpen ? '' : 'collapsed'}`}>
        {/* Header avec titre et bouton close */}
        <div className="sidebar-header-nightlife">
          <div className="sidebar-title-nightlife">
            <span className="sidebar-zone-icon-nightlife">{currentZone.icon}</span>
            <div>
              <h2 className="sidebar-zone-name-nightlife">{currentZone.name}</h2>
              <p className="sidebar-zone-subtitle-nightlife">Select a zone to explore</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="sidebar-close-btn-nightlife"
            aria-label="Toggle sidebar"
          >
            ✕
          </button>
        </div>

        {/* Divider */}
        <div className="sidebar-divider-nightlife"></div>

        {/* Zone Selector List */}
        <div className="sidebar-section-nightlife">
          <h3 className="sidebar-section-title-nightlife">🗺️ ZONES</h3>
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
                <span className="zone-item-name-nightlife">{zone.name}</span>
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
                <h3 className="sidebar-section-title-nightlife">🔍 FILTERS</h3>
                <button
                  onClick={onClearFilters}
                  className="clear-filters-btn-nightlife"
                  title="Clear all filters"
                >
                  🔄 Clear
                </button>
              </div>

              {/* Search */}
              <div className="sidebar-search-container-nightlife">
                <input
                  type="text"
                  placeholder="Search establishments..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="sidebar-search-input-nightlife"
                />
              </div>

              {/* Category Filters */}
              {categories.length > 0 && (
                <div className="sidebar-categories-nightlife">
                  <h4 className="sidebar-subsection-title-nightlife">Types:</h4>
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
          <p className="sidebar-legend-nightlife">
            💡 Click on establishments to view details
          </p>
        </div>
      </div>

      {/* Toggle Button (toujours visible) */}
      <button
        onClick={onToggle}
        className={`sidebar-toggle-btn-nightlife ${isOpen ? '' : 'collapsed'}`}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? '◀' : '☰'}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay-nightlife"
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default MapSidebar;
