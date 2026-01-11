import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCSRF } from '../../contexts/CSRFContext';
import notification from '../../utils/notification';
import { logger } from '../../utils/logger';
import '../../styles/components/modals.css';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * DeleteAccountModal
 *
 * GDPR-compliant account deletion confirmation modal.
 * Users must type "DELETE" (or "SUPPRIMER" in French) to confirm.
 */
const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const { csrfToken } = useCSRF();

  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  // The word users need to type to confirm
  const confirmWord = i18n.language === 'fr' ? 'SUPPRIMER' : 'DELETE';
  const isConfirmValid = confirmText.toUpperCase() === confirmWord;

  const handleDelete = async () => {
    if (!isConfirmValid) {
      setError(t('deleteAccount.confirmError', `Please type "${confirmWord}" to confirm`));
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('deleteAccount.deleteFailed', 'Failed to delete account'));
      }

      notification.success(t('deleteAccount.success', 'Your account has been deleted. Goodbye!'));

      // Close modal and logout
      onClose();

      // Wait a bit for notification to show, then logout
      setTimeout(() => {
        logout();
      }, 1500);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('deleteAccount.deleteFailed', 'Failed to delete account');
      setError(errorMessage);
      notification.error(errorMessage);
      logger.error('Account deletion failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay-unified" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
      <div className="modal-content-unified modal--medium" style={{ maxWidth: '480px' }}>
        <button
          onClick={handleClose}
          className="modal-close-btn"
          aria-label={t('common.close', 'Close')}
          disabled={isDeleting}
        >
          <X size={20} />
        </button>

        {/* Warning Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          padding: '16px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={24} color="#ef4444" />
          </div>
          <div>
            <h2 id="delete-account-title" style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#ef4444'
            }}>
              {t('deleteAccount.title', 'Delete Account')}
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: 'rgba(248, 250, 252, 0.7)'
            }}>
              {t('deleteAccount.warning', 'This action is permanent and cannot be undone')}
            </p>
          </div>
        </div>

        {/* Consequences List */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{
            fontSize: '14px',
            color: 'rgba(248, 250, 252, 0.9)',
            marginBottom: '12px'
          }}>
            {t('deleteAccount.consequencesIntro', 'Deleting your account will:')}
          </p>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            fontSize: '14px',
            color: 'rgba(248, 250, 252, 0.7)',
            lineHeight: '1.8'
          }}>
            <li>{t('deleteAccount.consequence1', 'Permanently delete all your personal data')}</li>
            <li>{t('deleteAccount.consequence2', 'Remove all your favorites and reviews')}</li>
            <li>{t('deleteAccount.consequence3', 'Unlink any employee profiles you claimed')}</li>
            <li>{t('deleteAccount.consequence4', 'Delete your achievements and XP progress')}</li>
            <li>{t('deleteAccount.consequence5', 'Remove all ownership requests')}</li>
          </ul>
        </div>

        {/* Confirmation Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            color: 'rgba(248, 250, 252, 0.9)',
            marginBottom: '8px'
          }}>
            {t('deleteAccount.confirmPrompt', `Type "${confirmWord}" to confirm:`)}
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
              setError('');
            }}
            placeholder={confirmWord}
            disabled={isDeleting}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              fontWeight: 500,
              background: 'rgba(0, 0, 0, 0.4)',
              border: `2px solid ${error ? 'rgba(239, 68, 68, 0.5)' : isConfirmValid ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
              borderRadius: '8px',
              color: isConfirmValid ? '#ef4444' : '#fff',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            autoComplete="off"
          />
          {error && (
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '13px',
              color: '#ef4444'
            }}>
              {error}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 500,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: 'rgba(248, 250, 252, 0.8)',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {t('deleteAccount.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmValid || isDeleting}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              background: isConfirmValid && !isDeleting
                ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                : 'rgba(239, 68, 68, 0.3)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: isConfirmValid && !isDeleting ? 'pointer' : 'not-allowed',
              opacity: isConfirmValid ? 1 : 0.6,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isDeleting ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                {t('deleteAccount.deleting', 'Deleting...')}
              </>
            ) : (
              <>
                <Trash2 size={16} />
                {t('deleteAccount.confirmButton', 'Delete Account')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
