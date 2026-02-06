/**
 * @vitest-environment jsdom
 */
/**
 * Footer Component Tests
 *
 * Tests for the Footer component:
 * - Renders without crashing
 * - Contains expected links and text
 * - Has proper semantic HTML (footer element)
 * - Displays current year in copyright
 *
 * Total: 4 tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from '../Footer';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

// Mock logger
vi.mock('../../../utils/logger');

// Mock CSS import
vi.mock('../../../styles/layout/footer.css', () => ({}));

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );

describe('Footer Component', () => {
  it('should render without crashing', () => {
    const { container } = renderFooter();
    expect(container).toBeTruthy();
  });

  it('should have a semantic footer element with contentinfo role', () => {
    renderFooter();
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
    expect(footer.tagName).toBe('FOOTER');
  });

  it('should display the current year and PattaMap in copyright', () => {
    renderFooter();
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${currentYear}`))).toBeInTheDocument();
    expect(screen.getByText(/PattaMap/)).toBeInTheDocument();
  });

  it('should contain Privacy Policy and Terms of Service links', () => {
    renderFooter();
    const privacyLink = screen.getByText('Privacy Policy');
    const termsLink = screen.getByText('Terms of Service');

    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink.closest('a')).toHaveAttribute('href', '/privacy-policy');

    expect(termsLink).toBeInTheDocument();
    expect(termsLink.closest('a')).toHaveAttribute('href', '/terms');
  });
});
