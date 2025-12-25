"use strict";
/**
 * 🧪 VIP Controller Edge Cases & Error Handling Tests
 *
 * Supplementary tests covering error paths and edge cases
 * not covered by main test files:
 * - Error handling for database failures
 * - PromptPay configuration errors
 * - Transaction rollback scenarios
 * - Invalid subscription type handling
 * - Admin permission checks in verifyPayment
 *
 * Target: Increase vipController.ts coverage from 79% to 90%+
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const vipController_1 = require("../../controllers/vipController");
const auth_1 = require("../../middleware/auth");
const csrf_1 = require("../../middleware/csrf");
const supabase_1 = require("../../config/__mocks__/supabase");
const promptpayService_1 = require("../../services/promptpayService");
// Mock dependencies
jest.mock('../../config/supabase', () => {
    const mockModule = jest.requireActual('../../config/__mocks__/supabase');
    return {
        supabase: mockModule.supabase,
        createMockQueryBuilder: mockModule.createMockQueryBuilder,
        mockSuccess: mockModule.mockSuccess,
        mockError: mockModule.mockError,
        mockNotFound: mockModule.mockNotFound
    };
});
jest.mock('../../middleware/auth');
jest.mock('../../middleware/csrf');
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));
jest.mock('../../utils/notificationHelper', () => ({
    notifyVIPPurchaseConfirmed: jest.fn(),
    notifyVIPPaymentVerified: jest.fn(),
    notifyVIPPaymentRejected: jest.fn(),
    notifyVIPSubscriptionCancelled: jest.fn()
}));
jest.mock('../../services/promptpayService', () => ({
    isPromptPayConfigured: jest.fn(),
    generatePromptPayQR: jest.fn()
}));
const supabase_2 = require("../../config/supabase");
describe('VIP Controller Edge Cases', () => {
    let app;
    beforeEach(() => {
        jest.clearAllMocks();
        supabase_2.supabase.from.mockImplementation(() => (0, supabase_1.createMockQueryBuilder)());
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        auth_1.authenticateToken.mockImplementation((req, res, next) => {
            req.user = { id: 'test-user-id', role: 'user' };
            next();
        });
        auth_1.requireAdmin.mockImplementation((req, res, next) => {
            if (req.user?.role === 'admin') {
                next();
            }
            else {
                res.status(403).json({ error: 'Admin access required' });
            }
        });
        csrf_1.csrfProtection.mockImplementation((req, res, next) => next());
        // Setup routes
        app.get('/api/vip/pricing/:type', vipController_1.getPricingOptions);
        app.post('/api/vip/purchase', auth_1.authenticateToken, csrf_1.csrfProtection, vipController_1.purchaseVIP);
        app.get('/api/vip/my-subscriptions', auth_1.authenticateToken, vipController_1.getMyVIPSubscriptions);
        app.patch('/api/vip/subscriptions/:id/cancel', auth_1.authenticateToken, csrf_1.csrfProtection, vipController_1.cancelVIPSubscription);
        app.post('/api/admin/vip/verify-payment/:transactionId', auth_1.authenticateToken, vipController_1.verifyPayment);
        app.get('/api/admin/vip/transactions', auth_1.authenticateToken, vipController_1.getVIPTransactions);
        app.post('/api/admin/vip/reject-payment/:transactionId', auth_1.authenticateToken, vipController_1.rejectPayment);
    });
    describe('getPricingOptions - Error Handling', () => {
        it('should return 500 on unexpected error', async () => {
            // Force an error by passing undefined type
            const response = await (0, supertest_1.default)(app)
                .get('/api/vip/pricing/undefined')
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('purchaseVIP - Error Paths', () => {
        it('should return 401 if user is not authenticated', async () => {
            auth_1.authenticateToken.mockImplementationOnce((req, res, next) => {
                req.user = undefined;
                next();
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/vip/purchase')
                .send({
                subscription_type: 'employee',
                entity_id: 'emp-123',
                duration: 30,
                payment_method: 'cash'
            })
                .expect(401);
            expect(response.body.error).toBe('Unauthorized');
        });
        it('should return 400 for invalid subscription type', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/vip/purchase')
                .send({
                subscription_type: 'invalid_type',
                entity_id: 'emp-123',
                duration: 30,
                payment_method: 'cash'
            })
                .expect(400);
            expect(response.body.error).toContain('Invalid subscription type');
        });
        it('should return 409 if active subscription already exists', async () => {
            const existingSubscription = {
                id: 'sub-existing',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                tier: 'employee'
            };
            supabase_2.supabase.from
                // Employee ownership check
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'emp-123', user_id: 'test-user-id' })))
                // Existing subscription check - returns active subscription
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(existingSubscription)));
            const response = await (0, supertest_1.default)(app)
                .post('/api/vip/purchase')
                .send({
                subscription_type: 'employee',
                entity_id: 'emp-123',
                duration: 30,
                payment_method: 'cash'
            })
                .expect(409);
            expect(response.body.error).toContain('Active subscription exists');
            expect(response.body).toHaveProperty('existing_subscription');
        });
        it('should return 500 if subscription creation fails', async () => {
            supabase_2.supabase.from
                // Employee ownership check
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'emp-123', user_id: 'test-user-id' })))
                // No existing subscription
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()))
                // Subscription creation fails
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Database connection error')));
            const response = await (0, supertest_1.default)(app)
                .post('/api/vip/purchase')
                .send({
                subscription_type: 'employee',
                entity_id: 'emp-123',
                duration: 30,
                payment_method: 'cash'
            })
                .expect(500);
            expect(response.body.error).toContain('Failed to create VIP subscription');
        });
        it('should return 400 if PromptPay is not configured', async () => {
            promptpayService_1.isPromptPayConfigured.mockReturnValue(false);
            supabase_2.supabase.from
                // Employee ownership check
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'emp-123', user_id: 'test-user-id' })))
                // No existing subscription
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()))
                // Subscription creation succeeds
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'sub-123' })));
            const response = await (0, supertest_1.default)(app)
                .post('/api/vip/purchase')
                .send({
                subscription_type: 'employee',
                entity_id: 'emp-123',
                duration: 30,
                payment_method: 'promptpay'
            })
                .expect(400);
            expect(response.body.error).toContain('PromptPay not available');
        });
        it('should rollback subscription if transaction creation fails', async () => {
            const subscriptionId = 'sub-to-rollback';
            supabase_2.supabase.from
                // Employee ownership check
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'emp-123', user_id: 'test-user-id' })))
                // No existing subscription
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()))
                // Subscription creation succeeds
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: subscriptionId })))
                // Transaction creation fails
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Transaction insert failed')))
                // Subscription delete (rollback)
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            const response = await (0, supertest_1.default)(app)
                .post('/api/vip/purchase')
                .send({
                subscription_type: 'employee',
                entity_id: 'emp-123',
                duration: 30,
                payment_method: 'cash'
            })
                .expect(500);
            expect(response.body.error).toContain('Failed to create payment transaction');
        });
        it('should handle admin_grant payment method correctly', async () => {
            auth_1.authenticateToken.mockImplementationOnce((req, res, next) => {
                req.user = { id: 'admin-user-id', role: 'admin' };
                next();
            });
            const subscription = {
                id: 'sub-123',
                status: 'active',
                tier: 'employee',
                starts_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
                price_paid: 3600
            };
            const transaction = {
                id: 'txn-123',
                amount: 3600,
                currency: 'THB',
                payment_method: 'admin_grant',
                payment_status: 'completed'
            };
            supabase_2.supabase.from
                // Employee ownership check
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'emp-123', user_id: 'admin-user-id' })))
                // No existing subscription
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()))
                // Subscription creation
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(subscription)))
                // Transaction creation
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(transaction)))
                // Update subscription with transaction_id
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            const response = await (0, supertest_1.default)(app)
                .post('/api/vip/purchase')
                .send({
                subscription_type: 'employee',
                entity_id: 'emp-123',
                duration: 30,
                payment_method: 'admin_grant'
            })
                .expect(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('activated successfully');
        });
    });
    describe('getMyVIPSubscriptions - Error Paths', () => {
        it('should return 401 if user is not authenticated', async () => {
            auth_1.authenticateToken.mockImplementationOnce((req, res, next) => {
                req.user = undefined;
                next();
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/vip/my-subscriptions')
                .expect(401);
            expect(response.body.error).toBe('Unauthorized');
        });
        it('should return 500 on database error', async () => {
            // Mock both calls to throw errors
            supabase_2.supabase.from.mockImplementation(() => {
                throw new Error('Database connection failed');
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/vip/my-subscriptions')
                .expect(500);
            expect(response.body.error).toContain('Failed to fetch VIP subscriptions');
        });
    });
    describe('cancelVIPSubscription - Error Paths', () => {
        it('should return 401 if user is not authenticated', async () => {
            auth_1.authenticateToken.mockImplementationOnce((req, res, next) => {
                req.user = undefined;
                next();
            });
            const response = await (0, supertest_1.default)(app)
                .patch('/api/vip/subscriptions/sub-123/cancel')
                .send({ subscription_type: 'employee' })
                .expect(401);
            expect(response.body.error).toBe('Unauthorized');
        });
        it('should return 400 for missing subscription_type', async () => {
            const response = await (0, supertest_1.default)(app)
                .patch('/api/vip/subscriptions/sub-123/cancel')
                .send({})
                .expect(400);
            expect(response.body.error).toContain('Invalid subscription type');
        });
        it('should return 500 if subscription update fails', async () => {
            const subscription = {
                id: 'sub-123',
                employee_id: 'emp-123',
                status: 'active'
            };
            const ownership = {
                id: 'ownership-123',
                user_id: 'test-user-id'
            };
            supabase_2.supabase.from
                // Subscription fetch
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(subscription)))
                // Ownership check
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(ownership)))
                // Subscription update fails
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Update failed')));
            const response = await (0, supertest_1.default)(app)
                .patch('/api/vip/subscriptions/sub-123/cancel')
                .send({ subscription_type: 'employee' })
                .expect(500);
            expect(response.body.error).toContain('Failed to cancel subscription');
        });
        it('should handle establishment subscription cancellation', async () => {
            const subscription = {
                id: 'sub-123',
                establishment_id: 'est-123',
                status: 'active',
                tier: 'establishment'
            };
            const ownership = {
                id: 'ownership-123',
                user_id: 'test-user-id'
            };
            const cancelledSubscription = {
                ...subscription,
                status: 'cancelled'
            };
            supabase_2.supabase.from
                // Subscription fetch
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(subscription)))
                // Ownership check
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(ownership)))
                // Subscription update
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(cancelledSubscription)));
            const response = await (0, supertest_1.default)(app)
                .patch('/api/vip/subscriptions/sub-123/cancel')
                .send({ subscription_type: 'establishment' })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.subscription.status).toBe('cancelled');
        });
    });
    describe('verifyPayment - Error Paths', () => {
        it('should return 401 if user is not authenticated', async () => {
            auth_1.authenticateToken.mockImplementationOnce((req, res, next) => {
                req.user = undefined;
                next();
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/admin/vip/verify-payment/txn-123')
                .send({ admin_notes: 'Test' })
                .expect(401);
            expect(response.body.error).toBe('Unauthorized');
        });
        it('should return 403 if user is not admin', async () => {
            // User is authenticated but not admin
            supabase_2.supabase.from
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ role: 'user' })));
            const response = await (0, supertest_1.default)(app)
                .post('/api/admin/vip/verify-payment/txn-123')
                .send({ admin_notes: 'Test' })
                .expect(403);
            expect(response.body.error).toBe('Forbidden');
        });
        it('should return 400 for non-cash payment method', async () => {
            const transaction = {
                id: 'txn-123',
                payment_status: 'pending',
                payment_method: 'promptpay' // Not cash
            };
            supabase_2.supabase.from
                // Admin role check
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ role: 'admin' })))
                // Transaction fetch
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(transaction)));
            const response = await (0, supertest_1.default)(app)
                .post('/api/admin/vip/verify-payment/txn-123')
                .send({ admin_notes: 'Test' })
                .expect(400);
            expect(response.body.error).toContain('Invalid payment method');
        });
        it('should return 500 if transaction update fails', async () => {
            const transaction = {
                id: 'txn-123',
                payment_status: 'pending',
                payment_method: 'cash'
            };
            supabase_2.supabase.from
                // Admin role check
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ role: 'admin' })))
                // Transaction fetch
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(transaction)))
                // Transaction update fails
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Update failed')));
            const response = await (0, supertest_1.default)(app)
                .post('/api/admin/vip/verify-payment/txn-123')
                .send({ admin_notes: 'Test' })
                .expect(500);
            expect(response.body.error).toContain('Failed to update transaction');
        });
        it('should return 500 if subscription activation fails', async () => {
            const transaction = {
                id: 'txn-123',
                subscription_type: 'employee',
                payment_status: 'pending',
                payment_method: 'cash',
                user_id: 'user-123'
            };
            supabase_2.supabase.from
                // Admin role check
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ role: 'admin' })))
                // Transaction fetch
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(transaction)))
                // Transaction update succeeds
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)))
                // Subscription update fails
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Subscription update failed')));
            const response = await (0, supertest_1.default)(app)
                .post('/api/admin/vip/verify-payment/txn-123')
                .send({ admin_notes: 'Test' })
                .expect(500);
            expect(response.body.error).toContain('Failed to activate subscription');
        });
    });
    describe('getVIPTransactions - Error Paths', () => {
        it('should return 500 on database error', async () => {
            supabase_2.supabase.from
                .mockReturnValueOnce({
                select: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/admin/vip/transactions')
                .expect(500);
            expect(response.body.error).toContain('Failed to fetch VIP transactions');
        });
        it('should return empty array when no transactions exist', async () => {
            supabase_2.supabase.from
                .mockReturnValueOnce({
                select: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: [], error: null })
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/admin/vip/transactions')
                .expect(200);
            expect(response.body.transactions).toEqual([]);
            expect(response.body.count).toBe(0);
        });
        it('should handle status=all filter correctly', async () => {
            const transactions = [
                { id: 'txn-1', subscription_type: 'employee', payment_status: 'pending' },
                { id: 'txn-2', subscription_type: 'employee', payment_status: 'completed' }
            ];
            supabase_2.supabase.from.mockImplementation((table) => {
                if (table === 'vip_payment_transactions') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        order: jest.fn().mockResolvedValue({ data: transactions, error: null })
                    };
                }
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
                };
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/admin/vip/transactions?status=all')
                .expect(200);
            expect(response.body.transactions.length).toBe(2);
        });
    });
    describe('rejectPayment - Error Paths', () => {
        it('should return 401 if user is not authenticated', async () => {
            auth_1.authenticateToken.mockImplementationOnce((req, res, next) => {
                req.user = undefined;
                next();
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/admin/vip/reject-payment/txn-123')
                .send({ admin_notes: 'Rejected' })
                .expect(401);
            expect(response.body.error).toContain('Authentication required');
        });
        it('should return 404 if transaction not found', async () => {
            supabase_2.supabase.from
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()));
            const response = await (0, supertest_1.default)(app)
                .post('/api/admin/vip/reject-payment/non-existent')
                .send({ admin_notes: 'Rejected' })
                .expect(404);
            expect(response.body.error).toContain('Transaction not found');
        });
        it('should return 500 if transaction update fails', async () => {
            const transaction = {
                id: 'txn-123',
                subscription_type: 'employee',
                payment_status: 'pending'
            };
            supabase_2.supabase.from
                // Transaction fetch
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(transaction)))
                // Transaction update fails
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Update failed')));
            const response = await (0, supertest_1.default)(app)
                .post('/api/admin/vip/reject-payment/txn-123')
                .send({ admin_notes: 'Invalid payment' })
                .expect(500);
            expect(response.body.error).toContain('Failed to update transaction');
        });
        it('should continue even if subscription update fails', async () => {
            const transaction = {
                id: 'txn-123',
                subscription_type: 'employee',
                payment_status: 'pending',
                user_id: 'user-123'
            };
            supabase_2.supabase.from
                // Transaction fetch
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(transaction)))
                // Transaction update succeeds
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)))
                // Subscription update fails (should continue anyway)
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Subscription update failed')))
                // Subscription tier fetch for notification
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ tier: 'employee' })));
            const response = await (0, supertest_1.default)(app)
                .post('/api/admin/vip/reject-payment/txn-123')
                .send({ admin_notes: 'Invalid payment' })
                .expect(200);
            // Should still succeed even if subscription update failed
            expect(response.body.success).toBe(true);
        });
        it('should handle establishment subscription rejection', async () => {
            const transaction = {
                id: 'txn-123',
                subscription_type: 'establishment',
                payment_status: 'pending',
                user_id: 'user-123'
            };
            supabase_2.supabase.from
                // Transaction fetch
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(transaction)))
                // Transaction update
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)))
                // Subscription update
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)))
                // Subscription tier fetch
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ tier: 'establishment' })));
            const response = await (0, supertest_1.default)(app)
                .post('/api/admin/vip/reject-payment/txn-123')
                .send({ admin_notes: 'Invalid receipt' })
                .expect(200);
            expect(response.body.success).toBe(true);
        });
    });
    describe('PromptPay Integration', () => {
        it('should generate QR code for PromptPay payment', async () => {
            promptpayService_1.isPromptPayConfigured.mockReturnValue(true);
            promptpayService_1.generatePromptPayQR.mockResolvedValue({
                qrCode: 'data:image/png;base64,mockQR',
                reference: 'ref-123'
            });
            const subscription = {
                id: 'sub-123',
                status: 'pending_payment',
                tier: 'employee',
                starts_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
                price_paid: 3600
            };
            const transaction = {
                id: 'txn-123',
                amount: 3600,
                currency: 'THB',
                payment_method: 'promptpay',
                payment_status: 'pending',
                promptpay_qr_code: 'data:image/png;base64,mockQR',
                promptpay_reference: 'ref-123'
            };
            supabase_2.supabase.from
                // Employee ownership check
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'emp-123', user_id: 'test-user-id' })))
                // No existing subscription
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()))
                // Subscription creation
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(subscription)))
                // Transaction creation
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(transaction)))
                // Update subscription with transaction_id
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            const response = await (0, supertest_1.default)(app)
                .post('/api/vip/purchase')
                .send({
                subscription_type: 'employee',
                entity_id: 'emp-123',
                duration: 30,
                payment_method: 'promptpay'
            })
                .expect(201);
            expect(response.body.success).toBe(true);
            expect(response.body.transaction.promptpay_qr_code).toBeDefined();
            expect(response.body.transaction.promptpay_reference).toBeDefined();
            expect(promptpayService_1.generatePromptPayQR).toHaveBeenCalled();
        });
    });
    describe('Owner Buying VIP for Employee', () => {
        it('should allow establishment owner to purchase VIP for their employee', async () => {
            const ownership = {
                id: 'ownership-123',
                permissions: { can_edit_employees: true },
                current_employment: {
                    establishment_id: 'est-123',
                    employee_id: 'emp-123'
                }
            };
            const subscription = {
                id: 'sub-123',
                status: 'pending_payment',
                tier: 'employee',
                starts_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
                price_paid: 3600
            };
            const transaction = {
                id: 'txn-123',
                amount: 3600,
                payment_method: 'cash',
                payment_status: 'pending'
            };
            supabase_2.supabase.from
                // Employee self-ownership check (not the owner)
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()))
                // Establishment owner check
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(ownership)))
                // No existing subscription
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()))
                // Subscription creation
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(subscription)))
                // Transaction creation
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(transaction)))
                // Update subscription with transaction_id
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            const response = await (0, supertest_1.default)(app)
                .post('/api/vip/purchase')
                .send({
                subscription_type: 'employee',
                entity_id: 'emp-123',
                duration: 30,
                payment_method: 'cash'
            })
                .expect(201);
            expect(response.body.success).toBe(true);
        });
        it('should reject if owner lacks can_edit_employees permission', async () => {
            const ownership = {
                id: 'ownership-123',
                permissions: { can_edit_employees: false }, // No permission
                current_employment: {
                    establishment_id: 'est-123',
                    employee_id: 'emp-123'
                }
            };
            supabase_2.supabase.from
                // Employee self-ownership check
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()))
                // Establishment owner check (no can_edit_employees permission)
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()));
            const response = await (0, supertest_1.default)(app)
                .post('/api/vip/purchase')
                .send({
                subscription_type: 'employee',
                entity_id: 'emp-123',
                duration: 30,
                payment_method: 'cash'
            })
                .expect(403);
            expect(response.body.error).toBe('Forbidden');
        });
    });
});
//# sourceMappingURL=vipControllerEdgeCases.test.js.map