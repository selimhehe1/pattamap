/**
 * @vitest-environment jsdom
 */
/**
 * FormField Component Tests
 *
 * Tests for the form field component:
 * - Renders with label and input
 * - Shows error message when invalid
 * - Shows help text
 * - Renders textarea variant
 * - Renders select variant
 * - Accessibility (axe)
 *
 * Total: 6 tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FormField from '../FormField';

describe('FormField Component', () => {
  const defaultProps = {
    label: 'Username',
    name: 'username',
    value: '',
    onChange: vi.fn(),
  };

  it('should render with label and input', () => {
    render(<FormField {...defaultProps} />);

    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should show error message when status is touched and error provided', () => {
    render(
      <FormField {...defaultProps} error="Username is required" status="invalid" />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Username is required');
  });

  it('should show help text when provided and no error', () => {
    render(<FormField {...defaultProps} helpText="Enter your display name" />);

    expect(screen.getByText('Enter your display name')).toBeInTheDocument();
  });

  it('should render textarea when type is textarea', () => {
    render(<FormField {...defaultProps} type="textarea" />);

    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA');
  });

  it('should render select when type is select', () => {
    const options = [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ];

    render(<FormField {...defaultProps} type="select" options={options} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  describe('[a11y]', () => {
    it('should have no accessibility violations', async () => {
      const { axe, toHaveNoViolations } = await import('jest-axe');
      expect.extend(toHaveNoViolations);

      const { container } = render(
        <FormField {...defaultProps} required helpText="Pick a unique name" />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations with error state', async () => {
      const { axe, toHaveNoViolations } = await import('jest-axe');
      expect.extend(toHaveNoViolations);

      const { container } = render(
        <FormField {...defaultProps} error="Required field" status="invalid" />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
