/**
 * VIP Subscription Controller
 *
 * Handles VIP subscription management (view and cancel).
 */

import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { asyncHandler, BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError, InternalServerError } from '../../middleware/asyncHandler';
import { isValidSubscriptionType } from '../../config/vipPricing';
import { getVIPTableName, getEntityColumn } from '../../utils/vipHelpers';
import { notifyVIPSubscriptionCancelled } from '../../utils/notificationHelper';

/**
 * GET /api/vip/my-subscriptions
 * Returns all VIP subscriptions for the authenticated user's entities
 */
export const getMyVIPSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw UnauthorizedError('Unauthorized');
  }

  // Get all employee VIP subscriptions for user's establishments
  const { data: employeeSubscriptions } = await supabase
    .from('employee_vip_subscriptions')
    .select(`
      *,
      employees:employee_id (
        id,
        name,
        nickname
      )
    `)
    .eq('employees.current_employment.establishment_owners.user_id', userId);

  // Get all establishment VIP subscriptions for user's establishments
  const { data: establishmentSubscriptions } = await supabase
    .from('establishment_vip_subscriptions')
    .select(`
      *,
      establishments:establishment_id (
        id,
        name
      )
    `)
    .eq('establishments.establishment_owners.user_id', userId);

  res.status(200).json({
    success: true,
    subscriptions: {
      employees: employeeSubscriptions || [],
      establishments: establishmentSubscriptions || [],
    },
  });
});

/**
 * PATCH /api/vip/subscriptions/:id/cancel
 * Cancels an active VIP subscription
 */
export const cancelVIPSubscription = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw UnauthorizedError('Unauthorized');
  }

  const { id } = req.params;
  const { subscription_type } = req.body;

  // Validate subscription type
  if (!isValidSubscriptionType(subscription_type)) {
    throw BadRequestError('Invalid subscription type. subscription_type must be "employee" or "establishment"');
  }

  const tableName = getVIPTableName(subscription_type);

  // Check if subscription exists and user has permission
  const { data: subscription, error: fetchError } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !subscription) {
    throw NotFoundError('Subscription not found');
  }

  // Verify user has permission (must be establishment owner)
  const entityColumn = getEntityColumn(subscription_type);
  const entityId = subscription[entityColumn];

  let hasPermission = false;

  if (subscription_type === 'employee') {
    const { data: ownership } = await supabase
      .from('establishment_owners')
      .select('id')
      .eq('user_id', userId)
      .eq('current_employment.employee_id', entityId)
      .eq('current_employment.is_current', true)
      .single();

    hasPermission = !!ownership;
  } else {
    const { data: ownership } = await supabase
      .from('establishment_owners')
      .select('id')
      .eq('user_id', userId)
      .eq('establishment_id', entityId)
      .single();

    hasPermission = !!ownership;
  }

  if (!hasPermission) {
    throw ForbiddenError('You do not have permission to cancel this subscription');
  }

  // Check if subscription is active
  if (subscription.status !== 'active') {
    throw BadRequestError(`Subscription is already ${subscription.status}`);
  }

  // Cancel the subscription
  const { data: updatedSubscription, error: updateError } = await supabase
    .from(tableName)
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError || !updatedSubscription) {
    throw InternalServerError('Failed to cancel subscription');
  }

  // Notify user of subscription cancellation
  await notifyVIPSubscriptionCancelled(
    userId,
    subscription.tier,
    'Cancelled by establishment owner'
  );

  res.status(200).json({
    success: true,
    message: 'VIP subscription cancelled successfully',
    subscription: updatedSubscription,
  });
});
