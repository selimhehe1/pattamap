import React from 'react';
import { CheckCircle, XCircle, History, Eye, Loader2 } from 'lucide-react';
import LazyImage from '../../Common/LazyImage';
import { getStatusColor, getStatusIcon, formatDate, getSafeImageUrl } from './verificationUtils';
import type { VerificationCardProps } from './types';

/**
 * VerificationCard Component
 *
 * Displays a single verification group card with:
 * - Status badge
 * - Employee info
 * - Latest verification details
 * - Action buttons (approve/reject, revoke, timeline, profile)
 */
const VerificationCard: React.FC<VerificationCardProps> = ({
  group,
  isProcessing,
  onReview,
  onRevoke,
  onViewTimeline,
  onViewProfile
}) => {
  const latestVerification = group.verifications[0];
  const profilePhoto = getSafeImageUrl(group.employee.photos?.[0]);
  const selfieUrl = getSafeImageUrl(latestVerification.selfie_url);
  const statusColor = getStatusColor(latestVerification.status);

  return (
    <div
      className="employee-card-nightlife"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      {/* Status Badge - Absolute Position Top Right */}
      <div style={{
        position: 'absolute',
        top: '15px',
        right: '15px',
        padding: '4px 10px',
        borderRadius: '12px',
        background: `${statusColor}20`,
        border: `1px solid ${statusColor}`,
        color: statusColor,
        fontSize: '10px',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        {getStatusIcon(latestVerification.status, latestVerification.auto_approved)}{' '}
        {latestVerification.status.toUpperCase().replace('_', ' ')}
        {latestVerification.auto_approved && ' (AUTO)'}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, paddingTop: '10px' }}>
        {/* Employee Header */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '15px', alignItems: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: `3px solid ${statusColor}`,
            flexShrink: 0
          }}>
            <LazyImage
              src={profilePhoto}
              alt={group.employee.name}
              objectFit="cover"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 'bold',
              margin: '0 0 4px 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {group.employee.name}
            </h3>
            <div style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '12px'
            }}>
              {group.totalAttempts} attempt{group.totalAttempts !== 1 ? 's' : ''}
              {group.approvedCount > 0 && (
                <span style={{ color: '#00FF88', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  {' '}• {group.approvedCount} <CheckCircle size={12} />
                </span>
              )}
              {group.rejectedCount > 0 && (
                <span style={{ color: '#FF4757', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  {' '}• {group.rejectedCount} <XCircle size={12} />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Latest Verification Details */}
        <div style={{
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Latest Submission:</span>
            <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 'bold' }}>
              {formatDate(latestVerification.submitted_at)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Face Match Score:</span>
            <span style={{ color: '#00E5FF', fontSize: '12px', fontWeight: 'bold', fontFamily: '"Orbitron", monospace' }}>
              {latestVerification.face_match_score}%
            </span>
          </div>
          {latestVerification.admin_notes && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(255,71,87,0.1)',
              border: '1px solid rgba(255,71,87,0.3)',
              borderRadius: '6px',
              color: '#FF4757',
              fontSize: '11px',
              lineHeight: '1.4'
            }}>
              <strong>Admin Notes:</strong> {latestVerification.admin_notes}
            </div>
          )}
        </div>

        {/* Selfie Thumbnail */}
        <div
          style={{
            width: '100%',
            height: '140px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            marginBottom: '12px'
          }}
          onClick={() => selfieUrl !== '/images/placeholder-employee.jpg' && window.open(latestVerification.selfie_url, '_blank')}
        >
          <LazyImage
            src={selfieUrl}
            alt="Verification selfie"
            objectFit="cover"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>

      {/* Actions - Anchored at Bottom */}
      <div style={{
        marginTop: 'auto',
        padding: '12px 0 0 0',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* Manual Review Actions */}
        {latestVerification.status === 'manual_review' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onReview(latestVerification.id, 'approve')}
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '10px 8px',
                background: isProcessing
                  ? 'linear-gradient(45deg, #666666, #888888)'
                  : 'linear-gradient(45deg, #00FF7F, #00CC65)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                opacity: isProcessing ? 0.7 : 1
              }}
            >
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle size={14} /> Approve</>}
            </button>
            <button
              onClick={() => onReview(latestVerification.id, 'reject')}
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '10px 8px',
                background: isProcessing
                  ? 'linear-gradient(45deg, #666666, #888888)'
                  : 'linear-gradient(45deg, #FF4757, #FF3742)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                opacity: isProcessing ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <><XCircle size={14} /> Reject</>}
            </button>
          </div>
        )}

        {/* Revoke Action for Approved Verifications */}
        {latestVerification.status === 'approved' && (
          <button
            onClick={() => onRevoke(group.employee.id, group.employee.name)}
            disabled={isProcessing}
            style={{
              width: '100%',
              padding: '10px 8px',
              background: isProcessing
                ? 'linear-gradient(45deg, #666666, #888888)'
                : 'linear-gradient(45deg, rgba(255,71,87,0.2), rgba(255,107,107,0.2))',
              border: '1px solid rgba(255,71,87,0.4)',
              color: '#FF4757',
              borderRadius: '10px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              opacity: isProcessing ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <><XCircle size={14} /> Reject Verification</>}
          </button>
        )}

        {/* Timeline & Profile Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onViewTimeline(group)}
            style={{
              flex: 1,
              padding: '10px 8px',
              background: 'linear-gradient(45deg, #00E5FF, #0080FF)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <History size={14} /> Timeline ({group.totalAttempts})
          </button>
          <button
            onClick={() => onViewProfile(group)}
            style={{
              flex: 1,
              padding: '10px 8px',
              background: 'linear-gradient(45deg, rgba(193, 154, 107,0.2), rgba(255,107,141,0.2))',
              border: '1px solid rgba(193, 154, 107,0.4)',
              color: '#C19A6B',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <Eye size={14} /> Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationCard;
