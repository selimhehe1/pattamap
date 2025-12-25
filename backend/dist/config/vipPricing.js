"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUBSCRIPTION_TYPES = exports.VIP_DURATIONS = exports.VIP_TIERS = exports.PAYMENT_METHODS = exports.VIP_PRICING = void 0;
exports.getVIPPrice = getVIPPrice;
exports.calculateVIPPrice = calculateVIPPrice;
exports.getVIPFeatures = getVIPFeatures;
exports.getVIPTypeConfig = getVIPTypeConfig;
exports.getAvailableDurations = getAvailableDurations;
exports.calculateDiscount = calculateDiscount;
exports.getSavingsPercentage = getSavingsPercentage;
exports.getPopularDuration = getPopularDuration;
exports.formatPrice = formatPrice;
exports.getPricePerDay = getPricePerDay;
exports.hasDiscount = hasDiscount;
exports.getAllPricingOptions = getAllPricingOptions;
exports.isValidTier = isValidTier;
exports.isValidDuration = isValidDuration;
exports.isValidSubscriptionType = isValidSubscriptionType;
exports.isValidPaymentMethod = isValidPaymentMethod;
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
exports.VIP_PRICING = {
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
function getVIPPrice(type, duration) {
    const typeConfig = exports.VIP_PRICING[type];
    return typeConfig.prices.find((p) => p.duration === duration);
}
/**
 * Calculate total price with discount applied
 */
function calculateVIPPrice(type, duration) {
    const priceConfig = getVIPPrice(type, duration);
    return priceConfig?.price ?? null;
}
/**
 * Get all features for a VIP type
 */
function getVIPFeatures(type) {
    return exports.VIP_PRICING[type].features;
}
/**
 * Get type configuration
 */
function getVIPTypeConfig(type) {
    return exports.VIP_PRICING[type];
}
/**
 * Get all available durations for a type
 */
function getAvailableDurations(type) {
    return exports.VIP_PRICING[type].prices.map((p) => p.duration);
}
/**
 * Calculate discount amount in THB
 */
function calculateDiscount(type, duration) {
    const priceConfig = getVIPPrice(type, duration);
    if (!priceConfig || !priceConfig.originalPrice)
        return 0;
    return priceConfig.originalPrice - priceConfig.price;
}
/**
 * Get savings percentage
 */
function getSavingsPercentage(type, duration) {
    const priceConfig = getVIPPrice(type, duration);
    return priceConfig?.discount ?? 0;
}
/**
 * Get popular duration for a type (usually 30 days)
 */
function getPopularDuration(type) {
    const typeConfig = exports.VIP_PRICING[type];
    const popularPrice = typeConfig.prices.find((p) => p.popular);
    return popularPrice?.duration ?? 30;
}
/**
 * Format price in THB with commas
 */
function formatPrice(price) {
    return `฿${price.toLocaleString('en-US')}`;
}
/**
 * Calculate price per day
 */
function getPricePerDay(type, duration) {
    const price = calculateVIPPrice(type, duration);
    if (price === null)
        return null;
    return Math.round((price / duration) * 100) / 100; // round to 2 decimals
}
/**
 * Check if a duration offers a discount
 */
function hasDiscount(type, duration) {
    const priceConfig = getVIPPrice(type, duration);
    return (priceConfig?.discount ?? 0) > 0;
}
/**
 * Get all pricing options for display in UI
 */
function getAllPricingOptions(type) {
    return exports.VIP_PRICING[type];
}
// =====================================================
// VALIDATION
// =====================================================
/**
 * Validate tier exists (now just checks if it's 'employee' or 'establishment')
 */
function isValidTier(tier) {
    return tier === 'employee' || tier === 'establishment';
}
/**
 * Validate duration exists
 */
function isValidDuration(duration) {
    return duration === 7 || duration === 30 || duration === 90 || duration === 365;
}
/**
 * Validate subscription type exists
 */
function isValidSubscriptionType(type) {
    return type === 'employee' || type === 'establishment';
}
/**
 * Validate payment method
 */
function isValidPaymentMethod(method) {
    return method === 'promptpay' || method === 'cash' || method === 'admin_grant';
}
// =====================================================
// CONSTANTS
// =====================================================
exports.PAYMENT_METHODS = ['promptpay', 'cash', 'admin_grant'];
exports.VIP_TIERS = ['employee', 'establishment']; // Simplified
exports.VIP_DURATIONS = [7, 30, 90, 365];
exports.SUBSCRIPTION_TYPES = ['employee', 'establishment'];
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
//# sourceMappingURL=vipPricing.js.map