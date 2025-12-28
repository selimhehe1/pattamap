/**
 * EstablishmentsPage - Displays establishments filtered by zone
 *
 * Accessible via /establishments?zone=<zone_id>
 * Shows all bars/venues in a specific zone with links to their detail pages
 */

import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, MapPin, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useEstablishmentsByZone } from '../hooks/useEstablishments';
import { getZoneLabel } from '../utils/constants';
import { generateEstablishmentUrl } from '../utils/slugify';
import { Establishment } from '../types';
import LazyImage from '../components/Common/LazyImage';
import '../styles/pages/establishments-page.css';

const EstablishmentsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const zone = searchParams.get('zone');

  const { data: establishments, isLoading, error, totalCount } = useEstablishmentsByZone(zone);

  // Navigate to establishment detail page
  const handleEstablishmentClick = (establishment: Establishment) => {
    const url = generateEstablishmentUrl(establishment.id, establishment.name, establishment.zone || zone || 'other');
    navigate(url);
  };

  // Go back to home
  const handleBack = () => {
    navigate('/');
  };

  if (!zone) {
    return (
      <div className="establishments-page">
        <div className="establishments-error">
          <AlertCircle size={48} />
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

  return (
    <div className="establishments-page">
      {/* Header */}
      <header className="establishments-header">
        <div className="header-content">
          <h1 className="page-title">
            <MapPin size={24} />
            {getZoneLabel(zone)}
          </h1>
          <p className="page-subtitle">
            {t('establishments.venuesInZone', { count: totalCount, zone: getZoneLabel(zone) })}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="establishments-content">
        {isLoading && (
          <div className="loading-state">
            <Loader2 size={40} className="spin" />
            <p>{t('common.loading', 'Loading...')}</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <AlertCircle size={40} />
            <p>{t('common.errorLoading', 'Error loading data')}</p>
          </div>
        )}

        {!isLoading && !error && establishments.length === 0 && (
          <div className="empty-state">
            <Building2 size={48} />
            <h3>{t('establishments.noVenuesFound', 'No venues found')}</h3>
            <p>{t('establishments.noVenuesInZone', 'There are no establishments in this zone yet.')}</p>
          </div>
        )}

        {!isLoading && !error && establishments.length > 0 && (
          <div className="establishments-grid">
            {establishments.map((establishment) => (
              <button
                key={establishment.id}
                className="establishment-card"
                onClick={() => handleEstablishmentClick(establishment)}
              >
                <div className="card-logo">
                  {establishment.logo_url ? (
                    <LazyImage
                      src={establishment.logo_url}
                      alt={establishment.name}
                      className="logo-image"
                      objectFit="contain"
                    />
                  ) : (
                    <div className="logo-placeholder">
                      <Building2 size={32} />
                    </div>
                  )}
                </div>
                <div className="card-info">
                  <h3 className="card-name">{establishment.name}</h3>
                  {establishment.category && (
                    <span className="card-category">
                      {establishment.category.icon} {establishment.category.name}
                    </span>
                  )}
                  {establishment.address && (
                    <span className="card-address">
                      <MapPin size={12} />
                      {establishment.address}
                    </span>
                  )}
                </div>
                <div className="card-arrow">
                  <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default EstablishmentsPage;
