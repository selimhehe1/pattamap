/**
 * Employee card component for EmployeesAdmin grid view
 * Displays employee info, photos, employment history, and action buttons
 *
 * Uses CSS classes from:
 * - src/styles/admin/admin-employee-card.css (.aec-* classes)
 * - src/styles/components/buttons.css (.btn--* variants)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Instagram, MessageSquare, Send, Smartphone, Users, Link, Calendar, User, MapPin, Briefcase, AlertTriangle, ClipboardList, Eye, Pencil, Loader2, CheckCircle, XCircle, ShieldCheck, ShieldX, HelpCircle, Trash2 } from 'lucide-react';
import LazyImage from '../../Common/LazyImage';
import { getStatusColor, formatDate, getSocialMediaUrl } from './utils';
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

const getSocialMediaIcon = (platform: string): React.ReactNode => {
  switch (platform) {
    case 'instagram': return <Instagram size={14} className="aec-icon" />;
    case 'line': return <MessageSquare size={14} className="aec-icon" />;
    case 'telegram': return <Send size={14} className="aec-icon" />;
    case 'whatsapp': return <Smartphone size={14} className="aec-icon" />;
    case 'facebook': return <Users size={14} className="aec-icon" />;
    default: return <Link size={14} className="aec-icon" />;
  }
};

const getStatusIcon = (status: string): React.ReactNode => {
  switch (status) {
    case 'pending': return <Loader2 size={12} className="aec-icon" />;
    case 'approved': return <CheckCircle size={12} className="aec-icon" />;
    case 'rejected': return <XCircle size={12} className="aec-icon" />;
    default: return <HelpCircle size={12} className="aec-icon" />;
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

const getPhotoContainerModifier = (status: string): string => {
  switch (status) {
    case 'pending': return 'aec-photo-container--pending';
    case 'approved': return 'aec-photo-container--approved';
    case 'rejected': return 'aec-photo-container--rejected';
    default: return '';
  }
};

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  isProcessing,
  isSelected = false,
  onToggleSelection,
  onViewProfile,
  onEdit,
  onApprove,
  onReject,
  onVerify,
  onRevokeVerification,
  onDelete,
}) => {
  const { t } = useTranslation();

  const handleCardClick = () => {
    onViewProfile(employee);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection?.(employee.id);
  };

  // Get employment history info
  const currentJob = employee.employment_history?.find((job) => job.is_current);
  const pastJobs = employee.employment_history
    ?.filter((job) => !job.is_current)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
    .slice(0, 3);

  return (
    <div
      className="employee-card-nightlife aec-card"
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); }}
    >
      {/* Selection Checkbox */}
      {onToggleSelection && (
        <div
          onClick={handleCheckboxClick}
          className={`aec-checkbox ${isSelected ? 'aec-checkbox--selected' : ''}`}
          role="checkbox"
          aria-checked={isSelected}
          aria-label={t('admin.selectEmployee', 'Select employee')}
        >
          {isSelected && <span className="aec-checkbox__checkmark">✓</span>}
        </div>
      )}

      {/* Status Badge */}
      <div className={`aec-status-badge ${getStatusModifier(employee.status)}`}>
        {getStatusIcon(employee.status)}{' '}
        {employee.status === 'approved'
          ? 'OK'
          : employee.status === 'pending'
          ? 'NEW'
          : employee.status === 'rejected'
          ? 'NO'
          : 'UNKNOWN'}
      </div>

      {/* Content Area */}
      <div className="aec-content">
        {/* Main Employee Info */}
        <div className="aec-main-info">
          {/* Circular Photo */}
          <div className={`aec-photo-container ${getPhotoContainerModifier(employee.status)}`}>
            {employee.photos && employee.photos.length > 0 ? (
              <LazyImage
                src={employee.photos[0]}
                alt={`${employee.name}, ${employee.age} years old from ${employee.nationality}`}
                cloudinaryPreset="thumbnail"
                className="aec-photo"
                objectFit="cover"
              />
            ) : (
              <div className="aec-photo-placeholder">
                {employee.name.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Photo Count Badge */}
            {employee.photos && employee.photos.length > 1 && (
              <div className="aec-photo-count">
                📷 {employee.photos.length}
              </div>
            )}
          </div>

          {/* Employee Details */}
          <div className="aec-details">
            {/* Name with Verified Badge */}
            <h3 className="aec-name">
              <span>{employee.name}</span>
              {employee.is_verified && (
                <span
                  className="aec-verified-badge"
                  title={`Verified ${
                    employee.verified_at
                      ? `on ${new Date(employee.verified_at).toLocaleDateString()}`
                      : ''
                  }`}
                >
                  ✓
                </span>
              )}
              {employee.nickname && (
                <span className="text-accent-nightlife nickname-text-nightlife">
                  "{employee.nickname}"
                </span>
              )}
            </h3>

            {/* Age and Nationality */}
            <div className="aec-age-nationality">
              {employee.age} {t('admin.years')} • {employee.nationality}
            </div>

            {/* Submission Info */}
            <div className="aec-submission-info">
              <span>
                <Calendar size={12} className="aec-icon" style={{ marginRight: '4px' }} />
                {formatDate(employee.created_at)}
              </span>
              <span className="aec-submitter">
                <User size={12} className="aec-icon" style={{ marginRight: '4px' }} />
                {employee.user?.pseudonym || t('admin.unknown')}
              </span>
            </div>
          </div>
        </div>

        {/* Employment History */}
        {employee.employment_history && employee.employment_history.length > 0 ? (
          <div className="aec-employment-section">
            {/* Current Employment */}
            {currentJob ? (
              <div
                className="status-card-nightlife status-employed-nightlife aec-current-job"
              >
                <div className="aec-current-job__label">
                  <MapPin size={12} className="aec-icon" style={{ marginRight: '4px' }} />
                  {t('admin.currentlyWorkingAt')}
                </div>
                <div className="aec-current-job__name">
                  {currentJob.establishment_name}
                </div>
                {currentJob.position && (
                  <div className="aec-current-job__position">
                    <Briefcase size={12} className="aec-icon" style={{ marginRight: '4px' }} />
                    {currentJob.position}
                  </div>
                )}
                <div className="aec-current-job__date">
                  Since{' '}
                  {new Date(currentJob.start_date).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>
            ) : (
              <div className="status-card-nightlife status-unemployed-nightlife aec-current-job">
                <AlertTriangle size={12} className="aec-icon" style={{ marginRight: '4px' }} />
                {t('admin.notCurrentlyEmployed')}
              </div>
            )}

            {/* Previous Employment History */}
            {pastJobs && pastJobs.length > 0 && (
              <div className="aec-past-jobs">
                <div className="aec-past-jobs__header">
                  <ClipboardList size={12} className="aec-icon" />
                  {t('admin.employmentHistory')} ({pastJobs.length}{' '}
                  {t('admin.previousJob', { count: pastJobs.length })}):
                </div>
                {pastJobs.map((job, index) => (
                  <div key={job.id || index} className="aec-past-job">
                    <span className="aec-past-job__name">
                      • {job.establishment_name}
                      {job.position && (
                        <span className="aec-past-job__position"> ({job.position})</span>
                      )}
                    </span>
                    <span className="aec-past-job__dates">
                      {new Date(job.start_date).getFullYear()}
                      {job.end_date && ` - ${new Date(job.end_date).getFullYear()}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="status-card-nightlife status-unemployed-nightlife aec-employment-section">
            <AlertTriangle size={12} className="aec-icon" style={{ marginRight: '4px' }} />
            {t('admin.noEmploymentHistory')}
          </div>
        )}

        {/* Social Media */}
        {employee.social_media &&
          Object.values(employee.social_media).some((username) => username) && (
            <div className="social-media-container-nightlife" style={{ marginBottom: 'var(--spacing-4)' }}>
              {Object.entries(employee.social_media).map(([platform, username]) => {
                if (!username) return null;
                return (
                  <a
                    key={platform}
                    href={getSocialMediaUrl(platform, username)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`social-icon-nightlife social-${platform}-nightlife`}
                    title={`@${username} on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {getSocialMediaIcon(platform)}
                  </a>
                );
              })}
            </div>
          )}

        {/* Description Preview */}
        {employee.description && (
          <div className="aec-description">
            💭 {employee.description}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="aec-actions">
        {/* View Profile + Edit */}
        <div className="aec-actions__row">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(employee);
            }}
            className="btn btn--primary btn--admin-sm aec-btn"
          >
            <Eye size={14} className="aec-icon" />
            {t('admin.viewProfile')}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(employee);
            }}
            className="btn btn--edit btn--admin-sm aec-btn"
          >
            <Pencil size={14} className="aec-icon" />
            {t('common.edit')}
          </button>
        </div>

        {/* Verify Profile Button - Only for non-verified approved employees */}
        {!employee.is_verified && employee.status === 'approved' && (
          <div className="aec-actions__row">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVerify(employee.id, employee.name);
              }}
              disabled={isProcessing}
              className={`btn btn--admin-sm aec-btn aec-btn--full ${isProcessing ? 'btn--processing' : 'btn--verify'}`}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={14} className="aec-icon aec-icon--spin" />
                  {t('admin.processing')}
                </>
              ) : (
                <>
                  <ShieldCheck size={14} className="aec-icon" />
                  {t('admin.verifyProfile', 'Verify Profile')}
                </>
              )}
            </button>
          </div>
        )}

        {/* Revoke Verification Button - Only for verified employees */}
        {employee.is_verified && (
          <div className="aec-actions__row">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRevokeVerification(employee.id, employee.name);
              }}
              disabled={isProcessing}
              className={`btn btn--admin-sm aec-btn aec-btn--full ${isProcessing ? 'btn--processing' : 'btn--revoke'}`}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={14} className="aec-icon aec-icon--spin" />
                  {t('admin.processing')}
                </>
              ) : (
                <>
                  <ShieldX size={14} className="aec-icon" />
                  {t('admin.revokeVerification', 'Revoke Verification')}
                </>
              )}
            </button>
          </div>
        )}

        {/* Approve/Reject - Only for pending */}
        {employee.status === 'pending' && (
          <div className="aec-actions__row">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove(employee.id);
              }}
              disabled={isProcessing}
              className={`btn btn--admin-sm aec-btn ${isProcessing ? 'btn--processing' : 'btn--success'}`}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={14} className="aec-icon aec-icon--spin" />
                  {t('admin.processing')}
                </>
              ) : (
                <>
                  <CheckCircle size={14} className="aec-icon" />
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
              className={`btn btn--admin-sm aec-btn ${isProcessing ? 'btn--processing' : 'btn--danger'}`}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={14} className="aec-icon aec-icon--spin" />
                  {t('admin.processing')}
                </>
              ) : (
                <>
                  <XCircle size={14} className="aec-icon" />
                  {t('admin.reject')}
                </>
              )}
            </button>
          </div>
        )}

        {/* Delete Button - Always visible for admins */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(employee.id, employee.name);
          }}
          disabled={isProcessing}
          className={`btn btn--admin-sm aec-btn aec-btn--full ${isProcessing ? 'btn--processing' : 'btn--delete'}`}
        >
          {isProcessing ? (
            <>
              <Loader2 size={14} className="aec-icon aec-icon--spin" />
              {t('admin.processing')}
            </>
          ) : (
            <>
              <Trash2 size={14} className="aec-icon" />
              {t('admin.deleteEmployee', 'Delete')}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default EmployeeCard;
