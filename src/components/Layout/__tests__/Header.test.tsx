/**
 * @vitest-environment jsdom
 */
/**
 * Header Component Tests
 *
 * Tests for the Header component:
 * - Renders without crashing
 * - Shows logo/branding
 * - Shows navigation elements
 * - Shows login button when not authenticated (via menu)
 * - Shows search quick action
 * - Hides favorites quick action when not authenticated
 *
 * Total: 6 tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

// Mock AuthContext
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    logout: vi.fn(),
    linkedEmployeeProfile: null,
  }),
}));

// Mock GamificationContext
vi.mock('../../../contexts/GamificationContext', () => ({
  useGamification: () => ({
    userProgress: null,
  }),
}));

// Mock useNavigateWithTransition
const mockNavigate = vi.fn();
vi.mock('../../../hooks/useNavigateWithTransition', () => ({
  useNavigateWithTransition: () => mockNavigate,
}));

// Mock useAppModals
vi.mock('../../../hooks/useAppModals', () => ({
  useAppModals: () => ({
    openEmployeeForm: vi.fn(),
    openEstablishmentForm: vi.fn(),
    handleEditMyProfile: vi.fn(),
    openUserInfoModal: vi.fn(),
  }),
}));

// Mock useMediaQuery (default to desktop)
vi.mock('../../../hooks/useMediaQuery', () => ({
  useMediaQuery: () => false,
}));

// Mock route preloader
vi.mock('../../../utils/routePreloader', () => ({
  createPreloadHandler: () => vi.fn(),
}));

// Mock lazy components
vi.mock('../../../routes/lazyComponents', () => ({
  importSearchPage: vi.fn(),
  importUserDashboard: vi.fn(),
  importAdminPanel: vi.fn(),
  importMyEstablishmentsPage: vi.fn(),
  importMyOwnershipRequests: vi.fn(),
  importEmployeeDashboard: vi.fn(),
  importMyAchievementsPage: vi.fn(),
}));

// Mock child components to simplify rendering
// NOTE: vi.mock factories cannot reference top-level variables (like React),
// so we use plain functions/arrow functions without JSX for forwardRef mocks.
vi.mock('../../Common/ThemeToggle', () => ({
  default: () => null,
}));

vi.mock('../../Common/AnimatedButton', async () => {
  const React = await import('react');
  return {
    default: React.forwardRef(function MockAnimatedButton(props: any, ref: any) {
      return React.createElement(
        'button',
        {
          ref,
          onClick: props.onClick,
          'aria-label': props.ariaLabel,
          className: props.className,
          'data-testid': props['data-testid'],
          onMouseEnter: props.onMouseEnter,
        },
        props.children
      );
    }),
  };
});

vi.mock('../../Common/LanguageSelector', () => ({
  default: () => null,
}));

vi.mock('../../Common/LazyImage', () => ({
  default: () => null,
}));

vi.mock('../../Common/UserAvatar', () => ({
  default: () => null,
}));

vi.mock('../../Common/NotificationBell', () => ({
  default: () => null,
}));

vi.mock('../../Common/SyncIndicatorSafe', () => ({
  default: () => null,
}));

vi.mock('../MobileMenu', () => ({
  default: () => null,
}));

// Mock logger
vi.mock('../../../utils/logger');

// Mock CSS import
vi.mock('../../../styles/layout/header.css', () => ({}));

import Header from '../Header';

const renderHeader = (initialRoute = '/') =>
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Header />
    </MemoryRouter>
  );

describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = renderHeader();
    expect(container).toBeTruthy();
  });

  it('should have a banner role header element', () => {
    renderHeader();
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header.tagName).toBe('HEADER');
  });

  it('should show logo/branding section', () => {
    renderHeader();
    const logo = screen.getByTestId('logo');
    expect(logo).toBeInTheDocument();
  });

  it('should show search quick action button', () => {
    renderHeader();
    const searchBtn = screen.getByTestId('quick-search');
    expect(searchBtn).toBeInTheDocument();
  });

  it('should not show favorites quick action when user is not authenticated', () => {
    renderHeader();
    expect(screen.queryByTestId('quick-favorites')).not.toBeInTheDocument();
  });

  it('should show login button in guest menu when menu is opened', () => {
    renderHeader();

    // Open the menu
    const menuButton = screen.getByTestId('mobile-menu');
    fireEvent.click(menuButton);

    // Guest menu should appear with a login button
    const loginButton = screen.getByTestId('login-button');
    expect(loginButton).toBeInTheDocument();
  });
});
