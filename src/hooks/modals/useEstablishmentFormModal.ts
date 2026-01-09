/**
 * useEstablishmentFormModal - Establishment Form Modal Management Hook
 *
 * Handles the establishment form modal for creating establishments.
 * Includes submission logic and state management.
 *
 * REFACTORED: Consolidated duplicate submission logic into submitEstablishmentRequest helper.
 */

import { useCallback, useState, lazy } from 'react';
import { useModal } from '../../contexts/ModalContext';
import { useSecureFetch } from '../useSecureFetch';
import { Establishment } from '../../types';
import { logger } from '../../utils/logger';
import notification from '../../utils/notification';

// Lazy-loaded modal component
const EstablishmentForm = lazy(() => import('../../components/Forms/EstablishmentForm'));

// Modal ID
export const ESTABLISHMENT_FORM_MODAL_ID = 'app-establishment-form';

export interface UseEstablishmentFormModalState {
  isSubmitting: boolean;
}

export interface UseEstablishmentFormModalActions {
  openEstablishmentForm: () => void;
  closeEstablishmentForm: () => void;
  handleSubmitEstablishment: (establishmentData: Partial<Establishment>) => Promise<void>;
}

export type UseEstablishmentFormModalReturn = UseEstablishmentFormModalState & UseEstablishmentFormModalActions;

export const useEstablishmentFormModal = (): UseEstablishmentFormModalReturn => {
  const { secureFetch } = useSecureFetch();
  const { openModal, closeModal } = useModal();

  // Form-specific state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // Core submission logic (single source of truth)
  // ==========================================
  const submitEstablishmentRequest = useCallback(async (
    establishmentData: Partial<Establishment>
  ): Promise<boolean> => {
    const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/establishments`, {
      method: 'POST',
      body: JSON.stringify(establishmentData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit establishment');
    }

    notification.success('Establishment added successfully!');
    return true;
  }, [secureFetch]);

  // ==========================================
  // Close Establishment Form Modal
  // ==========================================
  const closeEstablishmentForm = useCallback(() => {
    closeModal(ESTABLISHMENT_FORM_MODAL_ID);
  }, [closeModal]);

  // ==========================================
  // Open Establishment Form Modal
  // ==========================================
  const openEstablishmentForm = useCallback(() => {
    // Define submit handler inline to capture latest state
    const submitHandler = async (establishmentData: Partial<Establishment>) => {
      setIsSubmitting(true);
      try {
        await submitEstablishmentRequest(establishmentData);
        closeEstablishmentForm();
      } catch (error) {
        logger.error('Failed to submit establishment', error);
        notification.error(error instanceof Error ? error.message : 'Failed to submit establishment');
      } finally {
        setIsSubmitting(false);
      }
    };

    openModal(ESTABLISHMENT_FORM_MODAL_ID, EstablishmentForm, {
      onSubmit: submitHandler,
      isLoading: isSubmitting,
      onCancel: closeEstablishmentForm
    }, { size: 'large', closeOnOverlayClick: false });
  }, [openModal, isSubmitting, submitEstablishmentRequest, closeEstablishmentForm]);

  // ==========================================
  // Handle Submit Establishment (standalone)
  // ==========================================
  const handleSubmitEstablishment = useCallback(async (establishmentData: Partial<Establishment>) => {
    setIsSubmitting(true);
    try {
      await submitEstablishmentRequest(establishmentData);
      closeEstablishmentForm();
    } catch (error) {
      logger.error('Failed to submit establishment', error);
      notification.error(error instanceof Error ? error.message : 'Failed to submit establishment');
    } finally {
      setIsSubmitting(false);
    }
  }, [submitEstablishmentRequest, closeEstablishmentForm]);

  return {
    // State
    isSubmitting,
    // Actions
    openEstablishmentForm,
    closeEstablishmentForm,
    handleSubmitEstablishment
  };
};
