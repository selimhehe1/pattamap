/**
 * useAuthModals - Authentication Modal Management Hook
 *
 * Handles Login, Register, and Forgot Password modals.
 * Includes switch actions between modals.
 */

import { useCallback, lazy } from 'react';
import { useModal } from '../../contexts/ModalContext';
import { logger } from '../../utils/logger';

// Lazy-loaded modal components
const LoginForm = lazy(() => import('../../components/Auth/LoginForm'));
const MultiStepRegisterForm = lazy(() => import('../../components/Auth/MultiStepRegisterForm'));

// Modal IDs
export const AUTH_MODAL_IDS = {
  LOGIN: 'app-login',
  REGISTER: 'app-register',
  FORGOT_PASSWORD: 'app-forgot-password'
} as const;

export interface UseAuthModalsReturn {
  // Open actions
  openLoginForm: () => void;
  openRegisterForm: () => void;
  openForgotPasswordForm: () => void;
  // Close actions
  closeLoginForm: () => void;
  closeRegisterForm: () => void;
  closeForgotPasswordForm: () => void;
  // Switch actions
  switchLoginToRegister: () => void;
  switchRegisterToLogin: () => void;
  switchLoginToForgotPassword: () => void;
  switchForgotPasswordToLogin: () => void;
}

export const useAuthModals = (): UseAuthModalsReturn => {
  const { openModal, closeModal } = useModal();

  // ==========================================
  // Login Modal
  // ==========================================
  const openLoginForm = useCallback(() => {
    openModal(AUTH_MODAL_IDS.LOGIN, LoginForm, {
      onClose: () => closeModal(AUTH_MODAL_IDS.LOGIN),
      embedded: true,
      onSwitchToRegister: () => {
        closeModal(AUTH_MODAL_IDS.LOGIN);
        openModal(AUTH_MODAL_IDS.REGISTER, MultiStepRegisterForm, {
          onClose: () => closeModal(AUTH_MODAL_IDS.REGISTER),
          onSwitchToLogin: () => {
            closeModal(AUTH_MODAL_IDS.REGISTER);
            openModal(AUTH_MODAL_IDS.LOGIN, LoginForm, {
              onClose: () => closeModal(AUTH_MODAL_IDS.LOGIN),
              embedded: true
            }, { size: 'medium' });
          }
        }, { size: 'large' });
      }
    }, { size: 'medium' });
  }, [openModal, closeModal]);

  const closeLoginForm = useCallback(() => {
    closeModal(AUTH_MODAL_IDS.LOGIN);
  }, [closeModal]);

  // ==========================================
  // Register Modal
  // ==========================================
  const openRegisterForm = useCallback(() => {
    openModal(AUTH_MODAL_IDS.REGISTER, MultiStepRegisterForm, {
      onClose: () => closeModal(AUTH_MODAL_IDS.REGISTER),
      onSwitchToLogin: () => {
        closeModal(AUTH_MODAL_IDS.REGISTER);
        openLoginForm();
      }
    }, { size: 'large' });
  }, [openModal, closeModal, openLoginForm]);

  const closeRegisterForm = useCallback(() => {
    closeModal(AUTH_MODAL_IDS.REGISTER);
  }, [closeModal]);

  // ==========================================
  // Forgot Password Modal (placeholder)
  // ==========================================
  const openForgotPasswordForm = useCallback(() => {
    // TODO: Implement ForgotPasswordForm component
    logger.debug('Forgot password form not yet implemented');
  }, []);

  const closeForgotPasswordForm = useCallback(() => {
    closeModal(AUTH_MODAL_IDS.FORGOT_PASSWORD);
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

  return {
    openLoginForm,
    openRegisterForm,
    openForgotPasswordForm,
    closeLoginForm,
    closeRegisterForm,
    closeForgotPasswordForm,
    switchLoginToRegister,
    switchRegisterToLogin,
    switchLoginToForgotPassword,
    switchForgotPasswordToLogin
  };
};
