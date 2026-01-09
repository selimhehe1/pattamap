/**
 * useEmployeeFormModal - Employee Form Modal Management Hook
 *
 * Handles the employee form modal for creating and editing employees.
 * Includes submission logic and state management.
 *
 * REFACTORED: Consolidated duplicate submission logic into submitEmployeeRequest helper.
 */

import { useCallback, useState, useRef, lazy } from 'react';
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

/**
 * Determines the API endpoint and method for employee submission
 */
const getEmployeeEndpoint = (editData?: Employee | null, selfProfile?: boolean): { endpoint: string; method: string } => {
  const baseUrl = import.meta.env.VITE_API_URL;

  if (editData) {
    return {
      endpoint: `${baseUrl}/api/employees/${editData.id}`,
      method: 'PUT'
    };
  }

  if (selfProfile) {
    return {
      endpoint: `${baseUrl}/api/employees/my-profile`,
      method: 'POST'
    };
  }

  return {
    endpoint: `${baseUrl}/api/employees`,
    method: 'POST'
  };
};

/**
 * Generates success message based on submission type
 */
const getSuccessMessage = (isEdit: boolean, isSelfProfile: boolean): string => {
  if (isEdit) {
    return 'Profile updated successfully!';
  }
  if (isSelfProfile) {
    return 'Your employee profile has been created! Waiting for admin approval.';
  }
  return 'Employee added successfully!';
};

export const useEmployeeFormModal = (): UseEmployeeFormModalReturn => {
  const { secureFetch } = useSecureFetch();
  const { refreshLinkedProfile } = useAuth();
  const { openModal, closeModal } = useModal();

  // Form-specific states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSelfProfile, setIsSelfProfile] = useState(false);
  const [editingEmployeeData, setEditingEmployeeData] = useState<Employee | null>(null);

  // Ref to store current context for inline handler
  const contextRef = useRef<{ editData?: Employee | null; selfProfile?: boolean }>({});

  // ==========================================
  // Core submission logic (single source of truth)
  // ==========================================
  const submitEmployeeRequest = useCallback(async (
    employeeData: Partial<Employee>,
    editData?: Employee | null,
    selfProfile?: boolean
  ): Promise<boolean> => {
    const { endpoint, method } = getEmployeeEndpoint(editData, selfProfile);

    const response = await secureFetch(endpoint, {
      method,
      body: JSON.stringify(employeeData),
      forceCSRFRefresh: true
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit employee');
    }

    // Refresh linked profile if editing
    if (editData && refreshLinkedProfile) {
      await refreshLinkedProfile();
    }

    notification.success(getSuccessMessage(!!editData, !!selfProfile));
    return true;
  }, [secureFetch, refreshLinkedProfile]);

  // ==========================================
  // Close Employee Form Modal
  // ==========================================
  const closeEmployeeForm = useCallback(() => {
    closeModal(EMPLOYEE_FORM_MODAL_ID);
    setEditingEmployeeData(null);
    setIsSelfProfile(false);
    contextRef.current = {};
  }, [closeModal]);

  // ==========================================
  // Open Employee Form Modal
  // ==========================================
  const openEmployeeForm = useCallback((editData?: Employee, selfProfile?: boolean) => {
    setEditingEmployeeData(editData || null);
    setIsSelfProfile(selfProfile || false);
    contextRef.current = { editData, selfProfile };

    // Submit handler uses ref to capture context at modal open time
    const submitHandler = async (employeeData: Partial<Employee>) => {
      setIsSubmitting(true);
      try {
        await submitEmployeeRequest(
          employeeData,
          contextRef.current.editData,
          contextRef.current.selfProfile
        );
        closeEmployeeForm();
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
      onCancel: closeEmployeeForm
    }, { size: 'large', closeOnOverlayClick: false });
  }, [openModal, isSubmitting, submitEmployeeRequest, closeEmployeeForm]);

  // ==========================================
  // Handle Submit Employee (standalone - uses state)
  // ==========================================
  const handleSubmitEmployee = useCallback(async (employeeData: Partial<Employee>) => {
    setIsSubmitting(true);
    try {
      await submitEmployeeRequest(employeeData, editingEmployeeData, isSelfProfile);
      closeEmployeeForm();
    } catch (error) {
      logger.error('Failed to submit employee', error);
      notification.error(error instanceof Error ? error.message : 'Failed to submit employee');
    } finally {
      setIsSubmitting(false);
    }
  }, [editingEmployeeData, isSelfProfile, submitEmployeeRequest, closeEmployeeForm]);

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
