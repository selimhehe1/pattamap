"use strict";
/**
 * 🧪 Ownership Request Controller Tests
 *
 * Tests for establishment ownership claim system
 * - createOwnershipRequest (5/5 tests ✅)
 * - getMyOwnershipRequests (2/2 tests ✅)
 * - getAllOwnershipRequests (2/2 tests ✅)
 * - approveOwnershipRequest (3/3 tests ✅)
 * - rejectOwnershipRequest (3/3 tests ✅)
 * - cancelOwnershipRequest (3/3 tests ✅)
 *
 * CURRENT STATUS: 18/18 tests passing (100%) ✅
 *
 * Day 4 Sprint - Secondary Controllers Testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ownershipRequestController_1 = require("../ownershipRequestController");
// Import mock helpers
const supabase_1 = require("../../config/__mocks__/supabase");
// Mock dependencies with explicit factory for supabase
jest.mock('../../config/supabase', () => {
    const mockModule = jest.requireActual('../../config/__mocks__/supabase');
    return {
        supabase: mockModule.supabase,
        supabaseClient: mockModule.supabaseClient,
        createMockQueryBuilder: mockModule.createMockQueryBuilder,
        mockSuccess: mockModule.mockSuccess,
        mockNotFound: mockModule.mockNotFound,
        mockError: mockModule.mockError,
    };
});
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');
jest.mock('../../utils/notificationHelper', () => ({
    notifyAdminsNewOwnershipRequest: jest.fn(),
    notifyOwnerRequestStatusChange: jest.fn(),
    notifyOwnershipRequestSubmitted: jest.fn()
}));
// Import supabase AFTER jest.mock
const supabase_2 = require("../../config/supabase");
describe('OwnershipRequestController', () => {
    let mockRequest;
    let mockResponse;
    let jsonMock;
    let statusMock;
    beforeEach(() => {
        jest.clearAllMocks();
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockRequest = {
            query: {},
            params: {},
            body: {},
            user: {
                id: 'user-123',
                pseudonym: 'testuser',
                email: 'user@test.com',
                role: 'user',
                is_active: true
            }
        };
        mockResponse = {
            status: statusMock,
            json: jsonMock
        };
        // Reset supabase.from to plain mock
        supabase_2.supabase.from = jest.fn();
    });
    describe('createOwnershipRequest', () => {
        it('should create ownership request successfully for existing establishment', async () => {
            mockRequest.body = {
                establishment_id: 'est-1',
                documents_urls: ['doc1.jpg', 'doc2.pdf'],
                verification_code: 'VERIFY123',
                request_message: 'I am the owner'
            };
            const mockUser = { account_type: 'establishment_owner', pseudonym: 'testuser' };
            const mockEstablishment = { id: 'est-1', name: 'Test Bar' };
            const mockRequest_entity = {
                id: 'req-1',
                user_id: 'user-123',
                establishment_id: 'est-1',
                status: 'pending',
                created_at: new Date().toISOString()
            };
            // Mock queries: 1) get user, 2) get establishment, 3) check ownership, 4) check pending request, 5) insert
            supabase_2.supabase.from
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockUser)))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockEstablishment)))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockRequest_entity)));
            await (0, ownershipRequestController_1.createOwnershipRequest)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({
                message: expect.stringContaining('Ownership request submitted successfully'),
                request: mockRequest_entity,
                isNewEstablishment: false
            });
        });
        it('should return 400 for missing establishment_id and establishment_data', async () => {
            mockRequest.body = {
                documents_urls: ['doc1.jpg']
            };
            await (0, ownershipRequestController_1.createOwnershipRequest)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Either establishment_id or establishment_data is required'
            });
        });
        it('should return 400 for missing documents', async () => {
            mockRequest.body = {
                establishment_id: 'est-1',
                documents_urls: []
            };
            await (0, ownershipRequestController_1.createOwnershipRequest)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'At least one document is required'
            });
        });
        it('should return 403 if user is not establishment_owner', async () => {
            mockRequest.body = {
                establishment_id: 'est-1',
                documents_urls: ['doc1.jpg']
            };
            const mockUser = { account_type: 'user', pseudonym: 'testuser' };
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockUser)));
            await (0, ownershipRequestController_1.createOwnershipRequest)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Only establishment owners can request ownership',
                current_account_type: 'user'
            });
        });
        it('should return 409 if user already has pending request', async () => {
            mockRequest.body = {
                establishment_id: 'est-1',
                documents_urls: ['doc1.jpg']
            };
            const mockUser = { account_type: 'establishment_owner', pseudonym: 'testuser' };
            const mockEstablishment = { id: 'est-1', name: 'Test Bar' };
            const existingRequest = { id: 'req-existing', status: 'pending' };
            supabase_2.supabase.from
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockUser)))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockEstablishment)))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(existingRequest)));
            await (0, ownershipRequestController_1.createOwnershipRequest)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(409);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'You already have a pending request for this establishment'
            });
        });
    });
    describe('getMyOwnershipRequests', () => {
        it('should return user ownership requests', async () => {
            const mockRequests = [
                {
                    id: 'req-1',
                    status: 'pending',
                    documents_urls: '["doc1.jpg"]',
                    establishment: { id: 'est-1', name: 'Test Bar' }
                },
                {
                    id: 'req-2',
                    status: 'approved',
                    documents_urls: '["doc2.jpg"]',
                    establishment: { id: 'est-2', name: 'Another Bar' }
                }
            ];
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockRequests)));
            await (0, ownershipRequestController_1.getMyOwnershipRequests)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                requests: expect.arrayContaining([
                    expect.objectContaining({ id: 'req-1', status: 'pending', documents_urls: ['doc1.jpg'] }),
                    expect.objectContaining({ id: 'req-2', status: 'approved', documents_urls: ['doc2.jpg'] })
                ]),
                total: 2
            });
        });
        it('should return empty array if no requests', async () => {
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])));
            await (0, ownershipRequestController_1.getMyOwnershipRequests)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({ requests: [], total: 0 });
        });
    });
    describe('getAllOwnershipRequests', () => {
        it('should return all ownership requests', async () => {
            const mockRequests = [
                { id: 'req-1', status: 'pending', documents_urls: '["doc1.jpg"]' },
                { id: 'req-2', status: 'pending', documents_urls: '["doc2.jpg"]' }
            ];
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockRequests)));
            await (0, ownershipRequestController_1.getAllOwnershipRequests)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                requests: expect.arrayContaining([
                    expect.objectContaining({ id: 'req-1', documents_urls: ['doc1.jpg'] }),
                    expect.objectContaining({ id: 'req-2', documents_urls: ['doc2.jpg'] })
                ]),
                total: 2
            });
        });
        it('should return empty array if no requests', async () => {
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])));
            await (0, ownershipRequestController_1.getAllOwnershipRequests)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({ requests: [], total: 0 });
        });
    });
    describe('approveOwnershipRequest', () => {
        it('should approve ownership request successfully', async () => {
            mockRequest.params = { id: 'req-1' };
            mockRequest.body = { admin_notes: 'Verified' };
            mockRequest.user.role = 'admin';
            const mockRequest_entity = {
                id: 'req-1',
                user_id: 'user-1',
                establishment_id: 'est-1',
                status: 'pending',
                user: { account_type: 'establishment_owner' },
                establishment: { id: 'est-1', name: 'Test Bar' }
            };
            const updatedRequest = { ...mockRequest_entity, status: 'approved' };
            // Mock queries: 1) get request, 2) check existing ownership, 3) insert ownership, 4) update request
            supabase_2.supabase.from
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockRequest_entity)))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'own-1' })))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(updatedRequest)));
            await (0, ownershipRequestController_1.approveOwnershipRequest)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Ownership request approved successfully',
                request: updatedRequest
            });
        });
        it('should return 404 if request not found', async () => {
            mockRequest.params = { id: 'non-existent' };
            mockRequest.user.role = 'admin';
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()));
            await (0, ownershipRequestController_1.approveOwnershipRequest)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Ownership request not found' });
        });
        it('should return 400 if request already processed', async () => {
            mockRequest.params = { id: 'req-1' };
            mockRequest.user.role = 'admin';
            const mockRequest_entity = {
                id: 'req-1',
                status: 'approved',
                user: { account_type: 'establishment_owner' }
            };
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockRequest_entity)));
            await (0, ownershipRequestController_1.approveOwnershipRequest)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Request has already been approved',
                current_status: 'approved'
            });
        });
    });
    describe('rejectOwnershipRequest', () => {
        it('should reject ownership request successfully', async () => {
            mockRequest.params = { id: 'req-1' };
            mockRequest.body = { admin_notes: 'Insufficient proof' };
            mockRequest.user.role = 'admin';
            const mockRequest_entity = {
                id: 'req-1',
                user_id: 'user-1',
                establishment_id: 'est-1',
                status: 'pending',
                establishment: { name: 'Test Bar' }
            };
            const rejectedRequest = { ...mockRequest_entity, status: 'rejected' };
            // Mock queries: 1) get request, 2) update request
            supabase_2.supabase.from
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockRequest_entity)))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(rejectedRequest)));
            await (0, ownershipRequestController_1.rejectOwnershipRequest)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Ownership request rejected',
                request: rejectedRequest
            });
        });
        it('should return 400 if admin_notes missing', async () => {
            mockRequest.params = { id: 'req-1' };
            mockRequest.body = { admin_notes: '' };
            mockRequest.user.role = 'admin';
            await (0, ownershipRequestController_1.rejectOwnershipRequest)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'admin_notes is required when rejecting a request'
            });
        });
        it('should return 404 if request not found', async () => {
            mockRequest.params = { id: 'non-existent' };
            mockRequest.body = { admin_notes: 'Invalid' };
            mockRequest.user.role = 'admin';
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()));
            await (0, ownershipRequestController_1.rejectOwnershipRequest)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Ownership request not found' });
        });
    });
    describe('cancelOwnershipRequest', () => {
        it('should cancel ownership request successfully', async () => {
            mockRequest.params = { id: 'req-1' };
            const mockRequest_entity = {
                id: 'req-1',
                user_id: 'user-123',
                status: 'pending',
                establishment: { name: 'Test Bar' }
            };
            // Mock queries: 1) get request, 2) delete request
            supabase_2.supabase.from
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockRequest_entity)))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            await (0, ownershipRequestController_1.cancelOwnershipRequest)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Ownership request cancelled successfully'
            });
        });
        it('should return 404 if request not found', async () => {
            mockRequest.params = { id: 'non-existent' };
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()));
            await (0, ownershipRequestController_1.cancelOwnershipRequest)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Ownership request not found' });
        });
        it('should return 403 if user tries to cancel another user request', async () => {
            mockRequest.params = { id: 'req-1' };
            const mockRequest_entity = {
                id: 'req-1',
                user_id: 'other-user',
                status: 'pending'
            };
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockRequest_entity)));
            await (0, ownershipRequestController_1.cancelOwnershipRequest)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'You can only cancel your own requests'
            });
        });
    });
});
//# sourceMappingURL=ownershipRequestController.test.js.map