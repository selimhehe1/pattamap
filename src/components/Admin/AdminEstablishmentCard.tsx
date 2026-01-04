/**
 * Admin establishment card component for EstablishmentsAdmin grid view
 * Premium full-bleed design with 3D tilt, neon border, and floating actions
 *
 * Uses CSS classes from:
 * - src/styles/admin/admin-employee-card.css (.aec-* classes)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { use3DTilt } from '../../hooks/use3DTilt';
import Tooltip from '../Common/Tooltip';
import {
  MapPin,
  User,
  Calendar,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Check,
  Building2
} from 'lucide-react';
import LazyImage from '../Common/LazyImage';

interface AdminEstablishment {
  id: string;
  name: string;
  address: string;
  zone: string;
  category_id: string;
  phone?: string;
  website?: string;
  logo_url?: string;
  services?: string[];
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    pseudonym: string;
  };
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    created_at: string;
  };
}

interface AdminEstablishmentCardProps {
  establishment: AdminEstablishment;
  isProcessing: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  onEdit: (establishment: AdminEstablishment) => void;
  onApprove: (establishmentId: string) => void;
  onReject: (establishmentId: string) => void;
  onDelete: (establishmentId: string, establishmentName: string) => void;
}

const getStatusIcon = (status: string): React.ReactNode => {
  switch (status) {
    case 'pending': return <Clock size={12} />;
    case 'approved': return <CheckCircle size={12} />;
    case 'rejected': return <XCircle size={12} />;
    default: return <Clock size={12} />;
  }
};

const getStatusModifier = (status: string): string => {
  switch (status) {
    case 'pending': return 'aec-status-badge--pending';
    case 'approved': return 'aec-status-badge--approved';
    case 'rejected': return 'aec-status-badge--rejected';
    default: return '';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

export const AdminEstablishmentCard: React.FC<AdminEstablishmentCardProps> = ({
  establishment,
  isProcessing,
  isSelected = false,
  onToggleSelection,
  onEdit,
  onApprove,
  onReject,
  onDelete,
}) => {
  const { t } = useTranslation();

  // 3D Tilt effect hook
  const tiltRef = use3DTilt<HTMLDivElement>({
    maxTilt: 10,
    scale: 1.02,
    glowColor: 'rgba(232, 121, 249, 0.4)',
  });

  const handleCardClick = () => {
    onEdit(establishment);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection?.(establishment.id);
  };

  const isPending = establishment.status === 'pending';

  return (
    <div
      ref={tiltRef}
      className={`aec-card--fullbleed ${isPending ? 'aec-card--pending' : ''}`}
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
          <div className="aec-image-placeholder">
            <Building2 size={64} />
          </div>
        )}
      </div>

      {/* 2. Gradient overlay */}
      <div className="aec-overlay" />

      {/* 3. Status badge */}
      <div className={`aec-status-badge aec-status-badge--animated ${getStatusModifier(establishment.status)}`}>
        {getStatusIcon(establishment.status)}{' '}
        {establishment.status === 'approved'
          ? 'OK'
          : establishment.status === 'pending'
          ? 'NEW'
          : 'NO'}
      </div>

      {/* 4. Selection checkbox */}
      {onToggleSelection && (
        <div
          onClick={handleCheckboxClick}
          className={`aec-checkbox ${isSelected ? 'aec-checkbox--selected' : ''}`}
          role="checkbox"
          aria-checked={isSelected}
          aria-label={t('admin.selectEstablishment', 'Select establishment')}
        >
          {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
        </div>
      )}

      {/* 5. Floating action icons */}
      <div className="aec-floating-actions">
        <Tooltip content={t('admin.viewEditTooltip', 'Voir / Modifier')} position="bottom">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(establishment);
            }}
            className="aec-action-icon"
            aria-label={t('admin.viewEdit', 'View/Edit')}
          >
            <Eye size={16} />
          </button>
        </Tooltip>
        <Tooltip content={t('admin.deleteEstablishment', 'Supprimer cet établissement')} position="bottom">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(establishment.id, establishment.name);
            }}
            disabled={isProcessing}
            className="aec-action-icon aec-action-icon--danger"
            aria-label={t('admin.delete', 'Delete')}
          >
            {isProcessing ? <Loader2 size={16} className="aec-icon--spin" /> : <Trash2 size={16} />}
          </button>
        </Tooltip>
      </div>

      {/* 6. Info overlay */}
      <div className="aec-info-overlay">
        <h3 className="aec-title">{establishment.name}</h3>
        <div className="aec-meta">
          <span>
            <MapPin />
            {establishment.zone}
          </span>
          <span>
            {establishment.category?.icon} {establishment.category?.name || t('admin.unknown')}
          </span>
        </div>
        <div className="aec-info-submitter">
          <User />
          {establishment.user?.pseudonym || t('admin.unknown')}
          <span style={{ margin: '0 4px' }}>•</span>
          <Calendar />
          {formatDate(establishment.created_at)}
        </div>
      </div>

      {/* 7. Footer actions (pending only) */}
      {isPending && (
        <div className="aec-footer">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove(establishment.id);
            }}
            disabled={isProcessing}
            className="aec-footer-btn aec-footer-btn--approve"
          >
            {isProcessing ? (
              <Loader2 size={14} className="aec-icon--spin" />
            ) : (
              <>
                <CheckCircle />
                {t('admin.approve')}
              </>
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReject(establishment.id);
            }}
            disabled={isProcessing}
            className="aec-footer-btn aec-footer-btn--reject"
          >
            {isProcessing ? (
              <Loader2 size={14} className="aec-icon--spin" />
            ) : (
              <>
                <XCircle />
                {t('admin.reject')}
              </>
            )}
          </button>
        </div>
      )}

      {/* 8. Neon border */}
      <div className="aec-neon-border" />
    </div>
  );
};

export default AdminEstablishmentCard;
