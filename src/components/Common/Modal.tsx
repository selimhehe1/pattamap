import React from 'react';
import { ModalConfig } from '../../contexts/ModalContext';

interface ModalProps {
  modal: ModalConfig;
  index: number; // Position dans la stack pour le z-index
  onClose: (id: string) => void;
}

const Modal: React.FC<ModalProps> = ({ modal, index, onClose }) => {
  const { id, component: Component, props, options } = modal;

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

  return (
    <div
      className="modal-overlay-unified"
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
        padding: '20px',
        zIndex,
        animation: 'modalFadeIn 0.3s ease-out'
      }}
      onClick={handleOverlayClick}
    >
      <div
        className="modal-content-unified"
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(26,0,51,0.95), rgba(13,0,25,0.95))',
          borderRadius: options?.size === 'fullscreen' ? '0' : '20px',
          border: '2px solid rgba(255,27,141,0.3)',
          boxShadow: '0 20px 60px rgba(255,27,141,0.3)',
          maxHeight: options?.size === 'fullscreen' ? '100vh' : '90vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          animation: 'modalSlideIn 0.3s ease-out',
          boxSizing: 'border-box',
          ...sizeStyle
        }}
        onClick={(e) => e.stopPropagation()} // Empêche la fermeture en cliquant sur le contenu
      >
        {/* Bouton de fermeture optionnel */}
        {options?.showCloseButton !== false && (
          <button
            onClick={() => onClose(id)}
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,27,141,0.2)',
              border: '2px solid #FF1B8D',
              color: '#FF1B8D',
              fontSize: '20px',
              cursor: 'pointer',
              zIndex: 10,
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,27,141,0.3)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,27,141,0.2)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ×
          </button>
        )}

        {/* Contenu du modal */}
        <Component {...props} />
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .modal-content-unified {
            margin: 10px !important;
            width: calc(100vw - 20px) !important;
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Modal;