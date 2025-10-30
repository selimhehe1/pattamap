/**
 * Mock Ownership Helpers for VIP Tests
 * Provides pre-configured ownership mocks for testing VIP purchase authorization
 */

export interface MockEmployeeOwnership {
  id: string;
  user_id: string;
  establishment_id: string;
  permissions: {
    can_edit_info?: boolean;
    can_edit_pricing?: boolean;
    can_edit_photos?: boolean;
    can_edit_employees?: boolean;
    can_view_analytics?: boolean;
  };
  current_employment?: {
    establishment_id: string;
    employee_id: string;
    is_current: boolean;
  };
}

export interface MockEstablishmentOwnership {
  id: string;
  user_id: string;
  establishment_id: string;
  permissions: {
    can_edit_info?: boolean;
    can_edit_pricing?: boolean;
    can_edit_photos?: boolean;
    can_view_analytics?: boolean;
  };
}

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
export const mockEmployeeOwnership = (
  userId: string,
  employeeId: string,
  establishmentId: string = 'est-123',
  hasPermission: boolean = true
): MockEmployeeOwnership => {
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

/**
 * Creates mock ownership for establishment VIP purchase
 * User must be owner/manager of establishment
 *
 * @param userId - The user ID attempting to purchase
 * @param establishmentId - The establishment ID to purchase VIP for
 * @returns Mock ownership object matching vipController authorization check
 */
export const mockEstablishmentOwnership = (
  userId: string,
  establishmentId: string
): MockEstablishmentOwnership => {
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

/**
 * Creates mock for NO ownership (should trigger 403 Forbidden)
 * @returns null (simulates no ownership found)
 */
export const mockNoOwnership = () => {
  return null;
};

/**
 * Creates mock employee object for testing
 */
export const mockEmployee = (id: string, name: string = 'Test Employee', establishmentId: string = 'est-123') => {
  return {
    id,
    name,
    nickname: name.split(' ').map(n => n[0]).join(''), // e.g., "Test Employee" -> "TE"
    establishment_id: establishmentId,
    is_vip: false,
    vip_expires_at: null,
  };
};

/**
 * Creates mock establishment object for testing
 */
export const mockEstablishment = (id: string, name: string = 'Test Establishment') => {
  return {
    id,
    name,
    is_vip: false,
    vip_expires_at: null,
  };
};

/**
 * Creates mock VIP subscription object
 */
export const mockVIPSubscription = (
  id: string,
  entityId: string,
  subscriptionType: 'employee' | 'establishment',
  status: 'active' | 'expired' | 'cancelled' | 'pending_payment' = 'pending_payment',
  duration: number = 30
) => {
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

/**
 * Creates mock payment transaction object
 */
export const mockPaymentTransaction = (
  id: string,
  userId: string,
  subscriptionType: 'employee' | 'establishment',
  amount: number,
  paymentMethod: 'cash' | 'promptpay' | 'admin_grant' = 'cash',
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded' = 'pending'
) => {
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
