/**
 * VIP Subscriptions Controller (Re-export Module)
 *
 * This file re-exports all VIP controller functions from the split modules
 * for backward compatibility with existing imports.
 *
 * The controller has been refactored into:
 * - vip/vipPricingController.ts - Pricing endpoints
 * - vip/vipPurchaseController.ts - Purchase workflow
 * - vip/vipSubscriptionController.ts - Subscription management
 * - vip/vipAdminController.ts - Admin verification
 *
 * Related modules:
 * - utils/vipHelpers.ts - Shared utilities
 * - services/vipService.ts - Business logic
 */

export {
  getPricingOptions,
  purchaseVIP,
  getMyVIPSubscriptions,
  cancelVIPSubscription,
  verifyPayment,
  getVIPTransactions,
  rejectPayment,
} from './vip';
