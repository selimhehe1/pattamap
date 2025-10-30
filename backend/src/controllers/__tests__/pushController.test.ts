/**
 * Push Controller Tests
 * Tests for push notification subscription endpoints
 */

import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as pushController from '../pushController';
import { supabase } from '../../config/supabase';
import * as pushService from '../../services/pushService';

// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../services/pushService');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Helper to create mock request
const createMockRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest => {
  return {
    user: { id: 'user-123', email: 'test@example.com' },
    headers: { 'user-agent': 'Test Browser' },
    body: {},
    ...overrides
  } as AuthRequest;
};

// Helper to create mock response
const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Push Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPublicKey', () => {
    test('returns VAPID public key when push is configured', async () => {
      (pushService.isPushConfigured as jest.Mock).mockReturnValue(true);
      (pushService.getVapidPublicKey as jest.Mock).mockReturnValue('test-vapid-key');

      const req = createMockRequest();
      const res = createMockResponse();

      await pushController.getPublicKey(req, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        publicKey: 'test-vapid-key'
      });
    });

    test('returns 503 when push is not configured', async () => {
      (pushService.isPushConfigured as jest.Mock).mockReturnValue(false);

      const req = createMockRequest();
      const res = createMockResponse();

      await pushController.getPublicKey(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Push notifications not configured on server'
      });
    });

    test('handles errors gracefully', async () => {
      (pushService.isPushConfigured as jest.Mock).mockImplementation(() => {
        throw new Error('Config error');
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await pushController.getPublicKey(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('subscribe', () => {
    const validSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
      keys: {
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key'
      }
    };

    test('creates new subscription successfully', async () => {
      const req = createMockRequest({
        body: { subscription: validSubscription }
      });
      const res = createMockResponse();

      // Mock no existing subscription
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        }),
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      await pushController.subscribe(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Push subscription created successfully',
        subscribed: true
      });
    });

    test('updates existing subscription', async () => {
      const req = createMockRequest({
        body: { subscription: validSubscription }
      });
      const res = createMockResponse();

      // Mock existing subscription
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-sub-id' },
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      });

      await pushController.subscribe(req, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Push subscription updated successfully',
        subscribed: true
      });
    });

    test('returns 401 when user is not authenticated', async () => {
      const req = createMockRequest({ user: undefined });
      const res = createMockResponse();

      await pushController.subscribe(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    test('returns 400 when subscription object is missing', async () => {
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();

      await pushController.subscribe(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid subscription object. Must include endpoint and keys.'
      });
    });

    test('returns 400 when subscription endpoint is missing', async () => {
      const req = createMockRequest({
        body: {
          subscription: {
            keys: { p256dh: 'key', auth: 'key' }
          }
        }
      });
      const res = createMockResponse();

      await pushController.subscribe(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid subscription object. Must include endpoint and keys.'
      });
    });

    test('returns 400 when subscription keys are missing', async () => {
      const req = createMockRequest({
        body: {
          subscription: {
            endpoint: 'https://test.com'
          }
        }
      });
      const res = createMockResponse();

      await pushController.subscribe(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid subscription object. Must include endpoint and keys.'
      });
    });

    test('returns 400 when p256dh key is missing', async () => {
      const req = createMockRequest({
        body: {
          subscription: {
            endpoint: 'https://test.com',
            keys: { auth: 'key' }
          }
        }
      });
      const res = createMockResponse();

      await pushController.subscribe(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid subscription keys. Must include p256dh and auth.'
      });
    });

    test('returns 400 when auth key is missing', async () => {
      const req = createMockRequest({
        body: {
          subscription: {
            endpoint: 'https://test.com',
            keys: { p256dh: 'key' }
          }
        }
      });
      const res = createMockResponse();

      await pushController.subscribe(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid subscription keys. Must include p256dh and auth.'
      });
    });

    test('handles database insert error', async () => {
      const req = createMockRequest({
        body: { subscription: validSubscription }
      });
      const res = createMockResponse();

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        }),
        insert: jest.fn().mockResolvedValue({
          error: { message: 'Database insert error' }
        })
      });

      await pushController.subscribe(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database insert error' });
    });

    test('handles database update error', async () => {
      const req = createMockRequest({
        body: { subscription: validSubscription }
      });
      const res = createMockResponse();

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-sub-id' },
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { message: 'Database update error' }
          })
        })
      });

      await pushController.subscribe(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database update error' });
    });

    test('handles unexpected errors', async () => {
      const req = createMockRequest({
        body: { subscription: validSubscription }
      });
      const res = createMockResponse();

      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await pushController.subscribe(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('unsubscribe', () => {
    test('unsubscribes successfully', async () => {
      const req = createMockRequest({
        body: { endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint' }
      });
      const res = createMockResponse();

      (supabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        })
      });

      await pushController.unsubscribe(req, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Push subscription removed successfully',
        subscribed: false
      });
    });

    test('returns 401 when user is not authenticated', async () => {
      const req = createMockRequest({ user: undefined });
      const res = createMockResponse();

      await pushController.unsubscribe(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    test('returns 400 when endpoint is missing', async () => {
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();

      await pushController.unsubscribe(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Endpoint is required' });
    });

    test('handles database delete error', async () => {
      const req = createMockRequest({
        body: { endpoint: 'https://test.com' }
      });
      const res = createMockResponse();

      (supabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: { message: 'Database delete error' }
            })
          })
        })
      });

      await pushController.unsubscribe(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database delete error' });
    });

    test('handles unexpected errors', async () => {
      const req = createMockRequest({
        body: { endpoint: 'https://test.com' }
      });
      const res = createMockResponse();

      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await pushController.unsubscribe(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('getUserSubscriptions', () => {
    test('returns user subscriptions successfully', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/long-endpoint-1',
          user_agent: 'Chrome',
          created_at: '2025-01-01',
          last_used_at: '2025-01-15'
        },
        {
          id: 'sub-2',
          endpoint: 'https://fcm.googleapis.com/fcm/send/long-endpoint-2',
          user_agent: 'Firefox',
          created_at: '2025-01-05',
          last_used_at: '2025-01-14'
        }
      ];

      const req = createMockRequest();
      const res = createMockResponse();

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockSubscriptions,
              error: null
            })
          })
        })
      });

      await pushController.getUserSubscriptions(req, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        subscriptions: expect.arrayContaining([
          expect.objectContaining({
            id: 'sub-1',
            endpoint: expect.stringContaining('...')
          })
        ]),
        count: 2
      });

      // Verify endpoints are truncated
      const call = (res.json as jest.Mock).mock.calls[0][0];
      expect(call.subscriptions[0].endpoint).toHaveLength(53); // 50 chars + '...'
    });

    test('returns empty array when user has no subscriptions', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });

      await pushController.getUserSubscriptions(req, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        subscriptions: [],
        count: 0
      });
    });

    test('returns 401 when user is not authenticated', async () => {
      const req = createMockRequest({ user: undefined });
      const res = createMockResponse();

      await pushController.getUserSubscriptions(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    test('handles database query error', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database query error' }
            })
          })
        })
      });

      await pushController.getUserSubscriptions(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database query error' });
    });

    test('handles unexpected errors', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await pushController.getUserSubscriptions(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('getPushStatus', () => {
    test('returns status when push is configured and user is subscribed', async () => {
      (pushService.isPushConfigured as jest.Mock).mockReturnValue(true);

      const req = createMockRequest();
      const res = createMockResponse();

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 2
          })
        })
      });

      await pushController.getPushStatus(req, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        configured: true,
        subscribed: true,
        subscriptionCount: 2
      });
    });

    test('returns status when push is configured but user has no subscriptions', async () => {
      (pushService.isPushConfigured as jest.Mock).mockReturnValue(true);

      const req = createMockRequest();
      const res = createMockResponse();

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 0
          })
        })
      });

      await pushController.getPushStatus(req, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        configured: true,
        subscribed: false,
        subscriptionCount: 0
      });
    });

    test('returns unconfigured status when push is not configured', async () => {
      (pushService.isPushConfigured as jest.Mock).mockReturnValue(false);

      const req = createMockRequest();
      const res = createMockResponse();

      await pushController.getPushStatus(req, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        configured: false,
        subscribed: false,
        subscriptionCount: 0
      });
    });

    test('returns 401 when user is not authenticated', async () => {
      const req = createMockRequest({ user: undefined });
      const res = createMockResponse();

      await pushController.getPushStatus(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    test('handles unexpected errors', async () => {
      (pushService.isPushConfigured as jest.Mock).mockReturnValue(true);

      const req = createMockRequest();
      const res = createMockResponse();

      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await pushController.getPushStatus(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});
