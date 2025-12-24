/**
 * @vitest-environment jsdom
 */
/**
 * Modal Component Tests
 *
 * Tests for the unified Modal component:
 * - Rendering and basic display (4 tests)
 * - Close functionality (3 tests)
 * - Accessibility (3 tests)
 * - Size variants (3 tests)
 * - Z-index stacking (2 tests)
 *
 * Total: 15 tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../Modal';
import { ModalConfig } from '../../../contexts/ModalContext';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, style, ...props }: any) => (
      <div onClick={onClick} style={style} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock useFocusTrap hook
vi.mock('../../../hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}));

// Mock animation variants
vi.mock('../../../animations/variants', () => ({
  modalVariants: {},
  backdropVariants: {},
}));

// Mock AnimatedButton
vi.mock('../AnimatedButton', () => ({
  default: ({ children, onClick, ariaLabel, className }: any) => (
    <button onClick={onClick} aria-label={ariaLabel} className={className}>
      {children}
    </button>
  ),
}));

// Mock LoadingFallback
vi.mock('../LoadingFallback', () => ({
  default: ({ message }: any) => <div data-testid="loading-fallback">{message}</div>,
}));

// Sample modal content component
const TestContent = ({ title, message }: { title?: string; message?: string }) => (
  <div data-testid="modal-content">
    <h2 id="modal-title-test-1">{title || 'Test Title'}</h2>
    <p id="modal-description-test-1">{message || 'Test message'}</p>
  </div>
);

describe('Modal Component', () => {
  const mockOnClose = vi.fn();

  const createModalConfig = (overrides: Partial<ModalConfig> = {}): ModalConfig => ({
    id: 'test-1',
    component: TestContent,
    props: { title: 'Test Modal', message: 'This is a test' },
    options: {
      size: 'medium',
      closeOnEscape: true,
      closeOnOverlayClick: true,
      showCloseButton: true,
      ...overrides.options,
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering and basic display', () => {
    it('should render modal with content', () => {
      render(<Modal modal={createModalConfig()} index={0} onClose={mockOnClose} />);

      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('This is a test')).toBeInTheDocument();
    });

    it('should render close button by default', () => {
      render(<Modal modal={createModalConfig()} index={0} onClose={mockOnClose} />);

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('should hide close button when showCloseButton is false', () => {
      const modal = createModalConfig({
        options: { showCloseButton: false },
      });
      render(<Modal modal={modal} index={0} onClose={mockOnClose} />);

      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });

    it('should have dialog role and aria attributes', () => {
      render(<Modal modal={createModalConfig()} index={0} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title-test-1');
      expect(dialog).toHaveAttribute('aria-describedby', 'modal-description-test-1');
    });
  });

  describe('Close functionality', () => {
    it('should call onClose when close button is clicked', async () => {
      render(<Modal modal={createModalConfig()} index={0} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('Close modal');
      await userEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledWith('test-1');
    });

    it('should call onClose when Escape key is pressed', () => {
      render(<Modal modal={createModalConfig()} index={0} onClose={mockOnClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledWith('test-1');
    });

    it('should not close on Escape when closeOnEscape is false', () => {
      const modal = createModalConfig({
        options: { closeOnEscape: false },
      });
      render(<Modal modal={modal} index={0} onClose={mockOnClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Overlay click behavior', () => {
    it('should call onClose when overlay is clicked', async () => {
      render(<Modal modal={createModalConfig()} index={0} onClose={mockOnClose} />);

      // Find the overlay (first div with modal-overlay-unified class)
      const overlay = document.querySelector('.modal-overlay-unified');
      expect(overlay).toBeInTheDocument();

      // Simulate click on overlay (not on content)
      fireEvent.click(overlay!);

      expect(mockOnClose).toHaveBeenCalledWith('test-1');
    });

    it('should not close when clicking on modal content', async () => {
      render(<Modal modal={createModalConfig()} index={0} onClose={mockOnClose} />);

      const content = screen.getByTestId('modal-content');
      await userEvent.click(content);

      // onClose should not have been called because we clicked on content
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not close on overlay click when closeOnOverlayClick is false', async () => {
      const modal = createModalConfig({
        options: { closeOnOverlayClick: false },
      });
      render(<Modal modal={modal} index={0} onClose={mockOnClose} />);

      const overlay = document.querySelector('.modal-overlay-unified');
      fireEvent.click(overlay!);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Size variants', () => {
    it('should apply small size styles', () => {
      const modal = createModalConfig({ options: { size: 'small' } });
      render(<Modal modal={modal} index={0} onClose={mockOnClose} />);

      const content = document.querySelector('.modal-content-unified');
      expect(content).toHaveStyle({ maxWidth: '400px' });
    });

    it('should apply large size styles', () => {
      const modal = createModalConfig({ options: { size: 'large' } });
      render(<Modal modal={modal} index={0} onClose={mockOnClose} />);

      const content = document.querySelector('.modal-content-unified');
      expect(content).toHaveStyle({ maxWidth: '900px' });
    });

    it('should apply fullscreen size styles', () => {
      const modal = createModalConfig({ options: { size: 'fullscreen' } });
      render(<Modal modal={modal} index={0} onClose={mockOnClose} />);

      const content = document.querySelector('.modal-content-unified');
      expect(content).toHaveStyle({ width: '100vw', height: '100vh' });
      expect(content).toHaveAttribute('data-fullscreen', 'true');
    });
  });

  describe('Z-index stacking', () => {
    it('should calculate z-index based on index position', () => {
      render(<Modal modal={createModalConfig()} index={2} onClose={mockOnClose} />);

      const overlay = document.querySelector('.modal-overlay-unified');
      // Base z-index (100000) + index * 10 = 100020
      expect(overlay).toHaveStyle({ zIndex: '100020' });
    });

    it('should use custom z-index when provided in options', () => {
      const modal = createModalConfig({ options: { zIndex: 200000 } });
      render(<Modal modal={modal} index={0} onClose={mockOnClose} />);

      const overlay = document.querySelector('.modal-overlay-unified');
      expect(overlay).toHaveStyle({ zIndex: '200000' });
    });
  });

  describe('Cleanup', () => {
    it('should remove escape key listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = render(
        <Modal modal={createModalConfig()} index={0} onClose={mockOnClose} />
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });
});
