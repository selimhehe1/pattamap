import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getVapidPublicKey, isPushConfigured } from '../services/pushService';
import { asyncHandler, UnauthorizedError, BadRequestError } from '../middleware/asyncHandler';

/**
 * Get VAPID public key
 * Public endpoint - needed for frontend to subscribe to push
 * GET /api/push/vapid-public-key
 */
export const getPublicKey = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!isPushConfigured()) {
    return res.status(503).json({
      error: 'Push notifications not configured on server'
    });
  }

  res.json({
    publicKey: getVapidPublicKey()
  });
});

/**
 * Subscribe to push notifications
 * Creates a new push subscription for the authenticated user
 * POST /api/push/subscribe
 * Body: { subscription: PushSubscription }
 */
export const subscribe = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw UnauthorizedError('Authentication required');
  }

  const { subscription } = req.body;

  // Validate subscription object
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    throw BadRequestError('Invalid subscription object. Must include endpoint and keys.');
  }

  if (!subscription.keys.p256dh || !subscription.keys.auth) {
    throw BadRequestError('Invalid subscription keys. Must include p256dh and auth.');
  }

  // Extract user agent for debugging
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Check if subscription already exists (update instead of insert)
  const { data: existing } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('endpoint', subscription.endpoint)
    .single();

  // 🔧 FIX N5: Check subscription count limit (max 10 per user)
  const MAX_SUBSCRIPTIONS_PER_USER = 10;
  if (!existing) {
    const { count: subscriptionCount } = await supabase
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if ((subscriptionCount || 0) >= MAX_SUBSCRIPTIONS_PER_USER) {
      logger.warn('Push subscription limit reached', {
        userId: req.user.id,
        currentCount: subscriptionCount,
        limit: MAX_SUBSCRIPTIONS_PER_USER
      });
      throw BadRequestError(`Maximum ${MAX_SUBSCRIPTIONS_PER_USER} push subscriptions allowed. Please remove an old subscription first.`);
    }
  }

  if (existing) {
    // Update existing subscription (in case user_id changed)
    const { error: updateError } = await supabase
      .from('push_subscriptions')
      .update({
        user_id: req.user.id,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        user_agent: userAgent,
        last_used_at: new Date().toISOString()
      })
      .eq('endpoint', subscription.endpoint);

    if (updateError) {
      logger.error('Update push subscription error:', updateError);
      throw BadRequestError(updateError.message);
    }

    logger.info('Push subscription updated', {
      userId: req.user.id,
      endpoint: subscription.endpoint.substring(0, 50) + '...'
    });

    return res.json({
      message: 'Push subscription updated successfully',
      subscribed: true
    });
  }

  // Insert new subscription
  const { error: insertError } = await supabase
    .from('push_subscriptions')
    .insert({
      user_id: req.user.id,
      endpoint: subscription.endpoint,
      p256dh_key: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
      user_agent: userAgent
    });

  if (insertError) {
    logger.error('Insert push subscription error:', insertError);
    throw BadRequestError(insertError.message);
  }

  logger.info('Push subscription created', {
    userId: req.user.id,
    endpoint: subscription.endpoint.substring(0, 50) + '...'
  });

  res.status(201).json({
    message: 'Push subscription created successfully',
    subscribed: true
  });
});

/**
 * Unsubscribe from push notifications
 * Removes a push subscription for the authenticated user
 * POST /api/push/unsubscribe
 * Body: { endpoint: string }
 */
export const unsubscribe = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw UnauthorizedError('Authentication required');
  }

  const { endpoint } = req.body;

  if (!endpoint) {
    throw BadRequestError('Endpoint is required');
  }

  // Delete subscription (RLS policy ensures user can only delete their own)
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', req.user.id);

  if (error) {
    logger.error('Unsubscribe from push error:', error);
    throw BadRequestError(error.message);
  }

  logger.info('Push subscription removed', {
    userId: req.user.id,
    endpoint: endpoint.substring(0, 50) + '...'
  });

  res.json({
    message: 'Push subscription removed successfully',
    subscribed: false
  });
});

/**
 * Get user's push subscriptions
 * Returns all active push subscriptions for the authenticated user
 * GET /api/push/subscriptions
 */
export const getUserSubscriptions = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw UnauthorizedError('Authentication required');
  }

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, user_agent, created_at, last_used_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Get user subscriptions error:', error);
    throw BadRequestError(error.message);
  }

  // Truncate endpoints for security (only show first 50 chars)
  const sanitizedSubscriptions = (subscriptions || []).map(sub => ({
    ...sub,
    endpoint: sub.endpoint.substring(0, 50) + '...'
  }));

  res.json({
    subscriptions: sanitizedSubscriptions,
    count: subscriptions?.length || 0
  });
});

/**
 * Check if push is supported and user is subscribed
 * GET /api/push/status
 */
export const getPushStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw UnauthorizedError('Authentication required');
  }

  const configured = isPushConfigured();

  if (!configured) {
    return res.json({
      configured: false,
      subscribed: false,
      subscriptionCount: 0
    });
  }

  // Check if user has any subscriptions
  const { count } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', req.user.id);

  res.json({
    configured: true,
    subscribed: (count || 0) > 0,
    subscriptionCount: count || 0
  });
});
