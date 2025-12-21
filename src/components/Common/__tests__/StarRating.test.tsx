/**
 * @vitest-environment jsdom
 */
/**
 * StarRating Component Tests
 *
 * Tests for the star rating component:
 * - Rendering (3 tests)
 * - Interactive mode (4 tests)
 * - Readonly mode (2 tests)
 * - Size variants (3 tests)
 * - Accessibility (3 tests)
 *
 * Total: 15 tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StarRating from '../StarRating';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      if (key === 'starRating.ariaStarsSingular') return `${options?.count} star`;
      if (key === 'starRating.ariaStarsPlural') return `${options?.count} stars`;
      return key;
    },
  }),
}));

describe('StarRating Component', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render 5 stars', () => {
      render(<StarRating />);

      const stars = screen.getAllByRole('button');
      expect(stars).toHaveLength(5);
    });

    it('should render with initial rating', () => {
      render(<StarRating rating={3} />);

      // All 5 stars should be present
      const stars = screen.getAllByRole('button');
      expect(stars).toHaveLength(5);
    });

    it('should show value when showValue is true', () => {
      render(<StarRating rating={4} showValue={true} />);

      expect(screen.getByText('4.0')).toBeInTheDocument();
    });
  });

  describe('Interactive mode', () => {
    it('should call onChange when star is clicked', async () => {
      render(<StarRating onChange={mockOnChange} />);

      const stars = screen.getAllByRole('button');
      await userEvent.click(stars[2]); // Click 3rd star

      expect(mockOnChange).toHaveBeenCalledWith(3);
    });

    it('should update rating on click', async () => {
      render(<StarRating showValue={true} onChange={mockOnChange} />);

      const stars = screen.getAllByRole('button');
      await userEvent.click(stars[4]); // Click 5th star

      expect(screen.getByText('5.0')).toBeInTheDocument();
    });

    it('should show hover effect on mouse enter', async () => {
      render(<StarRating showValue={true} />);

      const stars = screen.getAllByRole('button');
      fireEvent.mouseEnter(stars[3]); // Hover 4th star

      // Value should update to show hovered rating
      expect(screen.getByText('4.0')).toBeInTheDocument();
    });

    it('should reset hover effect on mouse leave', async () => {
      render(<StarRating rating={2} showValue={true} />);

      const stars = screen.getAllByRole('button');
      fireEvent.mouseEnter(stars[4]); // Hover 5th star
      expect(screen.getByText('5.0')).toBeInTheDocument();

      fireEvent.mouseLeave(stars[4]);
      expect(screen.getByText('2.0')).toBeInTheDocument();
    });
  });

  describe('Readonly mode', () => {
    it('should not call onChange when readonly', async () => {
      render(<StarRating readonly={true} onChange={mockOnChange} />);

      const stars = screen.getAllByRole('img');
      await userEvent.click(stars[2]);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should render as img role when readonly', () => {
      render(<StarRating readonly={true} />);

      const stars = screen.getAllByRole('img');
      expect(stars).toHaveLength(5);
    });
  });

  describe('Size variants', () => {
    it('should apply small size styles', () => {
      const { container } = render(<StarRating size="small" />);

      const star = container.querySelector('span[role="button"]');
      expect(star).toHaveStyle({ fontSize: '14px' });
    });

    it('should apply medium size styles by default', () => {
      const { container } = render(<StarRating />);

      const star = container.querySelector('span[role="button"]');
      expect(star).toHaveStyle({ fontSize: '18px' });
    });

    it('should apply large size styles', () => {
      const { container } = render(<StarRating size="large" />);

      const star = container.querySelector('span[role="button"]');
      expect(star).toHaveStyle({ fontSize: '24px' });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label for each star', () => {
      render(<StarRating />);

      const stars = screen.getAllByRole('button');
      expect(stars[0]).toHaveAttribute('aria-label', '1 star');
      expect(stars[4]).toHaveAttribute('aria-label', '5 stars');
    });

    it('should be keyboard accessible', async () => {
      render(<StarRating onChange={mockOnChange} />);

      const stars = screen.getAllByRole('button');
      stars[2].focus();

      fireEvent.keyDown(stars[2], { key: 'Enter' });
      expect(mockOnChange).toHaveBeenCalledWith(3);
    });

    it('should handle space key', async () => {
      render(<StarRating onChange={mockOnChange} />);

      const stars = screen.getAllByRole('button');
      stars[3].focus();

      fireEvent.keyDown(stars[3], { key: ' ' });
      expect(mockOnChange).toHaveBeenCalledWith(4);
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<StarRating className="custom-rating" />);

      expect(container.firstChild).toHaveClass('custom-rating');
    });
  });
});
