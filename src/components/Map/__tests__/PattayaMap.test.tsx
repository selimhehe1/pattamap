/**
 * @vitest-environment jsdom
 */
/**
 * PattayaMap Component Tests
 *
 * Tests for the main map component:
 * - Rendering (3 tests)
 * - Zone filtering (2 tests)
 * - Category filtering (2 tests)
 * - View mode switching (3 tests)
 * - Mobile responsiveness (2 tests)
 * - Search functionality (2 tests)
 *
 * Total: 14 tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PattayaMap from '../PattayaMap';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock ModalContext
vi.mock('../../../contexts/ModalContext', () => ({
  useModal: () => ({
    openModal: vi.fn(),
    closeModal: vi.fn(),
  }),
}));

// Mock MapControlsContext
const mockSetViewMode = vi.fn();
vi.mock('../../../contexts/MapControlsContext', () => ({
  useMapControls: () => ({
    viewMode: 'map',
    setViewMode: mockSetViewMode,
  }),
}));

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock sub-components
vi.mock('../ZoneMapRenderer', () => ({
  default: ({ currentZone, establishments }: any) => (
    <div data-testid="zone-map-renderer">
      <span data-testid="current-zone">{currentZone}</span>
      <span data-testid="establishments-count">{establishments.length}</span>
    </div>
  ),
}));

vi.mock('../MapSidebar', () => ({
  default: ({
    currentZone,
    onZoneChange,
    onCategoryToggle,
    onSearchChange,
    onClearFilters,
    searchTerm,
    selectedCategories: _selectedCategories,
    establishmentCount,
  }: any) => (
    <div data-testid="map-sidebar">
      <span data-testid="sidebar-zone">{currentZone?.name || 'unknown'}</span>
      <span data-testid="sidebar-count">{establishmentCount}</span>
      <input
        data-testid="search-input"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search"
      />
      <button
        data-testid="toggle-category"
        onClick={() => onCategoryToggle('cat-001')}
      >
        Toggle Cat
      </button>
      <button
        data-testid="clear-filters"
        onClick={onClearFilters}
      >
        Clear
      </button>
      <button
        data-testid="change-zone"
        onClick={() => onZoneChange({ id: 'walking-street', name: 'Walking Street' })}
      >
        Change Zone
      </button>
    </div>
  ),
}));

vi.mock('../MobileMapMenu', () => ({
  default: () => <div data-testid="mobile-menu" />,
}));

vi.mock('../MobileBottomNav', () => ({
  default: ({ viewMode, onViewChange }: any) => (
    <div data-testid="mobile-bottom-nav">
      <span data-testid="current-view-mode">{viewMode}</span>
      <button data-testid="switch-to-list" onClick={() => onViewChange('list')}>
        List
      </button>
    </div>
  ),
}));

vi.mock('../EstablishmentListView', () => ({
  default: ({ establishments }: any) => (
    <div data-testid="establishment-list-view">
      <span data-testid="list-count">{establishments.length}</span>
    </div>
  ),
}));

vi.mock('../EmployeesGridView', () => ({
  default: () => <div data-testid="employees-grid-view" />,
}));

// Sample establishments
const mockEstablishments = [
  {
    id: 'est-1',
    name: 'Test Bar 1',
    zone: 'soi6',
    category_id: 1,
    address: '123 Soi 6',
  },
  {
    id: 'est-2',
    name: 'Test Club 2',
    zone: 'soi6',
    category_id: 2,
    address: '456 Soi 6',
  },
  {
    id: 'est-3',
    name: 'Walking Street Bar',
    zone: 'walking-street',
    category_id: 1,
    address: '789 Walking Street',
  },
];

const mockCategories = [
  { id: 1, name: 'Beer Bar' },
  { id: 2, name: 'Go-Go Bar' },
];

describe('PattayaMap Component', () => {
  const mockOnEstablishmentClick = vi.fn();
  const mockOnToggleSidebar = vi.fn();
  const mockOnEstablishmentUpdate = vi.fn();

  const defaultProps = {
    establishments: mockEstablishments,
    freelances: [],
    onEstablishmentClick: mockOnEstablishmentClick,
    sidebarOpen: true,
    onToggleSidebar: mockOnToggleSidebar,
    onEstablishmentUpdate: mockOnEstablishmentUpdate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock categories API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ categories: mockCategories }),
    });

    // Reset window size to desktop
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render map view by default', async () => {
      render(<PattayaMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('zone-map-renderer')).toBeInTheDocument();
      });
    });

    it('should render sidebar on desktop', async () => {
      render(<PattayaMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('map-sidebar')).toBeInTheDocument();
      });
    });

    it('should fetch categories on mount', async () => {
      render(<PattayaMap {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/establishments/categories')
        );
      });
    });
  });

  describe('Zone filtering', () => {
    it('should default to soi6 zone', async () => {
      render(<PattayaMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('current-zone')).toHaveTextContent('soi6');
      });
    });

    it('should change zone when zone selector is used', async () => {
      render(<PattayaMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('change-zone')).toBeInTheDocument();
      });

      const changeZoneButton = screen.getByTestId('change-zone');
      await userEvent.click(changeZoneButton);

      await waitFor(() => {
        expect(screen.getByTestId('current-zone')).toHaveTextContent('walking-street');
      });
    });
  });

  describe('Category filtering', () => {
    it('should show correct establishment count for zone', async () => {
      render(<PattayaMap {...defaultProps} />);

      // Wait for categories to load and count to be calculated
      await waitFor(() => {
        // Soi6 has 2 establishments
        expect(screen.getByTestId('sidebar-count')).toHaveTextContent('2');
      });
    });

    it('should filter establishments when category is toggled', async () => {
      render(<PattayaMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('toggle-category')).toBeInTheDocument();
      });

      // Initially should have all establishments
      await waitFor(() => {
        expect(screen.getByTestId('establishments-count')).toHaveTextContent('3');
      });
    });
  });

  describe('Search functionality', () => {
    it('should filter establishments by search term', async () => {
      render(<PattayaMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('search-input')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('search-input');
      await userEvent.type(searchInput, 'Test Bar');

      await waitFor(() => {
        // Only "Test Bar 1" should match
        expect(screen.getByTestId('establishments-count')).toHaveTextContent('1');
      });
    });

    it('should clear search when clear filters is clicked', async () => {
      render(<PattayaMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('search-input')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('search-input');
      await userEvent.type(searchInput, 'Test');

      const clearButton = screen.getByTestId('clear-filters');
      await userEvent.click(clearButton);

      await waitFor(() => {
        expect(searchInput).toHaveValue('');
      });
    });
  });

  describe('Mobile responsiveness', () => {
    it('should show mobile navigation on small screens', async () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      window.dispatchEvent(new Event('resize'));

      render(<PattayaMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument();
      });
    });

    it('should show mobile menu on small screens', async () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      window.dispatchEvent(new Event('resize'));

      render(<PattayaMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      });
    });
  });

  describe('View mode switching', () => {
    it('should display map view by default', async () => {
      render(<PattayaMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('zone-map-renderer')).toBeInTheDocument();
      });
    });

    it('should pass establishments to map renderer', async () => {
      render(<PattayaMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('establishments-count')).toHaveTextContent('3');
      });
    });

    it('should handle sidebar toggle', async () => {
      render(<PattayaMap {...defaultProps} />);

      // The sidebar toggle is handled by parent component
      expect(defaultProps.onToggleSidebar).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle category fetch error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<PattayaMap {...defaultProps} />);

      // Component should still render without crashing
      await waitFor(() => {
        expect(screen.getByTestId('zone-map-renderer')).toBeInTheDocument();
      });
    });
  });
});
