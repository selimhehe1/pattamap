/**
 * ModalCloseButton - Reusable modal close button
 *
 * Standardized close button with animations used across premium modals.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ModalCloseButtonProps {
  /** Click handler */
  onClick: () => void;
  /** Custom aria-label */
  ariaLabel?: string;
  /** Custom className */
  className?: string;
}

export const ModalCloseButton: React.FC<ModalCloseButtonProps> = ({
  onClick,
  ariaLabel,
  className = ''
}) => {
  const { t } = useTranslation();

  return (
    <motion.button
      className={`modal-premium__close ${className}`}
      onClick={onClick}
      aria-label={ariaLabel || t('common.close', 'Close')}
      whileHover={{ scale: 1.1, rotate: 90 }}
      whileTap={{ scale: 0.95 }}
    >
      <X size={18} />
    </motion.button>
  );
};

export default ModalCloseButton;
