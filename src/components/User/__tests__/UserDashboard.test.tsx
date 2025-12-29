/**
 * @vitest-environment jsdom
 */
/**
 * UserDashboard Component Tests
 *
 * Tests for the user dashboard/favorites page:
 * - Authentication (2 tests)
 * - Loading state (1 test)
 * - Empty state (2 tests)
 * - Favorites display (4 tests)
 * - Navigation (2 tests)
 * - Remove favorite (2 tests)
 *
 * Total: 13 tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserDashboard from '../UserDashboard';

// Mock navigate function
const mockNavigate = vi.fn() as ReturnType<typeof vi.fn> & {
  back: ReturnType<typeof vi.fn>;
  forward: ReturnType<typeof vi.fn>;
  go: ReturnType<typeof vi.fn>;
};
mockNavigate.back = vi.fn();
mockNavigate.forward = vi.fn();
mockNavigate.go = vi.fn();

// Mock useNavigateWithTransition hook
vi.mock('../../../hooks/useNavigateWithTransition', () => ({
  useNavigateWithTransition: () => mockNavigate,
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        'userDashboard.pageTitle': 'My Favorites',
        'userDashboard.pageSubtitle': 'Your saved profiles',
        'userDashboard.buttonBackHome': '← Back Home',
        'userDashboard.buttonEditProfile': 'Edit Profile',
        'userDashboard.emptyStateTitle': 'No Favorites Yet',
        'userDashboard.emptyStateMessage': 'Start adding favorites to see them here',
        'userDashboard.buttonBrowseEmployees': 'Browse Employees',
        'userDashboard.ariaRemoveFavorite': `Remove ${options?.name} from favorites`,
        'userDashboard.titleRemoveFavorite': 'Remove from favorites',
        'userDashboard.ageLabel': `${options?.age} years`,
        'userDashboard.establishmentLabel': 'Works at',
        'userDashboard.notEmployed': 'Not currently employed',
        'userDashboard.photoCountBadge': `+${options?.count} more`,
      };
      return translations[key] || key;
    },
  }),
}));

// Mock AuthContext
let mockUser: any = { id: 'user-123', email: 'test@example.com' };
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

// Mock ModalContext
const mockOpenModal = vi.fn();
const mockCloseModal = vi.fn();
vi.mock('../../../contexts/ModalContext', () => ({
  useModal: () => ({
    openModal: mockOpenModal,
    closeModal: mockCloseModal,
  }),
}));

// Mock useSecureFetch
vi.mock('../../../hooks/useSecureFetch', () => ({
  useSecureFetch: () => ({
    secureFetch: vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ employee: { id: 'emp-1', name: 'Test' } }),
    }),
  }),
}));

// Mock useFavorites hook
let mockFavorites: any[] = [];
let mockIsLoading = false;
const mockRemoveFavorite = vi.fn();

vi.mock('../../../hooks/useFavorites', () => ({
  useFavorites: () => ({
    data: mockFavorites,
    isLoading: mockIsLoading,
  }),
  useRemoveFavorite: () => ({
    mutate: mockRemoveFavorite,
  }),
}));

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock slugify
vi.mock('../../../utils/slugify', () => ({
  generateEstablishmentUrl: (id: string, name: string, zone: string) => `/bar/${zone}/${name.toLowerCase()}`,
}));

// Mock sub-components
vi.mock('../../Common/StarRating', () => ({
  default: ({ rating }: any) => <span data-testid="star-rating">{rating}</span>,
}));

vi.mock('../../Common/LazyImage', () => ({
  default: ({ alt }: any) => <img alt={alt} data-testid="lazy-image" />,
}));

vi.mock('../../Common/Skeleton', () => ({
  SkeletonGallery: () => <div data-testid="skeleton-loading">Loading...</div>,
}));

vi.mock('../../Common/PhotoGalleryModal', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="photo-gallery-modal">
      <button onClick={onClose}>Close Gallery</button>
    </div>
  ),
}));

vi.mock('../../Employee/EditEmployeeModal', () => ({
  default: ({ isOpen, onClose }: any) => isOpen ? (
    <div data-testid="edit-profile-modal">
      <button onClick={onClose}>Close Edit</button>
    </div>
  ) : null,
}));

vi.mock('../../../routes/lazyComponents', () => ({
  GirlProfile: () => <div data-testid="girl-profile" />,
}));

describe('UserDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: 'user-123', email: 'test@example.com' };
    mockFavorites = [];
    mockIsLoading = false;
  });

  describe('Authentication', () => {
    it('should redirect to login when user is not authenticated', () => {
      mockUser = null;
      render(<UserDashboard />);

      expect(mockNavigate.mock.calls[0][0]).toBe('/login');
    });

    it('should show dashboard when user is authenticated', () => {
      render(<UserDashboard />);

      expect(screen.getByText(/My Favorites/)).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should show skeleton when loading', () => {
      mockIsLoading = true;
      render(<UserDashboard />);

      expect(screen.getByTestId('skeleton-loading')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no favorites', () => {
      mockFavorites = [];
      render(<UserDashboard />);

      expect(screen.getByText(/No Favorites Yet/)).toBeInTheDocument();
      expect(screen.getByText(/Start adding favorites/)).toBeInTheDocument();
    });

    it('should have browse button in empty state', () => {
      mockFavorites = [];
      render(<UserDashboard />);

      expect(screen.getByText(/Browse Employees/)).toBeInTheDocument();
    });
  });

  describe('Favorites display', () => {
    const mockFavorite = {
      id: 'fav-1',
      employee_id: 'emp-1',
      employee_name: 'Jane Doe',
      employee_nickname: 'JD',
      employee_age: 25,
      employee_nationality: 'Thai',
      employee_photos: ['photo1.jpg', 'photo2.jpg'],
      employee_rating: 4.5,
      employee_comment_count: 10,
      current_establishment: {
        id: 'est-1',
        name: 'Test Bar',
        zone: 'soi6',
      },
    };

    it('should display favorite employee name', () => {
      mockFavorites = [mockFavorite];
      render(<UserDashboard />);

      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('should display employee nickname', () => {
      mockFavorites = [mockFavorite];
      render(<UserDashboard />);

      expect(screen.getByText('"JD"')).toBeInTheDocument();
    });

    it('should display employee age and nationality', () => {
      mockFavorites = [mockFavorite];
      render(<UserDashboard />);

      expect(screen.getByText(/25 years/)).toBeInTheDocument();
      expect(screen.getByText(/Thai/)).toBeInTheDocument();
    });

    it('should display establishment info', () => {
      mockFavorites = [mockFavorite];
      render(<UserDashboard />);

      expect(screen.getByText('Test Bar')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate home when back button is clicked', async () => {
      render(<UserDashboard />);

      const backButton = screen.getByText('← Back Home');
      await userEvent.click(backButton);

      expect(mockNavigate.mock.calls[0][0]).toBe('/');
    });

    it('should navigate to search when browse button is clicked', async () => {
      mockFavorites = [];
      render(<UserDashboard />);

      const browseButton = screen.getByText(/Browse Employees/);
      await userEvent.click(browseButton);

      expect(mockNavigate.mock.calls[0][0]).toBe('/search');
    });
  });

  describe('Remove favorite', () => {
    const mockFavorite = {
      id: 'fav-1',
      employee_id: 'emp-1',
      employee_name: 'Jane Doe',
      employee_photos: ['photo1.jpg'],
      current_establishment: null,
    };

    it('should call remove mutation when remove button is clicked', async () => {
      mockFavorites = [mockFavorite];
      render(<UserDashboard />);

      const removeButton = screen.getByTitle('Remove from favorites');
      await userEvent.click(removeButton);

      expect(mockRemoveFavorite).toHaveBeenCalledWith('emp-1');
    });

    it('should have accessible label for remove button', () => {
      mockFavorites = [mockFavorite];
      render(<UserDashboard />);

      const removeButton = screen.getByLabelText('Remove Jane Doe from favorites');
      expect(removeButton).toBeInTheDocument();
    });
  });

  describe('Edit profile button', () => {
    it('should show edit button when user has linked employee', () => {
      mockUser = { id: 'user-123', linked_employee_id: 'emp-123' };
      render(<UserDashboard />);

      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });

    it('should not show edit button when user has no linked employee', () => {
      mockUser = { id: 'user-123' };
      render(<UserDashboard />);

      expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
    });
  });
});
