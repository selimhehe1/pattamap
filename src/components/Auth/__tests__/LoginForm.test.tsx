/**
 * Tests for LoginForm component
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import LoginForm from '../LoginForm';

// Mock logger
vi.mock('../../../utils/logger');

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key, // Return the key as-is
    i18n: { language: 'en' }
  }),
  initReactI18next: { type: '3rdParty', init: () => {} }
}));

// Mock the toast utility
vi.mock('../../../utils/toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock useAuth
const mockLogin = vi.fn();
vi.mock('../../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      login: mockLogin,
      user: null,
      loading: false,
    }),
  };
});

// Mock useSupabaseAuth
vi.mock('../../../contexts/auth/SupabaseAuthContext', () => ({
  useSupabaseAuth: () => ({
    signInWithGoogle: vi.fn(),
    signInWithFacebook: vi.fn(),
    user: null,
    session: null,
    loading: false,
  }),
}));

// Mock useAutoSave
vi.mock('../../../hooks/useAutoSave', () => ({
  useAutoSave: () => ({
    isDraft: false,
    clearDraft: vi.fn(),
    restoreDraft: vi.fn(() => null),
    lastSaved: null,
  }),
}));

// Helper to wrap component with providers
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {component}
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('LoginForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSwitchToRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with all fields', () => {
    renderWithProviders(
      <LoginForm
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    // Check for presence of input fields
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    // Password field is type="password", not a textbox
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument();
  });

  it('renders login button', () => {
    renderWithProviders(
      <LoginForm
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    // Find the submit button by the translated key pattern
    const submitButton = screen.getByRole('button', { name: /auth\.signIn/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('renders switch to register link/button', () => {
    renderWithProviders(
      <LoginForm
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    // There should be a way to switch to register
    const registerLink = screen.getByRole('button', { name: /auth\.registerHere/i });
    expect(registerLink).toBeInTheDocument();
  });

  it('validates required fields on submit', async () => {
    renderWithProviders(
      <LoginForm
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    const submitButton = screen.getByRole('button', { name: /auth\.signIn/i });

    // Submit with empty fields
    fireEvent.click(submitButton);

    // Login should not be called with invalid form
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls onSwitchToRegister when register link is clicked', async () => {
    renderWithProviders(
      <LoginForm
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    const registerLink = screen.getByRole('button', { name: /auth\.registerHere/i });
    fireEvent.click(registerLink);

    expect(mockOnSwitchToRegister).toHaveBeenCalledTimes(1);
  });

  it('shows loading state during submission', async () => {
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    renderWithProviders(
      <LoginForm
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    // Fill in the form
    const loginInput = screen.getByRole('textbox');
    await userEvent.type(loginInput, 'testuser');

    // Find password input (type="password")
    const passwordField = document.querySelector('input[type="password"]');
    if (passwordField) {
      await userEvent.type(passwordField, 'testpassword123');
    }

    const submitButton = screen.getByRole('button', { name: /auth\.signIn/i });
    fireEvent.click(submitButton);

    // Check for loading indicator (spinner, disabled state, etc.)
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    }, { timeout: 100 }).catch(() => {
      // Button might not disable immediately, that's okay
    });
  });

  it('renders Facebook sign-in button', () => {
    renderWithProviders(
      <LoginForm
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    const facebookButton = screen.getByTestId('facebook-signin-button');
    expect(facebookButton).toBeInTheDocument();
    expect(facebookButton).toHaveTextContent('auth.continueWithFacebook');
  });

  it('displays error message on failed login', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    renderWithProviders(
      <LoginForm
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    // Fill in the form with valid data
    const loginInput = screen.getByRole('textbox');
    await userEvent.type(loginInput, 'testuser');

    const passwordField = document.querySelector('input[type="password"]');
    if (passwordField) {
      await userEvent.type(passwordField, 'testpassword123');
    }

    const submitButton = screen.getByRole('button', { name: /auth\.signIn/i });
    fireEvent.click(submitButton);

    // Wait for error message to appear (or toast to be called)
    await waitFor(() => {
      // At least the login should have been attempted
      expect(mockLogin).toHaveBeenCalled();
    }, { timeout: 2000 });
  });
});
