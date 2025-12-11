/**
 * Employee detail modal component for EmployeesAdmin
 * Shows full employee details with photos and action buttons
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import LazyImage from '../../Common/LazyImage';
import SanitizedText from '../../Common/SanitizedText';
import type { AdminEmployee } from './types';

interface EmployeeDetailModalProps {
  employee: AdminEmployee;
  onClose: () => void;
  onApprove: (employeeId: string) => void;
  onReject: (employeeId: string) => void;
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

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  employee,
  onClose,
  onApprove,
  onReject,
}) => {
  const { t } = useTranslation();

  const currentJob = employee.employment_history?.find((job) => job.is_current);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.9)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(10px)',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(26,0,51,0.95), rgba(13,0,25,0.95))',
          borderRadius: '25px',
          border: '2px solid #C19A6B',
          boxShadow: '0 20px 60px rgba(193, 154, 107, 0.3)',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(193, 154, 107, 0.2)',
            border: '2px solid #C19A6B',
            color: '#C19A6B',
            fontSize: '20px',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'all 0.3s ease',
          }}
        >
          ×
        </button>

        <div style={{ padding: '30px' }}>
          {/* Header */}
          <h2
            style={{
              color: '#C19A6B',
              fontSize: '28px',
              fontWeight: 'bold',
              margin: '0 0 20px 0',
            }}
          >
            {employee.name}
            {employee.nickname && (
              <span style={{ color: '#FFD700', fontSize: '20px', marginLeft: '10px' }}>
                "{employee.nickname}"
              </span>
            )}
          </h2>

          {/* Content Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '300px 1fr',
              gap: '30px',
            }}
          >
            {/* Photos */}
            <div>
              {employee.photos.map((photo, index) => (
                <LazyImage
                  key={index}
                  src={photo}
                  alt={`${employee.name}, ${employee.age} years old from ${employee.nationality} - ${index + 1}`}
                  cloudinaryPreset="employeePhoto"
                  style={{
                    width: '100%',
                    marginBottom: '10px',
                    borderRadius: '10px',
                  }}
                  objectFit="cover"
                />
              ))}
            </div>

            {/* Details */}
            <div style={{ color: 'white' }}>
              {/* Age */}
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#C19A6B' }}>Age:</strong> {employee.age}
              </div>

              {/* Nationality */}
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#C19A6B' }}>Nationality:</strong>{' '}
                {employee.nationality}
              </div>

              {/* Current Employment */}
              {currentJob && (
                <div style={{ marginBottom: '20px' }}>
                  <strong style={{ color: '#C19A6B' }}>{t('admin.currentEmployment')}</strong>
                  <div
                    style={{
                      marginTop: '10px',
                      background: 'rgba(0, 255, 127, 0.1)',
                      border: '2px solid rgba(0, 255, 127, 0.3)',
                      borderRadius: '12px',
                      padding: '15px',
                    }}
                  >
                    <div
                      style={{
                        color: '#00FF7F',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        marginBottom: '8px',
                      }}
                    >
                      🏢 {currentJob.establishment_name}
                    </div>
                    {currentJob.position && (
                      <div style={{ color: '#FFD700', marginBottom: '5px' }}>
                        💼 Position: {currentJob.position}
                      </div>
                    )}
                    <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                      📅 {t('admin.started')}{' '}
                      {new Date(currentJob.start_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                    {currentJob.notes && (
                      <div
                        style={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '13px',
                          marginTop: '8px',
                          fontStyle: 'italic',
                        }}
                      >
                        📝 {t('admin.notes')} {currentJob.notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {employee.description && (
                <div style={{ marginBottom: '20px' }}>
                  <strong style={{ color: '#C19A6B' }}>Description:</strong>
                  <SanitizedText
                    html={employee.description}
                    tag="p"
                    className="employee-description"
                  />
                </div>
              )}

              {/* Social Media */}
              {employee.social_media && (
                <div style={{ marginBottom: '20px' }}>
                  <strong style={{ color: '#C19A6B' }}>Social Media:</strong>
                  <div style={{ marginTop: '10px' }}>
                    {Object.entries(employee.social_media).map(([platform, username]) => {
                      if (!username) return null;
                      return (
                        <div key={platform} style={{ marginBottom: '5px' }}>
                          {getSocialMediaIcon(platform)} {platform}: {username}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons for Pending */}
              {employee.status === 'pending' && (
                <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                  <button
                    onClick={() => {
                      onApprove(employee.id);
                      onClose();
                    }}
                    style={{
                      flex: 1,
                      padding: '15px',
                      background: 'linear-gradient(45deg, #00FF7F, #00CC65)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    ✅ {t('admin.approve')}
                  </button>
                  <button
                    onClick={() => {
                      onReject(employee.id);
                      onClose();
                    }}
                    style={{
                      flex: 1,
                      padding: '15px',
                      background: 'linear-gradient(45deg, #FF4757, #FF3742)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    ❌ {t('admin.reject')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailModal;
