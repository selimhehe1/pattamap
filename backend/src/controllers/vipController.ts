/**
 * 🆕 v10.3 Phase 1 - VIP Subscriptions Controller
 *
 * Handles VIP subscription purchases, status checks, and admin verification
 * Updated: Fixed subscription_id NOT NULL constraint by reordering workflow
 */

import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';
import {
  VIP_PRICING,
  calculateVIPPrice,
  getVIPTypeConfig,
  isValidTier,
  isValidDuration,
  isValidSubscriptionType,
  isValidPaymentMethod,
  VIPSubscriptionType,
  VIPTier,
  VIPDuration,
  PaymentMethod,
  getAllPricingOptions,
} from '../config/vipPricing';
import {
  notifyVIPPurchaseConfirmed,
  notifyVIPPaymentVerified,
  notifyVIPPaymentRejected,
  notifyVIPSubscriptionCancelled
} from '../utils/notificationHelper';
import { generatePromptPayQR, isPromptPayConfigured } from '../services/promptpayService';

// =====================================================
// TYPES
// =====================================================

interface PurchaseVIPRequest {
  subscription_type: VIPSubscriptionType; // 'employee' | 'establishment'
  entity_id: string; // employee_id or establishment_id
  tier?: VIPTier; // Optional - will be auto-assigned based on subscription_type
  duration: VIPDuration;
  payment_method: PaymentMethod;
}

// =====================================================
// GET PRICING OPTIONS
// =====================================================

/**
 * GET /api/vip/pricing/:type
 * Returns all pricing options for a subscription type
 */
export const getPricingOptions = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    // Validate subscription type
    if (!isValidSubscriptionType(type)) {
      return res.status(400).json({
        error: 'Invalid subscription type',
        message: 'Type must be "employee" or "establishment"',
      });
    }

    // Get all pricing options
    const pricingOptions = getAllPricingOptions(type);

    return res.status(200).json({
      success: true,
      type,
      pricing: pricingOptions,
    });
  } catch (error) {
    logger.error('Error fetching VIP pricing:', error);
    return res.status(500).json({
      error: 'Failed to fetch VIP pricing',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// =====================================================
// PURCHASE VIP SUBSCRIPTION
// =====================================================

/**
 * POST /api/vip/purchase
 * Initiates a VIP subscription purchase
 */
export const purchaseVIP = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      subscription_type,
      entity_id,
      duration,
      payment_method,
    }: PurchaseVIPRequest = req.body;

    // =====================================================
    // 1. VALIDATION
    // =====================================================

    // Validate required fields
    if (!subscription_type || !entity_id || !duration || !payment_method) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'subscription_type, entity_id, duration, and payment_method are required',
      });
    }

    // Validate subscription type
    if (!isValidSubscriptionType(subscription_type)) {
      return res.status(400).json({
        error: 'Invalid subscription type',
        message: 'Type must be "employee" or "establishment"',
      });
    }

    // Auto-assign tier based on subscription type (SIMPLIFIED - no more basic/premium)
    const tier: VIPTier = subscription_type;

    // Validate duration
    if (!isValidDuration(duration)) {
      return res.status(400).json({
        error: 'Invalid duration',
        message: 'Duration must be 7, 30, 90, or 365 days',
      });
    }

    // Validate payment method
    if (!isValidPaymentMethod(payment_method)) {
      return res.status(400).json({
        error: 'Invalid payment method',
        message: 'Payment method must be "promptpay", "cash", or "admin_grant"',
      });
    }

    // =====================================================
    // 2. AUTHORIZATION CHECK
    // =====================================================

    // Check if user has permission to purchase VIP for this entity
    let hasPermission = false;

    if (subscription_type === 'employee') {
      // CASE 1: Employee buying VIP for themselves
      // Check if user_id is linked to this employee profile
      const { data: userEmployee } = await supabase
        .from('employees')
        .select('id, user_id')
        .eq('id', entity_id)
        .eq('user_id', userId)
        .single();

      if (userEmployee) {
        // Employee can purchase VIP for their own profile
        hasPermission = true;
        logger.debug('VIP purchase authorized: Employee buying for self', {
          userId,
          employeeId: entity_id
        });
      } else {
        // CASE 2: Establishment owner buying VIP for their employee
        const { data: ownership } = await supabase
          .from('establishment_owners')
          .select(`
            id,
            permissions,
            current_employment!inner(establishment_id, employee_id)
          `)
          .eq('user_id', userId)
          .eq('current_employment.employee_id', entity_id)
          .eq('current_employment.is_current', true)
          .single();

        hasPermission = !!(ownership && ownership.permissions?.can_edit_employees === true);

        if (hasPermission && ownership) {
          logger.debug('VIP purchase authorized: Owner buying for employee', {
            userId,
            employeeId: entity_id,
            canEditEmployees: ownership.permissions?.can_edit_employees
          });
        }
      }
    } else if (subscription_type === 'establishment') {
      // For establishments: user must be owner/manager
      const { data: ownership } = await supabase
        .from('establishment_owners')
        .select('id')
        .eq('user_id', userId)
        .eq('establishment_id', entity_id)
        .single();

      hasPermission = !!ownership;
    }

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to purchase VIP for this entity',
      });
    }

    // =====================================================
    // 3. CHECK FOR EXISTING ACTIVE SUBSCRIPTION
    // =====================================================

    const tableName =
      subscription_type === 'employee'
        ? 'employee_vip_subscriptions'
        : 'establishment_vip_subscriptions';

    const entityColumn = subscription_type === 'employee' ? 'employee_id' : 'establishment_id';

    const { data: existingSubscription } = await supabase
      .from(tableName)
      .select('id, expires_at, tier')
      .eq(entityColumn, entity_id)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingSubscription) {
      return res.status(409).json({
        error: 'Active subscription exists',
        message: `This ${subscription_type} already has an active ${existingSubscription.tier} VIP subscription until ${existingSubscription.expires_at}`,
        existing_subscription: existingSubscription,
      });
    }

    // =====================================================
    // 4. CALCULATE PRICE
    // =====================================================

    const price = calculateVIPPrice(subscription_type, duration);
    if (price === null) {
      return res.status(400).json({
        error: 'Invalid pricing configuration',
        message: 'Could not calculate price for the selected options',
      });
    }

    // =====================================================
    // 5. CREATE VIP SUBSCRIPTION (FIRST)
    // =====================================================

    const now = new Date();
    const startsAt = now;
    const expiresAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

    // Determine payment status based on method
    const paymentStatus = payment_method === 'admin_grant' ? 'completed' : 'pending';
    const subscriptionStatus =
      payment_method === 'admin_grant' ? 'active' : 'pending_payment';

    // Create subscription FIRST (without transaction_id, will be updated later)
    const subscriptionData = {
      [entityColumn]: entity_id,
      status: subscriptionStatus,
      tier,
      duration,
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      payment_method,
      payment_status: paymentStatus,
      price_paid: price,
      transaction_id: null, // Will be updated after transaction creation
      admin_verified_by: payment_method === 'admin_grant' ? userId : null,
      admin_verified_at: payment_method === 'admin_grant' ? now.toISOString() : null,
    };

    const { data: subscription, error: subscriptionError } = await supabase
      .from(tableName)
      .insert(subscriptionData)
      .select()
      .single();

    if (subscriptionError || !subscription) {
      logger.error('Error creating VIP subscription:', subscriptionError);
      return res.status(500).json({
        error: 'Failed to create VIP subscription',
        message: subscriptionError?.message || 'Unknown error',
      });
    }

    // =====================================================
    // 6. CREATE PAYMENT TRANSACTION (SECOND)
    // =====================================================

    // Generate PromptPay QR code if payment method is promptpay
    let promptpayData: { qrCode: string; reference: string } | null = null;
    if (payment_method === 'promptpay') {
      if (!isPromptPayConfigured()) {
        logger.error('PromptPay not configured but payment method is promptpay');
        return res.status(400).json({
          error: 'PromptPay not available',
          message: 'PromptPay payment is not configured. Please use cash or contact admin.',
        });
      }
      // Generate QR (we'll use subscription ID as reference since transaction doesn't exist yet)
      const qrResult = await generatePromptPayQR(price, subscription.id);
      promptpayData = { qrCode: qrResult.qrCode, reference: qrResult.reference };
    }

    // Create payment transaction with valid subscription_id
    const { data: transaction, error: transactionError } = await supabase
      .from('vip_payment_transactions')
      .insert({
        subscription_type,
        subscription_id: subscription.id, // ✅ Valid subscription_id!
        user_id: userId,
        amount: price,
        currency: 'THB',
        payment_method,
        payment_status: paymentStatus,
        promptpay_qr_code: promptpayData?.qrCode || null,
        promptpay_reference: promptpayData?.reference || null,
        admin_verified_by: payment_method === 'admin_grant' ? userId : null,
        admin_verified_at: payment_method === 'admin_grant' ? now.toISOString() : null,
        admin_notes: payment_method === 'admin_grant' ? 'Admin granted VIP' : null,
      })
      .select()
      .single();

    if (transactionError || !transaction) {
      logger.error('Error creating payment transaction:', transactionError);

      // Rollback: delete the subscription
      await supabase.from(tableName).delete().eq('id', subscription.id);

      return res.status(500).json({
        error: 'Failed to create payment transaction',
        message: transactionError?.message || 'Unknown error',
      });
    }

    // Update subscription with transaction_id
    await supabase
      .from(tableName)
      .update({ transaction_id: transaction.id })
      .eq('id', subscription.id);

    // =====================================================
    // 7. NOTIFY USER & RETURN SUCCESS RESPONSE
    // =====================================================

    // Notify user of VIP purchase confirmation
    await notifyVIPPurchaseConfirmed(userId, tier, duration, price);

    return res.status(201).json({
      success: true,
      message:
        payment_method === 'admin_grant'
          ? 'VIP subscription activated successfully'
          : payment_method === 'cash'
          ? 'VIP subscription created. Please contact admin to verify cash payment.'
          : payment_method === 'promptpay'
          ? 'VIP subscription created. Please scan QR code to complete payment.'
          : 'VIP subscription created. Please complete payment.',
      subscription: {
        id: subscription.id,
        type: subscription_type,
        entity_id,
        tier,
        duration,
        status: subscription.status,
        starts_at: subscription.starts_at,
        expires_at: subscription.expires_at,
        price_paid: subscription.price_paid,
      },
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        payment_method: transaction.payment_method,
        payment_status: transaction.payment_status,
        // PromptPay QR data (only present if payment_method is 'promptpay')
        promptpay_qr_code: transaction.promptpay_qr_code || undefined,
        promptpay_reference: transaction.promptpay_reference || undefined,
      },
    });
  } catch (error) {
    logger.error('Error purchasing VIP:', error);
    return res.status(500).json({
      error: 'Failed to purchase VIP',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// =====================================================
// GET MY VIP SUBSCRIPTIONS
// =====================================================

/**
 * GET /api/vip/my-subscriptions
 * Returns all VIP subscriptions for the authenticated user's entities
 */
export const getMyVIPSubscriptions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
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

    return res.status(200).json({
      success: true,
      subscriptions: {
        employees: employeeSubscriptions || [],
        establishments: establishmentSubscriptions || [],
      },
    });
  } catch (error) {
    logger.error('Error fetching VIP subscriptions:', error);
    return res.status(500).json({
      error: 'Failed to fetch VIP subscriptions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// =====================================================
// CANCEL VIP SUBSCRIPTION
// =====================================================

/**
 * PATCH /api/vip/subscriptions/:id/cancel
 * Cancels an active VIP subscription
 */
export const cancelVIPSubscription = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { subscription_type } = req.body;

    // Validate subscription type
    if (!isValidSubscriptionType(subscription_type)) {
      return res.status(400).json({
        error: 'Invalid subscription type',
        message: 'subscription_type must be "employee" or "establishment"',
      });
    }

    const tableName =
      subscription_type === 'employee'
        ? 'employee_vip_subscriptions'
        : 'establishment_vip_subscriptions';

    // Check if subscription exists and user has permission
    const { data: subscription, error: fetchError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({
        error: 'Subscription not found',
      });
    }

    // Verify user has permission (must be establishment owner)
    const entityColumn = subscription_type === 'employee' ? 'employee_id' : 'establishment_id';
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
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to cancel this subscription',
      });
    }

    // Check if subscription is active
    if (subscription.status !== 'active') {
      return res.status(400).json({
        error: 'Subscription not active',
        message: `Subscription is already ${subscription.status}`,
      });
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
      return res.status(500).json({
        error: 'Failed to cancel subscription',
        message: updateError?.message || 'Unknown error',
      });
    }

    // Notify user of subscription cancellation
    await notifyVIPSubscriptionCancelled(
      userId,
      subscription.tier,
      'Cancelled by establishment owner'
    );

    return res.status(200).json({
      success: true,
      message: 'VIP subscription cancelled successfully',
      subscription: updatedSubscription,
    });
  } catch (error) {
    logger.error('Error cancelling VIP subscription:', error);
    return res.status(500).json({
      error: 'Failed to cancel VIP subscription',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// =====================================================
// ADMIN: VERIFY PAYMENT
// =====================================================

/**
 * POST /api/admin/vip/verify-payment/:transactionId
 * Admin verifies a cash payment and activates subscription
 */
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can verify payments',
      });
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
      return res.status(404).json({
        error: 'Transaction not found',
      });
    }

    // Check if already verified
    if (transaction.payment_status === 'completed') {
      return res.status(400).json({
        error: 'Payment already verified',
        message: 'This transaction has already been verified',
      });
    }

    // Check if payment method is cash
    if (transaction.payment_method !== 'cash') {
      return res.status(400).json({
        error: 'Invalid payment method',
        message: 'Only cash payments require admin verification',
      });
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
      return res.status(500).json({
        error: 'Failed to update transaction',
        message: transactionUpdateError.message,
      });
    }

    // Update subscription status
    const tableName =
      transaction.subscription_type === 'employee'
        ? 'employee_vip_subscriptions'
        : 'establishment_vip_subscriptions';

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
      return res.status(500).json({
        error: 'Failed to activate subscription',
        message: subscriptionUpdateError.message,
      });
    }

    // Notify user that payment was verified and subscription is active
    if (subscription) {
      await notifyVIPPaymentVerified(
        transaction.user_id,
        subscription.tier,
        new Date(subscription.expires_at)
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and subscription activated',
      subscription,
    });
  } catch (error) {
    logger.error('Error verifying payment:', error);
    return res.status(500).json({
      error: 'Failed to verify payment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// =====================================================
// GET VIP TRANSACTIONS (ADMIN)
// =====================================================

/**
 * GET /api/admin/vip/transactions
 * Returns VIP payment transactions for admin verification
 * Query params:
 *  - payment_method: 'cash' | 'promptpay' | 'admin_grant'
 *  - status: 'pending' | 'completed' | 'failed' | 'refunded' | '' (all)
 */
export const getVIPTransactions = async (req: Request, res: Response) => {
  try {
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
      return res.status(500).json({
        error: 'Failed to fetch VIP transactions',
        message: transactionsError.message,
      });
    }

    // Fetch subscription details for each transaction
    const transactionsWithSubscriptions = await Promise.all(
      (transactions || []).map(async (transaction) => {
        const tableName =
          transaction.subscription_type === 'employee'
            ? 'employee_vip_subscriptions'
            : 'establishment_vip_subscriptions';

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

    return res.status(200).json({
      success: true,
      transactions: transactionsWithSubscriptions,
      count: transactionsWithSubscriptions.length,
    });
  } catch (error) {
    logger.error('Error fetching VIP transactions:', error);
    return res.status(500).json({
      error: 'Failed to fetch VIP transactions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// =====================================================
// REJECT PAYMENT (ADMIN)
// =====================================================

/**
 * POST /api/admin/vip/reject-payment/:transactionId
 * Reject a VIP payment and cancel the associated subscription
 */
export const rejectPayment = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const { admin_notes } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!admin_notes || admin_notes.trim().length === 0) {
      return res.status(400).json({ error: 'Rejection reason (admin_notes) is required' });
    }

    // 1. Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('vip_payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (transactionError || !transaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: transactionError?.message,
      });
    }

    // 2. Check if already processed
    if (transaction.payment_status !== 'pending') {
      return res.status(400).json({
        error: 'Transaction already processed',
        message: `Transaction status is ${transaction.payment_status}`,
      });
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
      return res.status(500).json({
        error: 'Failed to update transaction',
        message: updateTransactionError.message,
      });
    }

    // 4. Cancel the associated subscription
    const tableName =
      transaction.subscription_type === 'employee'
        ? 'employee_vip_subscriptions'
        : 'establishment_vip_subscriptions';

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

    return res.status(200).json({
      success: true,
      message: 'Payment rejected successfully',
    });
  } catch (error) {
    logger.error('Error rejecting payment:', error);
    return res.status(500).json({
      error: 'Failed to reject payment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
