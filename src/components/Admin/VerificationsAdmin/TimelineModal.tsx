import React from 'react';
import { Bot, User } from 'lucide-react';
import LazyImage from '../../Common/LazyImage';
import { getStatusColor, getStatusIcon, formatDate, getSafeImageUrl } from './verificationUtils';
import type { TimelineModalProps } from './types';

/**
 * TimelineModal Component
 *
 * Displays the verification history timeline for an employee.
 * Shows all verification attempts with status, scores, and selfies.
 */
const TimelineModal: React.FC<TimelineModalProps> = ({ group, onClose }) => {
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
        overflowY: 'auto'
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(26,0,51,0.95), rgba(13,0,25,0.95))',
          borderRadius: '25px',
          border: '2px solid #00E5FF',
          boxShadow: '0 20px 60px rgba(0,229,255,0.3)',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
          padding: '30px'
        }}
        onClick={(e) => e.stopPropagation()}
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
            background: 'rgba(0,229,255,0.2)',
            border: '2px solid #00E5FF',
            color: '#00E5FF',
            fontSize: '20px',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          ×
        </button>

        <h2 style={{
          color: '#00E5FF',
          fontSize: '24px',
          fontWeight: 'bold',
          margin: '0 0 8px 0'
        }}>
          Verification Timeline
        </h2>
        <p style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '16px',
          marginBottom: '24px'
        }}>
          {group.employee.name} - {group.totalAttempts} attempt{group.totalAttempts !== 1 ? 's' : ''}
        </p>

        {/* Timeline */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {group.verifications.map((verification, index) => {
            const vStatusColor = getStatusColor(verification.status);
            const timelineSelfieUrl = getSafeImageUrl(verification.selfie_url);

            return (
              <div
                key={verification.id}
                style={{
                  background: `linear-gradient(135deg, ${vStatusColor}15, rgba(0,0,0,0.2))`,
                  border: `1px solid ${vStatusColor}40`,
                  borderRadius: '12px',
                  padding: '16px',
                  position: 'relative'
                }}
              >
                {/* Latest Badge */}
                {index === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'rgba(0,229,255,0.2)',
                    border: '1px solid rgba(0,229,255,0.4)',
                    color: '#00E5FF',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Latest
                  </div>
                )}

                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    background: `${vStatusColor}20`,
                    border: `1px solid ${vStatusColor}`,
                    color: vStatusColor,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {getStatusIcon(verification.status, verification.auto_approved)}{' '}
                    {verification.status.toUpperCase().replace('_', ' ')}
                  </div>
                  <span style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '11px'
                  }}>
                    {formatDate(verification.submitted_at)}
                  </span>
                </div>

                {/* Details */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '12px',
                  fontSize: '12px'
                }}>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Match Score: </span>
                    <span style={{ color: '#00E5FF', fontWeight: 'bold' }}>{verification.face_match_score}%</span>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Method: </span>
                    <span style={{
                      color: verification.auto_approved ? '#00FF88' : '#FFD700',
                      fontWeight: 'bold',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {verification.auto_approved
                        ? <><Bot size={12} /> Auto</>
                        : <><User size={12} /> Manual</>
                      }
                    </span>
                  </div>
                </div>

                {/* Admin Notes */}
                {verification.admin_notes && (
                  <div style={{
                    marginBottom: '12px',
                    padding: '8px',
                    background: 'rgba(255,71,87,0.1)',
                    border: '1px solid rgba(255,71,87,0.3)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#FF4757'
                  }}>
                    <strong>Admin Notes:</strong> {verification.admin_notes}
                  </div>
                )}

                {/* Selfie Thumbnail */}
                <div
                  style={{
                    width: '100%',
                    height: '120px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer'
                  }}
                  onClick={() => timelineSelfieUrl !== '/images/placeholder-employee.jpg' && window.open(verification.selfie_url, '_blank')}
                >
                  <LazyImage
                    src={timelineSelfieUrl}
                    alt="Verification selfie"
                    objectFit="cover"
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Close Button Bottom */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: '24px',
            padding: '12px 20px',
            background: 'transparent',
            border: '2px solid #00E5FF',
            color: '#00E5FF',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default TimelineModal;
