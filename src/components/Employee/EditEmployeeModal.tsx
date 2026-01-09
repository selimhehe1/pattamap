import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, RefreshCw, UserCog, Loader2, Info } from 'lucide-react';
import notification from '../../utils/notification';
import { useTranslation } from 'react-i18next';
import EmployeeForm from '../Forms/EmployeeForm';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { Employee, EmployeeFormData } from '../../types';
import { logger } from '../../utils/logger';
import { premiumModalVariants, premiumBackdropVariants } from '../../animations/variants';
import { ModalCloseButton, ModalHeader } from '../Common/Modal/index';
import '../../styles/components/modal-premium-base.css';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
  /** If provided, skip API fetch and use this employee directly (for Admin use) */
  employee?: Employee | null;
  /** Custom save handler (for Admin use). If not provided, uses default API PUT */
  onSave?: (data: EmployeeFormData) => Promise<void>;
  /** Show info note about profile editing (default: true for self-edit, false when employee prop is provided) */
  showInfoNote?: boolean;
}

const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated,
  employee: employeeProp,
  onSave,
  showInfoNote,
}) => {
  const { t } = useTranslation();
  const [linkedProfile, setLinkedProfile] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { secureFetch } = useSecureFetch();
  const [retryCount, setRetryCount] = useState(0);

  const retryFetch = () => setRetryCount(c => c + 1);

  // Determine if we should show the info note (default: show for self-edit, hide for admin)
  const shouldShowInfoNote = showInfoNote ?? !employeeProp;

  useEffect(() => {
    // Reset state when modal closes
    if (!isOpen) {
      setLinkedProfile(null);
      setIsLoading(true);
      setFetchError(null);
      return;
    }

    // If employee is provided as prop, use it directly (Admin mode)
    if (employeeProp) {
      setLinkedProfile(employeeProp);
      setIsLoading(false);
      setFetchError(null);
      return;
    }

    // Otherwise, fetch the linked profile (Self-edit mode)
    const fetchLinkedProfile = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/employees/my-linked-profile`, {
          method: 'GET'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || t('editMyProfileModal.errorFetchProfile', { status: response.status }));
        }

        const data = await response.json();
        setLinkedProfile(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('editMyProfileModal.errorLoadProfile');
        logger.error('Fetch error:', error);
        setFetchError(errorMessage);
        notification.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLinkedProfile();
  }, [isOpen, secureFetch, t, retryCount, employeeProp]);

  const handleSubmit = async (employeeData: EmployeeFormData) => {
    if (!linkedProfile) {
      notification.error(t('editMyProfileModal.errorNoLinkedProfile'));
      return;
    }

    setIsSubmitting(true);
    try {
      // If custom onSave is provided (Admin mode), use it
      if (onSave) {
        await onSave(employeeData);
        notification.success(t('editMyProfileModal.successUpdate'));
        onProfileUpdated?.();
        onClose();
        return;
      }

      // Default behavior: API PUT (Self-edit mode)
      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/employees/${linkedProfile.id}`, {
        method: 'PUT',
        body: JSON.stringify(employeeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('editMyProfileModal.errorUpdateProfile'));
      }

      notification.success(t('editMyProfileModal.successUpdate'));
      onProfileUpdated?.();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('editMyProfileModal.errorUpdateProfile');
      notification.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="modal-premium-overlay"
          variants={premiumBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleOverlayClick}
        >
          <motion.div
            className="modal-premium modal-premium--profile"
            variants={premiumModalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-my-profile-modal-title"
          >
            {/* Close button */}
            <ModalCloseButton onClick={onClose} />

            {/* Header - Form style (left-aligned) */}
            <ModalHeader
              title={t('editMyProfileModal.title')}
              titleId="edit-my-profile-modal-title"
              icon={<UserCog size={24} />}
              variant="info"
              layout="form"
            />

            {/* Content */}
            <motion.div
              className="modal-premium__content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {isLoading ? (
                <div className="modal-premium__loading">
                  <motion.div
                    className="modal-premium__loading-spinner"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 size={48} />
                  </motion.div>
                  <p>{t('editMyProfileModal.loadingProfile')}</p>
                </div>
              ) : fetchError ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ textAlign: 'center', padding: '40px 20px' }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring' }}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 20px',
                      color: '#EF4444'
                    }}
                  >
                    <XCircle size={40} />
                  </motion.div>
                  <h3 style={{ color: '#EF4444', marginBottom: '12px' }}>
                    {t('editMyProfileModal.errorLoadingTitle')}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '24px' }}>
                    {fetchError}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <motion.button
                      className="modal-premium__btn-primary"
                      onClick={retryFetch}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <RefreshCw size={16} />
                      {t('editMyProfileModal.buttonRetry')}
                    </motion.button>
                    <motion.button
                      className="modal-premium__btn-secondary"
                      onClick={onClose}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {t('editMyProfileModal.buttonClose')}
                    </motion.button>
                  </div>
                </motion.div>
              ) : linkedProfile ? (
                <>
                  {shouldShowInfoNote && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      style={{
                        padding: '16px',
                        background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.1), rgba(0, 229, 255, 0.05))',
                        border: '1px solid rgba(0, 229, 255, 0.3)',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}
                    >
                      <Info size={20} style={{ color: '#00E5FF', flexShrink: 0, marginTop: '2px' }} />
                      <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                        <strong style={{ color: '#00E5FF' }}>{t('editMyProfileModal.noteTitle')}</strong> {t('editMyProfileModal.noteText')}
                      </p>
                    </motion.div>
                  )}

                  <EmployeeForm
                    onSubmit={handleSubmit}
                    onCancel={onClose}
                    isLoading={isSubmitting}
                    initialData={linkedProfile}
                  />
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ textAlign: 'center', padding: '40px 20px' }}
                >
                  <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '20px' }}>
                    {t('editMyProfileModal.noLinkedProfile')}
                  </p>
                  <motion.button
                    className="modal-premium__btn-secondary"
                    onClick={onClose}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t('editMyProfileModal.buttonClose')}
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default EditEmployeeModal;
