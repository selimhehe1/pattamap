/**
 * @vitest-environment jsdom
 */
/**
 * useDialog Hook Tests
 *
 * Tests for dialog/confirmation modals:
 * - confirm (3 tests)
 * - prompt (2 tests)
 * - confirmDelete (2 tests)
 * - confirmDiscard (2 tests)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDialog } from '../useDialog';

// Mock openModal and closeModal
const mockOpenModal = vi.fn();
const mockCloseModal = vi.fn();

// Mock ModalContext
vi.mock('../../contexts/ModalContext', () => ({
  useModal: () => ({
    openModal: mockOpenModal,
    closeModal: mockCloseModal,
  }),
}));

describe('useDialog Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('confirm', () => {
    it('should return confirm, prompt, confirmDelete, confirmDiscard functions', () => {
      const { result } = renderHook(() => useDialog());

      expect(typeof result.current.confirm).toBe('function');
      expect(typeof result.current.prompt).toBe('function');
      expect(typeof result.current.confirmDelete).toBe('function');
      expect(typeof result.current.confirmDiscard).toBe('function');
    });

    it('should open modal when confirm is called', async () => {
      const { result } = renderHook(() => useDialog());

      // Start confirm (don't await yet)
      act(() => {
        result.current.confirm('Are you sure?');
      });

      expect(mockOpenModal).toHaveBeenCalledWith(
        expect.stringContaining('confirm-'),
        expect.any(Function), // ConfirmModal component
        expect.objectContaining({
          message: 'Are you sure?',
          variant: 'info',
        }),
        expect.objectContaining({
          closeOnOverlayClick: true,
          closeOnEscape: true,
        })
      );
    });

    it('should pass custom options to modal', async () => {
      const { result } = renderHook(() => useDialog());

      act(() => {
        result.current.confirm('Delete item?', {
          title: 'Confirm Delete',
          variant: 'danger',
          confirmText: 'Yes, Delete',
          cancelText: 'No, Keep',
        });
      });

      expect(mockOpenModal).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({
          message: 'Delete item?',
          title: 'Confirm Delete',
          variant: 'danger',
          confirmText: 'Yes, Delete',
          cancelText: 'No, Keep',
        }),
        expect.any(Object)
      );
    });

    it('should resolve true when confirmed', async () => {
      const { result } = renderHook(() => useDialog());

      let confirmResult: boolean | undefined;

      await act(async () => {
        const promise = result.current.confirm('Are you sure?');

        // Simulate user clicking confirm
        const openModalCall = mockOpenModal.mock.calls[0];
        const props = openModalCall[2];
        props.onConfirm();

        confirmResult = await promise;
      });

      expect(confirmResult).toBe(true);
      expect(mockCloseModal).toHaveBeenCalled();
    });

    it('should resolve false when cancelled', async () => {
      const { result } = renderHook(() => useDialog());

      let confirmResult: boolean | undefined;

      await act(async () => {
        const promise = result.current.confirm('Are you sure?');

        // Simulate user clicking cancel
        const openModalCall = mockOpenModal.mock.calls[0];
        const props = openModalCall[2];
        props.onCancel();

        confirmResult = await promise;
      });

      expect(confirmResult).toBe(false);
      expect(mockCloseModal).toHaveBeenCalled();
    });
  });

  describe('prompt', () => {
    it('should open prompt modal', async () => {
      const { result } = renderHook(() => useDialog());

      act(() => {
        result.current.prompt('Enter reason:');
      });

      expect(mockOpenModal).toHaveBeenCalledWith(
        expect.stringContaining('prompt-'),
        expect.any(Function), // PromptModal component
        expect.objectContaining({
          message: 'Enter reason:',
          variant: 'info',
        }),
        expect.objectContaining({
          closeOnOverlayClick: false, // Don't close on overlay for prompts
          closeOnEscape: true,
        })
      );
    });

    it('should resolve with value when submitted', async () => {
      const { result } = renderHook(() => useDialog());

      let promptResult: string | null | undefined;

      await act(async () => {
        const promise = result.current.prompt('Enter name:');

        // Simulate user submitting
        const openModalCall = mockOpenModal.mock.calls[0];
        const props = openModalCall[2];
        props.onSubmit('John Doe');

        promptResult = await promise;
      });

      expect(promptResult).toBe('John Doe');
    });

    it('should resolve null when cancelled', async () => {
      const { result } = renderHook(() => useDialog());

      let promptResult: string | null | undefined;

      await act(async () => {
        const promise = result.current.prompt('Enter name:');

        // Simulate user cancelling
        const openModalCall = mockOpenModal.mock.calls[0];
        const props = openModalCall[2];
        props.onCancel();

        promptResult = await promise;
      });

      expect(promptResult).toBeNull();
    });
  });

  describe('confirmDelete', () => {
    it('should call confirm with danger variant', async () => {
      const { result } = renderHook(() => useDialog());

      act(() => {
        result.current.confirmDelete('Test Item');
      });

      expect(mockOpenModal).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({
          variant: 'danger',
          confirmText: 'Delete',
          cancelText: 'Cancel',
        }),
        expect.any(Object)
      );
    });

    it('should include item name in message', async () => {
      const { result } = renderHook(() => useDialog());

      act(() => {
        result.current.confirmDelete('My Document');
      });

      const openModalCall = mockOpenModal.mock.calls[0];
      const props = openModalCall[2];
      expect(props.message).toContain('My Document');
    });
  });

  describe('confirmDiscard', () => {
    it('should call confirm with warning variant', async () => {
      const { result } = renderHook(() => useDialog());

      act(() => {
        result.current.confirmDiscard();
      });

      expect(mockOpenModal).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({
          variant: 'warning',
          confirmText: 'Discard',
          cancelText: 'Keep Editing',
        }),
        expect.any(Object)
      );
    });

    it('should use custom message when provided', async () => {
      const { result } = renderHook(() => useDialog());

      act(() => {
        result.current.confirmDiscard('Custom discard message');
      });

      const openModalCall = mockOpenModal.mock.calls[0];
      const props = openModalCall[2];
      expect(props.message).toBe('Custom discard message');
    });
  });
});
