import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Zone } from './ZoneSelector';
import '../../styles/utils/overlays.css';
import './mobile-map-menu.css';

interface EstablishmentCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface MobileMapMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentZone: Zone;
  zones: Zone[];
  onZoneChange: (zone: Zone) => void;
  categories: EstablishmentCategory[];
  selectedCategories: string[];
  onCategoryToggle: (categoryId: string) => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
  establishmentCount?: number;
}

const MobileMapMenu: React.FC<MobileMapMenuProps> = ({
  isOpen,
  onClose,
  currentZone,
  zones,
  onZoneChange,
  categories,
  selectedCategories,
  onCategoryToggle,
  searchTerm,
  onSearchChange,
  onClearFilters,
  establishmentCount = 0
}) => {
  const { t } = useTranslation();
  const [expandedSection, setExpandedSection] = useState<'zones' | 'filters' | null>('zones');

  // Helper to map zone IDs to translation keys
  const getZoneTranslationKey = (zoneId: string): string => {
    const mapping: Record<string, string> = {
      'jomtiencomplex': 'jomtien',
      'soi78': 'soi7and8'
    };
    return mapping[zoneId] || zoneId;
  };

  const handleZoneSelect = (zone: Zone) => {
    onZoneChange(zone);
    // Don't close menu - let user continue exploring
  };

  const toggleSection = (section: 'zones' | 'filters') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!isOpen) return null;

  // Render menu in document.body using Portal to escape parent stacking context
  return ReactDOM.createPortal(
    <>
      {/* Overlay */}
      <div
        className="overlay overlay--dark"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu Container */}
      <div className="menu menu--fullscreen is-open">
        {/* Header */}
        <div className="menu__header">
          <div className="menu__header-content">
            <span className="mobile-map-menu-header-icon">🗺️</span>
            <div>
              <h2 className="menu__title">{t('map.mapControls')}</h2>
              <p className="menu__subtitle">{t(`map.zoneNames.${getZoneTranslationKey(currentZone.id)}`)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="menu__close"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="menu__content">
          {/* ZONES SECTION */}
          <div className="mobile-map-menu-section">
            <button
              className="mobile-map-menu-section-header"
              onClick={() => toggleSection('zones')}
            >
              <div className="mobile-map-menu-section-header-content">
                <span className="mobile-map-menu-section-icon">📍</span>
                <h3 className="mobile-map-menu-section-title">{t('map.zones').toUpperCase()}</h3>
              </div>
              <span className={`mobile-map-menu-section-arrow ${expandedSection === 'zones' ? 'open' : ''}`}>
                ▼
              </span>
            </button>

            {expandedSection === 'zones' && (
              <div className="mobile-map-menu-section-content">
                {zones.map((zone) => (
                  <button
                    key={zone.id}
                    className={`mobile-map-menu-zone-item ${zone.id === currentZone.id ? 'active' : ''}`}
                    onClick={() => handleZoneSelect(zone)}
                  >
                    <span className="mobile-map-menu-zone-icon">{zone.icon}</span>
                    <div className="mobile-map-menu-zone-info">
                      <span className="mobile-map-menu-zone-name">{t(`map.zoneNames.${getZoneTranslationKey(zone.id)}`)}</span>
                    </div>
                    {zone.id === currentZone.id && (
                      <span className="mobile-map-menu-zone-check">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* FILTERS SECTION */}
          <div className="mobile-map-menu-section">
            <button
              className="mobile-map-menu-section-header"
              onClick={() => toggleSection('filters')}
            >
              <div className="mobile-map-menu-section-header-content">
                <span className="mobile-map-menu-section-icon">🔍</span>
                <h3 className="mobile-map-menu-section-title">{t('search.filters').toUpperCase()}</h3>
              </div>
              <span className={`mobile-map-menu-section-arrow ${expandedSection === 'filters' ? 'open' : ''}`}>
                ▼
              </span>
            </button>

            {expandedSection === 'filters' && (
              <div className="mobile-map-menu-section-content">
                {/* Clear Filters Button */}
                <div className="mobile-map-menu-filters-header">
                  <button
                    onClick={onClearFilters}
                    className="mobile-map-menu-clear-btn"
                  >
                    🔄 {t('search.clearAllFilters')}
                  </button>
                </div>

                {/* Search Bar */}
                <div className="mobile-map-menu-search">
                  <input
                    type="text"
                    placeholder={t('search.placeholder')}
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="mobile-map-menu-search-input"
                  />
                  <span className="mobile-map-menu-search-icon">🔍</span>
                </div>

                {/* Category Filters */}
                {categories.length > 0 && (
                  <div className="mobile-map-menu-categories">
                    <h4 className="mobile-map-menu-subsection-title">{t('search.types')}:</h4>
                    <div className="mobile-map-menu-category-list">
                      {categories.map((category) => (
                        <label
                          key={category.id}
                          className="mobile-map-menu-category-item"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(`cat-${String(category.id).padStart(3, '0')}`)}
                            onChange={() => onCategoryToggle(`cat-${String(category.id).padStart(3, '0')}`)}
                            className="mobile-map-menu-category-checkbox"
                          />
                          <div
                            className="mobile-map-menu-category-badge"
                            style={{ backgroundColor: category.color }}
                          >
                            {category.icon}
                          </div>
                          <span className="mobile-map-menu-category-name">{category.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results Info */}
          <div className="mobile-map-menu-results">
            <span className="mobile-map-menu-results-icon">📊</span>
            <span className="mobile-map-menu-results-text">
              {t('map.establishmentCount', { count: establishmentCount, zone: t(`map.zoneNames.${getZoneTranslationKey(currentZone.id)}`) })}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="menu__footer">
          <p className="mobile-map-menu-legend">
            💡 {t('map.clickToView')}
          </p>
        </div>
      </div>
    </>,
    document.body
  );
};

export default MobileMapMenu;
