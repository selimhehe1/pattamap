import { useCallback } from 'react';
import { useModal } from '../contexts/ModalContext';
import ConfirmModal, { ConfirmModalProps, ConfirmVariant } from '../components/Common/ConfirmModal';
import PromptModal, { PromptModalProps } from '../components/Common/PromptModal';

/**
 * Hook for easy dialog/confirmation modals
 *
 * Usage:
 * ```tsx
 * const dialog = useDialog();
 *
 * // Confirm dialog
 * const confirmed = await dialog.confirm('Delete this item?', { variant: 'danger' });
 * if (confirmed) { ... }
 *
 * // Prompt dialog
 * const reason = await dialog.prompt('Enter reason:', { minLength: 10 });
 * if (reason) { ... }
 * ```
 */
export const useDialog = () => {
  const { openModal, closeModal } = useModal();

  /**
   * Show a confirmation dialog
   * Returns a Promise that resolves to true if confirmed, false if cancelled
   */
  const confirm = useCallback(
    (
      message: string,
      options?: {
        title?: string;
        variant?: ConfirmVariant;
        confirmText?: string;
        cancelText?: string;
      }
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        const modalId = `confirm-${Date.now()}`;

        const handleConfirm = () => {
          closeModal(modalId);
          resolve(true);
        };

        const handleCancel = () => {
          closeModal(modalId);
          resolve(false);
        };

        const props: Omit<ConfirmModalProps, 'onClose'> = {
          message,
          title: options?.title,
          variant: options?.variant || 'info',
          confirmText: options?.confirmText,
          cancelText: options?.cancelText,
          onConfirm: handleConfirm,
          onCancel: handleCancel,
        };

        openModal(modalId, ConfirmModal, props, {
          closeOnOverlayClick: true,
          closeOnEscape: true,
          showCloseButton: false,
          size: 'small',
        });
      });
    },
    [openModal, closeModal]
  );

  /**
   * Show a prompt dialog for text input
   * Returns a Promise that resolves to the input string if submitted, null if cancelled
   */
  const prompt = useCallback(
    (
      message: string,
      options?: {
        title?: string;
        placeholder?: string;
        defaultValue?: string;
        minLength?: number;
        maxLength?: number;
        required?: boolean;
        variant?: 'info' | 'warning' | 'danger';
        submitText?: string;
        cancelText?: string;
      }
    ): Promise<string | null> => {
      return new Promise((resolve) => {
        const modalId = `prompt-${Date.now()}`;

        const handleSubmit = (value: string) => {
          closeModal(modalId);
          resolve(value);
        };

        const handleCancel = () => {
          closeModal(modalId);
          resolve(null);
        };

        const props: Omit<PromptModalProps, 'onClose'> = {
          message,
          title: options?.title,
          placeholder: options?.placeholder,
          defaultValue: options?.defaultValue,
          minLength: options?.minLength,
          maxLength: options?.maxLength,
          required: options?.required,
          variant: options?.variant || 'info',
          submitText: options?.submitText,
          cancelText: options?.cancelText,
          onSubmit: handleSubmit,
          onCancel: handleCancel,
        };

        openModal(modalId, PromptModal, props, {
          closeOnOverlayClick: false, // Don't close on overlay click for prompts (might lose data)
          closeOnEscape: true,
          showCloseButton: false,
          size: 'small',
        });
      });
    },
    [openModal, closeModal]
  );

  /**
   * Convenience method for danger confirmation (e.g., delete actions)
   */
  const confirmDelete = useCallback(
    (itemName: string, options?: { title?: string }): Promise<boolean> => {
      return confirm(
        `Are you sure you want to permanently delete "${itemName}"? This action cannot be undone.`,
        {
          title: options?.title || 'Confirm Deletion',
          variant: 'danger',
          confirmText: 'Delete',
          cancelText: 'Cancel',
        }
      );
    },
    [confirm]
  );

  /**
   * Convenience method for warning confirmation (e.g., reject, discard changes)
   */
  const confirmDiscard = useCallback(
    (message?: string): Promise<boolean> => {
      return confirm(
        message || 'You have unsaved changes. Are you sure you want to discard them?',
        {
          title: 'Discard Changes?',
          variant: 'warning',
          confirmText: 'Discard',
          cancelText: 'Keep Editing',
        }
      );
    },
    [confirm]
  );

  return {
    confirm,
    prompt,
    confirmDelete,
    confirmDiscard,
  };
};
