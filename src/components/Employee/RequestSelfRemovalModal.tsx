import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import notification from '../../utils/notification';
import { logger } from '../../utils/logger';
import { premiumModalVariants, premiumBackdropVariants } from '../../animations/variants';
import { ModalCloseButton, ModalHeader, ModalFooter } from '../Common/Modal/index';
import '../../styles/components/modal-premium-base.css';

interface RequestSelfRemovalModalProps {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
  onSuccess: () => void;
  isOpen?: boolean;
}

const MIN_EXPLANATION_LENGTH = 10;
const MAX_EXPLANATION_LENGTH = 1000;

const RequestSelfRemovalModal: React.FC<RequestSelfRemovalModalProps> = ({
  employeeId,
  employeeName,
  onClose,
  onSuccess,
  isOpen = true
}) => {
  const { secureFetch } = useSecureFetch();
  const { t } = useTranslation();

  const [explanation, setExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidExplanation = explanation.trim().length >= MIN_EXPLANATION_LENGTH;

  const handleSubmit = async () => {
    if (!isValidExplanation) {
      notification.error(t('employeeDashboard.removalMinChars', `Please provide at least ${MIN_EXPLANATION_LENGTH} characters explaining your request.`));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/employees/${employeeId}/request-removal`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verification_info: explanation.trim() })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 403) {
          throw new Error(t('employeeDashboard.removalForbidden', 'You can only request removal of your own profile.'));
        }
        throw new Error(error.error || 'Request failed');
      }

      logger.info('Self-removal request submitted successfully');
      notification.success(t('employeeDashboard.removalSuccess', 'Removal request submitted. Administrators will review your request.'));
      onSuccess();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Self-removal request error', error);
      notification.error(errorMessage || 'Failed to submit removal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSubmitting) {
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
            className="modal-premium modal-premium--medium modal-premium--danger"
            variants={premiumModalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Close button */}
            <ModalCloseButton onClick={onClose} />

            {/* Header */}
            <ModalHeader
              title={t('employeeDashboard.requestRemoval', 'Request Profile Removal')}
              icon={<AlertTriangle size={32} />}
              variant="danger"
            />

            {/* Content */}
            <motion.div
              className="modal-premium__content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {/* Warning message */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                style={{
                  padding: '16px',
                  background: 'rgba(248, 113, 113, 0.1)',
                  border: '1px solid rgba(248, 113, 113, 0.3)',
                  borderRadius: '12px',
                  marginBottom: '20px'
                }}
              >
                <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0, lineHeight: '1.6' }}>
                  {t('employeeDashboard.removalWarning',
                    `You are requesting to remove your profile "${employeeName}" from PattaMap. Once approved by administrators, your profile will no longer be visible to visitors.`
                  ).replace('"employeeName"', `"${employeeName}"`)}
                </p>
              </motion.div>

              {/* Explanation textarea */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label
                  htmlFor="removal-explanation"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: 'rgba(255,255,255,0.8)',
                    fontWeight: '600'
                  }}
                >
                  {t('employeeDashboard.removalExplanation', 'Please explain why you want to remove your profile')} *
                </label>
                <textarea
                  id="removal-explanation"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value.slice(0, MAX_EXPLANATION_LENGTH))}
                  disabled={isSubmitting}
                  placeholder={t('employeeDashboard.removalPlaceholder', 'I want to remove my profile because...')}
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '12px',
                    background: 'rgba(0,0,0,0.3)',
                    border: `2px solid ${isValidExplanation ? 'rgba(248, 113, 113, 0.5)' : 'rgba(255,255,255,0.2)'}`,
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.5)'
                }}>
                  <span>
                    {explanation.trim().length < MIN_EXPLANATION_LENGTH && (
                      <span style={{ color: '#F87171' }}>
                        {t('common.minChars', `Minimum ${MIN_EXPLANATION_LENGTH} characters required`)}
                      </span>
                    )}
                  </span>
                  <span>{explanation.length}/{MAX_EXPLANATION_LENGTH}</span>
                </div>
              </motion.div>

              {/* Important notice */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                style={{
                  padding: '12px',
                  background: 'rgba(255, 193, 7, 0.1)',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  borderRadius: '8px',
                  marginTop: '16px'
                }}
              >
                <p style={{
                  margin: 0,
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <AlertTriangle size={16} style={{ color: '#FFC107', flexShrink: 0, marginTop: '2px' }} />
                  {t('employeeDashboard.removalNotice', 'This action requires admin approval. You will be notified once your request is processed.')}
                </p>
              </motion.div>
            </motion.div>

            {/* Footer */}
            <ModalFooter
              animationDelay={0.4}
              secondaryAction={{
                label: t('common.cancel', 'Cancel'),
                onClick: onClose,
                icon: <X size={16} />,
                disabled: isSubmitting
              }}
              primaryAction={{
                label: isSubmitting ? t('common.submitting', 'Submitting...') : t('employeeDashboard.submitRemovalRequest', 'Submit Removal Request'),
                onClick: handleSubmit,
                icon: <Trash2 size={16} />,
                disabled: !isValidExplanation,
                loading: isSubmitting,
                variant: 'danger'
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default RequestSelfRemovalModal;
