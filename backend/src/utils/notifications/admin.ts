/**
 * Admin/Moderator Notifications
 *
 * Notifications for admin and moderator actions
 */

import { logger } from '../logger';
import { fetchUserIdsByRole, notifyMultipleUsers } from './core';

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
    const staffIds = await fetchUserIdsByRole(['admin', 'moderator']);
    if (staffIds.length === 0) return;

    await notifyMultipleUsers(
      staffIds,
      (userId) => ({
        user_id: userId,
        type: 'new_content_pending',
        i18n_key: 'notifications.newContentPending',
        i18n_params: { submitterName, contentType, contentName },
        link: `/admin/moderation?item=${itemId}`,
        related_entity_type: contentType,
        related_entity_id: itemId
      }),
      `pending ${contentType} content (${itemId})`
    );
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
    const staffIds = await fetchUserIdsByRole(['admin', 'moderator']);
    if (staffIds.length === 0) return;

    await notifyMultipleUsers(
      staffIds,
      (userId) => ({
        user_id: userId,
        type: 'new_report',
        i18n_key: 'notifications.newReport',
        i18n_params: { reportReason, reportedContent },
        link: `/admin/reports?reportId=${reportId}`,
        related_entity_type: 'report',
        related_entity_id: reportId
      }),
      `new report (${reportId})`
    );
  } catch (error) {
    logger.error('Notify moderators new report error:', error);
  }
};
