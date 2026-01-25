/**
 * EstablishmentsPage - Premium Zone Exploration
 *
 * Displays establishments filtered by zone with Neo-Nightlife design
 * Features: Hero section, category filters, animated grid, skeleton loading
 */

import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  MapPin,
  ArrowLeft,
  Users,
  Star,
  AlertCircle,
  Sparkles,
  Filter,
  ArrowUpDown,
  TreePine,
  Waves,
  Heart,
  Beer,
  Music,
  Mic,
} from 'lucide-react';
import { useEstablishmentsByZone } from '../hooks/useEstablishments';
import { getZoneLabel } from '../utils/constants';
import { generateEstablishmentUrl } from '../utils/slugify';
import { Establishment } from '../types';
import EstablishmentCard from '../components/Common/EstablishmentCard';
import StructuredData from '../components/SEO/StructuredData';
import '../styles/pages/establishments-page.css';
import '../styles/components/establishment-card.css';

// Zone taglines for premium feel
const zoneTaglines: Record<string, string> = {
  soi6: 'The Famous Nightlife Strip',
  walkingstreet: "Pattaya's Premier Entertainment District",
  lkmetro: 'Local Vibes & Hidden Gems',
  soibuakhao: 'The Heart of Nightlife',
  treetown: 'Relaxed Atmosphere & Good Times',
  beachroad: 'Seaside Entertainment',
  soi7: 'Classic Pattaya Experience',
  thirdroad: 'Off the Beaten Path',
};

// Category definitions with Lucide icons
const categories = [
  { id: 'bar', name: 'Bar', icon: <Beer size={16} /> },
  { id: 'gogo', name: 'GoGo', icon: <Sparkles size={16} /> },
  { id: 'massage', name: 'Massage', icon: <Heart size={16} /> },
  { id: 'club', name: 'Club', icon: <Music size={16} /> },
  { id: 'karaoke', name: 'Karaoke', icon: <Mic size={16} /> },
];

// Sort options
type SortOption = 'name' | 'employees' | 'recent';

// Zone icon mapping - matches homepage ZoneGrid icons
const getZoneIcon = (zoneId: string): React.ReactNode => {
  const iconProps = { className: 'zone-icon' };
  const icons: Record<string, React.ReactNode> = {
    soi6: <Users {...iconProps} />,
    walkingstreet: <Sparkles {...iconProps} />,
    lkmetro: <Building2 {...iconProps} />,
    treetown: <TreePine {...iconProps} />,
    soibuakhao: <MapPin {...iconProps} />,
    beachroad: <Waves {...iconProps} />,
    freelance: <Heart {...iconProps} />,
  };
  return icons[zoneId] || <MapPin {...iconProps} />;
};

const EstablishmentsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const zone = searchParams.get('zone');

  // Filter & sort state
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('name');

  const { data: establishments, isLoading, error, totalCount } = useEstablishmentsByZone(zone);

  // Calculate total employees
  const totalEmployees = useMemo(() => {
    return establishments?.reduce((sum, est) => sum + (est.employee_count || 0), 0) || 0;
  }, [establishments]);

  // Filter and sort establishments
  const filteredEstablishments = useMemo(() => {
    let filtered = [...(establishments || [])];

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter((est) => {
        const catName = est.category?.name?.toLowerCase() || '';
        const catId = est.category_id?.toString() || '';
        return catName.includes(categoryFilter) || catId === categoryFilter;
      });
    }

    // Apply sorting
    switch (sortBy) {
      case 'employees':
        filtered.sort((a, b) => (b.employee_count || 0) - (a.employee_count || 0));
        break;
      case 'recent':
        filtered.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });
        break;
      case 'name':
      default:
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [establishments, categoryFilter, sortBy]);

  // Navigate to establishment detail page
  const handleEstablishmentClick = (establishment: Establishment) => {
    const url = generateEstablishmentUrl(
      establishment.id,
      establishment.name,
      establishment.zone || zone || 'other'
    );
    navigate(url);
  };

  // Go back to home
  const handleBack = () => {
    navigate('/');
  };

  // No zone selected state
  if (!zone) {
    return (
      <div className="establishments-page">
        <div className="error-state-premium">
          <div className="error-icon-container">
            <AlertCircle size={64} />
          </div>
          <h2>{t('establishments.noZoneSelected', 'No zone selected')}</h2>
          <p>{t('establishments.selectZoneFromHome', 'Please select a zone from the homepage')}</p>
          <button onClick={handleBack} className="btn-back-home">
            <ArrowLeft size={18} />
            {t('common.backToHome', 'Back to Home')}
          </button>
        </div>
      </div>
    );
  }

  // Breadcrumb items for SEO
  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Zones', url: '/zones' },
    { name: getZoneLabel(zone), url: `/zone/${zone}` },
  ];

  return (
    <div className="establishments-page">
      {/* SEO: Structured Data for search engines */}
      {filteredEstablishments.length > 0 && (
        <StructuredData
          type="ItemList"
          establishments={filteredEstablishments}
          zone={zone}
        />
      )}
      <StructuredData
        type="BreadcrumbList"
        items={breadcrumbItems}
      />

      {/* Premium Hero Section */}
      <section className="zone-hero">
        <div className="zone-hero-bg" />
        <div className="zone-hero-glow" />

        <div className="zone-hero-content">
          {/* Zone Icon - Dynamic based on zone */}
          <div className="zone-icon-container">
            {getZoneIcon(zone)}
            <Sparkles className="zone-sparkle zone-sparkle-1" />
            <Sparkles className="zone-sparkle zone-sparkle-2" />
          </div>

          {/* Zone Title */}
          <h1 className="zone-title">{getZoneLabel(zone)}</h1>

          {/* Zone Tagline */}
          <p className="zone-tagline">
            {zoneTaglines[zone] || 'Discover the Nightlife'}
          </p>

          {/* Stats Cards */}
          <div className="zone-stats">
            <div className="stat-card">
              <Building2 className="stat-icon" />
              <span className="stat-value">{totalCount}</span>
              <span className="stat-label">Venues</span>
            </div>
            <div className="stat-card stat-card-cyan">
              <Users className="stat-icon" />
              <span className="stat-value">{totalEmployees}</span>
              <span className="stat-label">Staff</span>
            </div>
            <div className="stat-card stat-card-gold">
              <Star className="stat-icon" />
              <span className="stat-value">4.5</span>
              <span className="stat-label">Rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-section">
          <Filter size={16} className="filter-icon" />
          <div className="category-filters">
            <button
              className={`filter-chip ${!categoryFilter ? 'active' : ''}`}
              onClick={() => setCategoryFilter(null)}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`filter-chip ${categoryFilter === cat.id ? 'active' : ''}`}
                onClick={() => setCategoryFilter(categoryFilter === cat.id ? null : cat.id)}
              >
                <span className="chip-icon">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="sort-section">
          <ArrowUpDown size={16} className="sort-icon" />
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="name">A-Z</option>
            <option value="employees">Most Staff</option>
            <option value="recent">Recently Added</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <main className="establishments-content">
        {/* Loading State - Skeleton Cards */}
        {isLoading && (
          <div className="establishments-grid-animated">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="skeleton-card"
                style={{ '--delay': `${i * 0.05}s` } as React.CSSProperties}
              >
                <div className="skeleton-image shimmer" />
                <div className="skeleton-info">
                  <div className="skeleton-title shimmer" />
                  <div className="skeleton-meta shimmer" />
                </div>
                <div className="skeleton-footer shimmer" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-state-premium">
            <div className="error-icon-container">
              <AlertCircle size={48} />
            </div>
            <p>{t('common.errorLoading', 'Error loading data')}</p>
            <button onClick={() => window.location.reload()} className="btn-retry">
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredEstablishments.length === 0 && (
          <div className="empty-state-premium">
            <div className="empty-icon-container">
              <Building2 size={64} />
            </div>
            <h3>
              {categoryFilter
                ? `No ${categories.find((c) => c.id === categoryFilter)?.name || ''} venues found`
                : t('establishments.noVenuesFound', 'No venues found')}
            </h3>
            <p>
              {categoryFilter
                ? 'Try selecting a different category'
                : t('establishments.noVenuesInZone', 'There are no establishments in this zone yet.')}
            </p>
            {categoryFilter && (
              <button onClick={() => setCategoryFilter(null)} className="btn-clear-filter">
                Clear Filter
              </button>
            )}
          </div>
        )}

        {/* Establishments Grid with Staggered Animation */}
        {!isLoading && !error && filteredEstablishments.length > 0 && (
          <>
            <div className="results-count">
              Showing {filteredEstablishments.length} of {totalCount} venues
            </div>
            <div className="establishments-grid-animated">
              {filteredEstablishments.map((establishment, index) => (
                <div
                  key={establishment.id}
                  className="card-wrapper"
                  style={{ '--delay': `${index * 0.05}s` } as React.CSSProperties}
                >
                  <EstablishmentCard
                    establishment={establishment}
                    onClick={handleEstablishmentClick}
                    showEmployeeCount={true}
                    showOpenStatus={true}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default EstablishmentsPage;
