/**
 * VIP Controllers Index
 *
 * Re-exports all VIP controller functions for backward compatibility.
 */

// Pricing endpoints
export { getPricingOptions } from './vipPricingController';

// Purchase endpoints
export { purchaseVIP } from './vipPurchaseController';

// Subscription management endpoints
export { getMyVIPSubscriptions, cancelVIPSubscription } from './vipSubscriptionController';

// Admin endpoints
export { verifyPayment, getVIPTransactions, rejectPayment } from './vipAdminController';
