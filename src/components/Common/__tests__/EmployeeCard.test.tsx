/**
 * @vitest-environment jsdom
 */
/**
 * EmployeeCard Component Tests
 *
 * Tests for the employee card component:
 * - Rendering (4 tests)
 * - Photo display (2 tests)
 * - Badges (4 tests)
 * - Click handling (2 tests)
 * - Accessibility (3 tests)
 *
 * Total: 15 tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmployeeCard from '../EmployeeCard';
import { Employee } from '../../../types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, onKeyDown, role, tabIndex, className, ...props }: any) => (
      <div
        onClick={onClick}
        onKeyDown={onKeyDown}
        role={role}
        tabIndex={tabIndex}
        className={className}
        {...props}
      >
        {children}
      </div>
    ),
  },
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        'employeeCard.ariaViewProfile': `View profile of ${options?.name}`,
        'employeeCard.altTextPhoto': `Photo of ${options?.name}`,
        'employeeCard.verifiedProfile': 'Verified profile',
        'employeeCard.voteCount': `${options?.count} votes`,
        'search.freelances': 'Freelance',
        'search.regularEmployees': 'Regular',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock LazyImage
vi.mock('../LazyImage', () => ({
  default: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} data-testid="lazy-image" />
  ),
}));

// Mock feature flags
vi.mock('../../../utils/featureFlags', () => ({
  isFeatureEnabled: () => true,
  FEATURES: { VIP_SYSTEM: 'vip_system' },
}));

// Create mock employee
const createMockEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'emp-123',
  name: 'Test Employee',
  nickname: 'Testy',
  age: 25,
  nationality: ['Thai'],
  photos: ['https://example.com/photo1.jpg'],
  average_rating: 4.5,
  is_verified: false,
  vote_count: 0,
  is_vip: false,
  current_employment: [],
  ...overrides,
} as Employee);

describe('EmployeeCard Component', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render employee name', () => {
      render(<EmployeeCard employee={createMockEmployee()} />);

      expect(screen.getByText('Test Employee')).toBeInTheDocument();
    });

    it('should render nickname when provided', () => {
      render(<EmployeeCard employee={createMockEmployee({ nickname: 'Sweetie' })} />);

      expect(screen.getByText('"Sweetie"')).toBeInTheDocument();
    });

    it('should render age when provided', () => {
      render(<EmployeeCard employee={createMockEmployee({ age: 28 })} />);

      expect(screen.getByText('28')).toBeInTheDocument();
    });

    it('should render nationality when provided', () => {
      render(<EmployeeCard employee={createMockEmployee({ nationality: ['Thai', 'Japanese'] })} />);

      expect(screen.getByText('Thai / Japanese')).toBeInTheDocument();
    });
  });

  describe('Photo display', () => {
    it('should render photo when available', () => {
      render(<EmployeeCard employee={createMockEmployee()} />);

      const image = screen.getByTestId('lazy-image');
      expect(image).toHaveAttribute('src', 'https://example.com/photo1.jpg');
    });

    it('should render placeholder when no photo', () => {
      render(<EmployeeCard employee={createMockEmployee({ photos: [] })} />);

      expect(screen.getByText('👤')).toBeInTheDocument();
    });
  });

  describe('Badges', () => {
    it('should show rating badge when showRatingBadge is true', () => {
      render(<EmployeeCard employee={createMockEmployee({ average_rating: 4.5 })} showRatingBadge={true} />);

      expect(screen.getByText(/4\.5/)).toBeInTheDocument();
    });

    it('should hide rating badge when showRatingBadge is false', () => {
      render(<EmployeeCard employee={createMockEmployee({ average_rating: 4.5 })} showRatingBadge={false} />);

      expect(screen.queryByText(/4\.5/)).not.toBeInTheDocument();
    });

    it('should show verified badge when employee is verified', () => {
      render(<EmployeeCard employee={createMockEmployee({ is_verified: true })} />);

      expect(screen.getByText('VERIFIED')).toBeInTheDocument();
    });

    it('should show vote count when votes exist', () => {
      render(<EmployeeCard employee={createMockEmployee({ vote_count: 5 })} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('VIP status', () => {
    it('should show VIP badge when employee is VIP', () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      render(<EmployeeCard employee={createMockEmployee({
        is_vip: true,
        vip_expires_at: futureDate.toISOString(),
      })} />);

      expect(screen.getByText('VIP')).toBeInTheDocument();
    });

    it('should not show VIP badge when VIP is expired', () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);

      render(<EmployeeCard employee={createMockEmployee({
        is_vip: true,
        vip_expires_at: pastDate.toISOString(),
      })} />);

      expect(screen.queryByText('VIP')).not.toBeInTheDocument();
    });
  });

  describe('Click handling', () => {
    it('should call onClick when card is clicked', async () => {
      const employee = createMockEmployee();
      render(<EmployeeCard employee={employee} onClick={mockOnClick} />);

      const card = screen.getByTestId('employee-card-inner');
      await userEvent.click(card);

      expect(mockOnClick).toHaveBeenCalledWith(employee);
    });

    it('should call onClick on Enter key', () => {
      const employee = createMockEmployee();
      render(<EmployeeCard employee={employee} onClick={mockOnClick} />);

      const card = screen.getByTestId('employee-card-inner');
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(mockOnClick).toHaveBeenCalledWith(employee);
    });
  });

  describe('Accessibility', () => {
    it('should have button role', () => {
      render(<EmployeeCard employee={createMockEmployee()} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have aria-label for profile access', () => {
      render(<EmployeeCard employee={createMockEmployee({ name: 'Jane Doe' })} />);

      expect(screen.getByLabelText('View profile of Jane Doe')).toBeInTheDocument();
    });

    it('should be keyboard focusable', () => {
      render(<EmployeeCard employee={createMockEmployee()} />);

      const card = screen.getByTestId('employee-card-inner');
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Establishment display', () => {
    it('should show establishment when showEstablishment is true', () => {
      const employee = createMockEmployee({
        current_employment: [{
          id: 'ce-1',
          is_current: true,
          establishment: { id: 'est-1', name: 'Test Bar' },
        }] as any,
      });

      render(<EmployeeCard employee={employee} showEstablishment={true} />);

      expect(screen.getByText('Test Bar')).toBeInTheDocument();
    });

    it('should hide establishment when showEstablishment is false', () => {
      const employee = createMockEmployee({
        current_employment: [{
          id: 'ce-1',
          is_current: true,
          establishment: { id: 'est-1', name: 'Test Bar' },
        }] as any,
      });

      render(<EmployeeCard employee={employee} showEstablishment={false} />);

      expect(screen.queryByText('Test Bar')).not.toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<EmployeeCard employee={createMockEmployee()} className="custom-class" />);

      const card = screen.getByTestId('employee-card-inner');
      expect(card).toHaveClass('custom-class');
    });
  });
});
