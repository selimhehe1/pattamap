/**
 * 🆕 v10.3 Phase 1 - VIP Pricing Configuration (SIMPLIFIED)
 *
 * Defines pricing structure, durations, and features for VIP subscriptions
 * for both employees and establishments.
 *
 * IMPORTANT: No more "basic"/"premium" tiers per type.
 * - Employee VIP: 1 configuration (lineup + search boost)
 * - Establishment VIP: 1 configuration (map + search boost)
 */
export type VIPTier = 'employee' | 'establishment';
export type VIPDuration = 7 | 30 | 90 | 365;
export type VIPSubscriptionType = 'employee' | 'establishment';
export type PaymentMethod = 'promptpay' | 'cash' | 'admin_grant';
export interface VIPPrice {
    duration: VIPDuration;
    price: number;
    discount: number;
    originalPrice?: number;
    popular?: boolean;
}
export interface VIPTypeConfig {
    name: string;
    description: string;
    features: string[];
    prices: VIPPrice[];
}
export interface VIPConfig {
    employee: VIPTypeConfig;
    establishment: VIPTypeConfig;
}
/**
 * VIP Pricing Structure (SIMPLIFIED)
 *
 * Philosophy:
 * - 7-day: Trial period (no discount) - Test the waters
 * - 30-day: Standard (10% discount) - Regular commitment
 * - 90-day: Popular (30% discount) - Smart choice
 * - 365-day: Best value (50% discount) - Long-term investment
 *
 * Base Prices:
 * - Employee: ฿1,000 / 7 days
 * - Establishment: ฿3,000 / 7 days
 */
export declare const VIP_PRICING: VIPConfig;
/**
 * Get price for a specific VIP type and duration
 */
export declare function getVIPPrice(type: VIPSubscriptionType, duration: VIPDuration): VIPPrice | undefined;
/**
 * Calculate total price with discount applied
 */
export declare function calculateVIPPrice(type: VIPSubscriptionType, duration: VIPDuration): number | null;
/**
 * Get all features for a VIP type
 */
export declare function getVIPFeatures(type: VIPSubscriptionType): string[];
/**
 * Get type configuration
 */
export declare function getVIPTypeConfig(type: VIPSubscriptionType): VIPTypeConfig;
/**
 * Get all available durations for a type
 */
export declare function getAvailableDurations(type: VIPSubscriptionType): VIPDuration[];
/**
 * Calculate discount amount in THB
 */
export declare function calculateDiscount(type: VIPSubscriptionType, duration: VIPDuration): number;
/**
 * Get savings percentage
 */
export declare function getSavingsPercentage(type: VIPSubscriptionType, duration: VIPDuration): number;
/**
 * Get popular duration for a type (usually 30 days)
 */
export declare function getPopularDuration(type: VIPSubscriptionType): VIPDuration;
/**
 * Format price in THB with commas
 */
export declare function formatPrice(price: number): string;
/**
 * Calculate price per day
 */
export declare function getPricePerDay(type: VIPSubscriptionType, duration: VIPDuration): number | null;
/**
 * Check if a duration offers a discount
 */
export declare function hasDiscount(type: VIPSubscriptionType, duration: VIPDuration): boolean;
/**
 * Get all pricing options for display in UI
 */
export declare function getAllPricingOptions(type: VIPSubscriptionType): VIPTypeConfig;
/**
 * Validate tier exists (now just checks if it's 'employee' or 'establishment')
 */
export declare function isValidTier(tier: string): tier is VIPTier;
/**
 * Validate duration exists
 */
export declare function isValidDuration(duration: number): duration is VIPDuration;
/**
 * Validate subscription type exists
 */
export declare function isValidSubscriptionType(type: string): type is VIPSubscriptionType;
/**
 * Validate payment method
 */
export declare function isValidPaymentMethod(method: string): method is PaymentMethod;
export declare const PAYMENT_METHODS: PaymentMethod[];
export declare const VIP_TIERS: VIPTier[];
export declare const VIP_DURATIONS: VIPDuration[];
export declare const SUBSCRIPTION_TYPES: VIPSubscriptionType[];
//# sourceMappingURL=vipPricing.d.ts.map