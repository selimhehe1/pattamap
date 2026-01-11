import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigateWithTransition } from '../../hooks/useNavigateWithTransition';
import { Employee } from '../../types';
import { UserPlus, Trash2, X, AlertCircle } from 'lucide-react';
import { premiumModalVariants, premiumBackdropVariants } from '../../animations/variants';
import '../../styles/components/modal-premium-base.css';
import '../../styles/components/claim-delete-modal.css';

interface ClaimOrDeleteModalProps {
  employee: Employee;
  onClose: () => void;
  onRequestDeletion: () => void;
  isOpen?: boolean;
}

/**
 * Modal displayed when someone clicks "C'est moi ?" on an unclaimed profile.
 * Offers two options:
 * 1. Claim the profile (redirect to registration with pre-selected employee)
 * 2. Request profile deletion (open deletion request form)
 */
const ClaimOrDeleteModal: React.FC<ClaimOrDeleteModalProps> = ({
  employee,
  onClose,
  onRequestDeletion,
  isOpen = true
}) => {
  const { t } = useTranslation();
  const navigate = useNavigateWithTransition();

  const handleClaimProfile = () => {
    // Navigate to login/register page with employee data in state
    // The registration form will detect this and pre-select the claim option
    navigate('/login', {
      state: {
        mode: 'register',
        accountType: 'employee',
        employeePath: 'claim',
        preselectedEmployee: employee
      }
    });
    onClose();
  };

  const handleRequestDeletion = () => {
    onRequestDeletion();
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="modal-premium-backdrop"
        variants={premiumBackdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={onClose}
      >
        <motion.div
          className="modal-premium-container modal-premium-container--small"
          variants={premiumModalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-premium-header">
            <div className="modal-premium-header-icon modal-premium-header-icon--info">
              <AlertCircle size={24} />
            </div>
            <h2 className="modal-premium-title">
              {t('claimOrDelete.title', "C'est vous ?")}
            </h2>
            <p className="modal-premium-subtitle">
              {t('claimOrDelete.subtitle', 'Que souhaitez-vous faire avec ce profil ?')}
            </p>
            <button
              className="modal-premium-close"
              onClick={onClose}
              aria-label={t('common.close', 'Close')}
            >
              <X size={20} />
            </button>
          </div>

          {/* Profile Preview */}
          <div className="modal-premium-body">
            <div className="claim-delete-profile-preview">
              {employee.photos?.[0] ? (
                <img
                  src={employee.photos[0]}
                  alt={employee.name}
                  className="claim-delete-profile-photo"
                />
              ) : (
                <div className="claim-delete-profile-placeholder">
                  {employee.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div className="claim-delete-profile-info">
                <span className="claim-delete-profile-name">{employee.name}</span>
                {employee.nickname && (
                  <span className="claim-delete-profile-nickname">"{employee.nickname}"</span>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="claim-delete-options">
              {/* Option 1: Claim */}
              <button
                className="claim-delete-option claim-delete-option--claim"
                onClick={handleClaimProfile}
              >
                <div className="claim-delete-option-icon">
                  <UserPlus size={24} />
                </div>
                <div className="claim-delete-option-content">
                  <span className="claim-delete-option-title">
                    {t('claimOrDelete.claimTitle', 'Récupérer ce profil')}
                  </span>
                  <span className="claim-delete-option-desc">
                    {t('claimOrDelete.claimDesc', 'Créez un compte et liez ce profil à votre identité')}
                  </span>
                </div>
              </button>

              {/* Option 2: Delete */}
              <button
                className="claim-delete-option claim-delete-option--delete"
                onClick={handleRequestDeletion}
              >
                <div className="claim-delete-option-icon">
                  <Trash2 size={24} />
                </div>
                <div className="claim-delete-option-content">
                  <span className="claim-delete-option-title">
                    {t('claimOrDelete.deleteTitle', 'Supprimer ce profil')}
                  </span>
                  <span className="claim-delete-option-desc">
                    {t('claimOrDelete.deleteDesc', 'Demandez la suppression de vos données personnelles')}
                  </span>
                </div>
              </button>
            </div>

            {/* Legal Notice */}
            <p className="claim-delete-notice">
              {t('claimOrDelete.notice', 'Conformément à la loi sur la protection des données personnelles (PDPA), vous avez le droit de demander la suppression de vos informations.')}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default ClaimOrDeleteModal;
