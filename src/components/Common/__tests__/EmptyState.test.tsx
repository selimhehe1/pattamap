/** @vitest-environment jsdom */
/**
 * EmptyState Component Tests
 *
 * Tests for the presentational empty state component:
 * - Renders with title
 * - Renders with message/description
 * - Renders with icon
 * - Renders action button when provided
 * - Action button click handler fires
 * - Renders secondary action button
 *
 * Total: 6 tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

// Mock useNavigateWithTransition
vi.mock('../../../hooks/useNavigateWithTransition', () => ({
  useNavigateWithTransition: () => vi.fn(),
}));

// Mock CSS import
vi.mock('../../../styles/components/EmptyState.css', () => ({}));

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const MockIcon = (props: any) => <span data-testid="lucide-icon" {...props} />;
  return {
    Search: MockIcon,
    Star: MockIcon,
    MessageSquare: MockIcon,
    Users: MockIcon,
    Building2: MockIcon,
    Bell: MockIcon,
    Trophy: MockIcon,
    Inbox: MockIcon,
  };
});

import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  it('renders with a custom title', () => {
    render(<EmptyState title="No items found" />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('No items found');
  });

  it('renders with a custom message', () => {
    render(<EmptyState message="Try adjusting your filters." />);

    expect(screen.getByText('Try adjusting your filters.')).toBeInTheDocument();
  });

  it('renders with a custom icon', () => {
    render(
      <EmptyState
        icon={<span data-testid="custom-icon">Custom</span>}
      />
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders primary action button when provided', () => {
    const onClick = vi.fn();

    render(
      <EmptyState
        type="search"
        showPrimaryAction={true}
        primaryActionText="Clear Filters"
        onPrimaryAction={onClick}
      />
    );

    const button = screen.getByRole('button', { name: 'Clear Filters' });
    expect(button).toBeInTheDocument();
  });

  it('fires onPrimaryAction when primary button is clicked', () => {
    const onClick = vi.fn();

    render(
      <EmptyState
        showPrimaryAction={true}
        primaryActionText="Retry"
        onPrimaryAction={onClick}
      />
    );

    const button = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders secondary action button when configured', () => {
    const onSecondary = vi.fn();

    render(
      <EmptyState
        showSecondaryAction={true}
        secondaryActionText="Go Back"
        onSecondaryAction={onSecondary}
      />
    );

    const secondaryBtn = screen.getByRole('button', { name: 'Go Back' });
    expect(secondaryBtn).toBeInTheDocument();

    fireEvent.click(secondaryBtn);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  describe('[a11y]', () => {
    it('should have no accessibility violations', async () => {
      const { axe, toHaveNoViolations } = await import('jest-axe');
      expect.extend(toHaveNoViolations);

      const { container } = render(
        <EmptyState title="No results" message="Try a different search" />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
