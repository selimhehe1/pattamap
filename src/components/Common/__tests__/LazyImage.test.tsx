/** @vitest-environment jsdom */
/**
 * LazyImage Component Tests
 *
 * Tests for the lazy-loaded image component:
 * - Renders without crashing
 * - Renders img element with correct src
 * - Renders with alt text
 * - Shows loading spinner when showLoadingSpinner is true
 * - Handles error state (fallback to placeholder)
 * - Applies custom className
 *
 * Total: 6 tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock logger
vi.mock('../../../utils/logger');

// Mock cloudinary utils
vi.mock('../../../utils/cloudinary', () => ({
  getOptimizedImageUrl: (url: string) => url,
  getAutoSrcSet: (url: string) => ({ src: url, srcSet: undefined, sizes: undefined }),
  isCloudinaryUrl: () => false,
}));

// Mock imageValidation utils
vi.mock('../../../utils/imageValidation', () => ({
  validateAltText: () => ({ isValid: true, warnings: [], errors: [] }),
  logAltTextValidation: () => {},
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  AlertTriangle: (props: any) => <span data-testid="alert-icon" {...props} />,
}));

import LazyImage from '../LazyImage';

describe('LazyImage', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <LazyImage src="https://example.com/photo.jpg" alt="Test photo" />
    );

    expect(container.querySelector('img')).toBeInTheDocument();
  });

  it('renders img element with the correct src', () => {
    render(
      <LazyImage src="https://example.com/photo.jpg" alt="Test photo" />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('renders with the correct alt text', () => {
    render(
      <LazyImage src="https://example.com/photo.jpg" alt="A scenic beach view" />
    );

    const img = screen.getByAltText('A scenic beach view');
    expect(img).toBeInTheDocument();
  });

  it('shows loading spinner when showLoadingSpinner is true', () => {
    render(
      <LazyImage
        src="https://example.com/photo.jpg"
        alt="Loading test"
        showLoadingSpinner={true}
      />
    );

    // The spinner has role="status"
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading image');
  });

  it('handles error state by showing placeholder and error indicator', () => {
    const onError = vi.fn();

    render(
      <LazyImage
        src="https://example.com/broken.jpg"
        alt="Broken image"
        onError={onError}
      />
    );

    const img = screen.getByRole('img');

    // Simulate image load error
    fireEvent.error(img);

    // onError callback should have been called
    expect(onError).toHaveBeenCalledTimes(1);

    // The error indicator should appear (contains AlertTriangle icon)
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
  });

  it('applies a custom className', () => {
    const { container } = render(
      <LazyImage
        src="https://example.com/photo.jpg"
        alt="Styled image"
        className="my-custom-class"
      />
    );

    // className is applied to the container div, not the img
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('my-custom-class');
  });
});
