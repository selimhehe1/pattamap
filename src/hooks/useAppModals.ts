/**
 * useAppModals - Application Modal Management Hook
 *
 * Refactored to use ModalContext for centralized modal management.
 * All modals are now rendered via ModalRenderer automatically.
 *
 * Benefits:
 * - Single source of truth for modal state
 * - Automatic scroll locking
 * - Consistent animations via ModalRenderer
 * - Escape key handling
 * - Proper focus management
 */

import { useCallback, useState, lazy } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { useSecureFetch } from './useSecureFetch';
import { Employee, Establishment } from '../types';
import { logger } from '../utils/logger';
import toast from '../utils/toast';

// Lazy-loaded modal components
const LoginForm = lazy(() => import('../components/Auth/LoginForm'));
const MultiStepRegisterForm = lazy(() => import('../components/Auth/MultiStepRegisterForm'));
const EmployeeProfileWizard = lazy(() => import('../components/Employee/EmployeeProfileWizard'));
const EditEmployeeModal = lazy(() => import('../components/Employee/EditEmployeeModal'));
const UserInfoModal = lazy(() => import('../components/User/UserInfoModal'));
const EmployeeForm = lazy(() => import('../components/Forms/EmployeeForm'));
const EstablishmentForm = lazy(() => import('../components/Forms/EstablishmentForm'));

// Modal IDs as constants for consistency
export const MODAL_IDS = {
  LOGIN: 'app-login',
  REGISTER: 'app-register',
  FORGOT_PASSWORD: 'app-forgot-password',
  EMPLOYEE_FORM: 'app-employee-form',
  ESTABLISHMENT_FORM: 'app-establishment-form',
  EMPLOYEE_WIZARD: 'app-employee-wizard',
  EDIT_MY_PROFILE: 'app-edit-my-profile',
  USER_INFO: 'app-user-info'
} as const;

interface AppModalsState {
  isSubmitting: boolean;
  isSelfProfile: boolean;
  editingEmployeeData: Employee | null;
}

interface AppModalsActions {
  // Open modals
  openLoginForm: () => void;
  openRegisterForm: () => void;
  openForgotPasswordForm: () => void;
  openEmployeeForm: (editData?: Employee, selfProfile?: boolean) => void;
  openEstablishmentForm: () => void;
  openEmployeeProfileWizard: () => void;
  openEditMyProfileModal: () => void;
  openUserInfoModal: () => void;
  // Close modals
  closeLoginForm: () => void;
  closeRegisterForm: () => void;
  closeForgotPasswordForm: () => void;
  closeEmployeeForm: () => void;
  closeEstablishmentForm: () => void;
  closeEmployeeProfileWizard: () => void;
  closeEditMyProfileModal: () => void;
  closeUserInfoModal: () => void;
  // Switch modals
  switchLoginToRegister: () => void;
  switchRegisterToLogin: () => void;
  switchLoginToForgotPassword: () => void;
  switchForgotPasswordToLogin: () => void;
  // Handlers
  handleSubmitEmployee: (employeeData: Partial<Employee>) => Promise<void>;
  handleSubmitEstablishment: (establishmentData: Partial<Establishment>) => Promise<void>;
  handleEditMyProfile: () => void;
  handleWizardCreateProfile: () => void;
  // Check if modal is open
  isModalOpen: (modalId: string) => boolean;
}

export type UseAppModalsReturn = AppModalsState & AppModalsActions;

export const useAppModals = (): UseAppModalsReturn => {
  const { secureFetch } = useSecureFetch();
  const { user, refreshLinkedProfile } = useAuth();
  const { openModal, closeModal, isModalOpen } = useModal();

  // Form-specific states (not modal visibility)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSelfProfile, setIsSelfProfile] = useState(false);
  const [editingEmployeeData, setEditingEmployeeData] = useState<Employee | null>(null);

  // ==========================================
  // Login Modal
  // ==========================================
  const openLoginForm = useCallback(() => {
    openModal(MODAL_IDS.LOGIN, LoginForm, {
      onClose: () => closeModal(MODAL_IDS.LOGIN),
      embedded: true, // Render without overlay since Modal.tsx provides one
      onSwitchToRegister: () => {
        closeModal(MODAL_IDS.LOGIN);
        openModal(MODAL_IDS.REGISTER, MultiStepRegisterForm, {
          onClose: () => closeModal(MODAL_IDS.REGISTER),
          onSwitchToLogin: () => {
            closeModal(MODAL_IDS.REGISTER);
            openModal(MODAL_IDS.LOGIN, LoginForm, {
              onClose: () => closeModal(MODAL_IDS.LOGIN),
              embedded: true // Render without overlay since Modal.tsx provides one
            }, { size: 'medium' });
          }
        }, { size: 'large' });
      }
    }, { size: 'medium' });
  }, [openModal, closeModal]);

  const closeLoginForm = useCallback(() => {
    closeModal(MODAL_IDS.LOGIN);
  }, [closeModal]);

  // ==========================================
  // Register Modal
  // ==========================================
  const openRegisterForm = useCallback(() => {
    openModal(MODAL_IDS.REGISTER, MultiStepRegisterForm, {
      onClose: () => closeModal(MODAL_IDS.REGISTER),
      onSwitchToLogin: () => {
        closeModal(MODAL_IDS.REGISTER);
        openLoginForm();
      }
    }, { size: 'large' });
  }, [openModal, closeModal, openLoginForm]);

  const closeRegisterForm = useCallback(() => {
    closeModal(MODAL_IDS.REGISTER);
  }, [closeModal]);

  // ==========================================
  // Forgot Password Modal (placeholder)
  // ==========================================
  const openForgotPasswordForm = useCallback(() => {
    // TODO: Implement ForgotPasswordForm component
    logger.debug('Forgot password form not yet implemented');
  }, []);

  const closeForgotPasswordForm = useCallback(() => {
    closeModal(MODAL_IDS.FORGOT_PASSWORD);
  }, [closeModal]);

  // ==========================================
  // Employee Form Modal
  // ==========================================
  const openEmployeeForm = useCallback((editData?: Employee, selfProfile?: boolean) => {
    setEditingEmployeeData(editData || null);
    setIsSelfProfile(selfProfile || false);

    // Define submit handler inline to capture latest state
    const submitHandler = async (employeeData: Partial<Employee>) => {
      setIsSubmitting(true);
      try {
        let endpoint: string;
        let method: string;

        if (editData) {
          endpoint = `${import.meta.env.VITE_API_URL}/api/employees/${editData.id}`;
          method = 'PUT';
        } else if (selfProfile) {
          endpoint = `${import.meta.env.VITE_API_URL}/api/employees/my-profile`;
          method = 'POST';
        } else {
          endpoint = `${import.meta.env.VITE_API_URL}/api/employees`;
          method = 'POST';
        }

        const response = await secureFetch(endpoint, {
          method,
          body: JSON.stringify(employeeData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to submit employee');
        }

        closeModal(MODAL_IDS.EMPLOYEE_FORM);
        setEditingEmployeeData(null);
        setIsSelfProfile(false);

        if (editData && refreshLinkedProfile) {
          await refreshLinkedProfile();
        }

        const successMessage = editData
          ? 'Profile updated successfully!'
          : (selfProfile ? 'Your employee profile has been created! Waiting for admin approval.' : 'Employee added successfully!');

        toast.success(successMessage);
      } catch (error) {
        logger.error('Failed to submit employee', error);
        toast.error(error instanceof Error ? error.message : 'Failed to submit employee');
      } finally {
        setIsSubmitting(false);
      }
    };

    openModal(MODAL_IDS.EMPLOYEE_FORM, EmployeeForm, {
      initialData: editData,
      isLoading: isSubmitting,
      onSubmit: submitHandler,
      onCancel: () => {
        closeModal(MODAL_IDS.EMPLOYEE_FORM);
        setEditingEmployeeData(null);
        setIsSelfProfile(false);
      }
    }, { size: 'large', closeOnOverlayClick: false });
  }, [openModal, closeModal, isSubmitting, secureFetch, refreshLinkedProfile]);

  const closeEmployeeForm = useCallback(() => {
    closeModal(MODAL_IDS.EMPLOYEE_FORM);
    setEditingEmployeeData(null);
    setIsSelfProfile(false);
  }, [closeModal]);

  // ==========================================
  // Establishment Form Modal
  // ==========================================
  const openEstablishmentForm = useCallback(() => {
    openModal(MODAL_IDS.ESTABLISHMENT_FORM, EstablishmentForm, {
      onCancel: () => closeModal(MODAL_IDS.ESTABLISHMENT_FORM)
    }, { size: 'large', closeOnOverlayClick: false });
  }, [openModal, closeModal]);

  const closeEstablishmentForm = useCallback(() => {
    closeModal(MODAL_IDS.ESTABLISHMENT_FORM);
  }, [closeModal]);

  // ==========================================
  // Employee Profile Wizard Modal
  // ==========================================
  const openEmployeeProfileWizard = useCallback(() => {
    openModal(MODAL_IDS.EMPLOYEE_WIZARD, EmployeeProfileWizard, {
      onClose: () => closeModal(MODAL_IDS.EMPLOYEE_WIZARD),
      onCreateProfile: () => {
        closeModal(MODAL_IDS.EMPLOYEE_WIZARD);
        setIsSelfProfile(true);
        openEmployeeForm(undefined, true);
      }
    }, { size: 'medium' });
  }, [openModal, closeModal, openEmployeeForm]);

  const closeEmployeeProfileWizard = useCallback(() => {
    closeModal(MODAL_IDS.EMPLOYEE_WIZARD);
  }, [closeModal]);

  // ==========================================
  // Edit My Profile Modal
  // ==========================================
  const openEditMyProfileModal = useCallback(() => {
    openModal(MODAL_IDS.EDIT_MY_PROFILE, EditEmployeeModal, {
      isOpen: true,
      onClose: () => closeModal(MODAL_IDS.EDIT_MY_PROFILE),
      onProfileUpdated: async () => {
        if (refreshLinkedProfile) {
          await refreshLinkedProfile();
        }
        logger.debug('Profile updated successfully via modal');
      }
    }, { size: 'profile' });
  }, [openModal, closeModal, refreshLinkedProfile]);

  const closeEditMyProfileModal = useCallback(() => {
    closeModal(MODAL_IDS.EDIT_MY_PROFILE);
  }, [closeModal]);

  // ==========================================
  // User Info Modal
  // ==========================================
  const openUserInfoModal = useCallback(() => {
    if (!user) {
      logger.warn('Cannot open user info modal: no user');
      return;
    }
    openModal(MODAL_IDS.USER_INFO, UserInfoModal, {
      user,
      onClose: () => closeModal(MODAL_IDS.USER_INFO)
    }, { size: 'medium' });
  }, [openModal, closeModal, user]);

  const closeUserInfoModal = useCallback(() => {
    closeModal(MODAL_IDS.USER_INFO);
  }, [closeModal]);

  // ==========================================
  // Switch Actions
  // ==========================================
  const switchLoginToRegister = useCallback(() => {
    closeLoginForm();
    openRegisterForm();
  }, [closeLoginForm, openRegisterForm]);

  const switchRegisterToLogin = useCallback(() => {
    closeRegisterForm();
    openLoginForm();
  }, [closeRegisterForm, openLoginForm]);

  const switchLoginToForgotPassword = useCallback(() => {
    closeLoginForm();
    openForgotPasswordForm();
  }, [closeLoginForm, openForgotPasswordForm]);

  const switchForgotPasswordToLogin = useCallback(() => {
    closeForgotPasswordForm();
    openLoginForm();
  }, [closeForgotPasswordForm, openLoginForm]);

  // ==========================================
  // Handle Edit My Profile (with force reopen)
  // ==========================================
  const handleEditMyProfile = useCallback(() => {
    logger.debug('handleEditMyProfile called');

    if (isModalOpen(MODAL_IDS.EDIT_MY_PROFILE)) {
      logger.debug('Modal already open, forcing close then reopen...');
      closeEditMyProfileModal();
      setTimeout(() => {
        openEditMyProfileModal();
      }, 50);
    } else {
      openEditMyProfileModal();
    }
  }, [isModalOpen, closeEditMyProfileModal, openEditMyProfileModal]);

  // ==========================================
  // Handle Wizard Create Profile
  // ==========================================
  const handleWizardCreateProfile = useCallback(() => {
    closeEmployeeProfileWizard();
    setIsSelfProfile(true);
    openEmployeeForm(undefined, true);
  }, [closeEmployeeProfileWizard, openEmployeeForm]);

  // ==========================================
  // Submit Handlers
  // ==========================================
  const handleSubmitEmployee = useCallback(async (employeeData: Partial<Employee>) => {
    setIsSubmitting(true);
    try {
      let endpoint: string;
      let method: string;

      if (editingEmployeeData) {
        endpoint = `${import.meta.env.VITE_API_URL}/api/employees/${editingEmployeeData.id}`;
        method = 'PUT';
      } else if (isSelfProfile) {
        endpoint = `${import.meta.env.VITE_API_URL}/api/employees/my-profile`;
        method = 'POST';
      } else {
        endpoint = `${import.meta.env.VITE_API_URL}/api/employees`;
        method = 'POST';
      }

      const response = await secureFetch(endpoint, {
        method,
        body: JSON.stringify(employeeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit employee');
      }

      closeEmployeeForm();

      if (editingEmployeeData && refreshLinkedProfile) {
        await refreshLinkedProfile();
      }

      const successMessage = editingEmployeeData
        ? 'Profile updated successfully!'
        : (isSelfProfile ? 'Your employee profile has been created! Waiting for admin approval.' : 'Employee added successfully!');

      toast.success(successMessage);
    } catch (error) {
      logger.error('Failed to submit employee', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit employee');
    } finally {
      setIsSubmitting(false);
    }
  }, [editingEmployeeData, isSelfProfile, secureFetch, refreshLinkedProfile, closeEmployeeForm]);

  const handleSubmitEstablishment = useCallback(async (establishmentData: Partial<Establishment>) => {
    setIsSubmitting(true);
    try {
      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/establishments`, {
        method: 'POST',
        body: JSON.stringify(establishmentData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit establishment');
      }

      closeEstablishmentForm();
      toast.success('Establishment added successfully!');
    } catch (error) {
      logger.error('Failed to submit establishment', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit establishment');
    } finally {
      setIsSubmitting(false);
    }
  }, [secureFetch, closeEstablishmentForm]);

  return {
    // State
    isSubmitting,
    isSelfProfile,
    editingEmployeeData,
    // Open actions
    openLoginForm,
    openRegisterForm,
    openForgotPasswordForm,
    openEmployeeForm,
    openEstablishmentForm,
    openEmployeeProfileWizard,
    openEditMyProfileModal,
    openUserInfoModal,
    // Close actions
    closeLoginForm,
    closeRegisterForm,
    closeForgotPasswordForm,
    closeEmployeeForm,
    closeEstablishmentForm,
    closeEmployeeProfileWizard,
    closeEditMyProfileModal,
    closeUserInfoModal,
    // Switch actions
    switchLoginToRegister,
    switchRegisterToLogin,
    switchLoginToForgotPassword,
    switchForgotPasswordToLogin,
    // Handlers
    handleSubmitEmployee,
    handleSubmitEstablishment,
    handleEditMyProfile,
    handleWizardCreateProfile,
    // Check
    isModalOpen
  };
};
