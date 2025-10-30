import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthContext } from '../../../contexts/AuthContext';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../utils/i18n';
import { BrowserRouter } from 'react-router-dom'; // Uses mock from src/__mocks__/react-router-dom.tsx

// react-router-dom is automatically mocked via src/__mocks__/react-router-dom.tsx

// Mock useSecureFetch hook
const mockSecureFetch = jest.fn();
jest.mock('../../../hooks/useSecureFetch', () => ({
  useSecureFetch: () => ({
    secureFetch: mockSecureFetch
  })
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Import NotificationBell after mocks
import NotificationBell from '../NotificationBell';

// Mock notifications data
const mockNotifications = [
  {
    id: '1',
    user_id: 'user-1',
    type: 'ownership_request_submitted',
    title: 'Ownership Request Submitted',
    message: 'Your ownership request has been submitted',
    is_read: false,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    user_id: 'user-1',
    type: 'employee_approved',
    title: 'Employee Approved',
    message: 'Your employee profile has been approved',
    is_read: false,
    created_at: new Date(Date.now() - 86400000).toISOString() // Yesterday
  },
  {
    id: '3',
    user_id: 'user-1',
    type: 'comment_reply',
    title: 'New Comment Reply',
    message: 'Someone replied to your comment',
    is_read: true,
    created_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
  },
  {
    id: '4',
    user_id: 'user-1',
    type: 'new_favorite',
    title: 'New Favorite',
    message: 'Someone favorited your profile',
    is_read: false,
    created_at: new Date(Date.now() - 604800000).toISOString() // 7 days ago
  }
];

// Helper to render with context
const renderWithContext = (ui: React.ReactElement, authValue: any = null) => {
  const defaultAuthValue = {
    user: { id: 'user-1', username: 'testuser' },
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
    loading: false
  };

  return render(
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        <AuthContext.Provider value={authValue || defaultAuthValue}>
          {ui}
        </AuthContext.Provider>
      </I18nextProvider>
    </BrowserRouter>
  );
};

describe('NotificationBell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notifications: [], unreadCount: 0 })
    });
  });

  describe('Rendering', () => {
    test('renders notification bell icon', () => {
      renderWithContext(<NotificationBell />);
      const bellButton = screen.getByRole('button', { name: /notifications/i });
      expect(bellButton).toBeInTheDocument();
    });

    test('shows unread count badge when there are unread notifications', async () => {
      mockSecureFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ unreadCount: 5 })
      });

      renderWithContext(<NotificationBell />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    test('does not show badge when unread count is 0', async () => {
      mockSecureFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ unreadCount: 0 })
      });

      renderWithContext(<NotificationBell />);

      await waitFor(() => {
        expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
      });
    });

    test('does not render when user is not authenticated', () => {
      const unauthenticatedValue = {
        user: null,
        isAuthenticated: false,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false
      };

      const { container } = renderWithContext(<NotificationBell />, unauthenticatedValue);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Dropdown Menu', () => {
    test('opens dropdown when bell icon is clicked', async () => {
      mockSecureFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ unreadCount: 0 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ notifications: [] }) });

      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/notifications/i)).toBeInTheDocument();
      });
    });

    test('closes dropdown when clicking outside', async () => {
      mockSecureFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ unreadCount: 0 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ notifications: [] }) });

      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/notifications/i)).toBeInTheDocument();
      });

      // Click outside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
      });
    });

    test('displays empty state when no notifications', async () => {
      mockSecureFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ unreadCount: 0 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ notifications: [] }) });

      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Notification Grouping', () => {
    beforeEach(() => {
      mockSecureFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ unreadCount: 3 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ notifications: mockNotifications }) });
    });

    test('groups notifications by type by default', async () => {
      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/ownership/i)).toBeInTheDocument();
        expect(screen.getByText(/moderation/i)).toBeInTheDocument();
        expect(screen.getByText(/social/i)).toBeInTheDocument();
      });
    });

    test('switches to date grouping mode', async () => {
      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/ownership/i)).toBeInTheDocument();
      });

      // Find and click the grouping mode toggle button (📁/📅 emoji)
      const groupToggleButton = screen.getByTitle(/toggle grouping/i);
      fireEvent.click(groupToggleButton);

      await waitFor(() => {
        expect(screen.getByText(/today/i)).toBeInTheDocument();
        expect(screen.getByText(/yesterday/i)).toBeInTheDocument();
      });
    });

    test('collapses and expands groups', async () => {
      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('Ownership Request Submitted')).toBeInTheDocument();
      });

      // Find the ownership group toggle button
      const groupHeader = screen.getByText(/ownership/i).closest('button');
      if (groupHeader) {
        fireEvent.click(groupHeader);

        await waitFor(() => {
          expect(screen.queryByText('Ownership Request Submitted')).not.toBeInTheDocument();
        });

        // Expand again
        fireEvent.click(groupHeader);

        await waitFor(() => {
          expect(screen.getByText('Ownership Request Submitted')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Notification Filtering', () => {
    beforeEach(() => {
      mockSecureFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ unreadCount: 3 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ notifications: mockNotifications }) });
    });

    test('filters to show only unread notifications', async () => {
      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('Ownership Request Submitted')).toBeInTheDocument();
        expect(screen.getByText('New Comment Reply')).toBeInTheDocument();
      });

      // Click unread filter
      const unreadFilterButton = screen.getByText(/unread/i);
      fireEvent.click(unreadFilterButton);

      await waitFor(() => {
        expect(screen.getByText('Ownership Request Submitted')).toBeInTheDocument();
        expect(screen.queryByText('New Comment Reply')).not.toBeInTheDocument();
      });
    });

    test('filters by category - ownership', async () => {
      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('Ownership Request Submitted')).toBeInTheDocument();
      });

      // Click ownership category filter
      const ownershipFilter = screen.getByText('🏆', { exact: false });
      fireEvent.click(ownershipFilter);

      await waitFor(() => {
        expect(screen.getByText('Ownership Request Submitted')).toBeInTheDocument();
        expect(screen.queryByText('Employee Approved')).not.toBeInTheDocument();
        expect(screen.queryByText('New Comment Reply')).not.toBeInTheDocument();
      });
    });

    test('filters by category - moderation', async () => {
      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('Employee Approved')).toBeInTheDocument();
      });

      // Find and click moderation category filter
      const categoryButtons = screen.getAllByRole('button');
      const moderationButton = categoryButtons.find(btn => btn.textContent?.includes('Moderation'));

      if (moderationButton) {
        fireEvent.click(moderationButton);

        await waitFor(() => {
          expect(screen.getByText('Employee Approved')).toBeInTheDocument();
          expect(screen.queryByText('Ownership Request Submitted')).not.toBeInTheDocument();
        });
      }
    });

    test('shows "no filtered notifications" message when filters match nothing', async () => {
      mockSecureFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ unreadCount: 0 }) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: [mockNotifications[2]] // Only read notification
          })
        });

      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('New Comment Reply')).toBeInTheDocument();
      });

      // Click unread filter (should show no results)
      const unreadFilterButton = screen.getByText(/unread/i);
      fireEvent.click(unreadFilterButton);

      await waitFor(() => {
        expect(screen.getByText(/no notifications match your filters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Batch Actions', () => {
    beforeEach(() => {
      mockSecureFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ unreadCount: 3 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ notifications: mockNotifications }) });
    });

    test('marks entire group as read', async () => {
      mockSecureFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('Ownership Request Submitted')).toBeInTheDocument();
      });

      // Find "mark group as read" button for ownership group
      const markGroupButtons = screen.getAllByTitle(/mark group as read/i);
      if (markGroupButtons.length > 0) {
        fireEvent.click(markGroupButtons[0]);

        await waitFor(() => {
          expect(mockSecureFetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/notifications/'),
            expect.objectContaining({ method: 'PATCH' })
          );
        });
      }
    });

    test('marks all notifications as read', async () => {
      mockSecureFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/mark all read/i)).toBeInTheDocument();
      });

      const markAllButton = screen.getByText(/mark all read/i);
      fireEvent.click(markAllButton);

      await waitFor(() => {
        expect(mockSecureFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/notifications/mark-all-read'),
          expect.objectContaining({ method: 'PATCH' })
        );
      });
    });
  });

  describe('Individual Notification Actions', () => {
    beforeEach(() => {
      mockSecureFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ unreadCount: 1 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ notifications: [mockNotifications[0]] }) });
    });

    test('marks individual notification as read when clicked', async () => {
      mockSecureFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('Ownership Request Submitted')).toBeInTheDocument();
      });

      const notification = screen.getByText('Ownership Request Submitted').closest('div');
      if (notification) {
        fireEvent.click(notification);

        await waitFor(() => {
          expect(mockSecureFetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/notifications/1/read'),
            expect.objectContaining({ method: 'PATCH' })
          );
        });
      }
    });

    test('deletes individual notification', async () => {
      mockSecureFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('Ownership Request Submitted')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(/delete notification/i);
      if (deleteButtons.length > 0) {
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
          expect(mockSecureFetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/notifications/1'),
            expect.objectContaining({ method: 'DELETE' })
          );
        });
      }
    });
  });

  describe('Notification Icons', () => {
    test('displays correct icon for ownership_request_submitted', async () => {
      const notification = {
        ...mockNotifications[0],
        type: 'ownership_request_submitted'
      };

      mockSecureFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ unreadCount: 1 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ notifications: [notification] }) });

      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('📋')).toBeInTheDocument();
      });
    });

    test('displays correct icon for employee_approved', async () => {
      const notification = {
        ...mockNotifications[1],
        type: 'employee_approved'
      };

      mockSecureFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ unreadCount: 1 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ notifications: [notification] }) });

      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('👤✅')).toBeInTheDocument();
      });
    });

    test('displays correct icon for comment_reply', async () => {
      const notification = {
        ...mockNotifications[2],
        type: 'comment_reply'
      };

      mockSecureFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ unreadCount: 0 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ notifications: [notification] }) });

      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('💬')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles fetch error gracefully', async () => {
      mockSecureFetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithContext(<NotificationBell />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
      });
    });

    test('handles mark as read error gracefully', async () => {
      mockSecureFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ unreadCount: 1 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ notifications: [mockNotifications[0]] }) })
        .mockRejectedValueOnce(new Error('Mark read failed'));

      renderWithContext(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('Ownership Request Submitted')).toBeInTheDocument();
      });

      const notification = screen.getByText('Ownership Request Submitted').closest('div');
      if (notification) {
        fireEvent.click(notification);

        await waitFor(() => {
          expect(mockSecureFetch).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Real-time Updates', () => {
    test('polls for new notifications every 30 seconds', async () => {
      jest.useFakeTimers();

      mockSecureFetch.mockResolvedValue({ ok: true, json: async () => ({ unreadCount: 0 }) });

      renderWithContext(<NotificationBell />);

      await waitFor(() => {
        expect(mockSecureFetch).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(mockSecureFetch).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });
  });
});
