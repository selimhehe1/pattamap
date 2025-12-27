import React, { useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { ModalConfig } from '../../contexts/ModalContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { modalVariants, backdropVariants } from '../../animations/variants';
import AnimatedButton from './AnimatedButton';
import LoadingFallback from './LoadingFallback';
import '../../styles/components/modals.css';

interface ModalProps {
  modal: ModalConfig;
  index: number; // Position dans la stack pour le z-index
  onClose: (id: string) => void;
}

const Modal: React.FC<ModalProps> = ({ modal, index, onClose }) => {
  const { id, component: Component, props, options } = modal;

  // Focus trap for accessibility
  const modalRef = useFocusTrap<HTMLDivElement>(true);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && options?.closeOnEscape !== false) {
        onClose(id);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [id, onClose, options?.closeOnEscape]);

  // 🎯 Z-index calculé automatiquement en fonction de la position dans la stack
  // Base logique: header(99999) < modals(100000+)
  const baseZIndex = 100000;
  const zIndex = options?.zIndex || (baseZIndex + index * 10);

  // 🎯 Taille du modal (utilisé pour la classe CSS)
  const size = options?.size || 'medium';
  const isFullscreen = size === 'fullscreen';

  // 🎯 Classes CSS pour le modal content
  const sizeClasses: Record<string, string> = {
    small: 'modal--small',
    medium: 'modal--medium',
    large: 'modal--large',
    profile: 'modal--profile',
    fullscreen: 'modal--fullscreen'
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && options?.closeOnOverlayClick !== false) {
      onClose(id);
    }
  };

  return (
    <motion.div
      className="modal-overlay-unified view-transition-modal-backdrop"
      data-fullscreen={isFullscreen}
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{ zIndex, padding: isFullscreen ? '0' : undefined }}
      onClick={handleOverlayClick}
    >
      <motion.div
        ref={modalRef}
        className={`modal-content-unified ${sizeClasses[size]} view-transition-modal`}
        data-fullscreen={isFullscreen}
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`modal-title-${id}`}
        aria-describedby={`modal-description-${id}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton de fermeture optionnel */}
        {options?.showCloseButton !== false && (
          <AnimatedButton
            onClick={() => onClose(id)}
            ariaLabel="Close modal"
            enableHaptic
            hapticLevel="light"
            className="modal-close-btn"
          >
            ×
          </AnimatedButton>
        )}

        {/* Contenu du modal */}
        <Suspense fallback={<LoadingFallback message="Loading..." variant="inline" />}>
          <Component {...props} />
        </Suspense>
      </motion.div>
    </motion.div>
  );
};

export default Modal;