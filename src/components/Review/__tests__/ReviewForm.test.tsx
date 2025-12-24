/**
 * @vitest-environment jsdom
 */
/**
 * ReviewForm Component Tests
 *
 * Tests for the review submission form:
 * - Authentication state (2 tests)
 * - Form rendering (3 tests)
 * - Validation (4 tests)
 * - Submission (3 tests)
 * - Loading states (2 tests)
 *
 * Total: 14 tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewForm from '../ReviewForm';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | { count?: number }) => {
      const translations: Record<string, string> = {
        'review.form.loginRequired': 'Login Required',
        'review.form.loginRequiredMessage': 'Please log in to leave a review',
        'review.form.addComment': 'Add Comment',
        'review.form.yourCommentLabel': 'Your Comment',
        'review.form.commentPlaceholder': 'Write your review here...',
        'review.form.errorCommentRequired': 'Comment is required',
        'review.form.errorCommentMinLength': 'Comment must be at least 10 characters',
        'review.form.errorCommentMaxLength': 'Comment must be less than 1000 characters',
        'review.form.cancelButton': 'Cancel',
        'review.form.submitButton': 'Submit Review',
        'review.form.submittingButton': 'Submitting...',
        'review.form.errorSubmitFailed': 'Failed to submit review',
        'reviews.addPhotos': 'Add photos (optional)',
        'reviews.photosLimit': 'Maximum 3 photos',
        'reviews.photoUploading': 'Uploading photos...',
        'reviews.photoUploadError': 'Failed to upload photos',
      };
      if (key === 'review.form.characterCount' && typeof fallback === 'object' && fallback.count !== undefined) {
        return `${fallback.count}/1000`;
      }
      return translations[key] || fallback || key;
    },
  }),
}));

// Mock AuthContext
const mockUser = { id: 'user-123', email: 'test@example.com', username: 'testuser' };
let mockUserValue: typeof mockUser | null = mockUser;

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUserValue,
  }),
}));

// Mock toast
vi.mock('../../../utils/toast', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
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

// Mock ImageUploadPreview
vi.mock('../../Common/ImageUploadPreview', () => ({
  default: ({ onFilesChange, label, disabled }: any) => (
    <div data-testid="image-upload">
      <span>{label}</span>
      <input
        data-testid="file-input"
        type="file"
        disabled={disabled}
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          onFilesChange(files);
        }}
      />
    </div>
  ),
}));

describe('ReviewForm Component', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    employeeId: 'emp-123',
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserValue = mockUser;
  });

  describe('Authentication state', () => {
    it('should show login required message when user is not authenticated', () => {
      mockUserValue = null;
      render(<ReviewForm {...defaultProps} />);

      expect(screen.getByText(/Login Required/i)).toBeInTheDocument();
      expect(screen.getByText(/Please log in to leave a review/i)).toBeInTheDocument();
    });

    it('should show form when user is authenticated', () => {
      render(<ReviewForm {...defaultProps} />);

      expect(screen.getByText(/Add Comment/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Your Comment/i)).toBeInTheDocument();
    });
  });

  describe('Form rendering', () => {
    it('should render comment textarea', () => {
      render(<ReviewForm {...defaultProps} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render submit and cancel buttons', () => {
      render(<ReviewForm {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Submit Review')).toBeInTheDocument();
    });

    it('should render image upload section', () => {
      render(<ReviewForm {...defaultProps} />);

      expect(screen.getByTestId('image-upload')).toBeInTheDocument();
      expect(screen.getByText('Maximum 3 photos')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show error when comment is empty', async () => {
      render(<ReviewForm {...defaultProps} />);

      const submitButton = screen.getByText('Submit Review');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Comment is required')).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error when comment is too short', async () => {
      render(<ReviewForm {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await userEvent.type(textarea, 'Short');

      const submitButton = screen.getByText('Submit Review');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Comment must be at least 10 characters')).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error when comment is too long', async () => {
      render(<ReviewForm {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      const longText = 'a'.repeat(1001);
      await userEvent.type(textarea, longText);

      const submitButton = screen.getByText('Submit Review');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Comment must be less than 1000 characters')).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show character count', async () => {
      render(<ReviewForm {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await userEvent.type(textarea, 'Test comment');

      expect(screen.getByText(/12\/1000/)).toBeInTheDocument();
    });
  });

  describe('Submission', () => {
    it('should call onSubmit with correct data when form is valid', async () => {
      mockOnSubmit.mockResolvedValue(undefined);
      render(<ReviewForm {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await userEvent.type(textarea, 'This is a valid review comment');

      const submitButton = screen.getByText('Submit Review');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          employee_id: 'emp-123',
          content: 'This is a valid review comment',
          photo_urls: undefined,
        });
      });
    });

    it('should reset form after successful submission', async () => {
      mockOnSubmit.mockResolvedValue(undefined);
      render(<ReviewForm {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await userEvent.type(textarea, 'This is a valid review comment');

      const submitButton = screen.getByText('Submit Review');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('should call onCancel when cancel button is clicked', async () => {
      render(<ReviewForm {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      await userEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading states', () => {
    it('should disable form controls when loading', () => {
      render(<ReviewForm {...defaultProps} isLoading={true} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });

    it('should disable buttons when loading', () => {
      render(<ReviewForm {...defaultProps} isLoading={true} />);

      const cancelButton = screen.getByText('Cancel');
      const submitButton = screen.getByText('Submitting...');

      expect(cancelButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Error handling', () => {
    it('should show error message when submission fails', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Network error'));
      render(<ReviewForm {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await userEvent.type(textarea, 'This is a valid review comment');

      const submitButton = screen.getByText('Submit Review');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to submit review')).toBeInTheDocument();
      });
    });
  });
});
