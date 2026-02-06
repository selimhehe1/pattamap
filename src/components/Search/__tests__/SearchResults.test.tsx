/** @vitest-environment jsdom */
/**
 * SearchResults Component Tests
 *
 * Tests for the search results display component:
 * - Renders without crashing
 * - Shows results when provided
 * - Shows empty state when no results
 * - Handles loading state
 *
 * Total: 4 tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Employee } from '../../../types';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) => {
      if (typeof fallback === 'string') return fallback;
      if (key === 'search.noResultsTitle') return 'No results found';
      if (key === 'search.noResultsHint') return 'Try a different search term';
      if (key === 'search.showingResults') return 'Showing results';
      return key;
    },
  }),
}));

// Mock EmployeeCard - use different testid to avoid collision with wrapper's data-testid="employee-card"
vi.mock('../../Common/EmployeeCard', () => ({
  default: ({ employee }: { employee: Employee }) => (
    <div data-testid="mock-employee-card">{employee.name}</div>
  ),
}));

// Mock SkeletonGallery
vi.mock('../../Common/Skeleton', () => ({
  SkeletonGallery: ({ count }: { count: number }) => (
    <div data-testid="skeleton-gallery">Loading {count} items</div>
  ),
}));

// Mock Pagination
vi.mock('../../Common/Pagination', () => ({
  default: () => <div data-testid="pagination">Pagination</div>,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Search: (props: any) => <span data-testid="search-icon" {...props} />,
}));

import SearchResults from '../SearchResults';

// Helper to create a mock Employee
const createMockEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'emp-1',
  name: 'Test Employee',
  sex: 'female',
  photos: ['https://example.com/photo.jpg'],
  status: 'approved',
  self_removal_requested: false,
  created_by: 'user-1',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

const defaultProps = {
  results: [] as Employee[],
  loading: false,
  currentPage: 1,
  totalPages: 1,
  onPageChange: vi.fn(),
  onEmployeeClick: vi.fn(),
  totalResults: 0,
};

describe('SearchResults', () => {
  it('renders without crashing', () => {
    const employees = [createMockEmployee({ id: 'emp-1', name: 'Alice' })];

    const { container } = render(
      <SearchResults
        {...defaultProps}
        results={employees}
        totalResults={1}
      />
    );

    expect(container).toBeTruthy();
  });

  it('shows employee cards when results are provided', () => {
    const employees = [
      createMockEmployee({ id: 'emp-1', name: 'Alice' }),
      createMockEmployee({ id: 'emp-2', name: 'Bob' }),
    ];

    render(
      <SearchResults
        {...defaultProps}
        results={employees}
        totalResults={2}
      />
    );

    const cards = screen.getAllByTestId('mock-employee-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('Alice');
    expect(cards[1]).toHaveTextContent('Bob');
  });

  it('shows empty state when there are no results and not loading', () => {
    render(
      <SearchResults
        {...defaultProps}
        results={[]}
        loading={false}
        totalResults={0}
      />
    );

    const emptyState = screen.getByTestId('empty-state');
    expect(emptyState).toBeInTheDocument();
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading with no prior results', () => {
    render(
      <SearchResults
        {...defaultProps}
        results={[]}
        loading={true}
        totalResults={0}
      />
    );

    const skeleton = screen.getByTestId('skeleton-gallery');
    expect(skeleton).toBeInTheDocument();
  });
});
