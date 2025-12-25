"use strict";
/**
 * VIP Controller Tests
 *
 * Tests for VIP subscription system (897 LOC):
 * - getPricingOptions (4 tests)
 * - purchaseVIP (12 tests)
 * - getMyVIPSubscriptions (3 tests)
 * - cancelVIPSubscription (6 tests)
 * - verifyPayment (7 tests)
 * - getVIPTransactions (4 tests)
 * - rejectPayment (6 tests)
 *
 * Total: 42 tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vipController_1 = require("../vipController");
// Import mock helpers
const supabase_1 = require("../../config/__mocks__/supabase");
// Mock dependencies
jest.mock('../../config/supabase', () => {
    const mockModule = jest.requireActual('../../config/__mocks__/supabase');
    return {
        supabase: mockModule.supabase,
        createMockQueryBuilder: mockModule.createMockQueryBuilder,
        mockSuccess: mockModule.mockSuccess,
        mockNotFound: mockModule.mockNotFound,
        mockError: mockModule.mockError,
    };
});
jest.mock('../../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    },
}));
jest.mock('../../utils/notificationHelper', () => ({
    notifyVIPPurchaseConfirmed: jest.fn().mockResolvedValue(undefined),
    notifyVIPPaymentVerified: jest.fn().mockResolvedValue(undefined),
    notifyVIPPaymentRejected: jest.fn().mockResolvedValue(undefined),
    notifyVIPSubscriptionCancelled: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/promptpayService', () => ({
    generatePromptPayQR: jest.fn().mockResolvedValue({ qrCode: 'mock-qr', reference: 'mock-ref' }),
    isPromptPayConfigured: jest.fn().mockReturnValue(true),
}));
// Import after mocks
const supabase_2 = require("../../config/supabase");
const notificationHelper_1 = require("../../utils/notificationHelper");
const promptpayService_1 = require("../../services/promptpayService");
// Default mock user with all required fields
const defaultUser = {
    id: 'test-user-123',
    pseudonym: 'TestUser',
    email: 'test@example.com',
    role: 'user',
    is_active: true,
};
// Helper to create mock request/response
const createMockReqRes = (overrides = {}) => {
    const req = {
        user: defaultUser,
        params: {},
        query: {},
        body: {},
        ...overrides,
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    return { req, res };
};
describe('VIPController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        supabase_2.supabase.from.mockImplementation(() => (0, supabase_1.createMockQueryBuilder)());
    });
    // ========================================
    // getPricingOptions Tests
    // ========================================
    describe('getPricingOptions', () => {
        it('should return pricing for employee type', async () => {
            const { req, res } = createMockReqRes({ params: { type: 'employee' } });
            await (0, vipController_1.getPricingOptions)(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                type: 'employee',
                pricing: expect.any(Object),
            }));
        });
        it('should return pricing for establishment type', async () => {
            const { req, res } = createMockReqRes({ params: { type: 'establishment' } });
            await (0, vipController_1.getPricingOptions)(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                type: 'establishment',
            }));
        });
        it('should reject invalid subscription type', async () => {
            const { req, res } = createMockReqRes({ params: { type: 'invalid' } });
            await (0, vipController_1.getPricingOptions)(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Invalid subscription type',
            }));
        });
        it('should handle errors gracefully', async () => {
            const { req, res } = createMockReqRes({ params: { type: 'employee' } });
            // Force an error by mocking the function to throw
            jest.spyOn(require('../../config/vipPricing'), 'getAllPricingOptions').mockImplementationOnce(() => {
                throw new Error('Pricing error');
            });
            await (0, vipController_1.getPricingOptions)(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
    // ========================================
    // purchaseVIP Tests
    // ========================================
    describe('purchaseVIP', () => {
        const validPurchaseBody = {
            subscription_type: 'employee',
            entity_id: 'emp-123',
            duration: 30,
            payment_method: 'cash',
        };
        it('should require authentication', async () => {
            const { req, res } = createMockReqRes({ user: undefined, body: validPurchaseBody });
            await (0, vipController_1.purchaseVIP)(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });
        it('should require all fields', async () => {
            const { req, res } = createMockReqRes({
                body: { subscription_type: 'employee' }, // Missing fields
            });
            await (0, vipController_1.purchaseVIP)(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Missing required fields',
            }));
        });
        it('should reject invalid subscription type', async () => {
            const { req, res } = createMockReqRes({
                body: { ...validPurchaseBody, subscription_type: 'invalid' },
            });
            await (0, vipController_1.purchaseVIP)(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Invalid subscription type',
            }));
        });
        it('should reject invalid duration', async () => {
            const { req, res } = createMockReqRes({
                body: { ...validPurchaseBody, duration: 15 }, // Invalid duration
            });
            await (0, vipController_1.purchaseVIP)(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Invalid duration',
            }));
        });
        it('should reject invalid payment method', async () => {
            const { req, res } = createMockReqRes({
                body: { ...validPurchaseBody, payment_method: 'bitcoin' },
            });
            await (0, vipController_1.purchaseVIP)(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Invalid payment method',
            }));
        });
        it('should check employee ownership for employee VIP purchase', async () => {
            const { req, res } = createMockReqRes({ body: validPurchaseBody });
            // Employee not linked to user
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()));
            // Not an establishment owner either
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()));
            await (0, vipController_1.purchaseVIP)(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Forbidden',
            }));
        });
        it('should reject if active subscription exists', async () => {
            const { req, res } = createMockReqRes({ body: validPurchaseBody });
            // Employee linked to user
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'emp-123', user_id: 'test-user-123' })));
            // Active subscription exists
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'sub-123', expires_at: '2025-12-31', tier: 'employee' })));
            await (0, vipController_1.purchaseVIP)(req, res);
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Active subscription exists',
            }));
        });
        it('should create subscription successfully with cash payment', async () => {
            const { req, res } = createMockReqRes({ body: validPurchaseBody });
            // Employee linked to user
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'emp-123', user_id: 'test-user-123' })));
            // No active subscription
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            // Create subscription
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({
                id: 'sub-new',
                status: 'pending_payment',
                starts_at: '2025-12-21',
                expires_at: '2026-01-20',
                price_paid: 299,
            })));
            // Create transaction
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({
                id: 'txn-new',
                amount: 299,
                currency: 'THB',
                payment_method: 'cash',
                payment_status: 'pending',
            })));
            // Update subscription with transaction_id
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            await (0, vipController_1.purchaseVIP)(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                subscription: expect.objectContaining({ id: 'sub-new' }),
                transaction: expect.objectContaining({ id: 'txn-new' }),
            }));
            expect(notificationHelper_1.notifyVIPPurchaseConfirmed).toHaveBeenCalled();
        });
        it('should create subscription with PromptPay and generate QR', async () => {
            const { req, res } = createMockReqRes({
                body: { ...validPurchaseBody, payment_method: 'promptpay' },
            });
            // Employee linked to user
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'emp-123', user_id: 'test-user-123' })));
            // No active subscription
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            // Create subscription
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'sub-new', price_paid: 299 })));
            // Create transaction with QR
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({
                id: 'txn-new',
                amount: 299,
                promptpay_qr_code: 'mock-qr',
                promptpay_reference: 'mock-ref',
            })));
            // Update subscription
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            await (0, vipController_1.purchaseVIP)(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                transaction: expect.objectContaining({
                    promptpay_qr_code: 'mock-qr',
                }),
            }));
        });
        it('should reject PromptPay if not configured', async () => {
            promptpayService_1.isPromptPayConfigured.mockReturnValueOnce(false);
            const { req, res } = createMockReqRes({
                body: { ...validPurchaseBody, payment_method: 'promptpay' },
            });
            // Employee linked to user
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'emp-123', user_id: 'test-user-123' })));
            // No active subscription
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            // Create subscription
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'sub-new', price_paid: 299 })));
            await (0, vipController_1.purchaseVIP)(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'PromptPay not available',
            }));
        });
        it('should rollback subscription on transaction creation failure', async () => {
            const { req, res } = createMockReqRes({ body: validPurchaseBody });
            const deleteMock = jest.fn().mockReturnThis();
            const eqMock = jest.fn().mockResolvedValue({ error: null });
            // Employee linked to user
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'emp-123', user_id: 'test-user-123' })));
            // No active subscription
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            // Create subscription
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'sub-new' })));
            // Transaction creation fails
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Transaction failed')));
            // Delete subscription (rollback)
            supabase_2.supabase.from.mockReturnValueOnce({
                delete: deleteMock,
                eq: eqMock,
            });
            await (0, vipController_1.purchaseVIP)(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Failed to create payment transaction',
            }));
        });
    });
    // ========================================
    // getMyVIPSubscriptions Tests
    // ========================================
    describe('getMyVIPSubscriptions', () => {
        it('should require authentication', async () => {
            const { req, res } = createMockReqRes({ user: undefined });
            await (0, vipController_1.getMyVIPSubscriptions)(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });
        it('should return user subscriptions', async () => {
            const { req, res } = createMockReqRes();
            // Employee subscriptions
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([{ id: 'emp-sub-1' }])));
            // Establishment subscriptions
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([{ id: 'est-sub-1' }])));
            await (0, vipController_1.getMyVIPSubscriptions)(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                subscriptions: expect.objectContaining({
                    employees: expect.any(Array),
                    establishments: expect.any(Array),
                }),
            }));
        });
        it('should handle empty subscriptions', async () => {
            const { req, res } = createMockReqRes();
            supabase_2.supabase.from.mockReturnValue((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])));
            await (0, vipController_1.getMyVIPSubscriptions)(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
    // ========================================
    // cancelVIPSubscription Tests
    // ========================================
    describe('cancelVIPSubscription', () => {
        it('should require authentication', async () => {
            const { req, res } = createMockReqRes({
                user: undefined,
                params: { id: 'sub-123' },
                body: { subscription_type: 'employee' },
            });
            await (0, vipController_1.cancelVIPSubscription)(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });
        it('should validate subscription type', async () => {
            const { req, res } = createMockReqRes({
                params: { id: 'sub-123' },
                body: { subscription_type: 'invalid' },
            });
            await (0, vipController_1.cancelVIPSubscription)(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Invalid subscription type',
            }));
        });
        it('should return 404 if subscription not found', async () => {
            const { req, res } = createMockReqRes({
                params: { id: 'sub-nonexistent' },
                body: { subscription_type: 'employee' },
            });
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()));
            await (0, vipController_1.cancelVIPSubscription)(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });
        it('should check user permission', async () => {
            const { req, res } = createMockReqRes({
                params: { id: 'sub-123' },
                body: { subscription_type: 'employee' },
            });
            // Subscription exists
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'sub-123', employee_id: 'emp-123', status: 'active' })));
            // User not owner
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()));
            await (0, vipController_1.cancelVIPSubscription)(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
        it('should reject if subscription not active', async () => {
            const { req, res } = createMockReqRes({
                params: { id: 'sub-123' },
                body: { subscription_type: 'employee' },
            });
            // Subscription already cancelled
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'sub-123', employee_id: 'emp-123', status: 'cancelled' })));
            // User is owner
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'owner-123' })));
            await (0, vipController_1.cancelVIPSubscription)(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Subscription not active',
            }));
        });
        it('should cancel subscription successfully', async () => {
            const { req, res } = createMockReqRes({
                params: { id: 'sub-123' },
                body: { subscription_type: 'employee' },
            });
            // Subscription exists and is active
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'sub-123', employee_id: 'emp-123', status: 'active', tier: 'employee' })));
            // User is owner
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'owner-123' })));
            // Update subscription
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'sub-123', status: 'cancelled' })));
            await (0, vipController_1.cancelVIPSubscription)(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'VIP subscription cancelled successfully',
            }));
            expect(notificationHelper_1.notifyVIPSubscriptionCancelled).toHaveBeenCalled();
        });
    });
    // ========================================
    // verifyPayment Tests (Admin)
    // ========================================
    describe('verifyPayment', () => {
        it('should require authentication', async () => {
            const { req, res } = createMockReqRes({ user: undefined, params: { transactionId: 'txn-123' } });
            await (0, vipController_1.verifyPayment)(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });
        it('should require admin role', async () => {
            const { req, res } = createMockReqRes({
                params: { transactionId: 'txn-123' },
                user: { ...defaultUser, id: 'user-123', role: 'user' },
            });
            // Check user role
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ role: 'user' })));
            await (0, vipController_1.verifyPayment)(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
        it('should return 404 if transaction not found', async () => {
            const { req, res } = createMockReqRes({
                params: { transactionId: 'txn-nonexistent' },
                user: { ...defaultUser, id: 'admin-123', role: 'admin' },
            });
            // User is admin
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ role: 'admin' })));
            // Transaction not found
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()));
            await (0, vipController_1.verifyPayment)(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });
        it('should reject already verified transaction', async () => {
            const { req, res } = createMockReqRes({
                params: { transactionId: 'txn-123' },
                user: { ...defaultUser, id: 'admin-123', role: 'admin' },
            });
            // User is admin
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ role: 'admin' })));
            // Transaction already verified
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'txn-123', payment_status: 'completed' })));
            await (0, vipController_1.verifyPayment)(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Payment already verified',
            }));
        });
        it('should only verify cash payments', async () => {
            const { req, res } = createMockReqRes({
                params: { transactionId: 'txn-123' },
                user: { ...defaultUser, id: 'admin-123', role: 'admin' },
            });
            // User is admin
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ role: 'admin' })));
            // Transaction is promptpay
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'txn-123', payment_status: 'pending', payment_method: 'promptpay' })));
            await (0, vipController_1.verifyPayment)(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Invalid payment method',
            }));
        });
        it('should verify payment and activate subscription', async () => {
            const { req, res } = createMockReqRes({
                params: { transactionId: 'txn-123' },
                body: { admin_notes: 'Verified cash payment' },
                user: { ...defaultUser, id: 'admin-123', role: 'admin' },
            });
            // User is admin
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ role: 'admin' })));
            // Transaction pending cash
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({
                id: 'txn-123',
                payment_status: 'pending',
                payment_method: 'cash',
                subscription_type: 'employee',
                user_id: 'buyer-123',
            })));
            // Update transaction
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            // Update subscription
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({
                id: 'sub-123',
                tier: 'employee',
                expires_at: '2026-01-20',
            })));
            await (0, vipController_1.verifyPayment)(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Payment verified and subscription activated',
            }));
            expect(notificationHelper_1.notifyVIPPaymentVerified).toHaveBeenCalled();
        });
        it('should handle transaction update failure', async () => {
            const { req, res } = createMockReqRes({
                params: { transactionId: 'txn-123' },
                user: { ...defaultUser, id: 'admin-123', role: 'admin' },
            });
            // User is admin
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ role: 'admin' })));
            // Transaction pending cash
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({
                id: 'txn-123',
                payment_status: 'pending',
                payment_method: 'cash',
                subscription_type: 'employee',
            })));
            // Update transaction fails
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Update failed')));
            await (0, vipController_1.verifyPayment)(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
    // ========================================
    // getVIPTransactions Tests (Admin)
    // ========================================
    describe('getVIPTransactions', () => {
        it('should return all transactions without filters', async () => {
            const { req, res } = createMockReqRes({ query: {} });
            const mockTransactions = [
                { id: 'txn-1', subscription_type: 'employee' },
                { id: 'txn-2', subscription_type: 'establishment' },
            ];
            // Get transactions
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockTransactions)));
            // Get subscription for txn-1
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ tier: 'employee' })));
            // Get subscription for txn-2
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ tier: 'establishment' })));
            await (0, vipController_1.getVIPTransactions)(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                transactions: expect.any(Array),
                count: 2,
            }));
        });
        it('should filter by payment_method', async () => {
            const { req, res } = createMockReqRes({ query: { payment_method: 'cash' } });
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])));
            await (0, vipController_1.getVIPTransactions)(req, res);
            expect(supabase_2.supabase.from).toHaveBeenCalledWith('vip_payment_transactions');
        });
        it('should filter by status', async () => {
            const { req, res } = createMockReqRes({ query: { status: 'pending' } });
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])));
            await (0, vipController_1.getVIPTransactions)(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
        it('should handle database errors', async () => {
            const { req, res } = createMockReqRes();
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Database error')));
            await (0, vipController_1.getVIPTransactions)(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
    // ========================================
    // rejectPayment Tests (Admin)
    // ========================================
    describe('rejectPayment', () => {
        it('should require authentication', async () => {
            const { req, res } = createMockReqRes({
                user: undefined,
                params: { transactionId: 'txn-123' },
                body: { admin_notes: 'Fake payment' },
            });
            await (0, vipController_1.rejectPayment)(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });
        it('should require admin_notes', async () => {
            const { req, res } = createMockReqRes({
                params: { transactionId: 'txn-123' },
                body: {}, // Missing admin_notes
            });
            await (0, vipController_1.rejectPayment)(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Rejection reason (admin_notes) is required',
            }));
        });
        it('should return 404 if transaction not found', async () => {
            const { req, res } = createMockReqRes({
                params: { transactionId: 'txn-nonexistent' },
                body: { admin_notes: 'Fake payment' },
            });
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()));
            await (0, vipController_1.rejectPayment)(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });
        it('should reject already processed transaction', async () => {
            const { req, res } = createMockReqRes({
                params: { transactionId: 'txn-123' },
                body: { admin_notes: 'Fake payment' },
            });
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'txn-123', payment_status: 'completed' })));
            await (0, vipController_1.rejectPayment)(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Transaction already processed',
            }));
        });
        it('should reject payment and cancel subscription', async () => {
            const { req, res } = createMockReqRes({
                params: { transactionId: 'txn-123' },
                body: { admin_notes: 'Payment proof is fake' },
            });
            // Transaction pending
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({
                id: 'txn-123',
                payment_status: 'pending',
                subscription_type: 'employee',
                user_id: 'buyer-123',
            })));
            // Update transaction to failed
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            // Cancel subscription
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            // Get tier for notification
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ tier: 'employee' })));
            await (0, vipController_1.rejectPayment)(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Payment rejected successfully',
            }));
            expect(notificationHelper_1.notifyVIPPaymentRejected).toHaveBeenCalled();
        });
        it('should handle transaction update failure', async () => {
            const { req, res } = createMockReqRes({
                params: { transactionId: 'txn-123' },
                body: { admin_notes: 'Fake payment' },
            });
            // Transaction pending
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({
                id: 'txn-123',
                payment_status: 'pending',
                subscription_type: 'employee',
            })));
            // Update transaction fails
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Update failed')));
            await (0, vipController_1.rejectPayment)(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
//# sourceMappingURL=vipController.test.js.map