/**
 * useProfileModals - Profile-related Modal Management Hook
 *
 * Handles Employee Profile Wizard, Edit My Profile, and User Info modals.
 */

import { useCallback, lazy } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { logger } from '../../utils/logger';

// Lazy-loaded modal components
const EmployeeProfileWizard = lazy(() => import('../../components/Employee/EmployeeProfileWizard'));
const EditEmployeeModal = lazy(() => import('../../components/Employee/EditEmployeeModal'));
const UserInfoModal = lazy(() => import('../../components/User/UserInfoModal'));

// Modal IDs
export const PROFILE_MODAL_IDS = {
  EMPLOYEE_WIZARD: 'app-employee-wizard',
  EDIT_MY_PROFILE: 'app-edit-my-profile',
  USER_INFO: 'app-user-info'
} as const;

export interface UseProfileModalsActions {
  // Employee Wizard
  openEmployeeProfileWizard: (onCreateProfile?: () => void) => void;
  closeEmployeeProfileWizard: () => void;
  // Edit My Profile
  openEditMyProfileModal: () => void;
  closeEditMyProfileModal: () => void;
  handleEditMyProfile: () => void;
  // User Info
  openUserInfoModal: () => void;
  closeUserInfoModal: () => void;
}

export type UseProfileModalsReturn = UseProfileModalsActions;

export const useProfileModals = (): UseProfileModalsReturn => {
  const { user, refreshLinkedProfile } = useAuth();
  const { openModal, closeModal, isModalOpen } = useModal();

  // ==========================================
  // Employee Profile Wizard Modal
  // ==========================================
  const openEmployeeProfileWizard = useCallback((onCreateProfile?: () => void) => {
    openModal(PROFILE_MODAL_IDS.EMPLOYEE_WIZARD, EmployeeProfileWizard, {
      onClose: () => closeModal(PROFILE_MODAL_IDS.EMPLOYEE_WIZARD),
      onCreateProfile: () => {
        closeModal(PROFILE_MODAL_IDS.EMPLOYEE_WIZARD);
        if (onCreateProfile) {
          onCreateProfile();
        }
      }
    }, { size: 'medium' });
  }, [openModal, closeModal]);

  const closeEmployeeProfileWizard = useCallback(() => {
    closeModal(PROFILE_MODAL_IDS.EMPLOYEE_WIZARD);
  }, [closeModal]);

  // ==========================================
  // Edit My Profile Modal
  // ==========================================
  const openEditMyProfileModal = useCallback(() => {
    openModal(PROFILE_MODAL_IDS.EDIT_MY_PROFILE, EditEmployeeModal, {
      isOpen: true,
      onClose: () => closeModal(PROFILE_MODAL_IDS.EDIT_MY_PROFILE),
      onProfileUpdated: async () => {
        if (refreshLinkedProfile) {
          await refreshLinkedProfile();
        }
        logger.debug('Profile updated successfully via modal');
      }
    }, { size: 'profile' });
  }, [openModal, closeModal, refreshLinkedProfile]);

  const closeEditMyProfileModal = useCallback(() => {
    closeModal(PROFILE_MODAL_IDS.EDIT_MY_PROFILE);
  }, [closeModal]);

  // Handle Edit My Profile (with force reopen)
  const handleEditMyProfile = useCallback(() => {
    logger.debug('handleEditMyProfile called');

    if (isModalOpen(PROFILE_MODAL_IDS.EDIT_MY_PROFILE)) {
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
  // User Info Modal
  // ==========================================
  const openUserInfoModal = useCallback(() => {
    if (!user) {
      logger.warn('Cannot open user info modal: no user');
      return;
    }
    openModal(PROFILE_MODAL_IDS.USER_INFO, UserInfoModal, {
      user,
      onClose: () => closeModal(PROFILE_MODAL_IDS.USER_INFO)
    }, { size: 'medium' });
  }, [openModal, closeModal, user]);

  const closeUserInfoModal = useCallback(() => {
    closeModal(PROFILE_MODAL_IDS.USER_INFO);
  }, [closeModal]);

  return {
    // Employee Wizard
    openEmployeeProfileWizard,
    closeEmployeeProfileWizard,
    // Edit My Profile
    openEditMyProfileModal,
    closeEditMyProfileModal,
    handleEditMyProfile,
    // User Info
    openUserInfoModal,
    closeUserInfoModal
  };
};
