/**
 * Employee card component for EmployeesAdmin grid view
 * Displays employee info, photos, employment history, and action buttons
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import LazyImage from '../../Common/LazyImage';
import { getStatusColor, getStatusIcon, formatDate, getSocialMediaUrl } from './utils';
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
}

const getSocialMediaIcon = (platform: string): string => {
  const icons: Record<string, string> = {
    instagram: '📷',
    line: '💬',
    telegram: '✈️',
    whatsapp: '📱',
    facebook: '👥',
  };
  return icons[platform] || '🔗';
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
}) => {
  const { t } = useTranslation();
  const statusColor = getStatusColor(employee.status);

  const handleCardClick = () => {
    onViewProfile(employee);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection?.(employee.id);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(-3px)';
    e.currentTarget.style.boxShadow = '0 10px 25px rgba(193, 154, 107, 0.2)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  };

  // Get employment history info
  const currentJob = employee.employment_history?.find((job) => job.is_current);
  const pastJobs = employee.employment_history
    ?.filter((job) => !job.is_current)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
    .slice(0, 3);

  return (
    <div
      className="employee-card-nightlife"
      role="button"
      tabIndex={0}
      style={{
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Selection Checkbox */}
      {onToggleSelection && (
        <div
          onClick={handleCheckboxClick}
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            border: isSelected ? '2px solid #C19A6B' : '2px solid rgba(255,255,255,0.3)',
            background: isSelected ? '#C19A6B' : 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 15,
            transition: 'all 0.2s ease',
          }}
          role="checkbox"
          aria-checked={isSelected}
          aria-label={t('admin.selectEmployee', 'Select employee')}
        >
          {isSelected && (
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
          )}
        </div>
      )}

      {/* Status Badge */}
      <div
        style={{
          position: 'absolute',
          top: '15px',
          right: '15px',
          padding: '4px 8px',
          borderRadius: '12px',
          background: `${statusColor}20`,
          border: `1px solid ${statusColor}`,
          color: statusColor,
          fontSize: '10px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}
      >
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
      <div style={{ flex: 1, paddingTop: '10px' }}>
        {/* Main Employee Info */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          {/* Circular Photo */}
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: `3px solid ${statusColor}`,
              flexShrink: 0,
              position: 'relative',
            }}
          >
            {employee.photos && employee.photos.length > 0 ? (
              <LazyImage
                src={employee.photos[0]}
                alt={`${employee.name}, ${employee.age} years old from ${employee.nationality}`}
                cloudinaryPreset="thumbnail"
                style={{ width: '100%', height: '100%' }}
                objectFit="cover"
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(45deg, #C19A6B, #FFD700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  color: 'white',
                }}
              >
                {employee.name.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Photo Count Badge */}
            {employee.photos && employee.photos.length > 1 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  background: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                }}
              >
                📷 {employee.photos.length}
              </div>
            )}
          </div>

          {/* Employee Details */}
          <div style={{ flex: 1 }}>
            {/* Name with Verified Badge */}
            <h3
              style={{
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 'bold',
                margin: '0 0 5px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{employee.name}</span>
              {employee.is_verified && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                    borderRadius: '50%',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(0, 212, 255, 0.4)',
                    flexShrink: 0,
                  }}
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
            <div style={{ color: '#00E5FF', fontSize: '12px', marginBottom: '8px' }}>
              {employee.age} {t('admin.years')} • {employee.nationality}
            </div>

            {/* Submission Info */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#888888',
                marginBottom: '8px',
              }}
            >
              <span>📅 {formatDate(employee.created_at)}</span>
              <span style={{ color: '#FFD700' }}>
                👤 {employee.user?.pseudonym || t('admin.unknown')}
              </span>
            </div>
          </div>
        </div>

        {/* Employment History */}
        {employee.employment_history && employee.employment_history.length > 0 ? (
          <div style={{ marginBottom: '15px' }}>
            {/* Current Employment */}
            {currentJob ? (
              <div
                className="status-card-nightlife status-employed-nightlife"
                style={{ marginBottom: pastJobs && pastJobs.length > 0 ? '10px' : '0px' }}
              >
                <div
                  style={{
                    color: '#00E5FF',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '5px',
                  }}
                >
                  📍 {t('admin.currentlyWorkingAt')}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#00FF7F',
                    marginBottom: '2px',
                  }}
                >
                  {currentJob.establishment_name}
                </div>
                {currentJob.position && (
                  <div style={{ color: '#FFD700', fontSize: '12px', marginBottom: '2px' }}>
                    💼 {currentJob.position}
                  </div>
                )}
                <div style={{ color: '#cccccc', fontSize: '11px' }}>
                  Since{' '}
                  {new Date(currentJob.start_date).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>
            ) : (
              <div
                className="status-card-nightlife status-unemployed-nightlife"
                style={{ marginBottom: pastJobs && pastJobs.length > 0 ? '10px' : '0px' }}
              >
                ⚠️ {t('admin.notCurrentlyEmployed')}
              </div>
            )}

            {/* Previous Employment History */}
            {pastJobs && pastJobs.length > 0 && (
              <div
                style={{
                  background: 'rgba(255, 215, 0, 0.05)',
                  border: '1px solid rgba(255, 215, 0, 0.2)',
                  borderRadius: '8px',
                  padding: '6px',
                }}
              >
                <div
                  style={{
                    color: '#FFD700',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  📋 {t('admin.employmentHistory')} ({pastJobs.length}{' '}
                  {t('admin.previousJob', { count: pastJobs.length })}):
                </div>
                {pastJobs.map((job, index) => (
                  <div
                    key={job.id || index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11px',
                      color: '#cccccc',
                      marginBottom: index === pastJobs.length - 1 ? '0px' : '4px',
                      paddingLeft: '8px',
                    }}
                  >
                    <span style={{ color: '#FFD700', fontWeight: 'bold' }}>
                      • {job.establishment_name}
                      {job.position && (
                        <span style={{ color: '#cccccc', fontWeight: 'normal' }}>
                          {' '}
                          ({job.position})
                        </span>
                      )}
                    </span>
                    <span style={{ color: '#999999', fontSize: '10px' }}>
                      {new Date(job.start_date).getFullYear()}
                      {job.end_date && ` - ${new Date(job.end_date).getFullYear()}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className="status-card-nightlife status-unemployed-nightlife"
            style={{ marginBottom: '15px' }}
          >
            ⚠️ {t('admin.noEmploymentHistory')}
          </div>
        )}

        {/* Social Media */}
        {employee.social_media &&
          Object.values(employee.social_media).some((username) => username) && (
            <div className="social-media-container-nightlife" style={{ marginBottom: '15px' }}>
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
          <div
            style={{
              color: '#cccccc',
              fontSize: '13px',
              lineHeight: '1.5',
              marginBottom: '15px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            💭 {employee.description}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ marginTop: 'auto', padding: '15px 0 0 0' }}>
        {/* View Profile + Edit */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(employee);
            }}
            className="btn btn--primary"
            style={{
              flex: 1,
              fontSize: '12px',
              fontWeight: 'bold',
              padding: '10px 8px',
              borderRadius: '10px',
            }}
          >
            👁️ {t('admin.viewProfile')}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(employee);
            }}
            className="btn"
            style={{
              flex: 1,
              background: 'linear-gradient(45deg, #FFD700, #FFA500)',
              color: '#000',
              fontSize: '12px',
              fontWeight: 'bold',
              padding: '10px 8px',
              borderRadius: '10px',
            }}
          >
            ✏️ {t('common.edit')}
          </button>
        </div>

        {/* Verify Profile Button - Only for non-verified approved employees */}
        {!employee.is_verified && employee.status === 'approved' && (
          <div style={{ marginBottom: '8px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVerify(employee.id, employee.name);
              }}
              disabled={isProcessing}
              className="btn"
              style={{
                width: '100%',
                background: isProcessing
                  ? 'linear-gradient(45deg, #666666, #888888)'
                  : 'linear-gradient(45deg, #00D4FF, #0099CC)',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                padding: '10px 8px',
                borderRadius: '10px',
                opacity: isProcessing ? 0.7 : 1,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
              }}
            >
              {isProcessing
                ? `⏳ ${t('admin.processing')}`
                : `✓ ${t('admin.verifyProfile', 'Verify Profile')}`}
            </button>
          </div>
        )}

        {/* Revoke Verification Button - Only for verified employees */}
        {employee.is_verified && (
          <div style={{ marginBottom: '8px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRevokeVerification(employee.id, employee.name);
              }}
              disabled={isProcessing}
              className="btn"
              style={{
                width: '100%',
                background: isProcessing
                  ? 'linear-gradient(45deg, #666666, #888888)'
                  : 'linear-gradient(45deg, #FF6B00, #FF4500)',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                padding: '10px 8px',
                borderRadius: '10px',
                opacity: isProcessing ? 0.7 : 1,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
              }}
            >
              {isProcessing
                ? `⏳ ${t('admin.processing')}`
                : `⛔ ${t('admin.revokeVerification', 'Revoke Verification')}`}
            </button>
          </div>
        )}

        {/* Approve/Reject - Only for pending */}
        {employee.status === 'pending' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove(employee.id);
              }}
              disabled={isProcessing}
              className="btn"
              style={{
                flex: 1,
                background: isProcessing
                  ? 'linear-gradient(45deg, #666666, #888888)'
                  : 'linear-gradient(45deg, #00FF7F, #00CC65)',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                padding: '10px 8px',
                borderRadius: '10px',
                opacity: isProcessing ? 0.7 : 1,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
              }}
            >
              {isProcessing ? `⏳ ${t('admin.processing')}` : `✅ ${t('admin.approve')}`}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onReject(employee.id);
              }}
              disabled={isProcessing}
              className="btn"
              style={{
                flex: 1,
                background: isProcessing
                  ? 'linear-gradient(45deg, #666666, #888888)'
                  : 'linear-gradient(45deg, #FF4757, #FF3742)',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                padding: '10px 8px',
                borderRadius: '10px',
                opacity: isProcessing ? 0.7 : 1,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
              }}
            >
              {isProcessing ? `⏳ ${t('admin.processing')}` : `❌ ${t('admin.reject')}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeCard;
