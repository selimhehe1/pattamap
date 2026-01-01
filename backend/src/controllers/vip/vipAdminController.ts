/**
 * VIP Admin Controller
 *
 * Admin-only endpoints for VIP payment verification and management.
 */

import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { asyncHandler, BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError, InternalServerError } from '../../middleware/asyncHandler';
import { getVIPTableName } from '../../utils/vipHelpers';
import {
  notifyVIPPaymentVerified,
  notifyVIPPaymentRejected
} from '../../utils/notificationHelper';

/**
 * POST /api/admin/vip/verify-payment/:transactionId
 * Admin verifies a cash payment and activates subscription
 */
export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    throw UnauthorizedError('Unauthorized');
  }

  // Check if user is admin
  const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();

  if (!user || user.role !== 'admin') {
    throw ForbiddenError('Only admins can verify payments');
  }

  const { transactionId } = req.params;
  const { admin_notes } = req.body;

  // Get payment transaction
  const { data: transaction, error: fetchError } = await supabase
    .from('vip_payment_transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (fetchError || !transaction) {
    throw NotFoundError('Transaction not found');
  }

  // Check if already verified
  if (transaction.payment_status === 'completed') {
    throw BadRequestError('This transaction has already been verified');
  }

  // Check if payment method is cash
  if (transaction.payment_method !== 'cash') {
    throw BadRequestError('Only cash payments require admin verification');
  }

  // Update payment transaction
  const now = new Date().toISOString();
  const { error: transactionUpdateError } = await supabase
    .from('vip_payment_transactions')
    .update({
      payment_status: 'completed',
      admin_verified_by: userId,
      admin_verified_at: now,
      admin_notes: admin_notes || 'Cash payment verified by admin',
      updated_at: now,
    })
    .eq('id', transactionId);

  if (transactionUpdateError) {
    throw InternalServerError('Failed to update transaction');
  }

  // Update subscription status
  const tableName = getVIPTableName(transaction.subscription_type);

  const { data: subscription, error: subscriptionUpdateError } = await supabase
    .from(tableName)
    .update({
      status: 'active',
      payment_status: 'completed',
      admin_verified_by: userId,
      admin_verified_at: now,
      admin_notes: admin_notes || 'Cash payment verified by admin',
      updated_at: now,
    })
    .eq('transaction_id', transactionId)
    .select()
    .single();

  if (subscriptionUpdateError) {
    throw InternalServerError('Failed to activate subscription');
  }

  // Notify user that payment was verified and subscription is active
  if (subscription) {
    await notifyVIPPaymentVerified(
      transaction.user_id,
      subscription.tier,
      new Date(subscription.expires_at)
    );
  }

  res.status(200).json({
    success: true,
    message: 'Payment verified and subscription activated',
    subscription,
  });
});

/**
 * GET /api/admin/vip/transactions
 * Returns VIP payment transactions for admin verification
 */
export const getVIPTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { payment_method, status } = req.query;

  // Build query
  let query = supabase
    .from('vip_payment_transactions')
    .select(`
      *,
      user:users!vip_payment_transactions_user_id_fkey(id, pseudonym, email),
      employee:employees(id, name, nickname),
      establishment:establishments(id, name)
    `)
    .order('created_at', { ascending: false });

  // Filter by payment method if provided
  if (payment_method && payment_method !== '') {
    query = query.eq('payment_method', payment_method);
  }

  // Filter by status if provided
  if (status && status !== '' && status !== 'all') {
    query = query.eq('payment_status', status);
  }

  const { data: transactions, error: transactionsError } = await query;

  if (transactionsError) {
    logger.error('Error fetching VIP transactions:', transactionsError);
    throw InternalServerError('Failed to fetch VIP transactions');
  }

  // Fetch subscription details for each transaction
  const transactionsWithSubscriptions = await Promise.all(
    (transactions || []).map(async (transaction) => {
      const tableName = getVIPTableName(transaction.subscription_type);

      const { data: subscription } = await supabase
        .from(tableName)
        .select('tier, duration, starts_at, expires_at')
        .eq('transaction_id', transaction.id)
        .maybeSingle();

      return {
        ...transaction,
        subscription,
      };
    })
  );

  res.status(200).json({
    success: true,
    transactions: transactionsWithSubscriptions,
    count: transactionsWithSubscriptions.length,
  });
});

/**
 * POST /api/admin/vip/reject-payment/:transactionId
 * Reject a VIP payment and cancel the associated subscription
 */
export const rejectPayment = asyncHandler(async (req: Request, res: Response) => {
  const { transactionId } = req.params;
  const { admin_notes } = req.body;
  const userId = (req as any).user?.id;

  if (!userId) {
    throw UnauthorizedError('Authentication required');
  }

  if (!admin_notes || admin_notes.trim().length === 0) {
    throw BadRequestError('Rejection reason (admin_notes) is required');
  }

  // 1. Get transaction details
  const { data: transaction, error: transactionError } = await supabase
    .from('vip_payment_transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (transactionError || !transaction) {
    throw NotFoundError('Transaction not found');
  }

  // 2. Check if already processed
  if (transaction.payment_status !== 'pending') {
    throw BadRequestError(`Transaction status is ${transaction.payment_status}`);
  }

  const now = new Date().toISOString();

  // 3. Update transaction to failed
  const { error: updateTransactionError } = await supabase
    .from('vip_payment_transactions')
    .update({
      payment_status: 'failed',
      admin_notes: admin_notes,
      updated_at: now,
    })
    .eq('id', transactionId);

  if (updateTransactionError) {
    throw InternalServerError('Failed to update transaction');
  }

  // 4. Cancel the associated subscription
  const tableName = getVIPTableName(transaction.subscription_type);

  const { error: subscriptionUpdateError } = await supabase
    .from(tableName)
    .update({
      status: 'cancelled',
      admin_notes: `Rejected: ${admin_notes}`,
      updated_at: now,
    })
    .eq('transaction_id', transactionId);

  if (subscriptionUpdateError) {
    logger.error('Error cancelling subscription:', subscriptionUpdateError);
    // Continue anyway - transaction is already rejected
  }

  // Get tier from subscription to notify user
  const { data: subscriptionData } = await supabase
    .from(tableName)
    .select('tier')
    .eq('transaction_id', transactionId)
    .single();

  // Notify user that payment was rejected
  if (subscriptionData) {
    await notifyVIPPaymentRejected(
      transaction.user_id,
      subscriptionData.tier,
      admin_notes
    );
  }

  res.status(200).json({
    success: true,
    message: 'Payment rejected successfully',
  });
});
