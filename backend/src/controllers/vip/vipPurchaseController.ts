/**
 * VIP Purchase Controller
 *
 * Handles VIP subscription purchase workflow.
 */

import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, ConflictError, InternalServerError } from '../../middleware/asyncHandler';
import {
  calculateVIPPrice,
  isValidDuration,
  isValidSubscriptionType,
  isValidPaymentMethod,
  VIPSubscriptionType,
  VIPTier,
  VIPDuration,
  PaymentMethod,
} from '../../config/vipPricing';
import { getVIPTableName, getEntityColumn } from '../../utils/vipHelpers';
import { notifyVIPPurchaseConfirmed } from '../../utils/notificationHelper';
import { generatePromptPayQR, isPromptPayConfigured } from '../../services/promptpayService';

// =====================================================
// TYPES
// =====================================================

interface PurchaseVIPRequest {
  subscription_type: VIPSubscriptionType;
  entity_id: string;
  tier?: VIPTier;
  duration: VIPDuration;
  payment_method: PaymentMethod;
}

/**
 * POST /api/vip/purchase
 * Initiates a VIP subscription purchase
 */
export const purchaseVIP = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw UnauthorizedError('Unauthorized');
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
    throw BadRequestError('Missing required fields: subscription_type, entity_id, duration, and payment_method are required');
  }

  // Validate subscription type
  if (!isValidSubscriptionType(subscription_type)) {
    throw BadRequestError('Invalid subscription type. Type must be "employee" or "establishment"');
  }

  // Auto-assign tier based on subscription type (SIMPLIFIED - no more basic/premium)
  const tier: VIPTier = subscription_type;

  // Validate duration
  if (!isValidDuration(duration)) {
    throw BadRequestError('Invalid duration. Duration must be 7, 30, 90, or 365 days');
  }

  // Validate payment method
  if (!isValidPaymentMethod(payment_method)) {
    throw BadRequestError('Invalid payment method. Payment method must be "promptpay", "cash", or "admin_grant"');
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
    throw ForbiddenError('You do not have permission to purchase VIP for this entity');
  }

  // =====================================================
  // 3. CHECK FOR EXISTING ACTIVE SUBSCRIPTION
  // =====================================================

  const tableName = getVIPTableName(subscription_type);
  const entityColumn = getEntityColumn(subscription_type);

  const { data: existingSubscription } = await supabase
    .from(tableName)
    .select('id, expires_at, tier')
    .eq(entityColumn, entity_id)
    .eq('status', 'active')
    .gte('expires_at', new Date().toISOString())
    .maybeSingle();

  if (existingSubscription) {
    throw ConflictError(`This ${subscription_type} already has an active ${existingSubscription.tier} VIP subscription until ${existingSubscription.expires_at}`);
  }

  // =====================================================
  // 4. CALCULATE PRICE
  // =====================================================

  const price = calculateVIPPrice(subscription_type, duration);
  if (price === null) {
    throw BadRequestError('Invalid pricing configuration. Could not calculate price for the selected options');
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
    throw InternalServerError('Failed to create VIP subscription');
  }

  // =====================================================
  // 6. CREATE PAYMENT TRANSACTION (SECOND)
  // =====================================================

  // Generate PromptPay QR code if payment method is promptpay
  let promptpayData: { qrCode: string; reference: string } | null = null;
  if (payment_method === 'promptpay') {
    if (!isPromptPayConfigured()) {
      logger.error('PromptPay not configured but payment method is promptpay');
      throw BadRequestError('PromptPay not available. PromptPay payment is not configured. Please use cash or contact admin.');
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

    throw InternalServerError('Failed to create payment transaction');
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

  res.status(201).json({
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
});
