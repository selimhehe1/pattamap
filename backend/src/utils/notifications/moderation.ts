/**
 * Moderation Notifications
 *
 * Notifications related to content moderation (pending, approved, rejected)
 */

import { logger } from '../logger';
import { createNotification } from './core';
import {
  CONTENT_APPROVED_TYPE_MAP,
  CONTENT_APPROVED_I18N_MAP,
  CONTENT_REJECTED_TYPE_MAP,
  CONTENT_REJECTED_I18N_MAP
} from './types';

/**
 * Notify user when their content is pending review
 * @param userId User ID (the creator)
 * @param contentType Type of content (employee, establishment)
 * @param contentName Name/title of content
 * @param contentId ID of content
 */
export const notifyUserContentPendingReview = async (
  userId: string,
  contentType: 'employee' | 'establishment',
  contentName: string,
  contentId?: string
): Promise<void> => {
  try {
    await createNotification({
      user_id: userId,
      type: 'content_pending_review',
      i18n_key: 'notifications.contentPendingReview',
      i18n_params: { contentType, contentName },
      related_entity_type: contentType,
      related_entity_id: contentId
    });

    logger.info(`User notified: ${contentType} pending review`, { userId, contentId });
  } catch (error) {
    logger.error('Notify content pending review error:', error);
  }
};

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
    const link = contentId ? `/${contentType}/${contentId}` : undefined;

    await createNotification({
      user_id: userId,
      type: CONTENT_APPROVED_TYPE_MAP[contentType],
      i18n_key: CONTENT_APPROVED_I18N_MAP[contentType],
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
    await createNotification({
      user_id: userId,
      type: CONTENT_REJECTED_TYPE_MAP[contentType],
      i18n_key: CONTENT_REJECTED_I18N_MAP[contentType],
      i18n_params: { contentType, reason },
      related_entity_type: contentType,
      related_entity_id: contentId
    });

    logger.info(`User notified: ${contentType} rejected`, { userId, contentId });
  } catch (error) {
    logger.error('Notify content rejected error:', error);
  }
};

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
