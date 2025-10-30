/**
 * 🧪 VIPVerificationAdmin Component Tests
 *
 * Tests for VIP Verification Admin Panel component
 * - Rendering transactions list
 * - Filter tabs (Pending/Completed/All)
 * - Transaction cards display
 * - Verify/Reject actions
 * - Error handling
 * - i18n support
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../utils/i18n';
import VIPVerificationAdmin from '../../Admin/VIPVerificationAdmin';

// Mock useSecureFetch hook
const mockSecureFetch = jest.fn();
jest.mock('../../../hooks/useSecureFetch', () => ({
  useSecureFetch: () => ({ secureFetch: mockSecureFetch })
}));

// Mock window.confirm and window.prompt
global.confirm = jest.fn(() => true);
global.prompt = jest.fn(() => 'Test notes');
global.alert = jest.fn();

describe('VIPVerificationAdmin Component', () => {
  const mockTransactions = [
    {
      id: 'transaction-1',
      subscription_type: 'employee',
      subscription_id: 'sub-1',
      user_id: 'user-1',
      amount: 3600,
      currency: 'THB',
      payment_method: 'cash',
      payment_status: 'pending',
      created_at: new Date().toISOString(),
      user: {
        id: 'user-1',
        pseudonym: 'john_doe',
        email: 'john@example.com'
      },
      employee: {
        id: 'employee-1',
        name: 'Jane Doe',
        nickname: 'JD'
      },
      subscription: {
        tier: 'employee',
        duration: 30,
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      id: 'transaction-2',
      subscription_type: 'establishment',
      subscription_id: 'sub-2',
      user_id: 'user-2',
      amount: 10800,
      currency: 'THB',
      payment_method: 'cash',
      payment_status: 'completed',
      created_at: new Date().toISOString(),
      admin_notes: 'Cash payment verified',
      user: {
        id: 'user-2',
        pseudonym: 'bar_owner',
        email: 'owner@example.com'
      },
      establishment: {
        id: 'est-1',
        name: 'Luxury Bar'
      },
      subscription: {
        tier: 'establishment',
        duration: 30,
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        transactions: mockTransactions
      })
    });
  });

  describe('Component Rendering', () => {
    it('should render VIP Verification Admin panel', async () => {
      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/VIP Payment Verification/i)).toBeInTheDocument();
      });
    });

    it('should display subtitle text', async () => {
      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Verify cash payments for VIP subscriptions/i)).toBeInTheDocument();
      });
    });

    it('should render filter tabs (Pending, Completed, All)', async () => {
      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('All')).toBeInTheDocument();
      });
    });
  });

  describe('Transaction List Display', () => {
    it('should display transaction cards', async () => {
      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
        expect(screen.getByText(/Luxury Bar/i)).toBeInTheDocument();
      });
    });

    it('should display employee VIP transaction with emoji 👤', async () => {
      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Employee VIP/i)).toBeInTheDocument();
      });
    });

    it('should display establishment VIP transaction with emoji 🏢', async () => {
      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Establishment VIP/i)).toBeInTheDocument();
      });
    });

    it('should display purchased by information', async () => {
      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/john_doe/i)).toBeInTheDocument();
        expect(screen.getByText(/bar_owner/i)).toBeInTheDocument();
      });
    });

    it('should display subscription duration', async () => {
      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        const durationElements = screen.getAllByText(/30.*days/i);
        expect(durationElements.length).toBeGreaterThan(0);
      });
    });

    it('should display payment amount in THB', async () => {
      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/฿3,600/i)).toBeInTheDocument();
        expect(screen.getByText(/฿10,800/i)).toBeInTheDocument();
      });
    });
  });

  describe('Status Badges', () => {
    it('should display pending status badge with ⏳ emoji', async () => {
      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        const pendingBadges = screen.getAllByText(/⏳.*Pending/i);
        expect(pendingBadges.length).toBeGreaterThan(0);
      });
    });

    it('should display completed status badge with ✅ emoji', async () => {
      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        const completedBadges = screen.getAllByText(/✅.*Completed/i);
        expect(completedBadges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Filter Tabs', () => {
    it('should select Pending tab by default', async () => {
      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        const pendingTab = screen.getByText('Pending').closest('button');
        expect(pendingTab).toHaveClass('active');
      });
    });

    it('should filter to pending transactions when clicking Pending tab', async () => {
      const pendingTransactions = mockTransactions.filter(t => t.payment_status === 'pending');

      mockSecureFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          transactions: pendingTransactions
        })
      });

      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(mockSecureFetch).toHaveBeenCalledWith(
          expect.stringContaining('status=pending')
        );
      });
    });

    it('should show count badge on Pending tab if pending transactions exist', async () => {
      const pendingTransactions = mockTransactions.filter(t => t.payment_status === 'pending');

      mockSecureFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          transactions: pendingTransactions
        })
      });

      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(pendingTransactions.length.toString())).toBeInTheDocument();
      });
    });

    it('should switch to Completed tab and fetch completed transactions', async () => {
      const completedTransactions = mockTransactions.filter(t => t.payment_status === 'completed');

      mockSecureFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          transactions: mockTransactions
        })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          transactions: completedTransactions
        })
      });

      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
      });

      const completedTab = screen.getByText('Completed');
      fireEvent.click(completedTab);

      await waitFor(() => {
        expect(mockSecureFetch).toHaveBeenCalledWith(
          expect.stringContaining('status=completed')
        );
      });
    });
  });

  describe('Verify Payment Action', () => {
    it('should display Verify Payment button for pending transactions', async () => {
      const pendingTransactions = mockTransactions.filter(t => t.payment_status === 'pending');

      mockSecureFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          transactions: pendingTransactions
        })
      });

      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/✅.*Verify Payment/i)).toBeInTheDocument();
      });
    });

    it('should prompt for notes when clicking Verify Payment', async () => {
      const pendingTransactions = mockTransactions.filter(t => t.payment_status === 'pending');

      mockSecureFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            transactions: pendingTransactions
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            transaction: { ...pendingTransactions[0], payment_status: 'completed' }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            transactions: []
          })
        });

      (global.prompt as jest.Mock).mockReturnValueOnce('Cash verified');

      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Verify Payment/i)).toBeInTheDocument();
      });

      const verifyButton = screen.getByText(/Verify Payment/i);
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(global.prompt).toHaveBeenCalledWith(
          expect.stringContaining('verification notes')
        );
      });
    });

    it('should call verify payment API with notes', async () => {
      const pendingTransactions = mockTransactions.filter(t => t.payment_status === 'pending');

      mockSecureFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            transactions: pendingTransactions
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            transaction: { ...pendingTransactions[0], payment_status: 'completed' }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            transactions: []
          })
        });

      (global.prompt as jest.Mock).mockReturnValueOnce('Payment verified via receipt');

      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Verify Payment/i)).toBeInTheDocument();
      });

      const verifyButton = screen.getByText(/Verify Payment/i);
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(mockSecureFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/admin/vip/verify-payment/'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Payment verified via receipt')
          })
        );
      });
    });
  });

  describe('Reject Payment Action', () => {
    it('should display Reject button for pending transactions', async () => {
      const pendingTransactions = mockTransactions.filter(t => t.payment_status === 'pending');

      mockSecureFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          transactions: pendingTransactions
        })
      });

      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/❌.*Reject/i)).toBeInTheDocument();
      });
    });

    it('should require rejection reason', async () => {
      const pendingTransactions = mockTransactions.filter(t => t.payment_status === 'pending');

      mockSecureFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          transactions: pendingTransactions
        })
      });

      (global.prompt as jest.Mock).mockReturnValueOnce(''); // Empty reason

      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Reject/i)).toBeInTheDocument();
      });

      const rejectButton = screen.getByText(/❌.*Reject/i);
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining('required')
        );
      });
    });

    it('should show confirmation dialog before rejecting', async () => {
      const pendingTransactions = mockTransactions.filter(t => t.payment_status === 'pending');

      mockSecureFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          transactions: pendingTransactions
        })
      });

      (global.prompt as jest.Mock).mockReturnValueOnce('Invalid payment');
      (global.confirm as jest.Mock).mockReturnValueOnce(true);

      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Reject/i)).toBeInTheDocument();
      });

      const rejectButton = screen.getByText(/❌.*Reject/i);
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith(
          expect.stringContaining('Are you sure')
        );
      });
    });
  });

  describe('Admin Notes Display', () => {
    it('should display admin notes for completed transactions', async () => {
      const completedTransactions = mockTransactions.filter(t => t.payment_status === 'completed');

      mockSecureFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          transactions: completedTransactions
        })
      });

      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Cash payment verified/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no transactions exist', async () => {
      mockSecureFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          transactions: []
        })
      });

      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/No pending verifications/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      mockSecureFetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'Failed to load transactions'
        })
      });

      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load VIP transactions/i)).toBeInTheDocument();
      });
    });

    it('should display retry button on error', async () => {
      mockSecureFetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'Network error'
        })
      });

      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Retry/i)).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should display refresh button', async () => {
      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/🔄.*Refresh/i)).toBeInTheDocument();
      });
    });

    it('should refetch transactions when clicking refresh', async () => {
      render(
        <I18nextProvider i18n={i18n}>
          <VIPVerificationAdmin />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Refresh/i)).toBeInTheDocument();
      });

      const initialCallCount = mockSecureFetch.mock.calls.length;

      const refreshButton = screen.getByText(/🔄.*Refresh/i);
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockSecureFetch.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });
});
