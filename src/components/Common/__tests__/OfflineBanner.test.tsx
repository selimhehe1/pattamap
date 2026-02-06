/** @vitest-environment jsdom */
/**
 * OfflineBanner Component Tests
 *
 * Tests for the offline notification banner:
 * - Returns null when online
 * - Renders banner when offline
 * - Has role="alert" for accessibility
 * - Has a retry button
 * - Retry button calls checkConnection
 *
 * Total: 5 tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

// Mock CSS import
vi.mock('../../../styles/components/offline-banner.css', () => ({}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  WifiOff: (props: any) => <span data-testid="wifi-off-icon" {...props} />,
}));

// Mock useOnline hook
const mockCheckConnection = vi.fn();
const mockUseOnline = vi.fn(() => ({
  isOffline: false,
  isOnline: true,
  checkConnection: mockCheckConnection,
  lastOnlineAt: new Date(),
}));

vi.mock('../../../hooks/useOnline', () => ({
  useOnline: (...args: any[]) => mockUseOnline(...args),
}));

import OfflineBanner from '../OfflineBanner';

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to online by default
    mockUseOnline.mockReturnValue({
      isOffline: false,
      isOnline: true,
      checkConnection: mockCheckConnection,
      lastOnlineAt: new Date(),
    });
  });

  it('returns null when online (renders nothing)', () => {
    const { container } = render(<OfflineBanner />);

    expect(container.innerHTML).toBe('');
  });

  it('renders the banner when offline', () => {
    mockUseOnline.mockReturnValue({
      isOffline: true,
      isOnline: false,
      checkConnection: mockCheckConnection,
      lastOnlineAt: new Date(),
    });

    render(<OfflineBanner />);

    expect(screen.getByText('You are currently offline. Some features may be unavailable.')).toBeInTheDocument();
  });

  it('has role="alert" for screen reader accessibility', () => {
    mockUseOnline.mockReturnValue({
      isOffline: true,
      isOnline: false,
      checkConnection: mockCheckConnection,
      lastOnlineAt: new Date(),
    });

    render(<OfflineBanner />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('has a retry button', () => {
    mockUseOnline.mockReturnValue({
      isOffline: true,
      isOnline: false,
      checkConnection: mockCheckConnection,
      lastOnlineAt: new Date(),
    });

    render(<OfflineBanner />);

    const retryButton = screen.getByRole('button', { name: 'Retry connection' });
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).toHaveTextContent('Retry');
  });

  it('calls checkConnection when retry button is clicked', () => {
    mockUseOnline.mockReturnValue({
      isOffline: true,
      isOnline: false,
      checkConnection: mockCheckConnection,
      lastOnlineAt: new Date(),
    });

    render(<OfflineBanner />);

    const retryButton = screen.getByRole('button', { name: 'Retry connection' });
    fireEvent.click(retryButton);

    expect(mockCheckConnection).toHaveBeenCalledTimes(1);
  });
});
