import { useState, useEffect } from 'react';

export const useModals = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showEstablishmentForm, setShowEstablishmentForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openLoginModal = () => setShowLogin(true);
  const closeLoginModal = () => setShowLogin(false);

  const openRegisterModal = () => setShowRegister(true);
  const closeRegisterModal = () => setShowRegister(false);

  const openEmployeeFormModal = () => setShowEmployeeForm(true);
  const closeEmployeeFormModal = () => setShowEmployeeForm(false);

  const openEstablishmentFormModal = () => setShowEstablishmentForm(true);
  const closeEstablishmentFormModal = () => setShowEstablishmentForm(false);

  const closeAllModals = () => {
    setShowLogin(false);
    setShowRegister(false);
    setShowEmployeeForm(false);
    setShowEstablishmentForm(false);
  };

  // 🎯 Gestion automatique de la classe modal-open sur le body
  useEffect(() => {
    const isAnyModalOpen = showLogin || showRegister || showEmployeeForm || showEstablishmentForm;

    if (isAnyModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    // Nettoyage au démontage du composant
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showLogin, showRegister, showEmployeeForm, showEstablishmentForm]);

  return {
    // States
    showLogin,
    showRegister,
    showEmployeeForm,
    showEstablishmentForm,
    isSubmitting,

    // Actions
    openLoginModal,
    closeLoginModal,
    openRegisterModal,
    closeRegisterModal,
    openEmployeeFormModal,
    closeEmployeeFormModal,
    openEstablishmentFormModal,
    closeEstablishmentFormModal,
    closeAllModals,
    setIsSubmitting
  };
};