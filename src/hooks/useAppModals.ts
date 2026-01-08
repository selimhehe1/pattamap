/**
 * useAppModals - Application Modal Management Hook
 *
 * Composes all modal hooks into a single unified interface.
 * For specific use cases, individual hooks can be imported directly:
 * - useAuthModals: Login, Register, Forgot Password
 * - useEmployeeFormModal: Employee creation/editing
 * - useEstablishmentFormModal: Establishment creation
 * - useProfileModals: Profile wizard, Edit profile, User info
 */

import { useCallback } from 'react';
import { useModal } from '../contexts/ModalContext';
import { Employee, Establishment } from '../types';

// Import individual modal hooks
import {
  useAuthModals,
  AUTH_MODAL_IDS
} from './modals/useAuthModals';

import {
  useEmployeeFormModal,
  EMPLOYEE_FORM_MODAL_ID
} from './modals/useEmployeeFormModal';

import {
  useEstablishmentFormModal,
  ESTABLISHMENT_FORM_MODAL_ID
} from './modals/useEstablishmentFormModal';

import {
  useProfileModals,
  PROFILE_MODAL_IDS
} from './modals/useProfileModals';

// Re-export MODAL_IDS for backward compatibility
export const MODAL_IDS = {
  ...AUTH_MODAL_IDS,
  EMPLOYEE_FORM: EMPLOYEE_FORM_MODAL_ID,
  ESTABLISHMENT_FORM: ESTABLISHMENT_FORM_MODAL_ID,
  ...PROFILE_MODAL_IDS
} as const;

interface AppModalsState {
  isSubmitting: boolean;
  isSelfProfile: boolean;
  editingEmployeeData: Employee | null;
}

interface AppModalsActions {
  // Auth modals
  openLoginForm: () => void;
  openRegisterForm: () => void;
  openForgotPasswordForm: () => void;
  closeLoginForm: () => void;
  closeRegisterForm: () => void;
  closeForgotPasswordForm: () => void;
  switchLoginToRegister: () => void;
  switchRegisterToLogin: () => void;
  switchLoginToForgotPassword: () => void;
  switchForgotPasswordToLogin: () => void;
  // Employee form
  openEmployeeForm: (editData?: Employee, selfProfile?: boolean) => void;
  closeEmployeeForm: () => void;
  handleSubmitEmployee: (employeeData: Partial<Employee>) => Promise<void>;
  // Establishment form
  openEstablishmentForm: () => void;
  closeEstablishmentForm: () => void;
  handleSubmitEstablishment: (establishmentData: Partial<Establishment>) => Promise<void>;
  // Profile modals
  openEmployeeProfileWizard: () => void;
  closeEmployeeProfileWizard: () => void;
  openEditMyProfileModal: () => void;
  closeEditMyProfileModal: () => void;
  openUserInfoModal: () => void;
  closeUserInfoModal: () => void;
  handleEditMyProfile: () => void;
  handleWizardCreateProfile: () => void;
  // Utility
  isModalOpen: (modalId: string) => boolean;
}

export type UseAppModalsReturn = AppModalsState & AppModalsActions;

export const useAppModals = (): UseAppModalsReturn => {
  const { isModalOpen } = useModal();

  // Compose individual hooks
  const authModals = useAuthModals();
  const employeeFormModal = useEmployeeFormModal();
  const establishmentFormModal = useEstablishmentFormModal();
  const profileModals = useProfileModals();

  // ==========================================
  // Handle Wizard Create Profile
  // ==========================================
  const handleWizardCreateProfile = useCallback(() => {
    profileModals.closeEmployeeProfileWizard();
    employeeFormModal.openEmployeeForm(undefined, true);
  }, [profileModals, employeeFormModal]);

  // ==========================================
  // Wrap openEmployeeProfileWizard to connect to employee form
  // ==========================================
  const openEmployeeProfileWizard = useCallback(() => {
    profileModals.openEmployeeProfileWizard(() => {
      employeeFormModal.openEmployeeForm(undefined, true);
    });
  }, [profileModals, employeeFormModal]);

  return {
    // State from employee form modal
    isSubmitting: employeeFormModal.isSubmitting || establishmentFormModal.isSubmitting,
    isSelfProfile: employeeFormModal.isSelfProfile,
    editingEmployeeData: employeeFormModal.editingEmployeeData,

    // Auth modal actions
    openLoginForm: authModals.openLoginForm,
    openRegisterForm: authModals.openRegisterForm,
    openForgotPasswordForm: authModals.openForgotPasswordForm,
    closeLoginForm: authModals.closeLoginForm,
    closeRegisterForm: authModals.closeRegisterForm,
    closeForgotPasswordForm: authModals.closeForgotPasswordForm,
    switchLoginToRegister: authModals.switchLoginToRegister,
    switchRegisterToLogin: authModals.switchRegisterToLogin,
    switchLoginToForgotPassword: authModals.switchLoginToForgotPassword,
    switchForgotPasswordToLogin: authModals.switchForgotPasswordToLogin,

    // Employee form actions
    openEmployeeForm: employeeFormModal.openEmployeeForm,
    closeEmployeeForm: employeeFormModal.closeEmployeeForm,
    handleSubmitEmployee: employeeFormModal.handleSubmitEmployee,

    // Establishment form actions
    openEstablishmentForm: establishmentFormModal.openEstablishmentForm,
    closeEstablishmentForm: establishmentFormModal.closeEstablishmentForm,
    handleSubmitEstablishment: establishmentFormModal.handleSubmitEstablishment,

    // Profile modal actions
    openEmployeeProfileWizard,
    closeEmployeeProfileWizard: profileModals.closeEmployeeProfileWizard,
    openEditMyProfileModal: profileModals.openEditMyProfileModal,
    closeEditMyProfileModal: profileModals.closeEditMyProfileModal,
    openUserInfoModal: profileModals.openUserInfoModal,
    closeUserInfoModal: profileModals.closeUserInfoModal,
    handleEditMyProfile: profileModals.handleEditMyProfile,
    handleWizardCreateProfile,

    // Utility
    isModalOpen
  };
};
