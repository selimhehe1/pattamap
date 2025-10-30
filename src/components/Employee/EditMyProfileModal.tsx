import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import EmployeeForm from '../Forms/EmployeeForm';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { Employee } from '../../types';

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
  console.log('🔄 EditMyProfileModal RENDER - isOpen:', isOpen);
  const { t } = useTranslation();
  const [linkedProfile, setLinkedProfile] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { secureFetch } = useSecureFetch();

  // Fetch linked profile when modal opens
  useEffect(() => {
    console.log('🎭 EditMyProfileModal useEffect - isOpen:', isOpen);
    if (isOpen) {
      console.log('📂 Modal is open, fetching linked profile...');
      fetchLinkedProfile();
    }
  }, [isOpen]);

  const fetchLinkedProfile = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      console.log('📡 Fetching /api/employees/my-linked-profile...');
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/employees/my-linked-profile`, {
        method: 'GET'
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.error || t('editMyProfileModal.errorFetchProfile', { status: response.status }));
      }

      const data = await response.json();
      console.log('✅ Profile data received:', data);
      setLinkedProfile(data); // Backend returns employee directly (no wrapper)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('editMyProfileModal.errorLoadProfile');
      console.error('❌ Fetch error:', error);
      setFetchError(errorMessage);
      toast.error(errorMessage);
      // ❌ REMOVED: onClose() - Don't close modal, show error instead
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (employeeData: any) => {
    if (!linkedProfile) {
      toast.error(t('editMyProfileModal.errorNoLinkedProfile'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/employees/${linkedProfile.id}`, {
        method: 'PUT',
        body: JSON.stringify(employeeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('editMyProfileModal.errorUpdateProfile'));
      }

      toast.success(t('editMyProfileModal.successUpdate'));
      onProfileUpdated?.();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('editMyProfileModal.errorUpdateProfile');
      toast.error(errorMessage);
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
                  <strong>❌ {t('editMyProfileModal.errorLoadingTitle')}</strong>
                </p>
                <p className="error-message">{fetchError}</p>
              </div>
              <div className="edit-profile-buttons-row">
                <button
                  onClick={fetchLinkedProfile}
                  className="btn-nightlife-base btn-primary-nightlife"
                >
                  🔄 {t('editMyProfileModal.buttonRetry')}
                </button>
                <button
                  onClick={onClose}
                  className="btn-nightlife-base btn-secondary-nightlife"
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
                className="btn-nightlife-base btn-secondary-nightlife"
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
