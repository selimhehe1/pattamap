/** @vitest-environment jsdom */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies before imports
const mockNavigate = vi.fn();
(mockNavigate as any).back = vi.fn();
(mockNavigate as any).forward = vi.fn();
(mockNavigate as any).go = vi.fn();

vi.mock('../../hooks/useNavigateWithTransition', () => ({
  useNavigateWithTransition: () => mockNavigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

vi.mock('@dr.pogodin/react-helmet', () => ({
  Helmet: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../utils/logger');

import NotFoundPage from '../NotFoundPage';

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: window.history.length > 2 so handleGoBack calls navigate.back()
    Object.defineProperty(window, 'history', {
      value: { length: 5 },
      writable: true,
    });
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );
  };

  it('renders the 404 error code', () => {
    renderPage();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText('notFound.title')).toBeInTheDocument();
  });

  it('renders the description', () => {
    renderPage();
    expect(screen.getByText('notFound.description')).toBeInTheDocument();
  });

  it('renders the go back button', () => {
    renderPage();
    expect(screen.getByText('notFound.goBack')).toBeInTheDocument();
  });

  it('calls navigate.back() when go back button is clicked and history > 2', () => {
    renderPage();

    const goBackButton = screen.getByText('notFound.goBack').closest('button')!;
    fireEvent.click(goBackButton);

    expect((mockNavigate as any).back).toHaveBeenCalled();
  });

  it('calls navigate("/") when go back button is clicked and history <= 2', () => {
    Object.defineProperty(window, 'history', {
      value: { length: 1 },
      writable: true,
    });
    renderPage();

    const goBackButton = screen.getByText('notFound.goBack').closest('button')!;
    fireEvent.click(goBackButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('renders home link pointing to /', () => {
    renderPage();
    const homeLink = screen.getByText('notFound.home').closest('a');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('has a search quick link pointing to /search', () => {
    renderPage();
    const searchLink = screen.getByText('header.search').closest('a');
    expect(searchLink).toHaveAttribute('href', '/search');
  });

  it('has correct ARIA attributes on the main container', () => {
    renderPage();
    const mainContainer = screen.getByRole('main');
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveAttribute('aria-labelledby', 'not-found-title');
  });

  it('has an id on the title matching aria-labelledby', () => {
    renderPage();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAttribute('id', 'not-found-title');
  });
});
