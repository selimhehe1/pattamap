/**
 * @vitest-environment jsdom
 */
/**
 * ConfirmModal Component Tests
 *
 * Tests for the confirmation dialog component:
 * - Rendering and display (4 tests)
 * - Button actions (4 tests)
 * - Variants (4 tests)
 * - Overlay behavior (2 tests)
 * - Custom text (2 tests)
 *
 * Total: 16 tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmModal from '../ConfirmModal';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

describe('ConfirmModal Component', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    message: 'Are you sure you want to proceed?',
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering and display', () => {
    it('should render message', () => {
      render(<ConfirmModal {...defaultProps} />);

      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(<ConfirmModal {...defaultProps} title="Custom Title" />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should render default title based on variant', () => {
      render(<ConfirmModal {...defaultProps} variant="danger" />);

      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<ConfirmModal {...defaultProps} />);

      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });
  });

  describe('Button actions', () => {
    it('should call onConfirm and onClose when confirm button is clicked', async () => {
      render(<ConfirmModal {...defaultProps} />);

      const confirmButton = screen.getByText('Confirm');
      await userEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel and onClose when cancel button is clicked', async () => {
      render(<ConfirmModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      await userEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when close button is clicked', async () => {
      render(<ConfirmModal {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close');
      await userEvent.click(closeButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should work without onClose callback', async () => {
      const { onClose: _, ...propsWithoutOnClose } = defaultProps;
      render(<ConfirmModal {...propsWithoutOnClose} />);

      const confirmButton = screen.getByText('Confirm');
      await userEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      // Should not throw even without onClose
    });
  });

  describe('Variants', () => {
    it('should render danger variant with correct icon and title', () => {
      render(<ConfirmModal {...defaultProps} variant="danger" />);

      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
      const modal = document.querySelector('.confirm-modal-danger');
      expect(modal).toBeInTheDocument();
    });

    it('should render warning variant with correct icon and title', () => {
      render(<ConfirmModal {...defaultProps} variant="warning" />);

      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      const modal = document.querySelector('.confirm-modal-warning');
      expect(modal).toBeInTheDocument();
    });

    it('should render success variant with correct icon and title', () => {
      render(<ConfirmModal {...defaultProps} variant="success" />);

      // Use heading role to distinguish from button
      expect(screen.getByRole('heading', { name: 'Confirm' })).toBeInTheDocument();
      const modal = document.querySelector('.confirm-modal-success');
      expect(modal).toBeInTheDocument();
    });

    it('should render info variant by default', () => {
      render(<ConfirmModal {...defaultProps} />);

      expect(screen.getByText('Confirmation')).toBeInTheDocument();
      const modal = document.querySelector('.confirm-modal-info');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Overlay behavior', () => {
    it('should call onCancel when clicking on overlay', async () => {
      render(<ConfirmModal {...defaultProps} />);

      const overlay = document.querySelector('.modal-overlay');
      expect(overlay).toBeInTheDocument();

      // Simulate click on overlay directly
      fireEvent.click(overlay!);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when clicking on modal content', async () => {
      render(<ConfirmModal {...defaultProps} />);

      const modal = document.querySelector('.modal.modal--dialog');
      expect(modal).toBeInTheDocument();

      fireEvent.click(modal!);

      expect(mockOnCancel).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Custom text', () => {
    it('should render custom confirm text', () => {
      render(<ConfirmModal {...defaultProps} confirmText="Delete Forever" />);

      expect(screen.getByText('Delete Forever')).toBeInTheDocument();
    });

    it('should render custom cancel text', () => {
      render(<ConfirmModal {...defaultProps} cancelText="Go Back" />);

      expect(screen.getByText('Go Back')).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should show danger icon for danger variant', () => {
      render(<ConfirmModal {...defaultProps} variant="danger" />);

      const icon = document.querySelector('.dialog-icon');
      expect(icon).toBeInTheDocument();
      // Lucide TriangleAlert (formerly AlertTriangle) icon is rendered as SVG
      expect(icon?.querySelector('.lucide-triangle-alert')).toBeInTheDocument();
    });

    it('should show warning icon for warning variant', () => {
      render(<ConfirmModal {...defaultProps} variant="warning" />);

      const icon = document.querySelector('.dialog-icon');
      expect(icon).toBeInTheDocument();
      // Lucide Zap icon is rendered as SVG
      expect(icon?.querySelector('.lucide-zap')).toBeInTheDocument();
    });

    it('should show success icon for success variant', () => {
      render(<ConfirmModal {...defaultProps} variant="success" />);

      const icon = document.querySelector('.dialog-icon');
      expect(icon).toBeInTheDocument();
      // Lucide Check icon is rendered as SVG
      expect(icon?.querySelector('.lucide-check')).toBeInTheDocument();
    });

    it('should show info icon by default', () => {
      render(<ConfirmModal {...defaultProps} />);

      const icon = document.querySelector('.dialog-icon');
      expect(icon).toBeInTheDocument();
      // Lucide Info icon is rendered as SVG
      expect(icon?.querySelector('.lucide-info')).toBeInTheDocument();
    });
  });
});
