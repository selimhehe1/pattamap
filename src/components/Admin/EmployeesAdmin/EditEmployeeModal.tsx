/**
 * EditEmployeeModal - Modal wrapper for editing employees in admin panel
 * Uses modal-premium styling with responsive design
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserCog } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmployeeForm } from '../../Forms/EmployeeForm';
import type { EmployeeFormData } from '../../../types';
import type { AdminEmployee } from './types';
import { premiumBackdropVariants, premiumModalVariants } from '../../../animations/variants';
import '../../../styles/components/modal-premium-base.css';

interface EditEmployeeModalProps {
  employee: AdminEmployee;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EmployeeFormData) => Promise<void>;
  isLoading?: boolean;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  employee,
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (data: EmployeeFormData) => {
    await onSave(data);
    onClose();
  };

  // Get current establishment ID from employment history
  const currentEstablishmentId = employee.employment_history?.find(
    (eh) => eh.is_current
  )?.establishment_id || '';

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
            className="modal-premium modal-premium--medium"
            variants={premiumModalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-employee-modal-title"
          >
            {/* Close button */}
            <motion.button
              className="modal-premium__close"
              onClick={onClose}
              aria-label={t('common.close')}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
            >
              <X size={18} />
            </motion.button>

            {/* Header */}
            <div className="modal-premium__header modal-premium__header--with-icon">
              <motion.div
                className="modal-premium__icon modal-premium__icon--info"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
              >
                <UserCog size={32} />
              </motion.div>
              <motion.h2
                id="edit-employee-modal-title"
                className="modal-premium__title modal-premium__title--info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {t('admin.editEmployee', 'Edit Employee')}
              </motion.h2>
            </div>

            {/* Content */}
            <motion.div
              className="modal-premium__content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{ maxHeight: '70vh', overflowY: 'auto' }}
            >
              <EmployeeForm
                initialData={{
                  ...employee,
                  current_establishment_id: currentEstablishmentId,
                }}
                onSubmit={handleSubmit}
                onCancel={onClose}
                isLoading={isLoading}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default EditEmployeeModal;
