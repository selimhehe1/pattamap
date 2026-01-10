/**
 * Specialized Notification Functions
 *
 * Contains VIP, Verification, Edit Proposal, and Establishment Owner notifications.
 */

import { logger } from '../logger';
import { createNotification, fetchUserIdsByRole, notifyMultipleUsers } from './core';

// =====================================================
// VERIFICATION SYSTEM NOTIFICATIONS
// =====================================================

/**
 * Notify employee when their verification is submitted
 */
export const notifyEmployeeVerificationSubmitted = async (
  employeeLinkedUserId: string,
  employeeName: string
): Promise<void> => {
  try {
    await createNotification({
      user_id: employeeLinkedUserId,
      type: 'verification_submitted',
      i18n_key: 'notifications.verificationSubmitted',
      i18n_params: { employeeName },
      link: '/employee/dashboard',
      related_entity_type: 'employee',
      related_entity_id: employeeName
    });

    logger.info('Employee notified: verification submitted', { employeeLinkedUserId });
  } catch (error) {
    logger.error('Notify verification submitted error:', error);
  }
};

/**
 * Notify employee when their verification is approved
 */
export const notifyEmployeeVerificationApproved = async (
  employeeLinkedUserId: string,
  employeeName: string
): Promise<void> => {
  try {
    await createNotification({
      user_id: employeeLinkedUserId,
      type: 'verification_approved',
      i18n_key: 'notifications.verificationApproved',
      i18n_params: { employeeName },
      link: '/employee/dashboard',
      related_entity_type: 'employee',
      related_entity_id: employeeName
    });

    logger.info('Employee notified: verification approved', { employeeLinkedUserId });
  } catch (error) {
    logger.error('Notify verification approved error:', error);
  }
};

/**
 * Notify employee when their verification is rejected
 */
export const notifyEmployeeVerificationRejected = async (
  employeeLinkedUserId: string,
  employeeName: string,
  reason: string
): Promise<void> => {
  try {
    await createNotification({
      user_id: employeeLinkedUserId,
      type: 'verification_rejected',
      i18n_key: 'notifications.verificationRejected',
      i18n_params: { employeeName, reason },
      link: '/employee/dashboard',
      related_entity_type: 'employee',
      related_entity_id: employeeName
    });

    logger.info('Employee notified: verification rejected', { employeeLinkedUserId, reason });
  } catch (error) {
    logger.error('Notify verification rejected error:', error);
  }
};

/**
 * Notify employee when their verification is revoked
 */
export const notifyEmployeeVerificationRevoked = async (
  employeeLinkedUserId: string,
  employeeName: string,
  reason: string
): Promise<void> => {
  try {
    await createNotification({
      user_id: employeeLinkedUserId,
      type: 'verification_revoked',
      i18n_key: 'notifications.verificationRevoked',
      i18n_params: { employeeName, reason },
      link: '/employee/dashboard',
      related_entity_type: 'employee',
      related_entity_id: employeeName
    });

    logger.info('Employee notified: verification revoked', { employeeLinkedUserId, reason });
  } catch (error) {
    logger.error('Notify verification revoked error:', error);
  }
};

/**
 * Notify admins when a new verification request is submitted
 */
export const notifyAdminsNewVerificationRequest = async (
  employeeName: string,
  verificationId: string
): Promise<void> => {
  try {
    const adminIds = await fetchUserIdsByRole('admin');
    if (adminIds.length === 0) return;

    await notifyMultipleUsers(
      adminIds,
      (userId) => ({
        user_id: userId,
        type: 'new_verification_request',
        i18n_key: 'notifications.newVerificationRequest',
        i18n_params: { employeeName },
        link: '/admin/verifications/manual-review',
        related_entity_type: 'employee_verification',
        related_entity_id: verificationId
      }),
      `verification request (${verificationId})`
    );
  } catch (error) {
    logger.error('Notify admins verification request error:', error);
  }
};

// ============================================================================
// VIP SYSTEM NOTIFICATIONS
// ============================================================================

/**
 * Notify user when their VIP purchase is confirmed
 */
export const notifyVIPPurchaseConfirmed = async (
  userId: string,
  tier: string,
  duration: number,
  price: number
): Promise<void> => {
  try {
    await createNotification({
      user_id: userId,
      type: 'vip_purchase_confirmed',
      i18n_key: 'notifications.vipPurchaseConfirmed',
      i18n_params: { tier, duration, price },
      link: '/user/profile',
      related_entity_type: 'vip_subscription',
      related_entity_id: tier
    });

    logger.info('User notified: VIP purchase confirmed', { userId, tier, duration, price });
  } catch (error) {
    logger.error('Notify VIP purchase confirmed error:', error);
  }
};

/**
 * Notify user when admin verifies their VIP payment
 */
export const notifyVIPPaymentVerified = async (
  userId: string,
  tier: string,
  expiresAt: Date
): Promise<void> => {
  try {
    await createNotification({
      user_id: userId,
      type: 'vip_payment_verified',
      i18n_key: 'notifications.vipPaymentVerified',
      i18n_params: { tier, expiresAt: new Date(expiresAt).toISOString() },
      link: '/user/profile',
      related_entity_type: 'vip_subscription',
      related_entity_id: tier
    });

    logger.info('User notified: VIP payment verified', { userId, tier, expiresAt });
  } catch (error) {
    logger.error('Notify VIP payment verified error:', error);
  }
};

/**
 * Notify user when admin rejects their VIP payment
 */
export const notifyVIPPaymentRejected = async (
  userId: string,
  tier: string,
  reason: string
): Promise<void> => {
  try {
    await createNotification({
      user_id: userId,
      type: 'vip_payment_rejected',
      i18n_key: 'notifications.vipPaymentRejected',
      i18n_params: { tier, reason },
      link: '/user/profile',
      related_entity_type: 'vip_subscription',
      related_entity_id: tier
    });

    logger.info('User notified: VIP payment rejected', { userId, tier, reason });
  } catch (error) {
    logger.error('Notify VIP payment rejected error:', error);
  }
};

/**
 * Notify user when their VIP subscription is cancelled
 */
export const notifyVIPSubscriptionCancelled = async (
  userId: string,
  tier: string,
  reason: string
): Promise<void> => {
  try {
    await createNotification({
      user_id: userId,
      type: 'vip_subscription_cancelled',
      i18n_key: 'notifications.vipSubscriptionCancelled',
      i18n_params: { tier, reason },
      link: '/user/profile',
      related_entity_type: 'vip_subscription',
      related_entity_id: tier
    });

    logger.info('User notified: VIP subscription cancelled', { userId, tier, reason });
  } catch (error) {
    logger.error('Notify VIP subscription cancelled error:', error);
  }
};

// ============================================================================
// EDIT PROPOSAL NOTIFICATIONS
// ============================================================================

/**
 * Notify admins when a new edit proposal is submitted
 */
export const notifyAdminsNewEditProposal = async (
  proposalId: string,
  proposerName: string,
  entityType: string,
  entityName: string
): Promise<void> => {
  try {
    const adminIds = await fetchUserIdsByRole('admin', true);
    if (adminIds.length === 0) return;

    await notifyMultipleUsers(
      adminIds,
      (userId) => ({
        user_id: userId,
        type: 'edit_proposal_submitted',
        i18n_key: 'notifications.editProposalSubmitted',
        i18n_params: { proposerName, entityType, entityName },
        link: `/admin/proposals`,
        related_entity_type: 'edit_proposal',
        related_entity_id: proposalId
      }),
      `edit proposal (${proposalId})`
    );
  } catch (error) {
    logger.error('Notify admins new edit proposal error:', error);
  }
};

/**
 * Notify user when their edit proposal is approved
 */
export const notifyEditProposalApproved = async (
  userId: string,
  entityType: string,
  entityName: string
): Promise<void> => {
  try {
    const link = entityType === 'employee' ? `/employee/${entityName}` : `/establishment/${entityName}`;

    await createNotification({
      user_id: userId,
      type: 'edit_proposal_approved',
      i18n_key: 'notifications.editProposalApproved',
      i18n_params: { entityType, entityName },
      link,
      related_entity_type: entityType,
      related_entity_id: entityName
    });

    logger.info('User notified: edit proposal approved', { userId, entityType, entityName });
  } catch (error) {
    logger.error('Notify edit proposal approved error:', error);
  }
};

/**
 * Notify user when their edit proposal is rejected
 */
export const notifyEditProposalRejected = async (
  userId: string,
  entityType: string,
  entityName: string,
  reason: string
): Promise<void> => {
  try {
    await createNotification({
      user_id: userId,
      type: 'edit_proposal_rejected',
      i18n_key: 'notifications.editProposalRejected',
      i18n_params: { entityType, entityName, reason },
      link: `/admin/proposals`,
      related_entity_type: entityType,
      related_entity_id: entityName
    });

    logger.info('User notified: edit proposal rejected', { userId, entityType, entityName, reason });
  } catch (error) {
    logger.error('Notify edit proposal rejected error:', error);
  }
};

// ============================================================================
// ESTABLISHMENT OWNER NOTIFICATIONS
// ============================================================================

/**
 * Notify user when they are assigned as establishment owner
 */
export const notifyEstablishmentOwnerAssigned = async (
  userId: string,
  establishmentName: string,
  establishmentId: string,
  role: string
): Promise<void> => {
  try {
    await createNotification({
      user_id: userId,
      type: 'establishment_owner_assigned',
      i18n_key: 'notifications.establishmentOwnerAssigned',
      i18n_params: { role, establishmentName },
      link: `/my-establishments`,
      related_entity_type: 'establishment',
      related_entity_id: establishmentId
    });

    logger.info('User notified: establishment owner assigned', { userId, establishmentName, role });
  } catch (error) {
    logger.error('Notify establishment owner assigned error:', error);
  }
};

/**
 * Notify user when they are removed as establishment owner
 */
export const notifyEstablishmentOwnerRemoved = async (
  userId: string,
  establishmentName: string,
  establishmentId: string
): Promise<void> => {
  try {
    await createNotification({
      user_id: userId,
      type: 'establishment_owner_removed',
      i18n_key: 'notifications.establishmentOwnerRemoved',
      i18n_params: { establishmentName },
      link: `/my-establishments`,
      related_entity_type: 'establishment',
      related_entity_id: establishmentId
    });

    logger.info('User notified: establishment owner removed', { userId, establishmentName });
  } catch (error) {
    logger.error('Notify establishment owner removed error:', error);
  }
};

/**
 * Notify user when their establishment owner permissions are updated
 */
export const notifyEstablishmentOwnerPermissionsUpdated = async (
  userId: string,
  establishmentName: string,
  establishmentId: string,
  updatedPermissions: Record<string, boolean>
): Promise<void> => {
  try {
    await createNotification({
      user_id: userId,
      type: 'establishment_owner_permissions_updated',
      i18n_key: 'notifications.establishmentOwnerPermissionsUpdated',
      i18n_params: { establishmentName, updatedPermissions },
      link: `/my-establishments`,
      related_entity_type: 'establishment',
      related_entity_id: establishmentId
    });

    logger.info('User notified: establishment owner permissions updated', {
      userId,
      establishmentName,
      updatedPermissions
    });
  } catch (error) {
    logger.error('Notify establishment owner permissions updated error:', error);
  }
};
