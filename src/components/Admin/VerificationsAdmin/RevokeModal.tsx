import React, { useState } from 'react';
import { XCircle, Loader2 } from 'lucide-react';
import type { RevokeModalProps } from './types';

/**
 * RevokeModal Component
 *
 * Modal for rejecting/revoking an employee's verification.
 * Requires a reason of at least 10 characters.
 */
const RevokeModal: React.FC<RevokeModalProps> = ({
  employeeName,
  isProcessing,
  onClose,
  onConfirm
}) => {
  const [reason, setReason] = useState('');

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleConfirm = () => {
    if (reason.trim().length >= 10) {
      onConfirm(reason);
    }
  };

  const isReasonValid = reason.trim().length >= 10;

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
        backdropFilter: 'blur(10px)'
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(26,0,51,0.95), rgba(13,0,25,0.95))',
          borderRadius: '25px',
          border: '2px solid #FF4757',
          boxShadow: '0 20px 60px rgba(255,71,87,0.3)',
          maxWidth: '500px',
          width: '100%',
          position: 'relative',
          padding: '30px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(255,71,87,0.2)',
            border: '2px solid #FF4757',
            color: '#FF4757',
            fontSize: '20px',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          ×
        </button>

        <h2 style={{
          color: '#FF4757',
          fontSize: '24px',
          fontWeight: 'bold',
          margin: '0 0 20px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <XCircle size={24} /> Reject Verification
        </h2>

        <p style={{
          color: '#cccccc',
          fontSize: '15px',
          marginBottom: '20px',
          lineHeight: '1.6'
        }}>
          You are about to reject the verification for <strong style={{ color: '#ffffff' }}>{employeeName}</strong>.
          This will remove their verified badge and create a rejection record.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            color: '#FF4757',
            fontSize: '13px',
            fontWeight: 'bold',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Reason for Rejection *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this verification is being rejected (e.g., fraudulent identity, misrepresentation, fake selfie, etc.)"
            rows={6}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(0,0,0,0.4)',
              border: '2px solid rgba(255,71,87,0.3)',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
          <div style={{
            fontSize: '12px',
            color: isReasonValid ? '#00FF7F' : '#cccccc',
            marginTop: '8px'
          }}>
            {reason.length} / 10 characters minimum
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={handleClose}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: 'transparent',
              border: '2px solid #cccccc',
              color: '#cccccc',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease'
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={!isReasonValid || isProcessing}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: !isReasonValid
                ? 'rgba(255,71,87,0.3)'
                : 'linear-gradient(45deg, #FF4757, #FF3742)',
              border: 'none',
              color: 'white',
              borderRadius: '12px',
              cursor: !isReasonValid ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              opacity: !isReasonValid ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {isProcessing
              ? <><Loader2 size={14} className="animate-spin" /> Rejecting...</>
              : 'Reject Verification'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default RevokeModal;
