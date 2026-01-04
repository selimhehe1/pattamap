/**
 * Employee card component for EmployeesAdmin grid view
 * Premium full-bleed design with 3D tilt, neon border, and floating actions
 *
 * Uses CSS classes from:
 * - src/styles/admin/admin-employee-card.css (.aec-* classes)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { use3DTilt } from '../../../hooks/use3DTilt';
import Tooltip from '../../Common/Tooltip';
import {
  User,
  Calendar,
  MapPin,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Check,
  BadgeCheck
} from 'lucide-react';
import LazyImage from '../../Common/LazyImage';
import type { AdminEmployee } from './types';

interface EmployeeCardProps {
  employee: AdminEmployee;
  isProcessing: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  onViewProfile: (employee: AdminEmployee) => void;
  onEdit: (employee: AdminEmployee) => void;
  onApprove: (employeeId: string) => void;
  onReject: (employeeId: string) => void;
  onVerify: (employeeId: string, employeeName: string) => void;
  onRevokeVerification: (employeeId: string, employeeName: string) => void;
  onDelete: (employeeId: string, employeeName: string) => void;
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

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  isProcessing,
  isSelected = false,
  onToggleSelection,
  onViewProfile,
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
    onViewProfile(employee);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection?.(employee.id);
  };

  const isPending = employee.status === 'pending';

  // Get current job for display
  const currentJob = employee.employment_history?.find((job) => job.is_current);

  // Display name: prefer nickname, fallback to name
  const displayName = employee.nickname || employee.name;

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
        {employee.photos && employee.photos.length > 0 ? (
          <LazyImage
            src={employee.photos[0]}
            alt={displayName}
            className="aec-image-inner"
            objectFit="cover"
          />
        ) : (
          <div className="aec-image-placeholder">
            <User size={64} />
          </div>
        )}
      </div>

      {/* 2. Gradient overlay */}
      <div className="aec-overlay" />

      {/* 3. Status badge */}
      <div className={`aec-status-badge aec-status-badge--animated ${getStatusModifier(employee.status)}`}>
        {getStatusIcon(employee.status)}{' '}
        {employee.status === 'approved'
          ? 'OK'
          : employee.status === 'pending'
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
          aria-label={t('admin.selectEmployee', 'Select employee')}
        >
          {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
        </div>
      )}

      {/* 5. Floating action icons */}
      <div className="aec-floating-actions">
        <Tooltip content={t('admin.viewProfileTooltip', 'Voir le profil complet')} position="bottom">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(employee);
            }}
            className="aec-action-icon"
            aria-label={t('admin.viewProfile', 'View Profile')}
          >
            <Eye size={16} />
          </button>
        </Tooltip>
        <Tooltip content={t('admin.deleteEmployee', 'Supprimer cet employé')} position="bottom">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(employee.id, employee.name);
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
        <h3 className="aec-title">
          {displayName}
          {employee.is_verified && (
            <BadgeCheck size={18} className="aec-verified-icon" />
          )}
        </h3>
        <div className="aec-meta">
          <span>
            {employee.sex ? t(`employee.sex.${employee.sex}`, employee.sex) : ''}
          </span>
          <span>
            🌍 {employee.nationality}
          </span>
          <span>
            {employee.age} {t('admin.years')}
          </span>
        </div>
        <div className="aec-info-submitter">
          {currentJob ? (
            <>
              <MapPin size={12} />
              {currentJob.establishment_name}
            </>
          ) : (
            <>
              <User size={12} />
              {employee.user?.pseudonym || t('admin.unknown')}
              <span style={{ margin: '0 4px' }}>•</span>
              <Calendar size={12} />
              {formatDate(employee.created_at)}
            </>
          )}
        </div>
      </div>

      {/* 7. Footer actions (pending only) */}
      {isPending && (
        <div className="aec-footer">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove(employee.id);
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
              onReject(employee.id);
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

export default EmployeeCard;
