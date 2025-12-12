import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { logger } from '../../utils/logger';
import toast from '../../utils/toast';

interface VerificationStatus {
  id: string;
  status: 'approved' | 'rejected' | 'revoked' | 'pending' | 'manual_review';
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  submitted_at: string;
  face_match_score?: number;
  auto_approved?: boolean;
}

interface EmployeeVerificationStatusCardProps {
  employeeId: string;
  employeeName: string;
  isVerified: boolean;
}

const EmployeeVerificationStatusCard: React.FC<EmployeeVerificationStatusCardProps> = ({
  employeeId,
  employeeName: _employeeName,
  isVerified
}) => {
  const { t: _t } = useTranslation();
  const { secureFetch } = useSecureFetch();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, _setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchVerificationStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const fetchVerificationStatus = async () => {
    setIsLoading(true);
    try {
      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/employees/${employeeId}/verification-status`
      );

      if (response.ok) {
        const data = await response.json();
        setVerificationStatus(data.latest_verification);
      } else {
        logger.error('Failed to fetch verification status');
      }
    } catch (error) {
      logger.error('Error fetching verification status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryVerification = () => {
    // Future: Open verification modal from EmployeeDashboard
    // Requires props callback or context to communicate with parent
    toast.info('Retry verification feature coming soon!');
  };

  if (isLoading) {
    return (
      <div style={{
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '12px',
        marginBottom: '16px',
        textAlign: 'center',
        color: '#888'
      }}>
        Loading verification status...
      </div>
    );
  }

  // If verified, show success message
  if (isVerified && verificationStatus?.status === 'approved') {
    return (
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))',
        border: '2px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#22c55e',
          fontWeight: '600',
          fontSize: '16px',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '24px' }}>✅</span>
          <span>Your profile is verified!</span>
        </div>
        <p style={{
          color: '#a0aec0',
          fontSize: '14px',
          margin: 0,
          lineHeight: '1.5'
        }}>
          Your profile has a verified badge, showing visitors that you are a real person.
        </p>
      </div>
    );
  }

  // If rejected or revoked, show error message with reason
  if (verificationStatus?.status === 'rejected' || verificationStatus?.status === 'revoked') {
    const isRevoked = verificationStatus.status === 'revoked';

    return (
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
        border: '2px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#ef4444',
          fontWeight: '600',
          fontSize: '16px',
          marginBottom: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>{isRevoked ? '🚫' : '❌'}</span>
          <span>
            {isRevoked
              ? 'Your verification was revoked'
              : 'Your verification was rejected'}
          </span>
        </div>

        {verificationStatus.admin_notes && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div style={{
              color: '#cbd5e0',
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Reason:
            </div>
            <div style={{
              color: '#e2e8f0',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              {verificationStatus.admin_notes}
            </div>
          </div>
        )}

        <p style={{
          color: '#a0aec0',
          fontSize: '14px',
          marginBottom: '12px',
          lineHeight: '1.5'
        }}>
          You can retry verification by uploading a new selfie with the Finger Heart pose.
        </p>

        <button
          onClick={handleRetryVerification}
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, #ff1493, #ff69b4)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 20, 147, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {isSubmitting ? '⏳ Processing...' : '🛡️ Retry Verification'}
        </button>
      </div>
    );
  }

  // If pending or manual review
  if (verificationStatus?.status === 'pending' || verificationStatus?.status === 'manual_review') {
    return (
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05))',
        border: '2px solid rgba(251, 191, 36, 0.3)',
        borderRadius: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#fbbf24',
          fontWeight: '600',
          fontSize: '16px',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '24px' }}>⏳</span>
          <span>Verification pending review</span>
        </div>
        <p style={{
          color: '#a0aec0',
          fontSize: '14px',
          margin: 0,
          lineHeight: '1.5'
        }}>
          Your verification request is being reviewed by our team. You'll be notified once it's approved.
        </p>
      </div>
    );
  }

  // If not verified and no verification attempt
  if (!isVerified && !verificationStatus) {
    return (
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))',
        border: '2px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#3b82f6',
          fontWeight: '600',
          fontSize: '16px',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <span>Your profile is not verified yet</span>
        </div>
        <p style={{
          color: '#a0aec0',
          fontSize: '14px',
          marginBottom: '12px',
          lineHeight: '1.5'
        }}>
          Verify your profile to gain trust and stand out with a verified badge.
        </p>

        <button
          onClick={handleRetryVerification}
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {isSubmitting ? '⏳ Processing...' : '🛡️ Verify My Profile'}
        </button>
      </div>
    );
  }

  // Default: don't show anything
  return null;
};

export default EmployeeVerificationStatusCard;
