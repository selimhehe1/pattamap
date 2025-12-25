"use strict";
/**
 * Mock Ownership Helpers for VIP Tests
 * Provides pre-configured ownership mocks for testing VIP purchase authorization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockPaymentTransaction = exports.mockVIPSubscription = exports.mockEstablishment = exports.mockEmployee = exports.mockNoOwnership = exports.mockEstablishmentOwnership = exports.mockEmployeeOwnership = void 0;
/**
 * Creates mock ownership for employee VIP purchase
 * User must be establishment owner with can_edit_employees permission
 *
 * @param userId - The user ID attempting to purchase
 * @param employeeId - The employee ID to purchase VIP for
 * @param establishmentId - The establishment ID where employee works
 * @param hasPermission - Whether user has can_edit_employees permission (default: true)
 * @returns Mock ownership object matching vipController authorization check
 */
const mockEmployeeOwnership = (userId, employeeId, establishmentId = 'est-123', hasPermission = true) => {
    return {
        id: `ownership-${userId}`,
        user_id: userId,
        establishment_id: establishmentId,
        permissions: {
            can_edit_info: true,
            can_edit_pricing: true,
            can_edit_photos: true,
            can_edit_employees: hasPermission, // Critical for VIP purchase
            can_view_analytics: true,
        },
        current_employment: {
            establishment_id: establishmentId,
            employee_id: employeeId,
            is_current: true,
        },
    };
};
exports.mockEmployeeOwnership = mockEmployeeOwnership;
/**
 * Creates mock ownership for establishment VIP purchase
 * User must be owner/manager of establishment
 *
 * @param userId - The user ID attempting to purchase
 * @param establishmentId - The establishment ID to purchase VIP for
 * @returns Mock ownership object matching vipController authorization check
 */
const mockEstablishmentOwnership = (userId, establishmentId) => {
    return {
        id: `ownership-${userId}`,
        user_id: userId,
        establishment_id: establishmentId,
        permissions: {
            can_edit_info: true,
            can_edit_pricing: true,
            can_edit_photos: true,
            can_view_analytics: true,
        },
    };
};
exports.mockEstablishmentOwnership = mockEstablishmentOwnership;
/**
 * Creates mock for NO ownership (should trigger 403 Forbidden)
 * @returns null (simulates no ownership found)
 */
const mockNoOwnership = () => {
    return null;
};
exports.mockNoOwnership = mockNoOwnership;
/**
 * Creates mock employee object for testing
 */
const mockEmployee = (id, name = 'Test Employee', establishmentId = 'est-123') => {
    return {
        id,
        name,
        nickname: name.split(' ').map(n => n[0]).join(''), // e.g., "Test Employee" -> "TE"
        establishment_id: establishmentId,
        is_vip: false,
        vip_expires_at: null,
    };
};
exports.mockEmployee = mockEmployee;
/**
 * Creates mock establishment object for testing
 */
const mockEstablishment = (id, name = 'Test Establishment') => {
    return {
        id,
        name,
        is_vip: false,
        vip_expires_at: null,
    };
};
exports.mockEstablishment = mockEstablishment;
/**
 * Creates mock VIP subscription object
 */
const mockVIPSubscription = (id, entityId, subscriptionType, status = 'pending_payment', duration = 30) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
    return {
        id,
        employee_id: subscriptionType === 'employee' ? entityId : undefined,
        establishment_id: subscriptionType === 'establishment' ? entityId : undefined,
        status,
        tier: subscriptionType,
        duration,
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        price_paid: duration === 7 ? 1000 : duration === 30 ? 3600 : duration === 90 ? 8400 : 18250,
        transaction_id: `txn-${id}`,
        created_at: now.toISOString(),
    };
};
exports.mockVIPSubscription = mockVIPSubscription;
/**
 * Creates mock payment transaction object
 */
const mockPaymentTransaction = (id, userId, subscriptionType, amount, paymentMethod = 'cash', paymentStatus = 'pending') => {
    return {
        id,
        subscription_type: subscriptionType,
        subscription_id: `sub-${id}`,
        user_id: userId,
        amount,
        currency: 'THB',
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        promptpay_qr_code: paymentMethod === 'promptpay' ? 'mock-qr-code' : null,
        admin_verified_by: paymentStatus === 'completed' ? 'admin-123' : null,
        admin_verified_at: paymentStatus === 'completed' ? new Date().toISOString() : null,
        admin_notes: null,
        created_at: new Date().toISOString(),
    };
};
exports.mockPaymentTransaction = mockPaymentTransaction;
//# sourceMappingURL=mockOwnership.js.map