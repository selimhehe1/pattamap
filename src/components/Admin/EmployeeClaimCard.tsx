/**
 * Employee Claim card component for EmployeeClaimsAdmin grid view
 * Premium full-bleed design with 3D tilt, neon border, and floating actions
 *
 * Uses CSS classes from:
 * - src/styles/admin/admin-employee-card.css (.aec-* classes)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { use3DTilt } from '../../hooks/use3DTilt';
import AdminCardFooter from './AdminCardFooter';
import {
  User,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Check
} from 'lucide-react';
import LazyImage from '../Common/LazyImage';
import { EmployeeClaimRequest } from '../../types';

interface EmployeeClaimCardProps {
  claim: EmployeeClaimRequest;
  isProcessing: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  onViewDetails: (claim: EmployeeClaimRequest) => void;
  onApprove: (claimId: string) => void;
  onReject: (claimId: string) => void;
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

export const EmployeeClaimCard: React.FC<EmployeeClaimCardProps> = ({
  claim,
  isProcessing,
  isSelected = false,
  onToggleSelection,
  onViewDetails,
  onApprove,
  onReject,
}) => {
  const { t } = useTranslation();

  // 3D Tilt effect hook
  const tiltRef = use3DTilt<HTMLDivElement>({
    maxTilt: 10,
    scale: 1.02,
    glowColor: 'rgba(232, 121, 249, 0.4)',
  });

  const handleCardClick = () => {
    onViewDetails(claim);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection?.(claim.id);
  };

  const isPending = claim.status === 'pending';

  // Display name for employee
  const employeeName = claim.employee?.nickname || claim.employee?.name || t('admin.claims.unknownEmployee');
  const employeePhoto = claim.employee?.photos?.[0];

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
        {employeePhoto ? (
          <LazyImage
            src={employeePhoto}
            alt={employeeName}
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
      <div className={`aec-status-badge aec-status-badge--animated ${getStatusModifier(claim.status)}`}>
        {getStatusIcon(claim.status)}{' '}
        {claim.status === 'approved'
          ? 'OK'
          : claim.status === 'pending'
          ? 'NEW'
          : 'NO'}
      </div>

      {/* 4. Selection checkbox */}
      {onToggleSelection && isPending && (
        <div
          onClick={handleCheckboxClick}
          className={`aec-checkbox ${isSelected ? 'aec-checkbox--selected' : ''}`}
          role="checkbox"
          aria-checked={isSelected}
          aria-label={t('admin.selectClaim', 'Select claim')}
        >
          {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
        </div>
      )}

      {/* 5. Floating action icons */}
      <div className="aec-floating-actions">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(claim);
          }}
          className="aec-action-icon"
          aria-label={t('admin.viewDetails', 'View Details')}
        >
          <Eye size={16} />
        </button>
      </div>

      {/* 6. Info overlay */}
      <div className="aec-info-overlay">
        <h3 className="aec-title">{employeeName}</h3>
        <div className="aec-meta">
          {claim.employee?.name && claim.employee?.nickname && (
            <span>{claim.employee.name}</span>
          )}
        </div>
        <div className="aec-info-submitter">
          <User size={12} />
          {t('admin.claims.claimBy', 'Claimed by')}: {claim.submitted_by_user?.pseudonym || t('admin.unknown')}
        </div>
      </div>

      {/* 7. Footer actions (pending only) */}
      {isPending && (
        <AdminCardFooter
          itemId={claim.id}
          isProcessing={isProcessing}
          onApprove={onApprove}
          onReject={onReject}
        />
      )}

      {/* 8. Neon border */}
      <div className="aec-neon-border" />
    </div>
  );
};

export default EmployeeClaimCard;
