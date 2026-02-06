/** @vitest-environment jsdom */
/**
 * BarDetailPage Component Tests
 *
 * Tests for BarDetailLoadingState and BarDetailHeader components:
 * - BarDetailLoadingState: loading skeleton, empty state
 * - BarDetailHeader: renders establishment name, edit button, category
 *
 * Total: 5 tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) => {
      if (typeof fallback === 'string') return fallback;
      return key;
    },
  }),
}));

// Mock logger
vi.mock('../../../utils/logger');

// Mock useNavigateWithTransition
const mockNavigate = vi.fn();
vi.mock('../../../hooks/useNavigateWithTransition', () => ({
  useNavigateWithTransition: () => mockNavigate,
}));

// Mock SkeletonDetailPage
vi.mock('../../Common/Skeleton', () => ({
  SkeletonDetailPage: (props: any) => (
    <div data-testid="skeleton-detail-page" data-variant={props.variant}>
      Loading skeleton
    </div>
  ),
}));

// Mock utils/constants
vi.mock('../../../utils/constants', () => ({
  getZoneLabel: (zone: string) => {
    const labels: Record<string, string> = {
      soi6: 'Soi 6',
      walkingstreet: 'Walking Street',
      lkmetro: 'LK Metro',
    };
    return labels[zone] || zone;
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const MockIcon = ({ children, ...props }: any) => <span data-testid="mock-icon" {...props}>{children}</span>;
  return {
    Pencil: MockIcon,
    Users: MockIcon,
    Star: MockIcon,
    MapPin: MockIcon,
    Clock: MockIcon,
    Beer: MockIcon,
    Sparkles: MockIcon,
    Heart: MockIcon,
    Music: MockIcon,
    Mic: MockIcon,
    UtensilsCrossed: MockIcon,
    Hotel: MockIcon,
    Building2: MockIcon,
  };
});

import { BarDetailLoadingState } from '../BarDetailPage/BarDetailLoadingState';
import { BarDetailHeader } from '../BarDetailPage/BarDetailHeader';
import { Establishment } from '../../../types';

// Helper to create a minimal Establishment fixture
const createMockBar = (overrides: Partial<Establishment> = {}): Establishment => ({
  id: 'est-1',
  name: 'Test Bar Pattaya',
  address: '123 Walking Street',
  category_id: 1,
  status: 'approved',
  created_by: 'user-1',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  photos: [],
  ...overrides,
});

describe('BarDetailLoadingState', () => {
  it('renders loading skeleton when type is loading', () => {
    render(<BarDetailLoadingState type="loading" />);

    const skeleton = screen.getByTestId('skeleton-detail-page');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('data-variant', 'establishment');
  });

  it('renders empty state with back-to-map button when type is empty', () => {
    render(<BarDetailLoadingState type="empty" />);

    // Should not show skeleton
    expect(screen.queryByTestId('skeleton-detail-page')).not.toBeInTheDocument();

    // Should show a button to navigate back
    const backButton = screen.getByRole('button');
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});

describe('BarDetailHeader', () => {
  it('renders the establishment name', () => {
    const bar = createMockBar({ name: 'Neon Lounge' });

    render(
      <BarDetailHeader
        bar={bar}
        isAdmin={false}
        hasUser={false}
        onEditClick={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Neon Lounge');
  });

  it('shows edit button when user is logged in', () => {
    const onEditClick = vi.fn();
    const bar = createMockBar();

    render(
      <BarDetailHeader
        bar={bar}
        isAdmin={false}
        hasUser={true}
        onEditClick={onEditClick}
      />
    );

    const editButton = screen.getByRole('button');
    expect(editButton).toBeInTheDocument();

    fireEvent.click(editButton);
    expect(onEditClick).toHaveBeenCalledTimes(1);
  });

  it('does not show edit button when no user', () => {
    const bar = createMockBar();

    render(
      <BarDetailHeader
        bar={bar}
        isAdmin={false}
        hasUser={false}
        onEditClick={vi.fn()}
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
