/**
 * Accessibility tests for ShareButton component
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import ShareButton from '../ShareButton';

// Extend expect with axe matchers
expect.extend(toHaveNoViolations);

// Mock analytics
vi.mock('../../../utils/analytics', () => ({
  Analytics: {
    trackEvent: vi.fn(),
  },
}));

describe('[a11y] ShareButton', () => {
  it('icon variant should have no accessibility violations', async () => {
    const { container } = render(
      <ShareButton title="Test Share" variant="icon" />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('button variant should have no accessibility violations', async () => {
    const { container } = render(
      <ShareButton title="Test Share" variant="button" />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible button with aria-label', () => {
    render(<ShareButton title="Test Share" variant="icon" />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Share');
  });

  it('dropdown variant should have proper ARIA attributes', () => {
    render(<ShareButton title="Test Share" variant="dropdown" />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Share options');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});
