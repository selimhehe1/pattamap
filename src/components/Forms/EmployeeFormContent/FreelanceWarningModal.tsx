import React from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';
import type { FreelanceWarningModalProps } from './types';

/**
 * FreelanceWarningModal Component
 *
 * Dialog shown when switching to freelance mode from a non-nightclub establishment.
 * Warns the user that the current establishment association will be removed.
 */
const FreelanceWarningModal: React.FC<FreelanceWarningModalProps> = ({
  establishmentName,
  categoryName,
  onConfirm,
  onCancel
}) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        border: '2px solid rgba(157, 78, 221, 0.5)',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '450px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(157, 78, 221, 0.3)'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          color: '#FFD700',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertTriangle size={20} /> Changement vers mode Freelance
        </h3>
        <p style={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '14px',
          lineHeight: '1.6',
          margin: '0 0 12px 0'
        }}>
          Un freelance ne peut travailler <strong style={{ color: '#C77DFF' }}>qu'en Nightclub</strong>.
        </p>
        <p style={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '14px',
          lineHeight: '1.6',
          margin: '0 0 20px 0'
        }}>
          L'association avec <strong style={{ color: '#00E5FF' }}>{establishmentName}</strong>{' '}
          <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>({categoryName})</span>{' '}
          sera supprimée.
        </p>
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <X size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(45deg, #9D4EDD, #C77DFF)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Check size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

export default FreelanceWarningModal;
