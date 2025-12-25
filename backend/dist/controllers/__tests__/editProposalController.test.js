"use strict";
/**
 * Edit Proposal Controller Tests
 *
 * Tests for edit proposal system:
 * - createProposal (8 tests)
 * - getProposals (4 tests)
 * - getMyProposals (3 tests)
 * - approveProposal (6 tests)
 * - rejectProposal (5 tests)
 *
 * Day 5+ Sprint - Security Testing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const editProposalController_1 = require("../editProposalController");
// Import mock helpers
const supabase_1 = require("../../config/__mocks__/supabase");
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
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));
jest.mock('../../utils/notificationHelper', () => ({
    notifyAdminsNewEditProposal: jest.fn().mockResolvedValue(undefined),
    notifyEditProposalApproved: jest.fn().mockResolvedValue(undefined),
    notifyEditProposalRejected: jest.fn().mockResolvedValue(undefined)
}));
const supabase_2 = require("../../config/supabase");
const notificationHelper_1 = require("../../utils/notificationHelper");
describe('editProposalController', () => {
    let app;
    const mockProposal = {
        id: 'proposal-123',
        item_type: 'employee',
        item_id: 'emp-123',
        proposed_changes: { name: 'New Name', nickname: 'NN' },
        current_values: { name: 'Old Name', nickname: 'ON' },
        proposed_by: 'user-123',
        status: 'pending',
        created_at: new Date().toISOString()
    };
    beforeEach(() => {
        jest.clearAllMocks();
        supabase_2.supabase.from.mockImplementation(() => (0, supabase_1.createMockQueryBuilder)());
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        // Mock authentication middleware
        app.use((req, res, next) => {
            req.user = { id: 'user-123', role: 'user' };
            next();
        });
        // Setup routes
        app.post('/api/proposals', editProposalController_1.createProposal);
        app.get('/api/proposals', editProposalController_1.getProposals);
        app.get('/api/proposals/my', editProposalController_1.getMyProposals);
        app.post('/api/proposals/:id/approve', editProposalController_1.approveProposal);
        app.post('/api/proposals/:id/reject', editProposalController_1.rejectProposal);
    });
    // ============================================
    // createProposal
    // ============================================
    describe('createProposal', () => {
        it('should create proposal for regular user (pending status)', async () => {
            let callCount = 0;
            supabase_2.supabase.from.mockImplementation((table) => {
                callCount++;
                if (callCount === 1 && table === 'users') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ role: 'user' }));
                }
                if (callCount === 2 && table === 'edit_proposals') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockProposal));
                }
                if (callCount === 3 && table === 'users') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ pseudonym: 'testuser' }));
                }
                if (callCount === 4 && table === 'employees') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ name: 'Test Employee' }));
                }
                return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null));
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/proposals')
                .send({
                item_type: 'employee',
                item_id: 'emp-123',
                proposed_changes: { name: 'New Name' },
                current_values: { name: 'Old Name' }
            })
                .expect(201);
            expect(response.body.auto_approved).toBe(false);
            expect(response.body.message).toBe('Edit proposal submitted for review');
            expect(notificationHelper_1.notifyAdminsNewEditProposal).toHaveBeenCalled();
        });
        it('should auto-approve for admin user', async () => {
            // Override auth middleware for this test
            const adminApp = (0, express_1.default)();
            adminApp.use(express_1.default.json());
            adminApp.use((req, res, next) => {
                req.user = { id: 'admin-123', role: 'admin' };
                next();
            });
            adminApp.post('/api/proposals', editProposalController_1.createProposal);
            let callCount = 0;
            supabase_2.supabase.from.mockImplementation((table) => {
                callCount++;
                if (callCount === 1 && table === 'users') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ role: 'admin' }));
                }
                if (callCount === 2 && table === 'employees') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)); // update
                }
                if (callCount === 3 && table === 'edit_proposals') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ ...mockProposal, status: 'approved' }));
                }
                return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null));
            });
            const response = await (0, supertest_1.default)(adminApp)
                .post('/api/proposals')
                .send({
                item_type: 'employee',
                item_id: 'emp-123',
                proposed_changes: { name: 'New Name' },
                current_values: { name: 'Old Name' }
            })
                .expect(201);
            expect(response.body.auto_approved).toBe(true);
            expect(response.body.message).toBe('Changes applied immediately');
        });
        it('should auto-approve for moderator user', async () => {
            const modApp = (0, express_1.default)();
            modApp.use(express_1.default.json());
            modApp.use((req, res, next) => {
                req.user = { id: 'mod-123', role: 'moderator' };
                next();
            });
            modApp.post('/api/proposals', editProposalController_1.createProposal);
            let callCount = 0;
            supabase_2.supabase.from.mockImplementation((table) => {
                callCount++;
                if (callCount === 1 && table === 'users') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ role: 'moderator' }));
                }
                if (callCount === 2 && table === 'employees') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null));
                }
                if (callCount === 3 && table === 'edit_proposals') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ ...mockProposal, status: 'approved' }));
                }
                return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null));
            });
            const response = await (0, supertest_1.default)(modApp)
                .post('/api/proposals')
                .send({
                item_type: 'employee',
                item_id: 'emp-123',
                proposed_changes: { name: 'New Name' }
            })
                .expect(201);
            expect(response.body.auto_approved).toBe(true);
        });
        it('should return 401 if not authenticated', async () => {
            const noAuthApp = (0, express_1.default)();
            noAuthApp.use(express_1.default.json());
            noAuthApp.post('/api/proposals', editProposalController_1.createProposal);
            const response = await (0, supertest_1.default)(noAuthApp)
                .post('/api/proposals')
                .send({
                item_type: 'employee',
                item_id: 'emp-123',
                proposed_changes: { name: 'New Name' }
            })
                .expect(401);
            expect(response.body.error).toBe('Unauthorized');
        });
        it('should return 400 for missing required fields', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/proposals')
                .send({
                item_type: 'employee'
                // Missing item_id and proposed_changes
            })
                .expect(400);
            expect(response.body.error).toBe('Missing required fields');
        });
        it('should return 500 on user role fetch error', async () => {
            supabase_2.supabase.from.mockImplementation(() => (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Database error')));
            const response = await (0, supertest_1.default)(app)
                .post('/api/proposals')
                .send({
                item_type: 'employee',
                item_id: 'emp-123',
                proposed_changes: { name: 'New Name' }
            })
                .expect(500);
            expect(response.body.error).toBe('Failed to verify user role');
        });
        it('should return 500 on proposal insert error', async () => {
            let callCount = 0;
            supabase_2.supabase.from.mockImplementation((table) => {
                callCount++;
                if (callCount === 1 && table === 'users') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ role: 'user' }));
                }
                return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Insert failed'));
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/proposals')
                .send({
                item_type: 'employee',
                item_id: 'emp-123',
                proposed_changes: { name: 'New Name' }
            })
                .expect(500);
            expect(response.body.error).toBe('Failed to create proposal');
        });
        it('should handle establishment proposals', async () => {
            let callCount = 0;
            supabase_2.supabase.from.mockImplementation((table) => {
                callCount++;
                if (callCount === 1 && table === 'users') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ role: 'user' }));
                }
                if (callCount === 2 && table === 'edit_proposals') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ ...mockProposal, item_type: 'establishment' }));
                }
                if (callCount === 3 && table === 'users') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ pseudonym: 'testuser' }));
                }
                if (callCount === 4 && table === 'establishments') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ name: 'Test Bar' }));
                }
                return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null));
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/proposals')
                .send({
                item_type: 'establishment',
                item_id: 'est-123',
                proposed_changes: { name: 'New Bar Name' }
            })
                .expect(201);
            expect(response.body.auto_approved).toBe(false);
        });
    });
    // ============================================
    // getProposals
    // ============================================
    describe('getProposals', () => {
        it('should return all proposals', async () => {
            supabase_2.supabase.from.mockImplementation(() => (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([mockProposal, { ...mockProposal, id: 'proposal-456' }])));
            const response = await (0, supertest_1.default)(app)
                .get('/api/proposals')
                .expect(200);
            expect(response.body.proposals).toHaveLength(2);
        });
        it('should filter by status', async () => {
            supabase_2.supabase.from.mockImplementation(() => (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([mockProposal])));
            const response = await (0, supertest_1.default)(app)
                .get('/api/proposals?status=pending')
                .expect(200);
            expect(response.body.proposals).toHaveLength(1);
        });
        it('should filter by item_type', async () => {
            supabase_2.supabase.from.mockImplementation(() => (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([mockProposal])));
            const response = await (0, supertest_1.default)(app)
                .get('/api/proposals?item_type=employee')
                .expect(200);
            expect(response.body.proposals).toHaveLength(1);
        });
        it('should return 500 on database error', async () => {
            supabase_2.supabase.from.mockImplementation(() => (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Database error')));
            const response = await (0, supertest_1.default)(app)
                .get('/api/proposals')
                .expect(500);
            expect(response.body.error).toBe('Failed to fetch proposals');
        });
    });
    // ============================================
    // getMyProposals
    // ============================================
    describe('getMyProposals', () => {
        it('should return user proposals', async () => {
            supabase_2.supabase.from.mockImplementation(() => (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([mockProposal])));
            const response = await (0, supertest_1.default)(app)
                .get('/api/proposals/my')
                .expect(200);
            expect(response.body.proposals).toHaveLength(1);
        });
        it('should return 401 if not authenticated', async () => {
            const noAuthApp = (0, express_1.default)();
            noAuthApp.use(express_1.default.json());
            noAuthApp.get('/api/proposals/my', editProposalController_1.getMyProposals);
            const response = await (0, supertest_1.default)(noAuthApp)
                .get('/api/proposals/my')
                .expect(401);
            expect(response.body.error).toBe('Unauthorized');
        });
        it('should return 500 on database error', async () => {
            supabase_2.supabase.from.mockImplementation(() => (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Database error')));
            const response = await (0, supertest_1.default)(app)
                .get('/api/proposals/my')
                .expect(500);
            expect(response.body.error).toBe('Failed to fetch proposals');
        });
    });
    // ============================================
    // approveProposal
    // ============================================
    describe('approveProposal', () => {
        it('should approve proposal and apply changes', async () => {
            let callCount = 0;
            supabase_2.supabase.from.mockImplementation((table) => {
                callCount++;
                if (callCount === 1 && table === 'edit_proposals') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockProposal));
                }
                if (callCount === 2 && table === 'employees') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)); // update entity
                }
                if (callCount === 3 && table === 'edit_proposals') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)); // update status
                }
                if (callCount === 4 && table === 'employees') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ name: 'Test Employee' }));
                }
                return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null));
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/proposals/proposal-123/approve')
                .send({ moderator_notes: 'Looks good' })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Proposal approved and changes applied');
            expect(notificationHelper_1.notifyEditProposalApproved).toHaveBeenCalled();
        });
        it('should return 401 if not authenticated', async () => {
            const noAuthApp = (0, express_1.default)();
            noAuthApp.use(express_1.default.json());
            noAuthApp.post('/api/proposals/:id/approve', editProposalController_1.approveProposal);
            const response = await (0, supertest_1.default)(noAuthApp)
                .post('/api/proposals/proposal-123/approve')
                .expect(401);
            expect(response.body.error).toBe('Unauthorized');
        });
        it('should return 404 if proposal not found', async () => {
            supabase_2.supabase.from.mockImplementation(() => (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()));
            const response = await (0, supertest_1.default)(app)
                .post('/api/proposals/non-existent/approve')
                .expect(404);
            expect(response.body.error).toBe('Proposal not found');
        });
        it('should return 400 if proposal already reviewed', async () => {
            const approvedProposal = { ...mockProposal, status: 'approved' };
            supabase_2.supabase.from.mockImplementation(() => (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(approvedProposal)));
            const response = await (0, supertest_1.default)(app)
                .post('/api/proposals/proposal-123/approve')
                .expect(400);
            expect(response.body.error).toBe('Proposal already reviewed');
        });
        it('should return 500 if entity update fails', async () => {
            let callCount = 0;
            supabase_2.supabase.from.mockImplementation((table) => {
                callCount++;
                if (callCount === 1 && table === 'edit_proposals') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockProposal));
                }
                return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Update failed'));
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/proposals/proposal-123/approve')
                .expect(500);
            expect(response.body.error).toBe('Failed to apply changes');
        });
        it('should return 500 if proposal status update fails', async () => {
            let callCount = 0;
            supabase_2.supabase.from.mockImplementation((table) => {
                callCount++;
                if (callCount === 1 && table === 'edit_proposals') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockProposal));
                }
                if (callCount === 2 && table === 'employees') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null));
                }
                return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Status update failed'));
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/proposals/proposal-123/approve')
                .expect(500);
            expect(response.body.error).toBe('Failed to update proposal status');
        });
    });
    // ============================================
    // rejectProposal
    // ============================================
    describe('rejectProposal', () => {
        it('should reject proposal successfully', async () => {
            let callCount = 0;
            supabase_2.supabase.from.mockImplementation((table) => {
                callCount++;
                if (callCount === 1 && table === 'edit_proposals') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockProposal));
                }
                if (callCount === 2 && table === 'edit_proposals') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null));
                }
                if (callCount === 3 && table === 'employees') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ name: 'Test Employee' }));
                }
                return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null));
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/proposals/proposal-123/reject')
                .send({ moderator_notes: 'Not appropriate' })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Proposal rejected');
            expect(notificationHelper_1.notifyEditProposalRejected).toHaveBeenCalled();
        });
        it('should return 401 if not authenticated', async () => {
            const noAuthApp = (0, express_1.default)();
            noAuthApp.use(express_1.default.json());
            noAuthApp.post('/api/proposals/:id/reject', editProposalController_1.rejectProposal);
            const response = await (0, supertest_1.default)(noAuthApp)
                .post('/api/proposals/proposal-123/reject')
                .expect(401);
            expect(response.body.error).toBe('Unauthorized');
        });
        it('should return 404 if proposal not found', async () => {
            supabase_2.supabase.from.mockImplementation(() => (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()));
            const response = await (0, supertest_1.default)(app)
                .post('/api/proposals/non-existent/reject')
                .expect(404);
            expect(response.body.error).toBe('Proposal not found');
        });
        it('should return 400 if proposal already reviewed', async () => {
            const rejectedProposal = { ...mockProposal, status: 'rejected' };
            supabase_2.supabase.from.mockImplementation(() => (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(rejectedProposal)));
            const response = await (0, supertest_1.default)(app)
                .post('/api/proposals/proposal-123/reject')
                .expect(400);
            expect(response.body.error).toBe('Proposal already reviewed');
        });
        it('should return 500 on database error', async () => {
            let callCount = 0;
            supabase_2.supabase.from.mockImplementation((table) => {
                callCount++;
                if (callCount === 1 && table === 'edit_proposals') {
                    return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockProposal));
                }
                return (0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Database error'));
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/proposals/proposal-123/reject')
                .expect(500);
            expect(response.body.error).toBe('Failed to reject proposal');
        });
    });
});
//# sourceMappingURL=editProposalController.test.js.map