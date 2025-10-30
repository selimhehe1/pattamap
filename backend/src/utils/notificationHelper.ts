import { supabase } from '../config/supabase';
import { logger } from './logger';
import { NotificationType, CreateNotificationRequest } from '../types';
import { sendPushToUser } from '../services/pushService';

/**
 * Create a new in-app notification for a user
 * Automatically sends push notification if user has subscriptions
 *
 * v10.3 - i18n Support:
 * - NEW: Pass i18n_key + i18n_params for multilingual notifications
 * - Backward compatible: Still accepts title + message
 * - Metadata: i18n data stored in JSONB column
 *
 * @param params Notification parameters
 * @returns Created notification ID or null if failed
 */
export const createNotification = async (params: CreateNotificationRequest): Promise<string | null> => {
  try {
    // Build metadata object for i18n support
    const metadata: Record<string, any> = {};
    if (params.i18n_key) {
      metadata.i18n_key = params.i18n_key;
      if (params.i18n_params) {
        metadata.i18n_params = params.i18n_params;
      }
    }

    // Validation: Require either (i18n_key) OR (title + message)
    if (!params.i18n_key && (!params.title || !params.message)) {
      logger.error('Create notification validation error: Must provide either i18n_key OR (title + message)');
      return null;
    }

    // Fallback values for backward compatibility
    const title = params.title || 'Notification'; // Fallback if using i18n_key only
    const message = params.message || ''; // Fallback if using i18n_key only

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.user_id,
        type: params.type,
        title,
        message,
        link: params.link,
        related_entity_type: params.related_entity_type,
        related_entity_id: params.related_entity_id,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        is_read: false
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Create notification error:', error);
      return null;
    }

    logger.info('Notification created', {
      notificationId: data.id,
      userId: params.user_id,
      type: params.type,
      hasI18nKey: !!params.i18n_key
    });

    // Send push notification asynchronously (don't await to avoid blocking)
    // If push fails, it won't affect the in-app notification
    sendPushToUser(params.user_id, {
      title,
      body: message,
      icon: '/logo192.png',
      badge: '/badge.png',
      data: {
        url: params.link,
        notificationId: data.id,
        type: params.type
      },
      tag: params.type, // Group notifications by type
      requireInteraction: false
    }).catch(error => {
      // Silent fail for push - in-app notification still works
      logger.warn('Push notification failed (non-blocking)', {
        notificationId: data.id,
        userId: params.user_id,
        error: error.message
      });
    });

    return data.id;
  } catch (error) {
    logger.error('Create notification error:', error);
    return null;
  }
};

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
    // Get all admin users
    const { data: admins, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (error || !admins || admins.length === 0) {
      logger.warn('No admins found to notify');
      return;
    }

    // Use different i18n key when establishment is being created
    const i18nKey = isNewEstablishment
      ? 'notifications.newOwnershipRequestWithEstablishment'
      : 'notifications.newOwnershipRequest';

    // Create notification for each admin using Promise.all
    const notificationPromises = admins.map(admin =>
      createNotification({
        user_id: admin.id,
        type: 'new_ownership_request',
        i18n_key: i18nKey,
        i18n_params: { requesterPseudonym, establishmentName },
        link: '/admin/establishment-owners?tab=pending',
        related_entity_type: 'ownership_request',
        related_entity_id: requestId
      })
    );

    await Promise.all(notificationPromises);

    logger.info('Admins notified about new ownership request', {
      requestId,
      adminCount: admins.length,
      isNewEstablishment
    });
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
    // Use different i18n key when establishment is being created
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

/**
 * Mark notification as read
 * @param notificationId Notification ID
 * @param userId User ID (for security check)
 * @returns Success boolean
 */
export const markNotificationAsRead = async (
  notificationId: string,
  userId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId); // Ensure user owns this notification

    if (error) {
      logger.error('Mark notification as read error:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    return false;
  }
};

/**
 * Mark all notifications as read for a user
 * @param userId User ID
 * @returns Success boolean
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      logger.error('Mark all notifications as read error:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Mark all notifications as read error:', error);
    return false;
  }
};

// ============================================================================
// MODERATION NOTIFICATIONS
// ============================================================================

/**
 * Notify user when their content is approved
 * @param userId User ID
 * @param contentType Type of content (employee, establishment, comment)
 * @param contentName Name/title of content
 * @param contentId ID of content
 */
export const notifyUserContentApproved = async (
  userId: string,
  contentType: 'employee' | 'establishment' | 'comment',
  contentName: string,
  contentId?: string
): Promise<void> => {
  try {
    const typeMap = {
      employee: 'employee_approved',
      establishment: 'establishment_approved',
      comment: 'comment_approved'
    };

    const i18nKeyMap = {
      employee: 'notifications.employeeApproved',
      establishment: 'notifications.establishmentApproved',
      comment: 'notifications.commentApproved'
    };

    const link = contentId ? `/${contentType}/${contentId}` : undefined;

    await createNotification({
      user_id: userId,
      type: typeMap[contentType] as NotificationType,
      i18n_key: i18nKeyMap[contentType],
      i18n_params: { contentType, contentName },
      link,
      related_entity_type: contentType,
      related_entity_id: contentId
    });

    logger.info(`User notified: ${contentType} approved`, { userId, contentId });
  } catch (error) {
    logger.error('Notify content approved error:', error);
  }
};

/**
 * Notify user when their content is rejected
 * @param userId User ID
 * @param contentType Type of content
 * @param reason Rejection reason
 * @param contentId ID of content
 */
export const notifyUserContentRejected = async (
  userId: string,
  contentType: 'employee' | 'establishment' | 'comment',
  reason: string,
  contentId?: string
): Promise<void> => {
  try {
    const typeMap = {
      employee: 'employee_rejected',
      establishment: 'establishment_rejected',
      comment: 'comment_rejected'
    };

    const i18nKeyMap = {
      employee: 'notifications.employeeRejected',
      establishment: 'notifications.establishmentRejected',
      comment: 'notifications.commentRejected'
    };

    await createNotification({
      user_id: userId,
      type: typeMap[contentType] as NotificationType,
      i18n_key: i18nKeyMap[contentType],
      i18n_params: { contentType, reason },
      related_entity_type: contentType,
      related_entity_id: contentId
    });

    logger.info(`User notified: ${contentType} rejected`, { userId, contentId });
  } catch (error) {
    logger.error('Notify content rejected error:', error);
  }
};

// ============================================================================
// SOCIAL NOTIFICATIONS
// ============================================================================

/**
 * Notify user when someone replies to their comment
 * @param userId User ID (original comment author)
 * @param replierName Name of person who replied
 * @param employeeName Name of employee profile
 * @param commentId ID of the reply comment
 * @param employeeId ID of employee
 */
export const notifyCommentReply = async (
  userId: string,
  replierName: string,
  employeeName: string,
  commentId: string,
  employeeId: string
): Promise<void> => {
  try {
    await createNotification({
      user_id: userId,
      type: 'comment_reply',
      i18n_key: 'notifications.commentReply',
      i18n_params: { replierName, employeeName },
      link: `/employee/${employeeId}?commentId=${commentId}`,
      related_entity_type: 'comment',
      related_entity_id: commentId
    });

    logger.info('User notified: comment reply', { userId, commentId });
  } catch (error) {
    logger.error('Notify comment reply error:', error);
  }
};

/**
 * Notify user when they are mentioned in a comment
 * @param userId User ID
 * @param mentionerName Name of person who mentioned
 * @param employeeName Name of employee profile
 * @param commentId ID of comment
 * @param employeeId ID of employee
 */
export const notifyCommentMention = async (
  userId: string,
  mentionerName: string,
  employeeName: string,
  commentId: string,
  employeeId: string
): Promise<void> => {
  try {
    await createNotification({
      user_id: userId,
      type: 'comment_mention',
      i18n_key: 'notifications.commentMention',
      i18n_params: { mentionerName, employeeName },
      link: `/employee/${employeeId}?commentId=${commentId}`,
      related_entity_type: 'comment',
      related_entity_id: commentId
    });

    logger.info('User notified: mention', { userId, commentId });
  } catch (error) {
    logger.error('Notify mention error:', error);
  }
};

/**
 * Notify employee when someone adds them as favorite
 * @param employeeLinkedUserId User ID linked to employee
 * @param favoritedByName Name of user who favorited
 * @param employeeName Name of employee
 */
export const notifyNewFavorite = async (
  employeeLinkedUserId: string,
  favoritedByName: string,
  employeeName: string
): Promise<void> => {
  try {
    await createNotification({
      user_id: employeeLinkedUserId,
      type: 'new_favorite',
      i18n_key: 'notifications.newFavorite',
      i18n_params: { favoritedByName, employeeName },
      link: '/employee/dashboard',
      related_entity_type: 'employee',
      related_entity_id: employeeName
    });

    logger.info('Employee notified: new favorite', { employeeLinkedUserId });
  } catch (error) {
    logger.error('Notify new favorite error:', error);
  }
};

/**
 * Notify users when a favorited employee becomes available
 * @param employeeId Employee ID
 * @param employeeName Name of employee
 * @param establishmentName Name of current establishment (optional)
 */
export const notifyFavoriteAvailable = async (
  employeeId: string,
  employeeName: string,
  establishmentName?: string
): Promise<void> => {
  try {
    // Find all users who have favorited this employee
    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select('user_id')
      .eq('employee_id', employeeId);

    if (error || !favorites || favorites.length === 0) {
      logger.debug('No users to notify for favorited employee', { employeeId });
      return;
    }

    // Create notification for each user using Promise.all
    const notificationPromises = favorites.map(fav =>
      createNotification({
        user_id: fav.user_id,
        type: 'favorite_available',
        i18n_key: 'notifications.favoriteAvailable',
        i18n_params: { employeeName, establishmentName: establishmentName || '' },
        link: `/employee/${employeeId}`,
        related_entity_type: 'employee',
        related_entity_id: employeeId
      })
    );

    await Promise.all(notificationPromises);

    logger.info('Users notified: favorite available', {
      employeeId,
      userCount: favorites.length
    });
  } catch (error) {
    logger.error('Notify favorite available error:', error);
  }
};

// ============================================================================
// EMPLOYEE UPDATE NOTIFICATIONS
// ============================================================================

/**
 * Notify followers when employee profile is updated
 * @param userIds Array of user IDs to notify
 * @param employeeName Name of employee
 * @param updateType Type of update (profile, photos, position)
 * @param employeeId ID of employee
 */
export const notifyEmployeeUpdate = async (
  userIds: string[],
  employeeName: string,
  updateType: 'profile' | 'photos' | 'position',
  employeeId: string
): Promise<void> => {
  try {
    const typeMap = {
      profile: 'employee_profile_updated',
      photos: 'employee_photos_updated',
      position: 'employee_position_changed'
    };

    const i18nKeyMap = {
      profile: 'notifications.employeeProfileUpdated',
      photos: 'notifications.employeePhotosUpdated',
      position: 'notifications.employeePositionChanged'
    };

    // Create notification for each follower using Promise.all
    const notificationPromises = userIds.map(userId =>
      createNotification({
        user_id: userId,
        type: typeMap[updateType] as NotificationType,
        i18n_key: i18nKeyMap[updateType],
        i18n_params: { employeeName },
        link: `/employee/${employeeId}`,
        related_entity_type: 'employee',
        related_entity_id: employeeId
      })
    );

    await Promise.all(notificationPromises);

    logger.info('Users notified: employee update', {
      employeeId,
      updateType,
      userCount: userIds.length
    });
  } catch (error) {
    logger.error('Notify employee update error:', error);
  }
};

// ============================================================================
// ADMIN/MODERATOR NOTIFICATIONS
// ============================================================================

/**
 * Notify admins when new content is submitted for moderation
 * @param contentType Type of content
 * @param contentName Name of content
 * @param submitterName Name of submitter
 * @param itemId Moderation queue item ID
 */
export const notifyAdminsPendingContent = async (
  contentType: 'employee' | 'establishment' | 'comment',
  contentName: string,
  submitterName: string,
  itemId: string
): Promise<void> => {
  try {
    // Get all admins and moderators
    const { data: admins, error } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'moderator']);

    if (error || !admins || admins.length === 0) {
      logger.warn('No admins/moderators found to notify');
      return;
    }

    // Create notification for each admin/moderator using Promise.all
    const notificationPromises = admins.map(admin =>
      createNotification({
        user_id: admin.id,
        type: 'new_content_pending',
        i18n_key: 'notifications.newContentPending',
        i18n_params: { submitterName, contentType, contentName },
        link: `/admin/moderation?item=${itemId}`,
        related_entity_type: contentType,
        related_entity_id: itemId
      })
    );

    await Promise.all(notificationPromises);

    logger.info('Admins notified: new content pending', {
      contentType,
      itemId,
      adminCount: admins.length
    });
  } catch (error) {
    logger.error('Notify admins pending content error:', error);
  }
};

/**
 * Notify moderators when a new report is submitted
 * @param reportReason Report reason
 * @param reportedContent Description of reported content
 * @param reportId Report ID
 */
export const notifyModeratorsNewReport = async (
  reportReason: string,
  reportedContent: string,
  reportId: string
): Promise<void> => {
  try {
    // Get all admins and moderators
    const { data: moderators, error } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'moderator']);

    if (error || !moderators || moderators.length === 0) {
      logger.warn('No moderators found to notify');
      return;
    }

    // Create notification for each moderator using Promise.all
    const notificationPromises = moderators.map(mod =>
      createNotification({
        user_id: mod.id,
        type: 'new_report',
        i18n_key: 'notifications.newReport',
        i18n_params: { reportReason, reportedContent },
        link: `/admin/reports?reportId=${reportId}`,
        related_entity_type: 'report',
        related_entity_id: reportId
      })
    );

    await Promise.all(notificationPromises);

    logger.info('Moderators notified: new report', {
      reportId,
      moderatorCount: moderators.length
    });
  } catch (error) {
    logger.error('Notify moderators new report error:', error);
  }
};

// =====================================================
// VERIFICATION SYSTEM NOTIFICATIONS (Phase 1.1)
// =====================================================

/**
 * Notify employee when their verification is submitted
 * @param employeeLinkedUserId User ID linked to employee
 * @param employeeName Name of employee
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
 * @param employeeLinkedUserId User ID linked to employee
 * @param employeeName Name of employee
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
 * @param employeeLinkedUserId User ID linked to employee
 * @param employeeName Name of employee
 * @param reason Rejection reason from admin
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
 * @param employeeLinkedUserId User ID linked to employee
 * @param employeeName Name of employee
 * @param reason Revocation reason from admin
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
 * @param employeeName Name of employee requesting verification
 * @param verificationId ID of verification request
 */
export const notifyAdminsNewVerificationRequest = async (
  employeeName: string,
  verificationId: string
): Promise<void> => {
  try {
    // Get all admin users
    const { data: admins, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (error || !admins || admins.length === 0) {
      logger.warn('No admins found to notify');
      return;
    }

    // Create notification for each admin using Promise.all
    const notificationPromises = admins.map(admin =>
      createNotification({
        user_id: admin.id,
        type: 'new_verification_request',
        i18n_key: 'notifications.newVerificationRequest',
        i18n_params: { employeeName },
        link: '/admin/verifications/manual-review',
        related_entity_type: 'employee_verification',
        related_entity_id: verificationId
      })
    );

    await Promise.all(notificationPromises);

    logger.info('Admins notified about new verification request', {
      employeeName,
      verificationId,
      adminCount: admins.length
    });
  } catch (error) {
    logger.error('Notify admins verification request error:', error);
  }
};

// ============================================================================
// VIP SYSTEM NOTIFICATIONS
// ============================================================================

/**
 * Notify user when their VIP purchase is confirmed
 * @param userId - ID of user who purchased VIP
 * @param tier - VIP tier (bronze, silver, gold, platinum)
 * @param duration - Duration in days
 * @param price - Price paid in THB
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
 * @param userId - ID of user whose payment was verified
 * @param tier - VIP tier
 * @param expiresAt - Expiration date
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
 * @param userId - ID of user whose payment was rejected
 * @param tier - VIP tier
 * @param reason - Rejection reason
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
 * @param userId - ID of user whose subscription was cancelled
 * @param tier - VIP tier
 * @param reason - Cancellation reason
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
 * Notify admins when a new edit proposal is submitted (non-privileged users only)
 * @param proposalId - ID of the proposal
 * @param proposerName - Name of user who submitted the proposal
 * @param entityType - Type of entity being edited (employee/establishment)
 * @param entityName - Name of entity being edited
 */
export const notifyAdminsNewEditProposal = async (
  proposalId: string,
  proposerName: string,
  entityType: string,
  entityName: string
): Promise<void> => {
  try {
    // Get all admins
    const { data: admins, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true);

    if (error || !admins || admins.length === 0) {
      logger.warn('No active admins found for edit proposal notification');
      return;
    }

    // Create notification for each admin
    const notificationPromises = admins.map((admin) =>
      createNotification({
        user_id: admin.id,
        type: 'edit_proposal_submitted',
        i18n_key: 'notifications.editProposalSubmitted',
        i18n_params: { proposerName, entityType, entityName },
        link: `/admin/proposals`,
        related_entity_type: 'edit_proposal',
        related_entity_id: proposalId
      })
    );

    await Promise.all(notificationPromises);
    logger.info('Admins notified: new edit proposal', { proposalId, entityType, entityName });
  } catch (error) {
    logger.error('Notify admins new edit proposal error:', error);
  }
};

/**
 * Notify user when their edit proposal is approved
 * @param userId - ID of user who submitted the proposal
 * @param entityType - Type of entity (employee/establishment)
 * @param entityName - Name of entity
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
 * @param userId - ID of user who submitted the proposal
 * @param entityType - Type of entity (employee/establishment)
 * @param entityName - Name of entity
 * @param reason - Rejection reason
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
 * @param userId - ID of user being assigned
 * @param establishmentName - Name of establishment
 * @param establishmentId - ID of establishment
 * @param role - Owner role (owner/manager)
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
 * @param userId - ID of user being removed
 * @param establishmentName - Name of establishment
 * @param establishmentId - ID of establishment
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
 * @param userId - ID of user whose permissions changed
 * @param establishmentName - Name of establishment
 * @param establishmentId - ID of establishment
 * @param updatedPermissions - Object describing what changed
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

// ============================================================================
// MODERATION NOTIFICATIONS
// ============================================================================

/**
 * Notify comment author when their comment is removed by moderator
 * @param userId - ID of comment author
 * @param reason - Removal reason
 * @param entityType - Type of entity (employee/establishment)
 * @param entityName - Name of entity
 */
export const notifyCommentRemoved = async (
  userId: string,
  reason: string,
  entityType: string,
  entityName: string
): Promise<void> => {
  try {
    const link = entityType === 'employee' ? `/employee/${entityName}` : `/establishment/${entityName}`;

    await createNotification({
      user_id: userId,
      type: 'comment_removed',
      i18n_key: 'notifications.commentRemoved',
      i18n_params: { entityType, entityName, reason },
      link,
      related_entity_type: entityType,
      related_entity_id: entityName
    });

    logger.info('User notified: comment removed', { userId, entityType, entityName, reason });
  } catch (error) {
    logger.error('Notify comment removed error:', error);
  }
};

/**
 * Get unread notification count for a user
 * @param userId User ID
 * @returns Unread count or 0 if error
 */
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    // Use RPC function to bypass PostgREST cache issue
    const { data: count, error } = await supabase.rpc('get_unread_count', {
      p_user_id: userId
    });

    if (error) {
      logger.error('Get unread notification count error:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    logger.error('Get unread notification count error:', error);
    return 0;
  }
};
