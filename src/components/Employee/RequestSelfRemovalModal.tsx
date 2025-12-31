import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import toast from '../../utils/toast';
import { logger } from '../../utils/logger';
import { premiumModalVariants, premiumBackdropVariants } from '../../animations/variants';
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
      toast.error(t('employeeDashboard.removalMinChars', `Please provide at least ${MIN_EXPLANATION_LENGTH} characters explaining your request.`));
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
      toast.success(t('employeeDashboard.removalSuccess', 'Removal request submitted. Administrators will review your request.'));
      onSuccess();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Self-removal request error', error);
      toast.error(errorMessage || 'Failed to submit removal request');
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
            <motion.button
              className="modal-premium__close"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label={t('common.close', 'Close')}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
            >
              <X size={18} />
            </motion.button>

            {/* Header */}
            <div className="modal-premium__header modal-premium__header--with-icon">
              <motion.div
                className="modal-premium__icon modal-premium__icon--danger"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
              >
                <AlertTriangle size={32} />
              </motion.div>
              <motion.h2
                className="modal-premium__title modal-premium__title--danger"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {t('employeeDashboard.requestRemoval', 'Request Profile Removal')}
              </motion.h2>
            </div>

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
            <motion.div
              className="modal-premium__footer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <motion.button
                className="modal-premium__btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <X size={16} />
                {t('common.cancel', 'Cancel')}
              </motion.button>
              <motion.button
                className="modal-premium__btn-primary modal-premium__btn-danger"
                onClick={handleSubmit}
                disabled={!isValidExplanation || isSubmitting}
                style={{ opacity: !isValidExplanation ? 0.5 : 1 }}
                whileHover={{ scale: isSubmitting || !isValidExplanation ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting || !isValidExplanation ? 1 : 0.98 }}
              >
                {isSubmitting ? (
                  <>
                    <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      <Loader2 size={16} />
                    </motion.span>
                    {t('common.submitting', 'Submitting...')}
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    {t('employeeDashboard.submitRemovalRequest', 'Submit Removal Request')}
                  </>
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default RequestSelfRemovalModal;
