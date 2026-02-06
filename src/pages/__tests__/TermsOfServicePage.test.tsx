/** @vitest-environment jsdom */
import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

vi.mock('@dr.pogodin/react-helmet', () => ({
  Helmet: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../utils/logger');

import TermsOfServicePage from '../TermsOfServicePage';

describe('TermsOfServicePage', () => {
  const renderPage = () => {
    return render(
      <MemoryRouter>
        <TermsOfServicePage />
      </MemoryRouter>
    );
  };

  it('renders without crashing', () => {
    renderPage();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('has a main heading with the title', () => {
    renderPage();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Terms of Service');
  });

  it('contains terms-related section headings', () => {
    renderPage();
    expect(screen.getByText('Acceptance of Terms')).toBeInTheDocument();
    expect(screen.getByText('Service Description')).toBeInTheDocument();
    expect(screen.getByText('User Accounts')).toBeInTheDocument();
    expect(screen.getByText('Prohibited Conduct')).toBeInTheDocument();
    expect(screen.getByText('Limitation of Liability')).toBeInTheDocument();
  });

  it('displays the last updated date', () => {
    renderPage();
    expect(screen.getByText('Last updated: January 2025')).toBeInTheDocument();
  });

  it('has a back to home link pointing to /', () => {
    renderPage();
    const backLink = screen.getByText('Back to Home').closest('a');
    expect(backLink).toHaveAttribute('href', '/');
  });

  it('has footer links to privacy policy and home', () => {
    renderPage();
    const privacyLink = screen.getByText('Privacy Policy');
    expect(privacyLink.closest('a')).toHaveAttribute('href', '/privacy-policy');

    const homeLink = screen.getByText('Home');
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('contains contact information', () => {
    renderPage();
    expect(screen.getByText('Contact Us')).toBeInTheDocument();
    expect(screen.getByText(/legal@pattamap.com/)).toBeInTheDocument();
  });
});
