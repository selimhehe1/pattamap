/**
 * Social Notifications
 *
 * Notifications for social interactions (comments, mentions, favorites)
 */

import { supabase } from '../../config/supabase';
import { logger } from '../logger';
import { createNotification, notifyMultipleUsers } from './core';

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

    const userIds = favorites.map(f => f.user_id);

    await notifyMultipleUsers(
      userIds,
      (userId) => ({
        user_id: userId,
        type: 'favorite_available',
        i18n_key: 'notifications.favoriteAvailable',
        i18n_params: { employeeName, establishmentName: establishmentName || '' },
        link: `/employee/${employeeId}`,
        related_entity_type: 'employee',
        related_entity_id: employeeId
      }),
      `favorite available (${employeeName})`
    );
  } catch (error) {
    logger.error('Notify favorite available error:', error);
  }
};
