/**
 * BarDetailHeader
 * Header section with logo, title, description and status
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { Establishment } from '../../../types';
import LazyImage from '../../Common/LazyImage';

interface BarDetailHeaderProps {
  bar: Establishment;
  isAdmin: boolean;
  hasUser: boolean;
  onEditClick: () => void;
}

export const BarDetailHeader: React.FC<BarDetailHeaderProps> = ({
  bar,
  isAdmin,
  hasUser,
  onEditClick,
}) => {
  const { t } = useTranslation();

  return (
    <div className="establishment-header-nightlife">
      {/* Edit Button - Floating */}
      {hasUser && (
        <button
          onClick={onEditClick}
          className="establishment-edit-icon-floating-nightlife"
          aria-label={
            isAdmin
              ? t('barDetailPage.ariaEditBar', { name: bar.name })
              : t('barDetailPage.ariaSuggestEdit', { name: bar.name })
          }
          title={isAdmin ? t('barDetailPage.titleEdit') : t('barDetailPage.titleSuggestEdit')}
        >
          <Pencil size={16} />
        </button>
      )}

      <div className="establishment-header-content-nightlife">
        {/* Logo Hero - Left */}
        {bar.logo_url && (
          <div className="establishment-logo-hero-nightlife">
            <LazyImage
              src={bar.logo_url}
              alt={`${bar.name} logo`}
              cloudinaryPreset="establishmentLogo"
              className="establishment-logo-header-image-nightlife"
              objectFit="contain"
            />
          </div>
        )}

        {/* Text content - Center */}
        <div className="establishment-text-content-nightlife">
          <h1 className="establishment-name-nightlife">{bar.name}</h1>
          <p className="establishment-meta-nightlife">
            {bar.description || t('barDetailPage.defaultDescription')}
          </p>

          {/* Status and Hours */}
          <div className="sidebar-status-container-nightlife">
            <span className="sidebar-status-indicator-nightlife" />
            <span className="sidebar-status-text-nightlife">
              {t('barDetailPage.statusOpenNow')} • {bar.opening_hours?.open || '14:00'} -{' '}
              {bar.opening_hours?.close || '02:00'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
