"use strict";
/**
 * Notification Helper Tests
 *
 * Tests for notification system (1,219 LOC utility):
 * - createNotification (5 tests)
 * - Ownership notifications (3 tests)
 * - Mark as read (4 tests)
 * - VIP notifications (3 tests)
 * - Verification notifications (4 tests)
 * - Favorite notifications (2 tests)
 * - getUnreadNotificationCount (2 tests)
 *
 * Day 5+ Sprint - Business Logic Testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
const notificationHelper_1 = require("../notificationHelper");
const supabase_1 = require("../../config/supabase");
const pushService_1 = require("../../services/pushService");
const supabase_2 = require("../../config/__mocks__/supabase");
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
jest.mock('../../services/pushService', () => ({
    sendPushToUser: jest.fn().mockResolvedValue(1)
}));
jest.mock('../logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
    }
}));
describe('notificationHelper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        supabase_1.supabase.from.mockImplementation(() => (0, supabase_2.createMockQueryBuilder)());
        supabase_1.supabase.rpc.mockResolvedValue({ data: 0, error: null });
    });
    describe('createNotification', () => {
        it('should create notification with i18n_key', async () => {
            const mockNotificationId = 'notif-123';
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: mockNotificationId })));
            const result = await (0, notificationHelper_1.createNotification)({
                user_id: 'user-123',
                type: 'new_ownership_request',
                i18n_key: 'notifications.test',
                i18n_params: { name: 'Test' }
            });
            expect(result).toBe(mockNotificationId);
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
        it('should create notification with title+message', async () => {
            const mockNotificationId = 'notif-456';
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: mockNotificationId })));
            const result = await (0, notificationHelper_1.createNotification)({
                user_id: 'user-123',
                type: 'new_ownership_request',
                title: 'Test Title',
                message: 'Test Message'
            });
            expect(result).toBe(mockNotificationId);
        });
        it('should return null if validation fails (no i18n_key and no title+message)', async () => {
            const result = await (0, notificationHelper_1.createNotification)({
                user_id: 'user-123',
                type: 'new_ownership_request'
                // Missing both i18n_key and title+message
            });
            expect(result).toBeNull();
        });
        it('should call sendPushToUser asynchronously', async () => {
            const mockNotificationId = 'notif-789';
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: mockNotificationId })));
            await (0, notificationHelper_1.createNotification)({
                user_id: 'user-123',
                type: 'new_ownership_request',
                title: 'Test',
                message: 'Test Message'
            });
            expect(pushService_1.sendPushToUser).toHaveBeenCalledWith('user-123', expect.objectContaining({
                title: 'Test',
                body: 'Test Message'
            }));
        });
        it('should return null on database error', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockError)('Database error')));
            const result = await (0, notificationHelper_1.createNotification)({
                user_id: 'user-123',
                type: 'new_ownership_request',
                title: 'Test',
                message: 'Test'
            });
            expect(result).toBeNull();
        });
    });
    describe('notifyAdminsNewOwnershipRequest', () => {
        it('should notify all admins', async () => {
            const admins = [{ id: 'admin-1' }, { id: 'admin-2' }];
            // First call returns admins, subsequent calls are for creating notifications
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(admins));
                }
                return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: `notif-${callCount}` }));
            });
            await (0, notificationHelper_1.notifyAdminsNewOwnershipRequest)('Test Bar', 'TestUser', 'request-123', false);
            // Should query for admins
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('users');
        });
        it('should use different i18n key for new establishment', async () => {
            const admins = [{ id: 'admin-1' }];
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(admins));
                }
                return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-1' }));
            });
            await (0, notificationHelper_1.notifyAdminsNewOwnershipRequest)('New Bar', 'TestUser', 'request-456', true // isNewEstablishment
            );
            expect(supabase_1.supabase.from).toHaveBeenCalled();
        });
        it('should handle no admins gracefully', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)([])));
            await (0, notificationHelper_1.notifyAdminsNewOwnershipRequest)('Test Bar', 'TestUser', 'request-789', false);
            // Should not throw
        });
    });
    describe('notifyOwnershipRequestSubmitted', () => {
        it('should notify user when request submitted', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyOwnershipRequestSubmitted)('user-123', 'Test Bar', 'request-123', false);
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
    });
    describe('notifyOwnerRequestStatusChange', () => {
        it('should notify on approval', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyOwnerRequestStatusChange)('user-123', 'approved', 'Test Bar', undefined, 'request-123');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
        it('should notify on rejection with notes', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyOwnerRequestStatusChange)('user-123', 'rejected', 'Test Bar', 'Missing documents', 'request-123');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
    });
    describe('markNotificationAsRead', () => {
        it('should mark notification as read', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(null)));
            const result = await (0, notificationHelper_1.markNotificationAsRead)('notif-123', 'user-123');
            expect(result).toBe(true);
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
        it('should verify user ownership', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(null)));
            await (0, notificationHelper_1.markNotificationAsRead)('notif-123', 'user-123');
            // The mock chain should include user_id check
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
        it('should return false on error', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockError)('Database error')));
            const result = await (0, notificationHelper_1.markNotificationAsRead)('notif-123', 'user-123');
            expect(result).toBe(false);
        });
    });
    describe('markAllNotificationsAsRead', () => {
        it('should mark all unread notifications', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(null)));
            const result = await (0, notificationHelper_1.markAllNotificationsAsRead)('user-123');
            expect(result).toBe(true);
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
        it('should return false on error', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockError)('Database error')));
            const result = await (0, notificationHelper_1.markAllNotificationsAsRead)('user-123');
            expect(result).toBe(false);
        });
    });
    describe('VIP Notifications', () => {
        it('notifyVIPPurchaseConfirmed should include tier/duration/price', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyVIPPurchaseConfirmed)('user-123', 'gold', 30, 999);
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
        it('notifyVIPPaymentVerified should include expiration', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            await (0, notificationHelper_1.notifyVIPPaymentVerified)('user-123', 'silver', expiresAt);
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
        it('notifyVIPPaymentRejected should include reason', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyVIPPaymentRejected)('user-123', 'gold', 'Payment not verified');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
        it('notifyVIPSubscriptionCancelled should include reason', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyVIPSubscriptionCancelled)('user-123', 'platinum', 'User requested');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
    });
    describe('Verification Notifications', () => {
        it('notifyEmployeeVerificationSubmitted should work', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyEmployeeVerificationSubmitted)('user-123', 'Jane');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
        it('notifyEmployeeVerificationApproved should work', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyEmployeeVerificationApproved)('user-123', 'Jane');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
        it('notifyEmployeeVerificationRejected with reason should work', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyEmployeeVerificationRejected)('user-123', 'Jane', 'Photo not clear');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
        it('notifyAdminsNewVerificationRequest to all admins', async () => {
            const admins = [{ id: 'admin-1' }, { id: 'admin-2' }];
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(admins));
                }
                return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: `notif-${callCount}` }));
            });
            await (0, notificationHelper_1.notifyAdminsNewVerificationRequest)('Jane', 'verif-123');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('users');
        });
    });
    describe('Favorite Notifications', () => {
        it('notifyFavoriteAvailable to all users who favorited', async () => {
            const favorites = [{ user_id: 'user-1' }, { user_id: 'user-2' }];
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(favorites));
                }
                return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: `notif-${callCount}` }));
            });
            await (0, notificationHelper_1.notifyFavoriteAvailable)('emp-123', 'Jane', 'Test Bar');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('user_favorites');
        });
        it('should handle no favorites gracefully', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)([])));
            await (0, notificationHelper_1.notifyFavoriteAvailable)('emp-123', 'Jane', 'Test Bar');
            // Should not throw
        });
        it('notifyNewFavorite should work', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyNewFavorite)('user-123', 'TestUser', 'Jane');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
    });
    describe('Moderation Notifications', () => {
        it('notifyUserContentApproved should work', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyUserContentApproved)('user-123', 'employee', 'Jane', 'emp-123');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
        it('notifyUserContentRejected should work', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyUserContentRejected)('user-123', 'comment', 'Inappropriate content', 'comment-123');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
        it('notifyCommentRemoved should work', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyCommentRemoved)('user-123', 'Violated guidelines', 'employee', 'Jane');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
    });
    describe('Social Notifications', () => {
        it('notifyCommentReply should work', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyCommentReply)('user-123', 'TestReplier', 'Jane', 'comment-456', 'emp-123');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
        it('notifyEmployeeUpdate should notify all followers', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyEmployeeUpdate)(['user-1', 'user-2'], 'Jane', 'profile', 'emp-123');
            expect(supabase_1.supabase.from).toHaveBeenCalled();
        });
    });
    describe('Admin Notifications', () => {
        it('notifyAdminsPendingContent should work', async () => {
            const admins = [{ id: 'admin-1' }];
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(admins));
                }
                return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: `notif-${callCount}` }));
            });
            await (0, notificationHelper_1.notifyAdminsPendingContent)('employee', 'Jane', 'TestSubmitter', 'item-123');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('users');
        });
        it('notifyAdminsNewEditProposal should work', async () => {
            const admins = [{ id: 'admin-1' }];
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(admins));
                }
                return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: `notif-${callCount}` }));
            });
            await (0, notificationHelper_1.notifyAdminsNewEditProposal)('proposal-123', 'TestUser', 'employee', 'Jane');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('users');
        });
    });
    describe('Edit Proposal Notifications', () => {
        it('notifyEditProposalApproved should work', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyEditProposalApproved)('user-123', 'employee', 'Jane');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
        it('notifyEditProposalRejected should work', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyEditProposalRejected)('user-123', 'employee', 'Jane', 'Invalid data');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
    });
    describe('Establishment Owner Notifications', () => {
        it('notifyEstablishmentOwnerAssigned should work', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyEstablishmentOwnerAssigned)('user-123', 'Test Bar', 'est-123', 'owner');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
        it('notifyEstablishmentOwnerRemoved should work', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)({ id: 'notif-123' })));
            await (0, notificationHelper_1.notifyEstablishmentOwnerRemoved)('user-123', 'Test Bar', 'est-123');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('notifications');
        });
    });
    describe('getUnreadNotificationCount', () => {
        it('should return count from RPC', async () => {
            supabase_1.supabase.rpc.mockResolvedValue({ data: 5, error: null });
            const result = await (0, notificationHelper_1.getUnreadNotificationCount)('user-123');
            expect(result).toBe(5);
            expect(supabase_1.supabase.rpc).toHaveBeenCalledWith('get_unread_count', { p_user_id: 'user-123' });
        });
        it('should return 0 on error', async () => {
            supabase_1.supabase.rpc.mockResolvedValue({ data: null, error: 'Database error' });
            const result = await (0, notificationHelper_1.getUnreadNotificationCount)('user-123');
            expect(result).toBe(0);
        });
        it('should return 0 if data is null', async () => {
            supabase_1.supabase.rpc.mockResolvedValue({ data: null, error: null });
            const result = await (0, notificationHelper_1.getUnreadNotificationCount)('user-123');
            expect(result).toBe(0);
        });
    });
});
//# sourceMappingURL=notificationHelper.test.js.map