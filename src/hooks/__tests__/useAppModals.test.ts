/**
 * @vitest-environment jsdom
 */
/**
 * useAppModals Hook Tests
 *
 * Tests for application-wide modal management:
 * - Initial state (1 test)
 * - Open/close actions (4 tests)
 * - Switch login/register (2 tests)
 * - Submit handlers (2 tests)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAppModals } from '../useAppModals';

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

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
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

describe('useAppModals Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('should have all modals closed initially', () => {
      const { result } = renderHook(() => useAppModals());

      expect(result.current.showEmployeeForm).toBe(false);
      expect(result.current.showEstablishmentForm).toBe(false);
      expect(result.current.showLoginForm).toBe(false);
      expect(result.current.showRegisterForm).toBe(false);
      expect(result.current.showEmployeeProfileWizard).toBe(false);
      expect(result.current.showEditMyProfileModal).toBe(false);
      expect(result.current.showUserInfoModal).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.isSelfProfile).toBe(false);
      expect(result.current.editingEmployeeData).toBeNull();
    });
  });

  describe('Open/close actions', () => {
    it('should open and close employee form', () => {
      const { result } = renderHook(() => useAppModals());

      act(() => {
        result.current.openEmployeeForm();
      });
      expect(result.current.showEmployeeForm).toBe(true);

      act(() => {
        result.current.closeEmployeeForm();
      });
      expect(result.current.showEmployeeForm).toBe(false);
    });

    it('should open and close establishment form', () => {
      const { result } = renderHook(() => useAppModals());

      act(() => {
        result.current.openEstablishmentForm();
      });
      expect(result.current.showEstablishmentForm).toBe(true);

      act(() => {
        result.current.closeEstablishmentForm();
      });
      expect(result.current.showEstablishmentForm).toBe(false);
    });

    it('should open and close login form', () => {
      const { result } = renderHook(() => useAppModals());

      act(() => {
        result.current.openLoginForm();
      });
      expect(result.current.showLoginForm).toBe(true);

      act(() => {
        result.current.closeLoginForm();
      });
      expect(result.current.showLoginForm).toBe(false);
    });

    it('should open and close user info modal', () => {
      const { result } = renderHook(() => useAppModals());

      act(() => {
        result.current.openUserInfoModal();
      });
      expect(result.current.showUserInfoModal).toBe(true);

      act(() => {
        result.current.closeUserInfoModal();
      });
      expect(result.current.showUserInfoModal).toBe(false);
    });
  });

  describe('Switch login/register', () => {
    it('should switch from login to register', () => {
      const { result } = renderHook(() => useAppModals());

      act(() => {
        result.current.openLoginForm();
      });
      expect(result.current.showLoginForm).toBe(true);
      expect(result.current.showRegisterForm).toBe(false);

      act(() => {
        result.current.switchLoginToRegister();
      });
      expect(result.current.showLoginForm).toBe(false);
      expect(result.current.showRegisterForm).toBe(true);
    });

    it('should switch from register to login', () => {
      const { result } = renderHook(() => useAppModals());

      act(() => {
        result.current.openRegisterForm();
      });
      expect(result.current.showRegisterForm).toBe(true);
      expect(result.current.showLoginForm).toBe(false);

      act(() => {
        result.current.switchRegisterToLogin();
      });
      expect(result.current.showRegisterForm).toBe(false);
      expect(result.current.showLoginForm).toBe(true);
    });
  });

  describe('Wizard create profile', () => {
    it('should transition from wizard to employee form', () => {
      const { result } = renderHook(() => useAppModals());

      act(() => {
        result.current.openEmployeeProfileWizard();
      });
      expect(result.current.showEmployeeProfileWizard).toBe(true);

      act(() => {
        result.current.handleWizardCreateProfile();
      });

      expect(result.current.showEmployeeProfileWizard).toBe(false);
      expect(result.current.showEmployeeForm).toBe(true);
      expect(result.current.isSelfProfile).toBe(true);
    });
  });

  describe('Submit handlers', () => {
    it('should submit establishment successfully', async () => {
      mockSecureFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'est-123' }),
      });

      const { result } = renderHook(() => useAppModals());

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

      expect(result.current.showEstablishmentForm).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should handle establishment submission error', async () => {
      mockSecureFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Validation failed' }),
      });

      const { result } = renderHook(() => useAppModals());

      await act(async () => {
        try {
          await result.current.handleSubmitEstablishment({
            name: 'Test',
          } as any);
        } catch {
          // Expected error
        }
      });

      // Form should still be open after error (user might want to fix)
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should submit new employee successfully', async () => {
      mockSecureFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'emp-123' }),
      });

      const { result } = renderHook(() => useAppModals());

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
    it('should open edit profile modal', () => {
      const { result } = renderHook(() => useAppModals());

      act(() => {
        result.current.handleEditMyProfile();
      });

      expect(result.current.showEditMyProfileModal).toBe(true);
    });
  });
});
