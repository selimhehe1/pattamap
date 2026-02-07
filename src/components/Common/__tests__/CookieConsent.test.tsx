/**
 * @vitest-environment jsdom
 */
/**
 * CookieConsent Component Tests
 *
 * Tests for the CookieConsent banner:
 * - Shows banner when no consent choice made (after 500ms delay)
 * - Hides when consent already given
 * - Calls acceptCookies and hides on accept click
 * - Calls declineCookies and hides on decline click
 * - Has dialog role
 * - Calls onAccept/onDecline callbacks
 *
 * Total: 6 tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CookieConsent from '../CookieConsent';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

// Mock cookieConsent utils
const mockHasConsentChoice = vi.fn(() => false);
const mockAcceptCookies = vi.fn();
const mockDeclineCookies = vi.fn();

vi.mock('../../../utils/cookieConsent', () => ({
  hasConsentChoice: () => mockHasConsentChoice(),
  acceptCookies: () => mockAcceptCookies(),
  declineCookies: () => mockDeclineCookies(),
}));

// Mock logger
vi.mock('../../../utils/logger');

// Mock CSS import
vi.mock('../../../styles/components/cookie-consent.css', () => ({}));

describe('CookieConsent Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockHasConsentChoice.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show the banner after 500ms delay when no consent choice has been made', () => {
    render(<CookieConsent />);

    // Should not be visible before the timer fires
    expect(screen.queryByText('Cookie Settings')).not.toBeInTheDocument();

    // Advance timer by 500ms
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now it should be visible
    expect(screen.getByText('Cookie Settings')).toBeInTheDocument();
  });

  it('should not show the banner when consent has already been given', () => {
    mockHasConsentChoice.mockReturnValue(true);

    render(<CookieConsent />);

    // Advance timer well past the 500ms delay
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('Cookie Settings')).not.toBeInTheDocument();
  });

  it('should call acceptCookies and hide the banner when accept is clicked', () => {
    render(<CookieConsent />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText('Cookie Settings')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Accept'));

    expect(mockAcceptCookies).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Cookie Settings')).not.toBeInTheDocument();
  });

  it('should call declineCookies and hide the banner when decline is clicked', () => {
    render(<CookieConsent />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText('Cookie Settings')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Decline'));

    expect(mockDeclineCookies).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Cookie Settings')).not.toBeInTheDocument();
  });

  it('should have a dialog role when visible', () => {
    render(<CookieConsent />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
  });

  it('should call onAccept and onDecline callbacks when provided', () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();

    // Test onAccept callback
    const { unmount } = render(<CookieConsent onAccept={onAccept} onDecline={onDecline} />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    fireEvent.click(screen.getByText('Accept'));
    expect(onAccept).toHaveBeenCalledTimes(1);

    unmount();

    // Reset mocks and test onDecline callback
    vi.clearAllMocks();
    mockHasConsentChoice.mockReturnValue(false);

    render(<CookieConsent onAccept={onAccept} onDecline={onDecline} />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    fireEvent.click(screen.getByText('Decline'));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  describe('[a11y]', () => {
    it('should have no accessibility violations when visible', async () => {
      const { axe, toHaveNoViolations } = await import('jest-axe');
      expect.extend(toHaveNoViolations);

      mockHasConsentChoice.mockReturnValue(false);

      const { container } = render(<CookieConsent />);

      // Advance fake timers to show the banner
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Switch to real timers before axe (axe uses async internally)
      vi.useRealTimers();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
