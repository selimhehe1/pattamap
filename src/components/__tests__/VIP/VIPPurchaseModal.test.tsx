/**
 * 🧪 VIPPurchaseModal Component Tests
 *
 * Tests for VIP Purchase Modal component
 * - Rendering with different entity types (employee/establishment)
 * - Pricing data fetching and display
 * - Duration selection
 * - Payment method selection
 * - Purchase flow
 * - Error handling
 * - i18n support
 */

import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders } from '../../../test-utils/test-helpers';
import VIPPurchaseModal from '../../Owner/VIPPurchaseModal';
import { Employee, Establishment } from '../../../types';

// Mock logger
jest.mock('../../../utils/logger');

// Mock useSecureFetch hook
const mockSecureFetch = jest.fn();
jest.mock('../../../hooks/useSecureFetch', () => ({
  useSecureFetch: () => ({ secureFetch: mockSecureFetch })
}));

// Mock fetch for pricing data
global.fetch = jest.fn();

describe('VIPPurchaseModal Component', () => {
  const mockEmployee: Employee = {
    id: 'employee-123',
    name: 'Jane Doe',
    nickname: 'JD',
    status: 'approved',
    photos: [],
    self_removal_requested: false,
    created_by: 'user-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockEstablishment: Establishment = {
    id: 'est-123',
    name: 'Luxury Bar',
    address: 'Soi 6, Pattaya',
    zone: 'soi6',
    category_id: 1,
    opening_hours: {
      monday: '18:00 - 02:00',
      tuesday: '18:00 - 02:00',
      wednesday: '18:00 - 02:00',
      thursday: '18:00 - 02:00',
      friday: '18:00 - 02:00',
      saturday: '18:00 - 02:00',
      sunday: '18:00 - 02:00'
    },
    status: 'approved',
    created_by: 'user-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockPricingData = {
    success: true,
    type: 'employee',
    pricing: {
      name: 'Employee VIP',
      description: 'Enhanced visibility with priority placement',
      features: [
        '🔍 Priority in search results',
        '👑 VIP badge on profile',
        '⭐ Top of category listings'
      ],
      prices: [
        { duration: 7, price: 1000, discount: 0, popular: false },
        { duration: 30, price: 3600, discount: 10, originalPrice: 4000, popular: true },
        { duration: 90, price: 8400, discount: 30, originalPrice: 12000, popular: false },
        { duration: 365, price: 18250, discount: 50, originalPrice: 36500, popular: false }
      ]
    }
  };

  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockPricingData
    });
  });

  describe('Modal Rendering', () => {
    it('should render modal with employee entity', async () => {
      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        expect(screen.getByText(/Purchase VIP Subscription/i)).toBeInTheDocument();
        // i18n interpolation may not work in tests, so check for the entity name
        expect(screen.getByText(/JD/i)).toBeInTheDocument();
        // Check the employee-info element contains expected content
        const employeeInfo = document.querySelector('.employee-info');
        expect(employeeInfo).toBeInTheDocument();
      });
    });

    it('should render modal with establishment entity', async () => {
      const establishmentPricingData = {
        ...mockPricingData,
        type: 'establishment',
        pricing: {
          ...mockPricingData.pricing,
          name: 'Establishment VIP',
          prices: [
            { duration: 7, price: 3000, discount: 0 },
            { duration: 30, price: 10800, discount: 10, originalPrice: 12000, popular: true },
            { duration: 90, price: 25200, discount: 30, originalPrice: 36000 },
            { duration: 365, price: 54750, discount: 50, originalPrice: 109500 }
          ]
        }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => establishmentPricingData
      });

      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="establishment"
            entity={mockEstablishment}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        expect(screen.getByText(/Establishment VIP/i)).toBeInTheDocument();
        expect(screen.getByText(/Luxury Bar/i)).toBeInTheDocument();
      });
    });

    it('should display loading state while fetching pricing', () => {
      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      expect(screen.getByText(/Loading pricing/i)).toBeInTheDocument();
    });

    it('should display VIP features from pricing data', async () => {
      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        expect(screen.getByText(/Priority in search results/i)).toBeInTheDocument();
        expect(screen.getByText(/VIP badge on profile/i)).toBeInTheDocument();
        expect(screen.getByText(/Top of category listings/i)).toBeInTheDocument();
      });
    });
  });

  describe('Duration Selection', () => {
    it('should render all 4 duration pills (7, 30, 90, 365 days)', async () => {
      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        // Check duration pills exist
        const durationPills = document.querySelectorAll('.duration-pill');
        expect(durationPills.length).toBe(4);
        // Check for duration values in the text content
        const pillsContainer = document.querySelector('.duration-pills');
        expect(pillsContainer?.textContent).toMatch(/7/);
        expect(pillsContainer?.textContent).toMatch(/30/);
        expect(pillsContainer?.textContent).toMatch(/90/);
        expect(pillsContainer?.textContent).toMatch(/365/);
      });
    });

    it('should display discount badges for discounted durations', async () => {
      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        // Check discount badges exist
        const discountBadges = document.querySelectorAll('.discount-badge');
        expect(discountBadges.length).toBe(3); // 30, 90, 365 days have discounts
        // Verify discount percentages
        const badgeTexts = Array.from(discountBadges).map(b => b.textContent);
        expect(badgeTexts).toContain('-10%');
        expect(badgeTexts).toContain('-30%');
        expect(badgeTexts).toContain('-50%');
      });
    });

    it('should mark popular duration with badge', async () => {
      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        const popularBadges = screen.getAllByText(/Popular/i);
        expect(popularBadges.length).toBeGreaterThan(0);
      });
    });

    it('should update price summary when selecting different duration', async () => {
      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        // Check total price summary shows 30 days price (3600)
        const totalValue = document.querySelector('.total-value');
        expect(totalValue?.textContent).toMatch(/3[\s,.]?600/);
      });

      // Click 90-day duration pill
      const durationPills = document.querySelectorAll('.duration-pill');
      const duration90Button = Array.from(durationPills).find(
        pill => pill.textContent?.includes('90')
      );
      if (duration90Button) {
        fireEvent.click(duration90Button);
      }

      await waitFor(() => {
        // Check total price summary shows 90 days price (8400)
        const totalValue = document.querySelector('.total-value');
        expect(totalValue?.textContent).toMatch(/8[\s,.]?400/);
      });
    });
  });

  describe('Payment Method Selection', () => {
    it('should render cash payment method', async () => {
      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        expect(screen.getByText(/Cash Payment/i)).toBeInTheDocument();
        expect(screen.getByText(/Pay in cash and admin will verify/i)).toBeInTheDocument();
      });
    });

    it('should render PromptPay payment method with "Coming Soon" badge', async () => {
      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        expect(screen.getByText(/PromptPay QR/i)).toBeInTheDocument();
        expect(screen.getByText(/Coming Soon/i)).toBeInTheDocument();
      });
    });

    it('should select cash payment by default', async () => {
      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        const cashButton = screen.getByText(/Cash Payment/i).closest('button');
        expect(cashButton).toHaveClass('selected');
      });
    });
  });

  describe('Purchase Flow', () => {
    it('should call purchase API with correct data when clicking Confirm Purchase', async () => {
      mockSecureFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          subscription: { id: 'sub-123', status: 'pending_payment' }
        })
      });

      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        expect(screen.getByText(/Confirm Purchase/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByText(/Confirm Purchase/i).closest('button');
      if (confirmButton) {
        fireEvent.click(confirmButton);
      }

      await waitFor(() => {
        expect(mockSecureFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/vip/purchase'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('employee')
          })
        );
      });
    });

    it('should display success message after successful purchase', async () => {
      mockSecureFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          subscription: { id: 'sub-123', status: 'pending_payment' }
        })
      });

      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        expect(screen.getByText(/Confirm Purchase/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByText(/Confirm Purchase/i).closest('button');
      if (confirmButton) {
        fireEvent.click(confirmButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/VIP Purchase Successful/i)).toBeInTheDocument();
      });
    });

    it('should call onSuccess and onClose callbacks after success', async () => {
      mockSecureFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          subscription: { id: 'sub-123', status: 'pending_payment' }
        })
      });

      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        expect(screen.getByText(/Confirm Purchase/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByText(/Confirm Purchase/i).closest('button');
      if (confirmButton) {
        fireEvent.click(confirmButton);
      }

      // Wait for success message + timeout (2s)
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should display error message on purchase failure', async () => {
      mockSecureFetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'Insufficient permissions'
        })
      });

      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        expect(screen.getByText(/Confirm Purchase/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByText(/Confirm Purchase/i).closest('button');
      if (confirmButton) {
        fireEvent.click(confirmButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/Insufficient permissions/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error state when pricing fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Failed to load pricing' })
      });

      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load pricing information/i)).toBeInTheDocument();
        expect(screen.getByText(/Retry/i)).toBeInTheDocument();
      });
    });

    it('should allow retry when pricing fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Network error' })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPricingData
      });

      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        expect(screen.getByText(/Retry/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByText(/Retry/i);
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/Employee VIP/i)).toBeInTheDocument();
      });
    });
  });

  describe('Close Modal', () => {
    it('should call onClose when clicking close button', async () => {
      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        expect(screen.getByText(/Purchase VIP Subscription/i)).toBeInTheDocument();
      });

      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking Cancel button', async () => {
      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByText(/Cancel/i);
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking overlay', async () => {
      renderWithProviders(
          <VIPPurchaseModal
            subscriptionType="employee"
            entity={mockEmployee}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
      );

      await waitFor(() => {
        expect(screen.getByText(/Purchase VIP Subscription/i)).toBeInTheDocument();
      });

      const overlay = document.querySelector('.vip-purchase-modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });
});
