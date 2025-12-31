/**
 * Establishment Owner card component for EstablishmentOwnersAdmin grid view
 * Premium full-bleed design with 3D tilt, neon border, and floating actions
 *
 * Uses CSS classes from:
 * - src/styles/admin/admin-employee-card.css (.aec-* classes)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { use3DTilt } from '../../hooks/use3DTilt';
import {
  Building2,
  MapPin,
  Eye,
  Users
} from 'lucide-react';
import LazyImage from '../Common/LazyImage';

interface EstablishmentOwnerCardProps {
  establishment: {
    id: string;
    name: string;
    address: string;
    zone?: string;
    logo_url?: string;
    ownersCount?: number;
  };
  onClick: () => void;
}

export const EstablishmentOwnerCard: React.FC<EstablishmentOwnerCardProps> = ({
  establishment,
  onClick,
}) => {
  const { t } = useTranslation();

  // 3D Tilt effect hook
  const tiltRef = use3DTilt<HTMLDivElement>({
    maxTilt: 10,
    scale: 1.02,
    glowColor: 'rgba(193, 154, 107, 0.4)',
  });

  const handleCardClick = () => {
    onClick();
  };

  const ownersCount = establishment.ownersCount || 0;
  const hasOwners = ownersCount > 0;

  return (
    <div
      ref={tiltRef}
      className="aec-card--fullbleed"
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); }}
    >
      {/* 1. Full-bleed image */}
      <div className="aec-image">
        {establishment.logo_url ? (
          <LazyImage
            src={establishment.logo_url}
            alt={establishment.name}
            className="aec-image-inner"
            objectFit="cover"
          />
        ) : (
          <div className="aec-image-placeholder aec-image-placeholder--gold">
            <Building2 size={64} />
          </div>
        )}
      </div>

      {/* 2. Gradient overlay */}
      <div className="aec-overlay" />

      {/* 3. Owners count badge - positioned left */}
      <div className={`aec-status-badge aec-status-badge--left ${hasOwners ? 'aec-status-badge--approved' : 'aec-status-badge--rejected'}`}>
        <Users size={12} />
        {ownersCount} {ownersCount === 1 ? 'Owner' : 'Owners'}
      </div>

      {/* 4. Floating action icons */}
      <div className="aec-floating-actions">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="aec-action-icon"
          aria-label={t('admin.manageOwners', 'Manage Owners')}
        >
          <Eye size={16} />
        </button>
      </div>

      {/* 5. Info overlay */}
      <div className="aec-info-overlay">
        <h3 className="aec-title">{establishment.name}</h3>
        <div className="aec-meta">
          {establishment.zone && (
            <span>
              <MapPin size={12} />
              {establishment.zone}
            </span>
          )}
        </div>
        <div className="aec-info-submitter">
          {establishment.address}
        </div>
      </div>

      {/* 6. Neon border */}
      <div className="aec-neon-border" />
    </div>
  );
};

export default EstablishmentOwnerCard;
