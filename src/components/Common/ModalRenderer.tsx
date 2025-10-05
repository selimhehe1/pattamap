import React from 'react';
import { useModal } from '../../contexts/ModalContext';
import Modal from './Modal';

const ModalRenderer: React.FC = () => {
  const { modals, closeModal } = useModal();

  if (modals.length === 0) {
    return null;
  }

  return (
    <>
      {modals.map((modal, index) => (
        <Modal
          key={modal.id}
          modal={modal}
          index={index}
          onClose={closeModal}
        />
      ))}
    </>
  );
};

export default ModalRenderer;