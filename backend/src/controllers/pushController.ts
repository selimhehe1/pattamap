import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getVapidPublicKey, isPushConfigured } from '../services/pushService';

/**
 * Get VAPID public key
 * Public endpoint - needed for frontend to subscribe to push
 * GET /api/push/vapid-public-key
 */
export const getPublicKey = async (req: AuthRequest, res: Response) => {
  try {
    if (!isPushConfigured()) {
      return res.status(503).json({
        error: 'Push notifications not configured on server'
      });
    }

    res.json({
      publicKey: getVapidPublicKey()
    });
  } catch (error) {
    logger.error('Get VAPID public key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Subscribe to push notifications
 * Creates a new push subscription for the authenticated user
 * POST /api/push/subscribe
 * Body: { subscription: PushSubscription }
 */
export const subscribe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { subscription } = req.body;

    // Validate subscription object
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        error: 'Invalid subscription object. Must include endpoint and keys.'
      });
    }

    if (!subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({
        error: 'Invalid subscription keys. Must include p256dh and auth.'
      });
    }

    // Extract user agent for debugging
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Check if subscription already exists (update instead of insert)
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .single();

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
        return res.status(400).json({ error: updateError.message });
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
      return res.status(400).json({ error: insertError.message });
    }

    logger.info('Push subscription created', {
      userId: req.user.id,
      endpoint: subscription.endpoint.substring(0, 50) + '...'
    });

    res.status(201).json({
      message: 'Push subscription created successfully',
      subscribed: true
    });
  } catch (error) {
    logger.error('Subscribe to push error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Unsubscribe from push notifications
 * Removes a push subscription for the authenticated user
 * POST /api/push/unsubscribe
 * Body: { endpoint: string }
 */
export const unsubscribe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    // Delete subscription (RLS policy ensures user can only delete their own)
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', req.user.id);

    if (error) {
      logger.error('Unsubscribe from push error:', error);
      return res.status(400).json({ error: error.message });
    }

    logger.info('Push subscription removed', {
      userId: req.user.id,
      endpoint: endpoint.substring(0, 50) + '...'
    });

    res.json({
      message: 'Push subscription removed successfully',
      subscribed: false
    });
  } catch (error) {
    logger.error('Unsubscribe from push error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user's push subscriptions
 * Returns all active push subscriptions for the authenticated user
 * GET /api/push/subscriptions
 */
export const getUserSubscriptions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, user_agent, created_at, last_used_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Get user subscriptions error:', error);
      return res.status(400).json({ error: error.message });
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
  } catch (error) {
    logger.error('Get user subscriptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Check if push is supported and user is subscribed
 * GET /api/push/status
 */
export const getPushStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
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
  } catch (error) {
    logger.error('Get push status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
