/**
 * @vitest-environment jsdom
 */
/**
 * useModals Hook Tests
 *
 * Tests for modal state management:
 * - Initial state (1 test)
 * - Open/close actions (4 tests)
 * - Close all modals (1 test)
 * - Body class management (2 tests)
 * - Submitting state (1 test)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModals } from '../useModals';

describe('useModals Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.classList.remove('modal-open');
  });

  afterEach(() => {
    document.body.classList.remove('modal-open');
  });

  describe('Initial state', () => {
    it('should have all modals closed initially', () => {
      const { result } = renderHook(() => useModals());

      expect(result.current.showLogin).toBe(false);
      expect(result.current.showRegister).toBe(false);
      expect(result.current.showEmployeeForm).toBe(false);
      expect(result.current.showEstablishmentForm).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('Open/close actions', () => {
    it('should open and close login modal', () => {
      const { result } = renderHook(() => useModals());

      act(() => {
        result.current.openLoginModal();
      });
      expect(result.current.showLogin).toBe(true);

      act(() => {
        result.current.closeLoginModal();
      });
      expect(result.current.showLogin).toBe(false);
    });

    it('should open and close register modal', () => {
      const { result } = renderHook(() => useModals());

      act(() => {
        result.current.openRegisterModal();
      });
      expect(result.current.showRegister).toBe(true);

      act(() => {
        result.current.closeRegisterModal();
      });
      expect(result.current.showRegister).toBe(false);
    });

    it('should open and close employee form modal', () => {
      const { result } = renderHook(() => useModals());

      act(() => {
        result.current.openEmployeeFormModal();
      });
      expect(result.current.showEmployeeForm).toBe(true);

      act(() => {
        result.current.closeEmployeeFormModal();
      });
      expect(result.current.showEmployeeForm).toBe(false);
    });

    it('should open and close establishment form modal', () => {
      const { result } = renderHook(() => useModals());

      act(() => {
        result.current.openEstablishmentFormModal();
      });
      expect(result.current.showEstablishmentForm).toBe(true);

      act(() => {
        result.current.closeEstablishmentFormModal();
      });
      expect(result.current.showEstablishmentForm).toBe(false);
    });
  });

  describe('Close all modals', () => {
    it('should close all open modals', () => {
      const { result } = renderHook(() => useModals());

      // Open all modals
      act(() => {
        result.current.openLoginModal();
        result.current.openRegisterModal();
        result.current.openEmployeeFormModal();
        result.current.openEstablishmentFormModal();
      });

      expect(result.current.showLogin).toBe(true);
      expect(result.current.showRegister).toBe(true);
      expect(result.current.showEmployeeForm).toBe(true);
      expect(result.current.showEstablishmentForm).toBe(true);

      // Close all
      act(() => {
        result.current.closeAllModals();
      });

      expect(result.current.showLogin).toBe(false);
      expect(result.current.showRegister).toBe(false);
      expect(result.current.showEmployeeForm).toBe(false);
      expect(result.current.showEstablishmentForm).toBe(false);
    });
  });

  describe('Body class management', () => {
    it('should add modal-open class when any modal is open', () => {
      const { result } = renderHook(() => useModals());

      expect(document.body.classList.contains('modal-open')).toBe(false);

      act(() => {
        result.current.openLoginModal();
      });

      expect(document.body.classList.contains('modal-open')).toBe(true);
    });

    it('should remove modal-open class when all modals are closed', () => {
      const { result } = renderHook(() => useModals());

      act(() => {
        result.current.openLoginModal();
      });
      expect(document.body.classList.contains('modal-open')).toBe(true);

      act(() => {
        result.current.closeLoginModal();
      });
      expect(document.body.classList.contains('modal-open')).toBe(false);
    });
  });

  describe('Submitting state', () => {
    it('should update submitting state', () => {
      const { result } = renderHook(() => useModals());

      expect(result.current.isSubmitting).toBe(false);

      act(() => {
        result.current.setIsSubmitting(true);
      });
      expect(result.current.isSubmitting).toBe(true);

      act(() => {
        result.current.setIsSubmitting(false);
      });
      expect(result.current.isSubmitting).toBe(false);
    });
  });
});
