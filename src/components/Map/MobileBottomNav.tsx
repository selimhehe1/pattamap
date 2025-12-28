import React from 'react';
import { useTranslation } from 'react-i18next';
import { List, Map, Users } from 'lucide-react';
import '../../styles/features/map/mobile-bottom-nav.css';

type ViewMode = 'map' | 'list' | 'employees';

interface MobileBottomNavProps {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
}

/**
 * MobileBottomNav - Modern bottom navigation bar
 *
 * Material Design 3 inspired bottom navigation with 3 view modes:
 * 1. List View (📋) - Establishments list
 * 2. Map View (🗺️) - Interactive zone map
 * 3. Employees View (👥) - Zone staff grid
 *
 * Features:
 * - Fixed position, always visible
 * - Thumb zone optimized (ergonomic)
 * - Active state indicators
 * - Nightlife theme consistency
 * - Smooth animations
 *
 * @component
 */
const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  viewMode,
  onViewChange
}) => {
  const { t } = useTranslation();

  return (
    <nav className="mobile-bottom-nav" role="navigation" aria-label={t('map.navigation')}>
      {/* List Button */}
      <button
        onClick={() => onViewChange('list')}
        className={`mobile-bottom-nav__button ${viewMode === 'list' ? 'active' : ''}`}
        aria-label={t('map.viewList')}
        title={t('map.viewList')}
        aria-current={viewMode === 'list' ? 'page' : undefined}
      >
        <span className="mobile-bottom-nav__icon" aria-hidden="true">
          <List size={24} />
        </span>
        <span className="mobile-bottom-nav__label">
          {t('map.viewList')}
        </span>
      </button>

      {/* Map Button */}
      <button
        onClick={() => onViewChange('map')}
        className={`mobile-bottom-nav__button mobile-bottom-nav__button--primary ${viewMode === 'map' ? 'active' : ''}`}
        aria-label={t('map.viewMap')}
        title={t('map.viewMap')}
        aria-current={viewMode === 'map' ? 'page' : undefined}
      >
        <span className="mobile-bottom-nav__icon mobile-bottom-nav__icon--large" aria-hidden="true">
          <Map size={28} />
        </span>
        <span className="mobile-bottom-nav__label">
          {t('map.viewMap')}
        </span>
      </button>

      {/* Employees Button */}
      <button
        onClick={() => onViewChange('employees')}
        className={`mobile-bottom-nav__button ${viewMode === 'employees' ? 'active' : ''}`}
        aria-label={t('map.lineup')}
        title={t('map.lineup')}
        aria-current={viewMode === 'employees' ? 'page' : undefined}
      >
        <span className="mobile-bottom-nav__icon" aria-hidden="true">
          <Users size={24} />
        </span>
        <span className="mobile-bottom-nav__label">
          {t('map.lineup')}
        </span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;
