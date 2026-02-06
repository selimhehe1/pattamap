/** @vitest-environment jsdom */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies before imports
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

vi.mock('../../utils/logger');

// Mock the useEstablishmentsByZone hook
const mockUseEstablishmentsByZone = vi.fn();
vi.mock('../../hooks/useEstablishments', () => ({
  useEstablishmentsByZone: (...args: any[]) => mockUseEstablishmentsByZone(...args),
}));

// Mock utility functions
vi.mock('../../utils/constants', () => ({
  getZoneLabel: (zone: string) => {
    const labels: Record<string, string> = {
      soi6: 'Soi 6',
      walkingstreet: 'Walking Street',
    };
    return labels[zone] || zone;
  },
}));

vi.mock('../../utils/slugify', () => ({
  generateEstablishmentUrl: (id: string, name: string, zone: string) =>
    `/establishment/${zone}/${id}`,
}));

// Mock child components to simplify rendering
vi.mock('../../components/Common/EstablishmentCard', () => ({
  default: ({ establishment, onClick }: any) => (
    <div data-testid={`establishment-card-${establishment.id}`} onClick={() => onClick(establishment)}>
      {establishment.name}
    </div>
  ),
}));

vi.mock('../../components/SEO/StructuredData', () => ({
  default: () => null,
}));

import EstablishmentsPage from '../EstablishmentsPage';

// Sample establishment data
const mockEstablishments = [
  {
    id: 'est-1',
    name: 'Alpha Bar',
    zone: 'soi6',
    employee_count: 10,
    category: { name: 'bar' },
    category_id: '1',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'est-2',
    name: 'Beta Club',
    zone: 'soi6',
    employee_count: 20,
    category: { name: 'club' },
    category_id: '2',
    created_at: '2025-02-01T00:00:00Z',
  },
];

describe('EstablishmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEstablishmentsByZone.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      totalCount: 0,
    });
  });

  const renderPage = (initialRoute = '/establishments?zone=soi6') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <EstablishmentsPage />
      </MemoryRouter>
    );
  };

  it('renders without crashing when a zone is selected', () => {
    mockUseEstablishmentsByZone.mockReturnValue({
      data: mockEstablishments,
      isLoading: false,
      error: null,
      totalCount: 2,
    });
    renderPage();
    // Zone title should be displayed
    expect(screen.getByText('Soi 6')).toBeInTheDocument();
  });

  it('shows the no zone selected state when no zone param is present', () => {
    renderPage('/establishments');
    expect(screen.getByText('No zone selected')).toBeInTheDocument();
    expect(screen.getByText('Please select a zone from the homepage')).toBeInTheDocument();
  });

  it('navigates home when clicking back button in no-zone state', () => {
    renderPage('/establishments');

    const backButton = screen.getByText('Back to Home').closest('button')!;
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows loading skeleton cards while data is loading', () => {
    mockUseEstablishmentsByZone.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      totalCount: 0,
    });
    renderPage();

    const skeletons = document.querySelectorAll('.skeleton-card');
    expect(skeletons.length).toBe(8);
  });

  it('shows error state when there is an error', () => {
    mockUseEstablishmentsByZone.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Failed to load'),
      totalCount: 0,
    });
    renderPage();

    expect(screen.getByText('Error loading data')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('shows empty state when no establishments are found', () => {
    mockUseEstablishmentsByZone.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      totalCount: 0,
    });
    renderPage();

    expect(screen.getByText('No venues found')).toBeInTheDocument();
  });

  it('renders establishment cards when data is loaded', () => {
    mockUseEstablishmentsByZone.mockReturnValue({
      data: mockEstablishments,
      isLoading: false,
      error: null,
      totalCount: 2,
    });
    renderPage();

    expect(screen.getByTestId('establishment-card-est-1')).toBeInTheDocument();
    expect(screen.getByTestId('establishment-card-est-2')).toBeInTheDocument();
    expect(screen.getByText('Alpha Bar')).toBeInTheDocument();
    expect(screen.getByText('Beta Club')).toBeInTheDocument();
  });

  it('displays the results count', () => {
    mockUseEstablishmentsByZone.mockReturnValue({
      data: mockEstablishments,
      isLoading: false,
      error: null,
      totalCount: 2,
    });
    renderPage();

    expect(screen.getByText('Showing 2 of 2 venues')).toBeInTheDocument();
  });

  it('navigates to establishment detail when a card is clicked', () => {
    mockUseEstablishmentsByZone.mockReturnValue({
      data: mockEstablishments,
      isLoading: false,
      error: null,
      totalCount: 2,
    });
    renderPage();

    fireEvent.click(screen.getByTestId('establishment-card-est-1'));

    expect(mockNavigate).toHaveBeenCalledWith('/establishment/soi6/est-1');
  });

  it('displays category filter buttons', () => {
    mockUseEstablishmentsByZone.mockReturnValue({
      data: mockEstablishments,
      isLoading: false,
      error: null,
      totalCount: 2,
    });
    renderPage();

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Bar')).toBeInTheDocument();
    expect(screen.getByText('GoGo')).toBeInTheDocument();
    expect(screen.getByText('Club')).toBeInTheDocument();
  });

  it('filters establishments by category when a filter chip is clicked', () => {
    mockUseEstablishmentsByZone.mockReturnValue({
      data: mockEstablishments,
      isLoading: false,
      error: null,
      totalCount: 2,
    });
    renderPage();

    // Click the "Bar" filter
    fireEvent.click(screen.getByText('Bar'));

    // Only Alpha Bar should be visible (its category name contains "bar")
    expect(screen.getByText('Alpha Bar')).toBeInTheDocument();
    expect(screen.queryByText('Beta Club')).not.toBeInTheDocument();
  });

  it('displays zone stats (venues count, staff count)', () => {
    mockUseEstablishmentsByZone.mockReturnValue({
      data: mockEstablishments,
      isLoading: false,
      error: null,
      totalCount: 2,
    });
    renderPage();

    // Total count is displayed
    expect(screen.getByText('2')).toBeInTheDocument();
    // Total employees (10 + 20 = 30)
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('Venues')).toBeInTheDocument();
    expect(screen.getByText('Staff')).toBeInTheDocument();
  });
});
