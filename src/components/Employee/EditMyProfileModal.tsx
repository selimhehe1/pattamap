import React, { useState, useEffect } from 'react';
import { X, XCircle, RefreshCw } from 'lucide-react';
import toastService from '../../utils/toast';
import { useTranslation } from 'react-i18next';
import EmployeeForm from '../Forms/EmployeeForm';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { Employee, EmployeeFormData } from '../../types';
import { logger } from '../../utils/logger';

interface EditMyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

/**
 * Modal for claimed employees to edit their own profile
 *
 * Features:
 * - Fetches linked employee profile via GET /api/employees/my-linked-profile
 * - Reuses EmployeeForm with initialData prop
 * - Calls PUT /api/employees/:id to update profile
 * - Backend checks user_id permission (added in v10.0)
 */
const EditMyProfileModal: React.FC<EditMyProfileModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated
}) => {
  logger.debug('EditMyProfileModal RENDER - isOpen:', isOpen);
  const { t } = useTranslation();
  const [linkedProfile, setLinkedProfile] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { secureFetch } = useSecureFetch();
  const [retryCount, setRetryCount] = useState(0);

  // Helper function to trigger retry
  const retryFetch = () => setRetryCount(c => c + 1);

  // Fetch linked profile when modal opens
  useEffect(() => {
    const fetchLinkedProfile = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        logger.debug('Fetching /api/employees/my-linked-profile...');
        const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/employees/my-linked-profile`, {
          method: 'GET'
        });

        logger.debug('Response status:', { status: response.status, statusText: response.statusText });

        if (!response.ok) {
          const errorData = await response.json();
          logger.error('API Error:', errorData);
          throw new Error(errorData.error || t('editMyProfileModal.errorFetchProfile', { status: response.status }));
        }

        const data = await response.json();
        logger.debug('Profile data received:', data);
        setLinkedProfile(data); // Backend returns employee directly (no wrapper)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('editMyProfileModal.errorLoadProfile');
        logger.error('Fetch error:', error);
        setFetchError(errorMessage);
        toastService.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    logger.debug('EditMyProfileModal useEffect - isOpen:', isOpen);
    if (isOpen) {
      logger.debug('Modal is open, fetching linked profile...');
      fetchLinkedProfile();
    }
  }, [isOpen, secureFetch, t, retryCount]);

  const handleSubmit = async (employeeData: EmployeeFormData) => {
    if (!linkedProfile) {
      toastService.error(t('editMyProfileModal.errorNoLinkedProfile'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/employees/${linkedProfile.id}`, {
        method: 'PUT',
        body: JSON.stringify(employeeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('editMyProfileModal.errorUpdateProfile'));
      }

      toastService.success(t('editMyProfileModal.successUpdate'));
      onProfileUpdated?.();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('editMyProfileModal.errorUpdateProfile');
      toastService.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay-nightlife">
      <div className="edit-profile-modal-container">
        {/* Header */}
        <div className="edit-profile-modal-header">
          <h2 className="header-title-nightlife">
            {t('editMyProfileModal.title')}
          </h2>
          <button
            onClick={onClose}
            className="modal-close-button"
            aria-label={t('editMyProfileModal.ariaCloseModal')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="edit-profile-modal-content">
          {isLoading ? (
            <div className="edit-profile-loading-state">
              <span className="loading-spinner-nightlife"></span>
              <p className="loading-text">{t('editMyProfileModal.loadingProfile')}</p>
            </div>
          ) : fetchError ? (
            <div className="edit-profile-error-state">
              <div className="form-error-zone">
                <p className="error-title">
                  <strong><XCircle size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />{t('editMyProfileModal.errorLoadingTitle')}</strong>
                </p>
                <p className="error-message">{fetchError}</p>
              </div>
              <div className="edit-profile-buttons-row">
                <button
                  onClick={retryFetch}
                  className="btn btn--primary"
                >
                  <RefreshCw size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  {t('editMyProfileModal.buttonRetry')}
                </button>
                <button
                  onClick={onClose}
                  className="btn btn--secondary"
                >
                  {t('editMyProfileModal.buttonClose')}
                </button>
              </div>
            </div>
          ) : linkedProfile ? (
            <>
              <div className="edit-profile-info-note">
                <p>
                  <strong>{t('editMyProfileModal.noteTitle')}</strong> {t('editMyProfileModal.noteText')}
                </p>
              </div>

              <EmployeeForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isLoading={isSubmitting}
                initialData={linkedProfile}
              />
            </>
          ) : (
            <div className="edit-profile-empty-state">
              <p className="empty-state-text">{t('editMyProfileModal.noLinkedProfile')}</p>
              <button
                onClick={onClose}
                className="btn btn--secondary"
              >
                {t('editMyProfileModal.buttonClose')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditMyProfileModal;
