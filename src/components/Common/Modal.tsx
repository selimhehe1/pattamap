import React, { useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { ModalConfig } from '../../contexts/ModalContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { modalVariants, backdropVariants } from '../../animations/variants';
import AnimatedButton from './AnimatedButton';
import LoadingFallback from './LoadingFallback';

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

  // 🎯 Tailles prédéfinies
  const sizeStyles = {
    small: { maxWidth: '400px', width: '90vw' },
    medium: { maxWidth: '600px', width: '90vw' },
    large: { maxWidth: '900px', width: '95vw' },
    profile: { width: '600px', maxWidth: '95vw' }, // Taille exacte pour profils
    fullscreen: { width: '100vw', height: '100vh', maxWidth: 'none', maxHeight: 'none', borderRadius: '0' }
  };

  const sizeStyle = sizeStyles[options?.size || 'medium'];

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && options?.closeOnOverlayClick !== false) {
      onClose(id);
    }
  };

  // 🎯 Pour fullscreen sur mobile: pas de padding/margin
  const isFullscreen = options?.size === 'fullscreen';

  return (
    <motion.div
      className="modal-overlay-unified"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isFullscreen ? '0' : '20px',
        zIndex
      }}
      onClick={handleOverlayClick}
    >
      <motion.div
        ref={modalRef}
        className="modal-content-unified"
        data-fullscreen={isFullscreen}
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`modal-title-${id}`}
        aria-describedby={`modal-description-${id}`}
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(26,0,51,0.95), rgba(13,0,25,0.95))',
          borderRadius: options?.size === 'fullscreen' ? '0' : '20px',
          border: isFullscreen ? 'none' : '2px solid rgba(193, 154, 107, 0.4)',
          boxShadow: isFullscreen ? 'none' : '0 20px 60px rgba(193, 154, 107, 0.25), 0 0 40px rgba(44, 62, 80, 0.2)',
          maxHeight: options?.size === 'fullscreen' ? '100vh' : '90vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxSizing: 'border-box',
          ...sizeStyle
        }}
        onClick={(e) => e.stopPropagation()} // Empêche la fermeture en cliquant sur le contenu
      >
        {/* Bouton de fermeture optionnel - Phase 3B Animated */}
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

      {/* Responsive design */}
      <style>{`
        .modal-close-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(193, 154, 107, 0.2), rgba(44, 62, 80, 0.2));
          border: 2px solid rgba(193, 154, 107, 0.4);
          color: var(--color-text, #f5f5f5);
          font-size: 24px;
          font-weight: 300;
          cursor: pointer;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          box-shadow: 0 2px 8px rgba(193, 154, 107, 0.2);
        }

        .modal-close-btn:hover {
          background: linear-gradient(135deg, rgba(193, 154, 107, 0.4), rgba(44, 62, 80, 0.4));
          border-color: var(--color-primary, #C19A6B);
          transform: scale(1.1);
          box-shadow: 0 4px 16px rgba(193, 154, 107, 0.4);
        }

        @media (max-width: 768px) {
          .modal-content-unified:not([data-fullscreen="true"]) {
            margin: 10px !important;
            width: calc(100vw - 20px) !important;
            max-width: none !important;
          }
        }

        /* Landscape mode - full width for large modals */
        @media (max-height: 768px) and (orientation: landscape) {
          .modal-content-unified:not([data-fullscreen="true"]) {
            width: calc(100vw - 20px) !important;
            max-width: none !important;
            margin: 10px !important;
          }

          .modal-overlay-unified {
            padding: 10px !important;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default Modal;