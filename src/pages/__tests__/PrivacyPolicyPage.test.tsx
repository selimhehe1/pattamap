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

import PrivacyPolicyPage from '../PrivacyPolicyPage';

describe('PrivacyPolicyPage', () => {
  const renderPage = () => {
    return render(
      <MemoryRouter>
        <PrivacyPolicyPage />
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
    expect(heading).toHaveTextContent('Privacy Policy');
  });

  it('contains privacy-related section headings', () => {
    renderPage();
    // Check key sections are present
    expect(screen.getByText('Information We Collect')).toBeInTheDocument();
    expect(screen.getByText('How We Use Your Information')).toBeInTheDocument();
    expect(screen.getByText('Your Rights')).toBeInTheDocument();
    expect(screen.getByText('Cookies and Tracking')).toBeInTheDocument();
    expect(screen.getByText('Data Security')).toBeInTheDocument();
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

  it('has footer links to terms and home', () => {
    renderPage();
    const termsLink = screen.getByText('Terms of Service');
    expect(termsLink.closest('a')).toHaveAttribute('href', '/terms');

    const homeLink = screen.getByText('Home');
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('contains contact information', () => {
    renderPage();
    expect(screen.getByText('Contact Us')).toBeInTheDocument();
    expect(screen.getByText(/privacy@pattamap.com/)).toBeInTheDocument();
  });
});
