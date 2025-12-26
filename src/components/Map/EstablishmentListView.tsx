import React from 'react';
import { Search, Sparkles, MapPin, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Establishment } from '../../types';
import { getCategoryIcon } from '../../utils/iconMapper';
import SanitizedText from '../Common/SanitizedText';
import '../../styles/components/establishment-list-view.css';

interface EstablishmentListViewProps {
  establishments: Establishment[];
  onEstablishmentClick?: (establishment: Establishment) => void;
  selectedEstablishment?: string;
  loading?: boolean;
}

/**
 * EstablishmentListView - Alternative list view to ergonomic maps
 *
 * Displays establishments as cards in a responsive grid layout.
 * Reuses existing filters (categories, search, zone) from PattayaMap.
 *
 * Features:
 * - Responsive grid: 3 cols (desktop) → 2 cols (tablet) → 1 col (mobile)
 * - Complete info: logo, name, category, address, zone, pricing, description
 * - Click card to view details (same as map markers)
 * - Empty state for no results
 * - Nightlife theme consistency
 */
const EstablishmentListView: React.FC<EstablishmentListViewProps> = ({
  establishments,
  onEstablishmentClick,
  selectedEstablishment,
  loading = false
}) => {
  const { t } = useTranslation();

  // 🆕 v10.3 Phase 5 - VIP Priority Sorting + Approved Employee Sorting
  // Sort establishments: VIP → Has Approved Employees → Approved Count → Total Count
  // IMPORTANT: useMemo must be called BEFORE any conditional returns (React Hooks rules)
  const sortedEstablishments = React.useMemo(() => {
    const sorted = [...establishments];
    sorted.sort((a, b) => {
      // 1. VIP comes before non-VIP
      const isVIPActiveA = a.is_vip && a.vip_expires_at && new Date(a.vip_expires_at) > new Date();
      const isVIPActiveB = b.is_vip && b.vip_expires_at && new Date(b.vip_expires_at) > new Date();

      if (isVIPActiveA && !isVIPActiveB) return -1;
      if (!isVIPActiveA && isVIPActiveB) return 1;

      // 2. Establishments with approved employees come before those without
      const hasApprovedA = (a.approved_employee_count || 0) > 0;
      const hasApprovedB = (b.approved_employee_count || 0) > 0;

      if (hasApprovedA && !hasApprovedB) return -1;
      if (!hasApprovedA && hasApprovedB) return 1;

      // 3. Sort by number of approved employees (descending)
      const approvedDiff = (b.approved_employee_count || 0) - (a.approved_employee_count || 0);
      if (approvedDiff !== 0) return approvedDiff;

      // 4. Sort by total number of employees (descending)
      return (b.employee_count || 0) - (a.employee_count || 0);
    });
    return sorted;
  }, [establishments]);

  // Helper to format zone name for display
  const formatZoneName = (zone?: string): string => {
    if (!zone) return 'Unknown';

    const zoneNames: Record<string, string> = {
      soi6: 'Soi 6',
      walkingstreet: 'Walking Street',
      lkmetro: 'LK Metro',
      treetown: 'Treetown',
      soibuakhao: 'Soi Buakhao',
      beachroad: 'Beach Road'
    };

    return zoneNames[zone] || zone;
  };

  // Helper to truncate description
  const truncateText = (text: string, maxLength: number = 120): string => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Loading state
  if (loading) {
    return (
      <div className="establishment-listview-container-nightlife">
        <div className="establishment-listview-grid-nightlife">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={`skeleton-${i}`} className="establishment-listview-card-nightlife skeleton">
              <div className="skeleton-shimmer"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!establishments || establishments.length === 0) {
    return (
      <div className="establishment-listview-container-nightlife">
        <div className="establishment-listview-empty-nightlife">
          <div className="establishment-listview-empty-icon-nightlife"><Search size={48} /></div>
          <h3 className="establishment-listview-empty-title-nightlife">{t('establishmentList.noResults')}</h3>
          <p className="establishment-listview-empty-description-nightlife">
            {t('establishmentList.noResultsHint')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="establishment-list-container-nightlife">
      {/* Results count */}
      <div className="establishment-listview-header-nightlife">
        <h2 className="establishment-listview-results-count-nightlife">
          <Sparkles size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('establishmentList.resultsCount', { count: establishments.length })}
        </h2>
        <p className="establishment-listview-subtitle-nightlife">
          <Lightbulb size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('establishmentList.clickToView')}
        </p>
      </div>

      {/* Grid of establishment cards - Tinder Style */}
      <div className="establishment-listview-grid-nightlife scroll-reveal-stagger">
        {sortedEstablishments.map((establishment) => {
          const isSelected = selectedEstablishment === establishment.id;
          const categoryName = establishment.category?.name || 'Establishment';
          const categoryIcon = getCategoryIcon(establishment.category?.icon || '');
          const categoryColor = establishment.category?.color || '#9B5DE5';

          // 🆕 v10.3 Phase 5 - VIP Active Check pour effet brillant
          const isVIPActive = establishment.is_vip && establishment.vip_expires_at && new Date(establishment.vip_expires_at) > new Date();

          return (
            <div
              key={establishment.id}
              className={`establishment-card-tinder establishment-card-scroll-reveal ${isSelected ? 'selected' : ''} ${isVIPActive ? 'establishment-card-vip' : ''}`}
              onClick={() => onEstablishmentClick?.(establishment)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onEstablishmentClick?.(establishment);
                }
              }}
            >
              {/* Category Badge - Top Left */}
              <div
                className="establishment-card-category"
                style={{
                  background: `linear-gradient(135deg, ${categoryColor}E6, ${categoryColor}B3)`,
                  borderColor: categoryColor
                }}
              >
                {categoryIcon} {categoryName}
              </div>

              {/* VIP Badge - Top Right (v10.3 Phase 5 - Repositionné) */}
              {isVIPActive && (
                <div
                  className="establishment-card-vip-badge"
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 3,
                    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.95) 0%, rgba(255, 165, 0, 0.95) 100%)',
                    color: '#1a1a2e',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 0 20px rgba(255, 215, 0, 0.6), 0 4px 15px rgba(255, 165, 0, 0.4)',
                    animation: 'vipPulse 2s ease-in-out infinite'
                  }}
                  title={`VIP until ${new Date(establishment.vip_expires_at!).toLocaleDateString()}`}
                >
                  👑 VIP
                </div>
              )}

              {/* Logo Centered (NEW) */}
              {establishment.logo_url ? (
                <div className="establishment-card-logo-center">
                  <img
                    src={establishment.logo_url}
                    alt={`${establishment.name} logo`}
                    className="establishment-card-logo-img"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="establishment-card-logo-placeholder-center">
                  {categoryIcon}
                </div>
              )}

              {/* Content Overlay */}
              <div className="establishment-card-content">
                {/* Name */}
                <h3 className="establishment-card-name">
                  {establishment.name}
                </h3>

                {/* Meta Info */}
                <div className="establishment-card-meta">
                  {/* Employee Count */}
                  <span className="establishment-card-employees">
                    👥 {t('establishmentList.employeeCount', { count: establishment.employee_count || 0 })}
                  </span>

                  {/* Zone Badge - Inline (v10.3 Phase 5 - Repositionné) */}
                  <span className="establishment-card-zone-inline">
                    <MapPin size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {formatZoneName(establishment.zone)}
                  </span>
                </div>

                {/* Description (optional) */}
                {establishment.description && (
                  <SanitizedText
                    html={truncateText(establishment.description, 80)}
                    tag="p"
                    className="establishment-card-description"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EstablishmentListView;
