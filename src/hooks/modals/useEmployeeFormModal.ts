/**
 * useEmployeeFormModal - Employee Form Modal Management Hook
 *
 * Handles the employee form modal for creating and editing employees.
 * Includes submission logic and state management.
 */

import { useCallback, useState, lazy } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { useSecureFetch } from '../useSecureFetch';
import { Employee } from '../../types';
import { logger } from '../../utils/logger';
import notification from '../../utils/notification';

// Lazy-loaded modal component
const EmployeeForm = lazy(() => import('../../components/Forms/EmployeeForm'));

// Modal ID
export const EMPLOYEE_FORM_MODAL_ID = 'app-employee-form';

export interface UseEmployeeFormModalState {
  isSubmitting: boolean;
  isSelfProfile: boolean;
  editingEmployeeData: Employee | null;
}

export interface UseEmployeeFormModalActions {
  openEmployeeForm: (editData?: Employee, selfProfile?: boolean) => void;
  closeEmployeeForm: () => void;
  handleSubmitEmployee: (employeeData: Partial<Employee>) => Promise<void>;
}

export type UseEmployeeFormModalReturn = UseEmployeeFormModalState & UseEmployeeFormModalActions;

export const useEmployeeFormModal = (): UseEmployeeFormModalReturn => {
  const { secureFetch } = useSecureFetch();
  const { refreshLinkedProfile } = useAuth();
  const { openModal, closeModal } = useModal();

  // Form-specific states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSelfProfile, setIsSelfProfile] = useState(false);
  const [editingEmployeeData, setEditingEmployeeData] = useState<Employee | null>(null);

  // ==========================================
  // Open Employee Form Modal
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
          body: JSON.stringify(employeeData),
          forceCSRFRefresh: true
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to submit employee');
        }

        closeModal(EMPLOYEE_FORM_MODAL_ID);
        setEditingEmployeeData(null);
        setIsSelfProfile(false);

        if (editData && refreshLinkedProfile) {
          await refreshLinkedProfile();
        }

        const successMessage = editData
          ? 'Profile updated successfully!'
          : (selfProfile ? 'Your employee profile has been created! Waiting for admin approval.' : 'Employee added successfully!');

        notification.success(successMessage);
      } catch (error) {
        logger.error('Failed to submit employee', error);
        notification.error(error instanceof Error ? error.message : 'Failed to submit employee');
      } finally {
        setIsSubmitting(false);
      }
    };

    openModal(EMPLOYEE_FORM_MODAL_ID, EmployeeForm, {
      initialData: editData,
      isLoading: isSubmitting,
      onSubmit: submitHandler,
      onCancel: () => {
        closeModal(EMPLOYEE_FORM_MODAL_ID);
        setEditingEmployeeData(null);
        setIsSelfProfile(false);
      }
    }, { size: 'large', closeOnOverlayClick: false });
  }, [openModal, closeModal, isSubmitting, secureFetch, refreshLinkedProfile]);

  // ==========================================
  // Close Employee Form Modal
  // ==========================================
  const closeEmployeeForm = useCallback(() => {
    closeModal(EMPLOYEE_FORM_MODAL_ID);
    setEditingEmployeeData(null);
    setIsSelfProfile(false);
  }, [closeModal]);

  // ==========================================
  // Handle Submit Employee (standalone)
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
        body: JSON.stringify(employeeData),
        forceCSRFRefresh: true
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

      notification.success(successMessage);
    } catch (error) {
      logger.error('Failed to submit employee', error);
      notification.error(error instanceof Error ? error.message : 'Failed to submit employee');
    } finally {
      setIsSubmitting(false);
    }
  }, [editingEmployeeData, isSelfProfile, secureFetch, refreshLinkedProfile, closeEmployeeForm]);

  return {
    // State
    isSubmitting,
    isSelfProfile,
    editingEmployeeData,
    // Actions
    openEmployeeForm,
    closeEmployeeForm,
    handleSubmitEmployee
  };
};
