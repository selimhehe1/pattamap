/**
 * Ownership Request Notifications
 *
 * Notifications related to establishment ownership requests
 */

import { logger } from '../logger';
import { createNotification, fetchUserIdsByRole, notifyMultipleUsers } from './core';

/**
 * Notify all admins about a new ownership request
 * @param establishmentName Name of establishment
 * @param requesterPseudonym Pseudonym of requester
 * @param requestId Request ID
 * @param isNewEstablishment Whether this request includes establishment creation
 */
export const notifyAdminsNewOwnershipRequest = async (
  establishmentName: string,
  requesterPseudonym: string,
  requestId: string,
  isNewEstablishment: boolean = false
): Promise<void> => {
  try {
    const adminIds = await fetchUserIdsByRole('admin');
    if (adminIds.length === 0) return;

    const i18nKey = isNewEstablishment
      ? 'notifications.newOwnershipRequestWithEstablishment'
      : 'notifications.newOwnershipRequest';

    await notifyMultipleUsers(
      adminIds,
      (userId) => ({
        user_id: userId,
        type: 'new_ownership_request',
        i18n_key: i18nKey,
        i18n_params: { requesterPseudonym, establishmentName },
        link: '/admin/establishment-owners?tab=pending',
        related_entity_type: 'ownership_request',
        related_entity_id: requestId
      }),
      `admin ownership request (${requestId})`
    );
  } catch (error) {
    logger.error('Notify admins error:', error);
  }
};

/**
 * Notify user when they submit an ownership request
 * @param userId User ID
 * @param establishmentName Name of establishment
 * @param requestId Request ID
 * @param isNewEstablishment Whether this request includes establishment creation
 */
export const notifyOwnershipRequestSubmitted = async (
  userId: string,
  establishmentName: string,
  requestId: string,
  isNewEstablishment: boolean = false
): Promise<void> => {
  try {
    const i18nKey = isNewEstablishment
      ? 'notifications.ownershipRequestWithEstablishmentSubmitted'
      : 'notifications.ownershipRequestSubmitted';

    const notificationId = await createNotification({
      user_id: userId,
      type: 'ownership_request_submitted',
      i18n_key: i18nKey,
      i18n_params: { establishmentName },
      link: '/my-ownership-requests',
      related_entity_type: 'ownership_request',
      related_entity_id: requestId
    });

    if (notificationId) {
      logger.info('User notified: ownership request submitted', {
        userId,
        requestId,
        notificationId,
        isNewEstablishment
      });
    }
  } catch (error) {
    logger.error('Notify ownership request submitted error:', error);
  }
};

/**
 * Notify owner about request status change
 * @param userId Owner user ID
 * @param status New status (approved/rejected)
 * @param establishmentName Name of establishment
 * @param adminNotes Optional admin notes
 * @param requestId Request ID
 */
export const notifyOwnerRequestStatusChange = async (
  userId: string,
  status: 'approved' | 'rejected',
  establishmentName: string,
  adminNotes?: string,
  requestId?: string
): Promise<void> => {
  try {
    const isApproved = status === 'approved';
    const link = isApproved ? '/my-establishments' : '/my-ownership-requests';

    const notificationId = await createNotification({
      user_id: userId,
      type: isApproved ? 'ownership_request_approved' : 'ownership_request_rejected',
      i18n_key: isApproved ? 'notifications.ownershipRequestApproved' : 'notifications.ownershipRequestRejected',
      i18n_params: isApproved
        ? { establishmentName }
        : { establishmentName, adminNotes: adminNotes || '' },
      link,
      related_entity_type: 'ownership_request',
      related_entity_id: requestId
    });

    if (notificationId) {
      logger.info('Owner notified about request status change', {
        userId,
        status,
        notificationId
      });
    }
  } catch (error) {
    logger.error('Notify owner status change error:', error);
  }
};
