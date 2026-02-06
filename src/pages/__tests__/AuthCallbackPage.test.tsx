import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from '@dr.pogodin/react-helmet';

// Mock dependencies before imports
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../utils/logger');

const mockGetSession = vi.fn();
vi.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession()
    }
  }
}));

// Mock global fetch (overrides setupTests.ts default)
const mockFetch = vi.fn();
global.fetch = mockFetch;

import AuthCallbackPage from '../AuthCallbackPage';

// sessionStorage is a mock (vi.fn()) from setupTests.ts
// We need to cast to access mock methods
const mockSessionStorageGetItem = sessionStorage.getItem as ReturnType<typeof vi.fn>;
const mockSessionStorageSetItem = sessionStorage.setItem as ReturnType<typeof vi.fn>;
const mockSessionStorageRemoveItem = sessionStorage.removeItem as ReturnType<typeof vi.fn>;

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Default: sessionStorage returns null for any key
    mockSessionStorageGetItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    cleanup();
  });

  const renderWithRouter = (searchParams = '') => {
    return render(
      <HelmetProvider>
        <MemoryRouter initialEntries={[`/auth/callback${searchParams}`]}>
          <AuthCallbackPage />
        </MemoryRouter>
      </HelmetProvider>
    );
  };

  const mockSession = {
    access_token: 'test-access-token',
    user: {
      id: 'supabase-uid-123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg'
      }
    }
  };

  describe('Loading state', () => {
    it('should show loading spinner initially', () => {
      mockGetSession.mockReturnValue(new Promise(() => {})); // Never resolves
      renderWithRouter();

      expect(screen.getByText('Connexion en cours...')).toBeInTheDocument();
    });
  });

  describe('URL error handling', () => {
    it('should show error when URL contains error params', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
      renderWithRouter('?error=access_denied&error_description=User%20cancelled');

      await waitFor(() => {
        expect(screen.getByText('User cancelled')).toBeInTheDocument();
      });
      expect(screen.getByText("Erreur d'authentification")).toBeInTheDocument();
    });
  });

  describe('Existing user flow', () => {
    it('should show success and redirect to home for existing user', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ isNew: false, user: { id: 'db-123' } })
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Connexion reussie !')).toBeInTheDocument();
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('should redirect to saved redirect path for existing user', async () => {
      // Configure sessionStorage mock to return '/dashboard' for 'auth_redirect'
      mockSessionStorageGetItem.mockImplementation((key: string) => {
        if (key === 'auth_redirect') return '/dashboard';
        return null;
      });

      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ isNew: false, user: { id: 'db-123' } })
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Connexion reussie !')).toBeInTheDocument();
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      expect(mockSessionStorageRemoveItem).toHaveBeenCalledWith('auth_redirect');
    });
  });

  describe('New user flow', () => {
    it('should redirect new user to /login?mode=register&from=google', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ isNew: true })
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Connexion reussie !')).toBeInTheDocument();
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/login?mode=register&from=google', { replace: true });
    });

    it('should store Google user data in sessionStorage for new user', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ isNew: true })
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Connexion reussie !')).toBeInTheDocument();
      });

      // Verify sessionStorage.setItem was called with Google user data
      expect(mockSessionStorageSetItem).toHaveBeenCalledWith(
        'google_user_data',
        expect.stringContaining('"email":"test@example.com"')
      );

      // Parse the stored value to verify all fields
      const setItemCall = mockSessionStorageSetItem.mock.calls.find(
        (call: string[]) => call[0] === 'google_user_data'
      );
      const storedData = JSON.parse(setItemCall[1]);
      expect(storedData.email).toBe('test@example.com');
      expect(storedData.name).toBe('Test User');
      expect(storedData.avatar_url).toBe('https://example.com/avatar.jpg');
    });
  });

  describe('Error handling (Bug Fix #2)', () => {
    it('should show error when sync-user returns non-ok response', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error', code: 'SERVER_ERROR' })
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Erreur d'authentification")).toBeInTheDocument();
      });
      expect(screen.getByText('Internal server error')).toBeInTheDocument();
      expect(screen.queryByText('Connexion reussie !')).not.toBeInTheDocument();
    });

    it('should show error on network failure instead of false success', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
      mockFetch.mockRejectedValue(new Error('Network error'));

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Erreur d'authentification")).toBeInTheDocument();
      });
      expect(screen.getByText('Impossible de synchroniser votre compte. Veuillez reessayer.')).toBeInTheDocument();
      expect(screen.queryByText('Connexion reussie !')).not.toBeInTheDocument();
    });

    it('should show error when session has error', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Token expired' }
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Token expired')).toBeInTheDocument();
      });
    });

    it('should show fallback error message when sync-user returns no error text', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ code: 'USER_INACTIVE' })
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Erreur lors de la synchronisation du compte')).toBeInTheDocument();
      });
    });
  });

  describe('Anti-double-call guard (Bug Fix #3)', () => {
    it('should call fetch only once per component mount', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ isNew: false, user: { id: 'db-123' } })
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Connexion reussie !')).toBeInTheDocument();
      });

      // sync-user should have been called exactly once (not multiple times)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/sync-user'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('No session flow', () => {
    it('should show error when no session found', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Session non trouvee. Veuillez vous reconnecter.')).toBeInTheDocument();
      });
    });

    it('should redirect to reset-password for recovery type', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      renderWithRouter('?type=recovery');

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/reset-password', { replace: true });
      });
    });
  });
});
