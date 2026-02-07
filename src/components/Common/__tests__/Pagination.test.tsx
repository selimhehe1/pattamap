/**
 * @vitest-environment jsdom
 */
/**
 * Pagination Component Tests
 *
 * Tests for the pagination component:
 * - Rendering (3 tests)
 * - Navigation (4 tests)
 * - Page numbers (3 tests)
 * - Disabled states (3 tests)
 * - Accessibility (2 tests)
 *
 * Total: 15 tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from '../Pagination';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, disabled, className, ...props }: any) => (
      <button onClick={onClick} disabled={disabled} className={className} {...props}>
        {children}
      </button>
    ),
  },
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { current?: number; total?: number; page?: number; defaultValue?: string }) => {
      const translations: Record<string, string> = {
        'pagination.navigation': 'Pagination Navigation',
        'pagination.first': 'First page',
        'pagination.previous': 'Previous page',
        'pagination.next': 'Next page',
        'pagination.last': 'Last page',
      };
      if (key === 'pagination.pageInfo') {
        return `Page ${options?.current} of ${options?.total}`;
      }
      if (key === 'pagination.goToPage') {
        return `Go to page ${options?.page}`;
      }
      return translations[key] || options?.defaultValue || key;
    },
  }),
}));

// Mock haptics
vi.mock('../../../utils/haptics', () => ({
  haptic: {
    light: vi.fn(),
  },
}));

describe('Pagination Component', () => {
  const mockOnPageChange = vi.fn();

  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    onPageChange: mockOnPageChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.innerWidth for responsive tests
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  });

  describe('Rendering', () => {
    it('should render navigation with all buttons', () => {
      render(<Pagination {...defaultProps} />);

      expect(screen.getByText('First page')).toBeInTheDocument();
      expect(screen.getByText('Previous page')).toBeInTheDocument();
      expect(screen.getByText('Next page')).toBeInTheDocument();
      expect(screen.getByText('Last page')).toBeInTheDocument();
    });

    it('should show page info', () => {
      render(<Pagination {...defaultProps} currentPage={5} />);

      expect(screen.getByText('Page 5 of 10')).toBeInTheDocument();
    });

    it('should not render when totalPages is 1', () => {
      const { container } = render(<Pagination {...defaultProps} totalPages={1} />);

      expect(container.querySelector('nav')).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should call onPageChange when next is clicked', async () => {
      render(<Pagination {...defaultProps} currentPage={1} />);

      const nextButton = screen.getByLabelText('Next page');
      await userEvent.click(nextButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange when previous is clicked', async () => {
      render(<Pagination {...defaultProps} currentPage={5} />);

      const prevButton = screen.getByLabelText('Previous page');
      await userEvent.click(prevButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(4);
    });

    it('should go to first page when first button is clicked', async () => {
      render(<Pagination {...defaultProps} currentPage={5} />);

      const firstButton = screen.getByLabelText('First page');
      await userEvent.click(firstButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });

    it('should go to last page when last button is clicked', async () => {
      render(<Pagination {...defaultProps} currentPage={1} />);

      const lastButton = screen.getByLabelText('Last page');
      await userEvent.click(lastButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(10);
    });
  });

  describe('Page numbers', () => {
    it('should render page numbers', () => {
      render(<Pagination {...defaultProps} currentPage={1} />);

      // Should show page 1
      expect(screen.getByRole('button', { name: 'Go to page 1' })).toBeInTheDocument();
    });

    it('should call onPageChange when page number is clicked', async () => {
      render(<Pagination {...defaultProps} currentPage={1} />);

      const page3 = screen.getByRole('button', { name: 'Go to page 3' });
      await userEvent.click(page3);

      expect(mockOnPageChange).toHaveBeenCalledWith(3);
    });

    it('should mark current page as active', () => {
      render(<Pagination {...defaultProps} currentPage={3} />);

      const currentPageButton = screen.getByRole('button', { name: 'Go to page 3' });
      expect(currentPageButton).toHaveClass('pagination-btn--active');
    });
  });

  describe('Disabled states', () => {
    it('should disable previous and first on first page', () => {
      render(<Pagination {...defaultProps} currentPage={1} />);

      expect(screen.getByLabelText('First page')).toBeDisabled();
      expect(screen.getByLabelText('Previous page')).toBeDisabled();
    });

    it('should disable next and last on last page', () => {
      render(<Pagination {...defaultProps} currentPage={10} />);

      expect(screen.getByLabelText('Next page')).toBeDisabled();
      expect(screen.getByLabelText('Last page')).toBeDisabled();
    });

    it('should disable all buttons when disabled prop is true', () => {
      render(<Pagination {...defaultProps} currentPage={5} disabled={true} />);

      expect(screen.getByLabelText('First page')).toBeDisabled();
      expect(screen.getByLabelText('Previous page')).toBeDisabled();
      expect(screen.getByLabelText('Next page')).toBeDisabled();
      expect(screen.getByLabelText('Last page')).toBeDisabled();
    });
  });

  describe('Loading state', () => {
    it('should disable all buttons when loading', () => {
      render(<Pagination {...defaultProps} currentPage={5} loading={true} />);

      expect(screen.getByLabelText('First page')).toBeDisabled();
      expect(screen.getByLabelText('Previous page')).toBeDisabled();
      expect(screen.getByLabelText('Next page')).toBeDisabled();
      expect(screen.getByLabelText('Last page')).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have navigation role with label', () => {
      render(<Pagination {...defaultProps} />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Pagination Navigation');
    });

    it('should mark current page with aria-current', () => {
      render(<Pagination {...defaultProps} currentPage={3} />);

      const currentPageButton = screen.getByRole('button', { name: 'Go to page 3' });
      expect(currentPageButton).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Edge cases', () => {
    it('should not call onPageChange when clicking current page', async () => {
      render(<Pagination {...defaultProps} currentPage={5} />);

      const currentPage = screen.getByRole('button', { name: 'Go to page 5' });
      await userEvent.click(currentPage);

      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it('should show ellipsis for large page counts', () => {
      render(<Pagination {...defaultProps} totalPages={20} currentPage={10} />);

      // Should have ellipsis elements
      const ellipses = screen.getAllByText('...');
      expect(ellipses.length).toBeGreaterThan(0);
    });
  });

  describe('[a11y]', () => {
    it('should have no accessibility violations', async () => {
      const { axe, toHaveNoViolations } = await import('jest-axe');
      expect.extend(toHaveNoViolations);

      const { container } = render(
        <Pagination {...defaultProps} totalPages={5} currentPage={3} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
