/**
 * Establishment Owner Controller Tests
 *
 * Tests for establishment ownership management:
 * - getEstablishmentOwners (4 tests)
 * - getMyOwnedEstablishments (3 tests)
 * - assignEstablishmentOwner (9 tests)
 * - removeEstablishmentOwner (4 tests)
 * - updateEstablishmentOwnerPermissions (5 tests)
 *
 * Day 5+ Sprint - Security Testing
 */

import express, { Express } from 'express';
import request from 'supertest';
import {
  getEstablishmentOwners,
  getMyOwnedEstablishments,
  assignEstablishmentOwner,
  removeEstablishmentOwner,
  updateEstablishmentOwnerPermissions
} from '../establishmentOwnerController';
import { supabase } from '../../config/supabase';
import { createMockQueryBuilder, mockSuccess, mockError, mockNotFound } from '../../config/__mocks__/supabase';

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
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../utils/notificationHelper', () => ({
  notifyEstablishmentOwnerAssigned: jest.fn().mockResolvedValue(true),
  notifyEstablishmentOwnerRemoved: jest.fn().mockResolvedValue(true),
  notifyEstablishmentOwnerPermissionsUpdated: jest.fn().mockResolvedValue(true)
}));

describe('establishmentOwnerController', () => {
  let app: Express;
  let mockUser: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      id: 'admin-123',
      pseudonym: 'admin',
      email: 'admin@test.com',
      role: 'admin'
    };

    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req: any, _res, next) => {
      req.user = mockUser;
      next();
    });

    // Setup routes
    app.get('/api/admin/establishments/:id/owners', getEstablishmentOwners);
    app.get('/api/establishments/my-owned', getMyOwnedEstablishments);
    app.post('/api/admin/establishments/:id/owners', assignEstablishmentOwner);
    app.delete('/api/admin/establishments/:id/owners/:userId', removeEstablishmentOwner);
    app.patch('/api/admin/establishments/:id/owners/:userId', updateEstablishmentOwnerPermissions);

    (supabase.from as jest.Mock).mockImplementation(() => createMockQueryBuilder());
  });

  describe('getEstablishmentOwners', () => {
    const establishmentId = 'est-123';

    it('should return all owners for an establishment', async () => {
      const mockEstablishment = { id: establishmentId, name: 'Test Bar' };
      const mockOwners = [
        {
          id: 'owner-1',
          user_id: 'user-1',
          establishment_id: establishmentId,
          owner_role: 'owner',
          permissions: { can_edit: true, can_manage_employees: true },
          assigned_by: 'admin-123',
          assigned_at: '2024-01-01T00:00:00Z',
          user: { id: 'user-1', pseudonym: 'owner1', email: 'owner1@test.com', account_type: 'establishment_owner' },
          assigner: { id: 'admin-123', pseudonym: 'admin' }
        }
      ];

      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockQueryBuilder(mockSuccess(mockEstablishment));
        }
        return createMockQueryBuilder(mockSuccess(mockOwners));
      });

      const response = await request(app)
        .get(`/api/admin/establishments/${establishmentId}/owners`);

      expect(response.status).toBe(200);
      expect(response.body.establishment).toEqual({ id: establishmentId, name: 'Test Bar' });
      expect(response.body.owners).toHaveLength(1);
      expect(response.body.owners[0].owner_role).toBe('owner');
    });

    it('should return 404 if establishment not found', async () => {
      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryBuilder(mockNotFound())
      );

      const response = await request(app)
        .get(`/api/admin/establishments/${establishmentId}/owners`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Establishment not found');
    });

    it('should return 500 on database error fetching owners', async () => {
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockQueryBuilder(mockSuccess({ id: establishmentId, name: 'Test Bar' }));
        }
        return createMockQueryBuilder(mockError('Database error'));
      });

      const response = await request(app)
        .get(`/api/admin/establishments/${establishmentId}/owners`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch owners');
    });

    it('should return empty array if no owners', async () => {
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockQueryBuilder(mockSuccess({ id: establishmentId, name: 'Test Bar' }));
        }
        return createMockQueryBuilder(mockSuccess(null));
      });

      const response = await request(app)
        .get(`/api/admin/establishments/${establishmentId}/owners`);

      expect(response.status).toBe(200);
      expect(response.body.owners).toEqual([]);
    });
  });

  describe('getMyOwnedEstablishments', () => {
    beforeEach(() => {
      mockUser = {
        id: 'owner-user-123',
        pseudonym: 'owner',
        email: 'owner@test.com',
        role: 'user'
      };
    });

    it('should return all establishments owned by the user', async () => {
      const mockOwnerships = [
        {
          id: 'ownership-1',
          user_id: 'owner-user-123',
          establishment_id: 'est-1',
          owner_role: 'owner',
          permissions: { can_edit: true },
          assigned_at: '2024-01-01T00:00:00Z',
          establishment: {
            id: 'est-1',
            name: 'My Bar',
            address: '123 Street',
            zone: 'walking-street',
            status: 'active',
            category: { id: 'cat-1', name: 'Bar' }
          }
        },
        {
          id: 'ownership-2',
          user_id: 'owner-user-123',
          establishment_id: 'est-2',
          owner_role: 'manager',
          permissions: { can_edit: true, can_manage_employees: false },
          assigned_at: '2024-02-01T00:00:00Z',
          establishment: {
            id: 'est-2',
            name: 'My Club',
            address: '456 Avenue',
            zone: 'soi-buakhao',
            status: 'active',
            category: { id: 'cat-2', name: 'Club' }
          }
        }
      ];

      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryBuilder(mockSuccess(mockOwnerships))
      );

      const response = await request(app)
        .get('/api/establishments/my-owned');

      expect(response.status).toBe(200);
      expect(response.body.establishments).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.establishments[0].ownership_role).toBe('owner');
      expect(response.body.establishments[1].ownership_role).toBe('manager');
    });

    it('should return empty array if user has no owned establishments', async () => {
      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryBuilder(mockSuccess([]))
      );

      const response = await request(app)
        .get('/api/establishments/my-owned');

      expect(response.status).toBe(200);
      expect(response.body.establishments).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should return 500 on database error', async () => {
      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryBuilder(mockError('Database error'))
      );

      const response = await request(app)
        .get('/api/establishments/my-owned');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch owned establishments');
    });
  });

  describe('assignEstablishmentOwner', () => {
    const establishmentId = 'est-123';
    const targetUserId = 'user-456';

    it('should assign a user as owner successfully', async () => {
      const mockEstablishment = { id: establishmentId, name: 'Test Bar' };
      const mockTargetUser = {
        id: targetUserId,
        pseudonym: 'newowner',
        email: 'newowner@test.com',
        account_type: 'establishment_owner'
      };
      const mockOwnership = {
        id: 'ownership-123',
        user_id: targetUserId,
        establishment_id: establishmentId,
        owner_role: 'owner',
        permissions: { can_edit: true, can_manage_employees: true },
        assigned_by: 'admin-123',
        user: mockTargetUser,
        establishment: mockEstablishment
      };

      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1 && table === 'establishments') {
          return createMockQueryBuilder(mockSuccess(mockEstablishment));
        }
        if (callCount === 2 && table === 'users') {
          return createMockQueryBuilder(mockSuccess(mockTargetUser));
        }
        if (callCount === 3 && table === 'establishment_owners') {
          // Check existing - not found
          return createMockQueryBuilder(mockNotFound());
        }
        if (callCount === 4 && table === 'establishment_owners') {
          // Insert new ownership
          return createMockQueryBuilder(mockSuccess(mockOwnership));
        }
        if (callCount === 5 && table === 'establishment_ownership_requests') {
          // Check pending request - not found
          return createMockQueryBuilder(mockNotFound());
        }
        return createMockQueryBuilder(mockSuccess(null));
      });

      const response = await request(app)
        .post(`/api/admin/establishments/${establishmentId}/owners`)
        .send({ user_id: targetUserId, owner_role: 'owner' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Owner assigned successfully');
      expect(response.body.ownership.user_id).toBe(targetUserId);
    });

    it('should return 400 if user_id is missing', async () => {
      const response = await request(app)
        .post(`/api/admin/establishments/${establishmentId}/owners`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('user_id is required');
    });

    it('should return 404 if establishment not found', async () => {
      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryBuilder(mockNotFound())
      );

      const response = await request(app)
        .post(`/api/admin/establishments/${establishmentId}/owners`)
        .send({ user_id: targetUserId });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Establishment not found');
    });

    it('should return 404 if user not found', async () => {
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockQueryBuilder(mockSuccess({ id: establishmentId, name: 'Test Bar' }));
        }
        return createMockQueryBuilder(mockNotFound());
      });

      const response = await request(app)
        .post(`/api/admin/establishments/${establishmentId}/owners`)
        .send({ user_id: targetUserId });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 if user account_type is not establishment_owner', async () => {
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockQueryBuilder(mockSuccess({ id: establishmentId, name: 'Test Bar' }));
        }
        if (callCount === 2) {
          return createMockQueryBuilder(mockSuccess({
            id: targetUserId,
            pseudonym: 'regularuser',
            account_type: 'regular'
          }));
        }
        return createMockQueryBuilder(mockSuccess(null));
      });

      const response = await request(app)
        .post(`/api/admin/establishments/${establishmentId}/owners`)
        .send({ user_id: targetUserId });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User must have account_type=establishment_owner');
      expect(response.body.current_account_type).toBe('regular');
    });

    it('should return 409 if user is already an owner', async () => {
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockQueryBuilder(mockSuccess({ id: establishmentId, name: 'Test Bar' }));
        }
        if (callCount === 2) {
          return createMockQueryBuilder(mockSuccess({
            id: targetUserId,
            pseudonym: 'owner',
            account_type: 'establishment_owner'
          }));
        }
        if (callCount === 3) {
          // Existing ownership found
          return createMockQueryBuilder(mockSuccess({ id: 'existing-ownership' }));
        }
        return createMockQueryBuilder(mockSuccess(null));
      });

      const response = await request(app)
        .post(`/api/admin/establishments/${establishmentId}/owners`)
        .send({ user_id: targetUserId });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('User is already an owner of this establishment');
    });

    it('should auto-approve pending ownership request when assigning', async () => {
      const mockEstablishment = { id: establishmentId, name: 'Test Bar' };
      const mockTargetUser = {
        id: targetUserId,
        pseudonym: 'newowner',
        email: 'newowner@test.com',
        account_type: 'establishment_owner'
      };
      const mockOwnership = {
        id: 'ownership-123',
        user_id: targetUserId,
        establishment_id: establishmentId,
        owner_role: 'owner',
        user: mockTargetUser,
        establishment: mockEstablishment
      };
      const mockPendingRequest = { id: 'request-123', status: 'pending' };

      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) return createMockQueryBuilder(mockSuccess(mockEstablishment));
        if (callCount === 2) return createMockQueryBuilder(mockSuccess(mockTargetUser));
        if (callCount === 3) return createMockQueryBuilder(mockNotFound()); // No existing ownership
        if (callCount === 4) return createMockQueryBuilder(mockSuccess(mockOwnership)); // Insert
        if (callCount === 5) return createMockQueryBuilder(mockSuccess(mockPendingRequest)); // Pending request found
        if (callCount === 6) return createMockQueryBuilder(mockSuccess(null)); // Update request
        return createMockQueryBuilder(mockSuccess(null));
      });

      const response = await request(app)
        .post(`/api/admin/establishments/${establishmentId}/owners`)
        .send({ user_id: targetUserId });

      expect(response.status).toBe(201);
      expect(supabase.from).toHaveBeenCalledWith('establishment_ownership_requests');
    });

    it('should return 500 on insert error', async () => {
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockQueryBuilder(mockSuccess({ id: establishmentId, name: 'Test Bar' }));
        }
        if (callCount === 2) {
          return createMockQueryBuilder(mockSuccess({
            id: targetUserId,
            pseudonym: 'owner',
            account_type: 'establishment_owner'
          }));
        }
        if (callCount === 3) {
          return createMockQueryBuilder(mockNotFound()); // No existing
        }
        if (callCount === 4) {
          return createMockQueryBuilder(mockError('Insert failed'));
        }
        return createMockQueryBuilder(mockSuccess(null));
      });

      const response = await request(app)
        .post(`/api/admin/establishments/${establishmentId}/owners`)
        .send({ user_id: targetUserId });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to assign owner');
    });

    it('should use default owner_role if not provided', async () => {
      const mockEstablishment = { id: establishmentId, name: 'Test Bar' };
      const mockTargetUser = {
        id: targetUserId,
        pseudonym: 'newowner',
        account_type: 'establishment_owner'
      };
      const mockOwnership = {
        id: 'ownership-123',
        user_id: targetUserId,
        owner_role: 'owner', // Default
        user: mockTargetUser,
        establishment: mockEstablishment
      };

      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockQueryBuilder(mockSuccess(mockEstablishment));
        if (callCount === 2) return createMockQueryBuilder(mockSuccess(mockTargetUser));
        if (callCount === 3) return createMockQueryBuilder(mockNotFound());
        if (callCount === 4) return createMockQueryBuilder(mockSuccess(mockOwnership));
        if (callCount === 5) return createMockQueryBuilder(mockNotFound());
        return createMockQueryBuilder(mockSuccess(null));
      });

      const response = await request(app)
        .post(`/api/admin/establishments/${establishmentId}/owners`)
        .send({ user_id: targetUserId }); // No owner_role

      expect(response.status).toBe(201);
      expect(response.body.ownership.owner_role).toBe('owner');
    });
  });

  describe('removeEstablishmentOwner', () => {
    const establishmentId = 'est-123';
    const userId = 'user-456';

    it('should remove owner successfully', async () => {
      const mockOwnership = {
        id: 'ownership-123',
        user: { pseudonym: 'removedowner' },
        establishment: { name: 'Test Bar' }
      };

      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockQueryBuilder(mockSuccess(mockOwnership));
        }
        return createMockQueryBuilder(mockSuccess(null));
      });

      const response = await request(app)
        .delete(`/api/admin/establishments/${establishmentId}/owners/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Owner removed successfully');
    });

    it('should return 404 if ownership not found', async () => {
      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryBuilder(mockNotFound())
      );

      const response = await request(app)
        .delete(`/api/admin/establishments/${establishmentId}/owners/${userId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Ownership record not found');
    });

    it('should return 500 on delete error', async () => {
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockQueryBuilder(mockSuccess({
            id: 'ownership-123',
            user: { pseudonym: 'owner' },
            establishment: { name: 'Bar' }
          }));
        }
        return createMockQueryBuilder(mockError('Delete failed'));
      });

      const response = await request(app)
        .delete(`/api/admin/establishments/${establishmentId}/owners/${userId}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to remove owner');
    });

    it('should notify user when removed', async () => {
      const { notifyEstablishmentOwnerRemoved } = require('../../utils/notificationHelper');

      const mockOwnership = {
        id: 'ownership-123',
        user: { pseudonym: 'removedowner' },
        establishment: { name: 'Test Bar' }
      };

      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockQueryBuilder(mockSuccess(mockOwnership));
        }
        return createMockQueryBuilder(mockSuccess(null));
      });

      await request(app)
        .delete(`/api/admin/establishments/${establishmentId}/owners/${userId}`);

      expect(notifyEstablishmentOwnerRemoved).toHaveBeenCalledWith(
        userId,
        'Test Bar',
        establishmentId
      );
    });
  });

  describe('updateEstablishmentOwnerPermissions', () => {
    const establishmentId = 'est-123';
    const userId = 'user-456';

    it('should update permissions successfully', async () => {
      const newPermissions = { can_edit: true, can_manage_employees: true, can_view_analytics: true };
      const mockUpdated = {
        id: 'ownership-123',
        user_id: userId,
        establishment_id: establishmentId,
        owner_role: 'owner',
        permissions: newPermissions,
        user: { id: userId, pseudonym: 'owner', email: 'owner@test.com' },
        establishment: { id: establishmentId, name: 'Test Bar' }
      };

      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockQueryBuilder(mockSuccess({ id: 'ownership-123' }));
        }
        return createMockQueryBuilder(mockSuccess(mockUpdated));
      });

      const response = await request(app)
        .patch(`/api/admin/establishments/${establishmentId}/owners/${userId}`)
        .send({ permissions: newPermissions });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Permissions updated successfully');
      expect(response.body.ownership.permissions).toEqual(newPermissions);
    });

    it('should update owner_role successfully', async () => {
      const mockUpdated = {
        id: 'ownership-123',
        user_id: userId,
        owner_role: 'manager',
        user: { id: userId, pseudonym: 'owner' },
        establishment: { id: establishmentId, name: 'Test Bar' }
      };

      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockQueryBuilder(mockSuccess({ id: 'ownership-123' }));
        }
        return createMockQueryBuilder(mockSuccess(mockUpdated));
      });

      const response = await request(app)
        .patch(`/api/admin/establishments/${establishmentId}/owners/${userId}`)
        .send({ owner_role: 'manager' });

      expect(response.status).toBe(200);
      expect(response.body.ownership.owner_role).toBe('manager');
    });

    it('should return 400 if neither permissions nor owner_role provided', async () => {
      const response = await request(app)
        .patch(`/api/admin/establishments/${establishmentId}/owners/${userId}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('permissions or owner_role is required');
    });

    it('should return 404 if ownership not found', async () => {
      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryBuilder(mockNotFound())
      );

      const response = await request(app)
        .patch(`/api/admin/establishments/${establishmentId}/owners/${userId}`)
        .send({ permissions: { can_edit: true } });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Ownership record not found');
    });

    it('should return 500 on update error', async () => {
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockQueryBuilder(mockSuccess({ id: 'ownership-123' }));
        }
        return createMockQueryBuilder(mockError('Update failed'));
      });

      const response = await request(app)
        .patch(`/api/admin/establishments/${establishmentId}/owners/${userId}`)
        .send({ permissions: { can_edit: true } });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to update permissions');
    });
  });
});
