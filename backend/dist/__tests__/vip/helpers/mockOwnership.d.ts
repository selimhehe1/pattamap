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
export declare const mockEmployeeOwnership: (userId: string, employeeId: string, establishmentId?: string, hasPermission?: boolean) => MockEmployeeOwnership;
/**
 * Creates mock ownership for establishment VIP purchase
 * User must be owner/manager of establishment
 *
 * @param userId - The user ID attempting to purchase
 * @param establishmentId - The establishment ID to purchase VIP for
 * @returns Mock ownership object matching vipController authorization check
 */
export declare const mockEstablishmentOwnership: (userId: string, establishmentId: string) => MockEstablishmentOwnership;
/**
 * Creates mock for NO ownership (should trigger 403 Forbidden)
 * @returns null (simulates no ownership found)
 */
export declare const mockNoOwnership: () => null;
/**
 * Creates mock employee object for testing
 */
export declare const mockEmployee: (id: string, name?: string, establishmentId?: string) => {
    id: string;
    name: string;
    nickname: string;
    establishment_id: string;
    is_vip: boolean;
    vip_expires_at: null;
};
/**
 * Creates mock establishment object for testing
 */
export declare const mockEstablishment: (id: string, name?: string) => {
    id: string;
    name: string;
    is_vip: boolean;
    vip_expires_at: null;
};
/**
 * Creates mock VIP subscription object
 */
export declare const mockVIPSubscription: (id: string, entityId: string, subscriptionType: "employee" | "establishment", status?: "active" | "expired" | "cancelled" | "pending_payment", duration?: number) => {
    id: string;
    employee_id: string | undefined;
    establishment_id: string | undefined;
    status: "active" | "pending_payment" | "cancelled" | "expired";
    tier: "employee" | "establishment";
    duration: number;
    starts_at: string;
    expires_at: string;
    price_paid: number;
    transaction_id: string;
    created_at: string;
};
/**
 * Creates mock payment transaction object
 */
export declare const mockPaymentTransaction: (id: string, userId: string, subscriptionType: "employee" | "establishment", amount: number, paymentMethod?: "cash" | "promptpay" | "admin_grant", paymentStatus?: "pending" | "completed" | "failed" | "refunded") => {
    id: string;
    subscription_type: "employee" | "establishment";
    subscription_id: string;
    user_id: string;
    amount: number;
    currency: string;
    payment_method: "promptpay" | "cash" | "admin_grant";
    payment_status: "pending" | "completed" | "failed" | "refunded";
    promptpay_qr_code: string | null;
    admin_verified_by: string | null;
    admin_verified_at: string | null;
    admin_notes: null;
    created_at: string;
};
//# sourceMappingURL=mockOwnership.d.ts.map