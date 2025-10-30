import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useModal } from '../../contexts/ModalContext';
import Modal from './Modal';

/**
 * ModalRenderer - Phase 3B Enhanced with Framer Motion
 * Wraps modals in AnimatePresence for smooth exit animations
 */
const ModalRenderer: React.FC = () => {
  const { modals, closeModal } = useModal();

  return (
    <AnimatePresence mode="wait">
      {modals.map((modal, index) => (
        <Modal
          key={modal.id}
          modal={modal}
          index={index}
          onClose={closeModal}
        />
      ))}
    </AnimatePresence>
  );
};

export default ModalRenderer;