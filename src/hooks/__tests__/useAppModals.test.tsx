/**
 * @vitest-environment jsdom
 */
/**
 * useAppModals Hook Tests
 *
 * Tests for application-wide modal management with ModalContext integration:
 * - Initial state (1 test)
 * - Open/close actions (4 tests)
 * - Switch login/register (2 tests)
 * - Submit handlers (2 tests)
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppModals, MODAL_IDS } from '../useAppModals';
import { ModalProvider } from '../../contexts/ModalContext';

// Mock secureFetch
const mockSecureFetch = vi.fn();

// Mock useSecureFetch
vi.mock('../useSecureFetch', () => ({
  useSecureFetch: () => ({
    secureFetch: mockSecureFetch,
  }),
}));

// Mock refreshLinkedProfile
const mockRefreshLinkedProfile = vi.fn();

// Mock AuthContext with user
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@test.com' },
    refreshLinkedProfile: mockRefreshLinkedProfile,
  }),
}));

// Mock toast
vi.mock('../../utils/toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Wrapper with ModalProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ModalProvider>{children}</ModalProvider>
);

describe('useAppModals Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('should have initial form states', () => {
      const { result } = renderHook(() => useAppModals(), { wrapper });

      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.isSelfProfile).toBe(false);
      expect(result.current.editingEmployeeData).toBeNull();
    });
  });

  describe('Open/close actions', () => {
    it('should open and close employee form via ModalContext', () => {
      const { result } = renderHook(() => useAppModals(), { wrapper });

      act(() => {
        result.current.openEmployeeForm();
      });
      expect(result.current.isModalOpen(MODAL_IDS.EMPLOYEE_FORM)).toBe(true);

      act(() => {
        result.current.closeEmployeeForm();
      });
      expect(result.current.isModalOpen(MODAL_IDS.EMPLOYEE_FORM)).toBe(false);
    });

    it('should open and close establishment form via ModalContext', () => {
      const { result } = renderHook(() => useAppModals(), { wrapper });

      act(() => {
        result.current.openEstablishmentForm();
      });
      expect(result.current.isModalOpen(MODAL_IDS.ESTABLISHMENT_FORM)).toBe(true);

      act(() => {
        result.current.closeEstablishmentForm();
      });
      expect(result.current.isModalOpen(MODAL_IDS.ESTABLISHMENT_FORM)).toBe(false);
    });

    it('should open and close login form via ModalContext', () => {
      const { result } = renderHook(() => useAppModals(), { wrapper });

      act(() => {
        result.current.openLoginForm();
      });
      expect(result.current.isModalOpen(MODAL_IDS.LOGIN)).toBe(true);

      act(() => {
        result.current.closeLoginForm();
      });
      expect(result.current.isModalOpen(MODAL_IDS.LOGIN)).toBe(false);
    });

    it('should open and close user info modal via ModalContext', () => {
      const { result } = renderHook(() => useAppModals(), { wrapper });

      act(() => {
        result.current.openUserInfoModal();
      });
      expect(result.current.isModalOpen(MODAL_IDS.USER_INFO)).toBe(true);

      act(() => {
        result.current.closeUserInfoModal();
      });
      expect(result.current.isModalOpen(MODAL_IDS.USER_INFO)).toBe(false);
    });
  });

  describe('Switch login/register', () => {
    it('should switch from login to register', () => {
      const { result } = renderHook(() => useAppModals(), { wrapper });

      act(() => {
        result.current.openLoginForm();
      });
      expect(result.current.isModalOpen(MODAL_IDS.LOGIN)).toBe(true);

      act(() => {
        result.current.switchLoginToRegister();
      });
      expect(result.current.isModalOpen(MODAL_IDS.LOGIN)).toBe(false);
      expect(result.current.isModalOpen(MODAL_IDS.REGISTER)).toBe(true);
    });

    it('should switch from register to login', () => {
      const { result } = renderHook(() => useAppModals(), { wrapper });

      act(() => {
        result.current.openRegisterForm();
      });
      expect(result.current.isModalOpen(MODAL_IDS.REGISTER)).toBe(true);

      act(() => {
        result.current.switchRegisterToLogin();
      });
      expect(result.current.isModalOpen(MODAL_IDS.REGISTER)).toBe(false);
      expect(result.current.isModalOpen(MODAL_IDS.LOGIN)).toBe(true);
    });
  });

  describe('Submit handlers', () => {
    it('should submit establishment successfully', async () => {
      mockSecureFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'est-123' }),
      });

      const { result } = renderHook(() => useAppModals(), { wrapper });

      act(() => {
        result.current.openEstablishmentForm();
      });

      await act(async () => {
        await result.current.handleSubmitEstablishment({
          name: 'Test Bar',
          address: 'Walking Street',
        } as any);
      });

      expect(mockSecureFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/establishments'),
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(result.current.isModalOpen(MODAL_IDS.ESTABLISHMENT_FORM)).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should handle establishment submission error', async () => {
      mockSecureFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Validation failed' }),
      });

      const { result } = renderHook(() => useAppModals(), { wrapper });

      await act(async () => {
        try {
          await result.current.handleSubmitEstablishment({
            name: 'Test',
          } as any);
        } catch {
          // Expected error
        }
      });

      expect(result.current.isSubmitting).toBe(false);
    });

    it('should submit new employee successfully', async () => {
      mockSecureFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'emp-123' }),
      });

      const { result } = renderHook(() => useAppModals(), { wrapper });

      await act(async () => {
        await result.current.handleSubmitEmployee({
          name: 'Test Employee',
        } as any);
      });

      expect(mockSecureFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/employees'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('Edit my profile', () => {
    it('should open edit profile modal via ModalContext', () => {
      const { result } = renderHook(() => useAppModals(), { wrapper });

      act(() => {
        result.current.handleEditMyProfile();
      });

      expect(result.current.isModalOpen(MODAL_IDS.EDIT_MY_PROFILE)).toBe(true);
    });
  });
});
