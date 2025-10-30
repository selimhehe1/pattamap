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

// =====================================================
// TYPES
// =====================================================

export type VIPTier = 'employee' | 'establishment'; // Simplified from 'basic' | 'premium'
export type VIPDuration = 7 | 30 | 90 | 365;
export type VIPSubscriptionType = 'employee' | 'establishment';
export type PaymentMethod = 'promptpay' | 'cash' | 'admin_grant';

export interface VIPPrice {
  duration: VIPDuration;
  price: number; // THB
  discount: number; // percentage (0-100)
  originalPrice?: number; // THB (before discount)
  popular?: boolean; // highlight this option
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

// =====================================================
// PRICING CONFIGURATION
// =====================================================

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
export const VIP_PRICING: VIPConfig = {
  // =====================================================
  // EMPLOYEE VIP (Individuals)
  // =====================================================
  employee: {
    name: 'Employee VIP',
    description: 'Boost your visibility in lineup and search results',
    features: [
      '👑 VIP Badge on profile (gold border)',
      '🏆 Top position in establishment lineup',
      '🔍 Search ranking boost (priority in results)',
    ],
    prices: [
      {
        duration: 7,
        price: 1000,
        discount: 0,
      },
      {
        duration: 30,
        price: 3600,
        discount: 10,
        originalPrice: 4000,
        popular: true, // Most common choice
      },
      {
        duration: 90,
        price: 8400,
        discount: 30,
        originalPrice: 12000,
      },
      {
        duration: 365,
        price: 18250,
        discount: 50,
        originalPrice: 36500,
      },
    ],
  },

  // =====================================================
  // ESTABLISHMENT VIP (Business)
  // =====================================================
  establishment: {
    name: 'Establishment VIP',
    description: 'Maximize visibility on maps and search results',
    features: [
      '👑 VIP Badge on establishment listing',
      '🗺️ Featured map marker (highlighted + larger)',
      '🔍 Priority search ranking (boosted in results)',
      '🎯 Homepage featured section placement',
    ],
    prices: [
      {
        duration: 7,
        price: 3000,
        discount: 0,
      },
      {
        duration: 30,
        price: 10800,
        discount: 10,
        originalPrice: 12000,
        popular: true,
      },
      {
        duration: 90,
        price: 25200,
        discount: 30,
        originalPrice: 36000,
      },
      {
        duration: 365,
        price: 54750,
        discount: 50,
        originalPrice: 109500,
      },
    ],
  },
};

// =====================================================
// HELPER FUNCTIONS (SIMPLIFIED - NO TIER PARAM)
// =====================================================

/**
 * Get price for a specific VIP type and duration
 */
export function getVIPPrice(
  type: VIPSubscriptionType,
  duration: VIPDuration
): VIPPrice | undefined {
  const typeConfig = VIP_PRICING[type];
  return typeConfig.prices.find((p) => p.duration === duration);
}

/**
 * Calculate total price with discount applied
 */
export function calculateVIPPrice(
  type: VIPSubscriptionType,
  duration: VIPDuration
): number | null {
  const priceConfig = getVIPPrice(type, duration);
  return priceConfig?.price ?? null;
}

/**
 * Get all features for a VIP type
 */
export function getVIPFeatures(
  type: VIPSubscriptionType
): string[] {
  return VIP_PRICING[type].features;
}

/**
 * Get type configuration
 */
export function getVIPTypeConfig(
  type: VIPSubscriptionType
): VIPTypeConfig {
  return VIP_PRICING[type];
}

/**
 * Get all available durations for a type
 */
export function getAvailableDurations(
  type: VIPSubscriptionType
): VIPDuration[] {
  return VIP_PRICING[type].prices.map((p) => p.duration);
}

/**
 * Calculate discount amount in THB
 */
export function calculateDiscount(
  type: VIPSubscriptionType,
  duration: VIPDuration
): number {
  const priceConfig = getVIPPrice(type, duration);
  if (!priceConfig || !priceConfig.originalPrice) return 0;
  return priceConfig.originalPrice - priceConfig.price;
}

/**
 * Get savings percentage
 */
export function getSavingsPercentage(
  type: VIPSubscriptionType,
  duration: VIPDuration
): number {
  const priceConfig = getVIPPrice(type, duration);
  return priceConfig?.discount ?? 0;
}

/**
 * Get popular duration for a type (usually 30 days)
 */
export function getPopularDuration(
  type: VIPSubscriptionType
): VIPDuration {
  const typeConfig = VIP_PRICING[type];
  const popularPrice = typeConfig.prices.find((p) => p.popular);
  return popularPrice?.duration ?? 30;
}

/**
 * Format price in THB with commas
 */
export function formatPrice(price: number): string {
  return `฿${price.toLocaleString('en-US')}`;
}

/**
 * Calculate price per day
 */
export function getPricePerDay(
  type: VIPSubscriptionType,
  duration: VIPDuration
): number | null {
  const price = calculateVIPPrice(type, duration);
  if (price === null) return null;
  return Math.round((price / duration) * 100) / 100; // round to 2 decimals
}

/**
 * Check if a duration offers a discount
 */
export function hasDiscount(
  type: VIPSubscriptionType,
  duration: VIPDuration
): boolean {
  const priceConfig = getVIPPrice(type, duration);
  return (priceConfig?.discount ?? 0) > 0;
}

/**
 * Get all pricing options for display in UI
 */
export function getAllPricingOptions(type: VIPSubscriptionType): VIPTypeConfig {
  return VIP_PRICING[type];
}

// =====================================================
// VALIDATION
// =====================================================

/**
 * Validate tier exists (now just checks if it's 'employee' or 'establishment')
 */
export function isValidTier(tier: string): tier is VIPTier {
  return tier === 'employee' || tier === 'establishment';
}

/**
 * Validate duration exists
 */
export function isValidDuration(duration: number): duration is VIPDuration {
  return duration === 7 || duration === 30 || duration === 90 || duration === 365;
}

/**
 * Validate subscription type exists
 */
export function isValidSubscriptionType(type: string): type is VIPSubscriptionType {
  return type === 'employee' || type === 'establishment';
}

/**
 * Validate payment method
 */
export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return method === 'promptpay' || method === 'cash' || method === 'admin_grant';
}

// =====================================================
// CONSTANTS
// =====================================================

export const PAYMENT_METHODS: PaymentMethod[] = ['promptpay', 'cash', 'admin_grant'];
export const VIP_TIERS: VIPTier[] = ['employee', 'establishment']; // Simplified
export const VIP_DURATIONS: VIPDuration[] = [7, 30, 90, 365];
export const SUBSCRIPTION_TYPES: VIPSubscriptionType[] = ['employee', 'establishment'];

// =====================================================
// EXAMPLES
// =====================================================

/*
Usage Examples (SIMPLIFIED):

// Get price for 30-day employee VIP
const price = calculateVIPPrice('employee', 30); // 3600

// Get all features for employee VIP
const features = getVIPFeatures('employee'); // Returns 3 features

// Calculate savings on 90-day establishment VIP
const discount = calculateDiscount('establishment', 90); // 10800 (36000 - 25200)

// Get price per day
const perDay = getPricePerDay('employee', 30); // 120.00

// Check if duration has discount
const hasDiscountCheck = hasDiscount('employee', 7); // false
const hasDiscountCheck2 = hasDiscount('employee', 30); // true

// Format price
const formatted = formatPrice(3600); // "฿3,600"

// Get popular duration
const popular = getPopularDuration('establishment'); // 30

// Get all pricing for employee
const employeePricing = getAllPricingOptions('employee');
// Returns { name: 'Employee VIP', features: [...], prices: [...] }
*/
