/**
 * Comment Helper Functions
 *
 * Extracted from commentController.ts to reduce file size
 */

import { supabase } from '../config/supabase';
import { logger } from './logger';
import { escapeLikeWildcards } from './validation';
import { notifyCommentReply, notifyCommentMention } from './notificationHelper';
import { missionTrackingService } from '../services/missionTrackingService';
import { awardXP } from '../services/gamificationService';
import { badgeAwardService } from '../services/badgeAwardService';

// Type definitions
export interface CommentPhotoRecord {
  id: string;
  comment_id: string;
  photo_url: string;
  cloudinary_public_id: string;
  display_order: number;
  created_at: string;
}

/** Helper: Insert photos for a comment */
export async function insertCommentPhotos(
  commentId: string,
  photoUrls: string[]
): Promise<CommentPhotoRecord[]> {
  if (!photoUrls || photoUrls.length === 0) return [];

  const photosToInsert = photoUrls.map((url, index) => {
    const urlParts = url.split('/');
    const filenameWithExt = urlParts[urlParts.length - 1];
    const publicId = filenameWithExt.split('.')[0];
    return { comment_id: commentId, photo_url: url, cloudinary_public_id: publicId, display_order: index };
  });

  const { data: photos, error } = await supabase
    .from('comment_photos')
    .insert(photosToInsert)
    .select();

  if (error) {
    logger.error('Insert comment photos error:', error);
    return [];
  }
  logger.info(`📸 Inserted ${photos?.length || 0} photos for comment ${commentId}`);
  return photos || [];
}

/** Helper: Handle notifications for comment creation */
export async function handleCommentNotifications(
  commentId: string,
  employeeId: string,
  userId: string,
  userPseudonym: string,
  content: string,
  parentCommentId?: string
): Promise<void> {
  // Notify parent comment author if this is a reply
  if (parentCommentId) {
    try {
      const { data: parentComment } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', parentCommentId)
        .single();

      const { data: employeeData } = await supabase
        .from('employees')
        .select('id, name')
        .eq('id', employeeId)
        .single();

      if (parentComment && employeeData && parentComment.user_id !== userId) {
        await notifyCommentReply(parentComment.user_id, userPseudonym, employeeData.name, commentId, employeeData.id);
      }
    } catch (err) {
      logger.error('Comment reply notification error:', err);
    }
  }

  // Detect and notify mentioned users (@username)
  try {
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const mentions = [...content.matchAll(mentionRegex)].map(match => match[1]);

    if (mentions.length > 0) {
      const { data: employeeData } = await supabase
        .from('employees')
        .select('id, name')
        .eq('id', employeeId)
        .single();

      if (employeeData) {
        const orConditions = mentions.map(m => `pseudonym.ilike.${escapeLikeWildcards(m.toLowerCase())}`).join(',');
        const { data: mentionedUsers } = await supabase.from('users').select('id, pseudonym').or(orConditions);

        if (mentionedUsers?.length) {
          await Promise.all(
            mentionedUsers
              .filter(user => user.id !== userId)
              .map(user => notifyCommentMention(user.id, userPseudonym, employeeData.name, commentId, employeeData.id))
          );
          logger.info(`Notified ${mentionedUsers.length} mentioned users in comment ${commentId}`);
        }
      }
    }
  } catch (err) {
    logger.error('Mention notification error:', err);
  }
}

/** Helper: Handle post-creation hooks (missions, badges, XP) */
export async function handlePostCreationHooks(
  userId: string,
  commentId: string,
  content: string,
  photoCount: number,
  isReply: boolean
): Promise<void> {
  if (isReply) return; // Only for parent comments

  // Track mission progress
  try {
    await missionTrackingService.onReviewCreated(userId, commentId, content?.length || 0, photoCount > 0);
  } catch (err) {
    logger.error('Mission tracking error for review:', err);
  }

  // Award badges
  try {
    const newBadges = await badgeAwardService.checkAndAwardBadges(userId, 'review_created');
    if (newBadges.length > 0) {
      logger.info(`🎉 Awarded ${newBadges.length} badge(s) to user ${userId}: ${newBadges.join(', ')}`);
    }
  } catch (err) {
    logger.error('Badge award error for review:', err);
  }

  // Award XP
  if (content) {
    try {
      await awardXP(userId, 50, 'review_created', 'comment', commentId);
    } catch (err) {
      logger.error('XP award error for review:', err);
    }
  }
}
