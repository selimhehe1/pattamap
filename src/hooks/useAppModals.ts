import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSecureFetch } from './useSecureFetch';
import { Employee, Establishment } from '../types';
import { logger } from '../utils/logger';
import toast from '../utils/toast';

interface AppModalsState {
  showEmployeeForm: boolean;
  showEstablishmentForm: boolean;
  showLoginForm: boolean;
  showRegisterForm: boolean;
  showForgotPasswordForm: boolean; // 🔧 FIX A4
  showEmployeeProfileWizard: boolean;
  showEditMyProfileModal: boolean;
  showUserInfoModal: boolean;
  isSubmitting: boolean;
  isSelfProfile: boolean;
  editingEmployeeData: Employee | null;
}

interface AppModalsActions {
  openEmployeeForm: () => void;
  closeEmployeeForm: () => void;
  openEstablishmentForm: () => void;
  closeEstablishmentForm: () => void;
  openLoginForm: () => void;
  closeLoginForm: () => void;
  openRegisterForm: () => void;
  closeRegisterForm: () => void;
  openForgotPasswordForm: () => void; // 🔧 FIX A4
  closeForgotPasswordForm: () => void; // 🔧 FIX A4
  openEmployeeProfileWizard: () => void;
  closeEmployeeProfileWizard: () => void;
  openEditMyProfileModal: () => void;
  closeEditMyProfileModal: () => void;
  openUserInfoModal: () => void;
  closeUserInfoModal: () => void;
  switchLoginToRegister: () => void;
  switchRegisterToLogin: () => void;
  switchLoginToForgotPassword: () => void; // 🔧 FIX A4
  switchForgotPasswordToLogin: () => void; // 🔧 FIX A4
  handleSubmitEmployee: (employeeData: Partial<Employee>) => Promise<void>;
  handleSubmitEstablishment: (establishmentData: Partial<Establishment>) => Promise<void>;
  handleEditMyProfile: () => void;
  handleWizardCreateProfile: () => void;
}

export type UseAppModalsReturn = AppModalsState & AppModalsActions;

export const useAppModals = (): UseAppModalsReturn => {
  const { secureFetch } = useSecureFetch();
  const { refreshLinkedProfile } = useAuth();

  // Modal visibility states
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showEstablishmentForm, setShowEstablishmentForm] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showForgotPasswordForm, setShowForgotPasswordForm] = useState(false); // 🔧 FIX A4
  const [showEmployeeProfileWizard, setShowEmployeeProfileWizard] = useState(false);
  const [showEditMyProfileModal, setShowEditMyProfileModal] = useState(false);
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSelfProfile, setIsSelfProfile] = useState(false);
  const [editingEmployeeData, setEditingEmployeeData] = useState<Employee | null>(null);

  // Open/Close actions
  const openEmployeeForm = useCallback(() => setShowEmployeeForm(true), []);
  const closeEmployeeForm = useCallback(() => {
    setShowEmployeeForm(false);
    setEditingEmployeeData(null);
    setIsSelfProfile(false);
  }, []);

  const openEstablishmentForm = useCallback(() => setShowEstablishmentForm(true), []);
  const closeEstablishmentForm = useCallback(() => setShowEstablishmentForm(false), []);

  const openLoginForm = useCallback(() => setShowLoginForm(true), []);
  const closeLoginForm = useCallback(() => setShowLoginForm(false), []);

  const openRegisterForm = useCallback(() => setShowRegisterForm(true), []);
  const closeRegisterForm = useCallback(() => setShowRegisterForm(false), []);

  // 🔧 FIX A4: Forgot Password modal
  const openForgotPasswordForm = useCallback(() => setShowForgotPasswordForm(true), []);
  const closeForgotPasswordForm = useCallback(() => setShowForgotPasswordForm(false), []);

  const openEmployeeProfileWizard = useCallback(() => setShowEmployeeProfileWizard(true), []);
  const closeEmployeeProfileWizard = useCallback(() => setShowEmployeeProfileWizard(false), []);

  const openEditMyProfileModal = useCallback(() => setShowEditMyProfileModal(true), []);
  const closeEditMyProfileModal = useCallback(() => {
    logger.debug('Closing EditMyProfileModal');
    setShowEditMyProfileModal(false);
  }, []);

  const openUserInfoModal = useCallback(() => setShowUserInfoModal(true), []);
  const closeUserInfoModal = useCallback(() => setShowUserInfoModal(false), []);

  // Switch between login/register
  const switchLoginToRegister = useCallback(() => {
    setShowLoginForm(false);
    setShowRegisterForm(true);
  }, []);

  const switchRegisterToLogin = useCallback(() => {
    setShowRegisterForm(false);
    setShowLoginForm(true);
  }, []);

  // 🔧 FIX A4: Switch between login/forgot password
  const switchLoginToForgotPassword = useCallback(() => {
    setShowLoginForm(false);
    setShowForgotPasswordForm(true);
  }, []);

  const switchForgotPasswordToLogin = useCallback(() => {
    setShowForgotPasswordForm(false);
    setShowLoginForm(true);
  }, []);

  // Handle edit my profile with force reopen logic
  const handleEditMyProfile = useCallback(() => {
    logger.debug('handleEditMyProfile called! Opening EditMyProfileModal');

    if (showEditMyProfileModal) {
      logger.debug('Modal already open, forcing close then reopen...');
      setShowEditMyProfileModal(false);
      setTimeout(() => {
        setShowEditMyProfileModal(true);
        logger.debug('Modal reopened after reset');
      }, 50);
    } else {
      setShowEditMyProfileModal(true);
      logger.debug('setShowEditMyProfileModal(true) called');
    }
  }, [showEditMyProfileModal]);

  // Handle wizard create profile
  const handleWizardCreateProfile = useCallback(() => {
    setShowEmployeeProfileWizard(false);
    setIsSelfProfile(true);
    setShowEmployeeForm(true);
  }, []);

  // Submit handlers
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

      setShowEmployeeForm(false);
      setIsSelfProfile(false);
      setEditingEmployeeData(null);

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
  }, [editingEmployeeData, isSelfProfile, secureFetch, refreshLinkedProfile]);

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

      setShowEstablishmentForm(false);
      toast.success('Establishment added successfully!');
    } catch (error) {
      logger.error('Failed to submit establishment', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit establishment');
    } finally {
      setIsSubmitting(false);
    }
  }, [secureFetch]);

  return {
    // State
    showEmployeeForm,
    showEstablishmentForm,
    showLoginForm,
    showRegisterForm,
    showForgotPasswordForm, // 🔧 FIX A4
    showEmployeeProfileWizard,
    showEditMyProfileModal,
    showUserInfoModal,
    isSubmitting,
    isSelfProfile,
    editingEmployeeData,
    // Actions
    openEmployeeForm,
    closeEmployeeForm,
    openEstablishmentForm,
    closeEstablishmentForm,
    openLoginForm,
    closeLoginForm,
    openRegisterForm,
    closeRegisterForm,
    openForgotPasswordForm, // 🔧 FIX A4
    closeForgotPasswordForm, // 🔧 FIX A4
    openEmployeeProfileWizard,
    closeEmployeeProfileWizard,
    openEditMyProfileModal,
    closeEditMyProfileModal,
    openUserInfoModal,
    closeUserInfoModal,
    switchLoginToRegister,
    switchRegisterToLogin,
    switchLoginToForgotPassword, // 🔧 FIX A4
    switchForgotPasswordToLogin, // 🔧 FIX A4
    handleSubmitEmployee,
    handleSubmitEstablishment,
    handleEditMyProfile,
    handleWizardCreateProfile
  };
};
