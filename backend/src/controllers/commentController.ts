import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { CreateCommentRequest } from '../types';
import { logger } from '../utils/logger';
import { sanitizeErrorForClient } from '../utils/validation';
import { notifyCommentReply, notifyCommentMention, notifyModeratorsNewReport } from '../utils/notificationHelper';
import { missionTrackingService } from '../services/missionTrackingService';
import { awardXP } from '../services/gamificationService';
import { badgeAwardService } from '../services/badgeAwardService';

export const getComments = async (req: AuthRequest, res: Response) => {
  try {
    const { employee_id } = req.query;
    const { status = 'approved' } = req.query;

    if (!employee_id) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    // 🔧 Get ALL comments (parents + replies) but exclude ratings
    // Comments have rating = null, ratings have rating != null
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:users(pseudonym)
      `)
      .eq('employee_id', employee_id)
      .eq('status', status)
      .is('rating', null) // 🎯 EXCLUDE rating entries - only get actual comments
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Get comments error:', error);
      return res.status(400).json({ error: sanitizeErrorForClient(error, 'fetch') });
    }

    // 🔧 Map parent_comment_id → parent_id for frontend compatibility
    const mappedComments = comments?.map(comment => ({
      ...comment,
      parent_id: comment.parent_comment_id
    })) || [];

    logger.debug('🔧 BACKEND - getComments result:');
    logger.debug('Total comments:', mappedComments.length);
    logger.debug('Comments with parent_id:', mappedComments.filter(c => c.parent_id).length);
    logger.debug('Parent comments:', mappedComments.filter(c => !c.parent_id).length);

    res.json({ comments: mappedComments });
  } catch (error) {
    logger.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    logger.debug('🎯 CREATE COMMENT - Body:', req.body);
    logger.debug('🎯 CREATE COMMENT - User:', req.user);

    const { employee_id, content, rating, parent_comment_id }: CreateCommentRequest = req.body;

    if (!employee_id || !content) {
      logger.debug('❌ Validation failed: missing employee_id or content');
      return res.status(400).json({ error: 'Employee ID and content are required' });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if employee exists and is approved
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, status')
      .eq('id', employee_id)
      .eq('status', 'approved')
      .single();

    if (employeeError || !employee) {
      return res.status(404).json({ error: 'Employee not found or not approved' });
    }

    // Check if parent comment exists (for replies)
    if (parent_comment_id) {
      const { data: parentComment } = await supabase
        .from('comments')
        .select('id')
        .eq('id', parent_comment_id)
        .single();

      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    // 🎯 FIXED: Check if user already rated this employee (only for parent comments with rating)
    // Using the same logic as updateUserRating for consistency
    // ========================================
    // BUG #6 FIX - Robust duplicate rating validation
    // ========================================
    // Issue: .single() fails if multiple duplicates exist (DB corruption case)
    // Fix: Use .select() to handle all cases (0, 1, or >1 ratings)
    if (rating && !parent_comment_id) {
      const { data: existingRatings, error: checkError } = await supabase
        .from('comments')
        .select('id, rating')
        .eq('user_id', req.user!.id)
        .eq('employee_id', employee_id)
        .not('rating', 'is', null)
        .is('parent_comment_id', null);

      if (checkError) {
        logger.error('Error checking existing rating:', checkError);
        return res.status(500).json({ error: 'Failed to check existing rating' });
      }

      if (existingRatings && existingRatings.length > 0) {
        // Log warning if multiple ratings found (DB corruption case)
        if (existingRatings.length > 1) {
          logger.warn('Multiple ratings found for same user/employee (DB corruption)', {
            userId: req.user!.id,
            employeeId: employee_id,
            count: existingRatings.length,
            ratingIds: existingRatings.map(r => r.id)
          });
        }

        return res.status(400).json({
          error: 'You have already rated this employee. You can update your rating using the rating section above, or add a review without rating.',
          existing_rating: existingRatings[0].rating
        });
      }
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        employee_id,
        user_id: req.user!.id,
        content,
        rating: parent_comment_id ? null : rating, // Only parent comments can have ratings
        parent_comment_id,
        status: 'approved' // Comments are approved by default, can be moderated post-publication
      })
      .select(`
        *,
        user:users(pseudonym)
      `)
      .single();

    if (error) {
      logger.error('Insert comment error:', error);
      // Handle unique constraint violation (database-level protection)
      if (error.code === '23505' && error.message.includes('unique_user_employee_rating')) {
        return res.status(400).json({
          error: 'You have already rated this employee. You can update your rating using the rating section above, or add a review without rating.'
        });
      }
      return res.status(400).json({ error: sanitizeErrorForClient(error, 'create') });
    }

    // Notify parent comment author if this is a reply
    if (parent_comment_id) {
      try {
        // Get parent comment author
        const { data: parentComment } = await supabase
          .from('comments')
          .select('user_id, user:users(pseudonym)')
          .eq('id', parent_comment_id)
          .single();

        // Get employee name
        const { data: employeeData } = await supabase
          .from('employees')
          .select('id, name')
          .eq('id', employee_id)
          .single();

        // Only notify if parent comment author is different from reply author
        if (parentComment && employeeData && parentComment.user_id !== req.user!.id) {
          await notifyCommentReply(
            parentComment.user_id,
            req.user!.pseudonym,
            employeeData.name,
            comment.id,
            employeeData.id
          );
        }
      } catch (notifyError) {
        // Log error but don't fail the request if notification fails
        logger.error('Comment reply notification error:', notifyError);
      }
    }

    // 🔔 Detect and notify mentioned users (@username)
    try {
      // Extract mentions from content using regex (e.g., @john_doe, @user123)
      const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
      const mentions = [...content.matchAll(mentionRegex)].map(match => match[1]);

      if (mentions.length > 0) {
        // Get employee name for notification
        const { data: employeeData } = await supabase
          .from('employees')
          .select('id, name')
          .eq('id', employee_id)
          .single();

        if (employeeData) {
          // Find users with these pseudonyms (case-insensitive)
          // Build OR condition for each mention
          const orConditions = mentions
            .map(m => `pseudonym.ilike.${m.toLowerCase()}`)
            .join(',');

          const { data: mentionedUsers } = await supabase
            .from('users')
            .select('id, pseudonym')
            .or(orConditions);

          // Notify each mentioned user (except the comment author)
          if (mentionedUsers && mentionedUsers.length > 0) {
            const notifyPromises = mentionedUsers
              .filter(user => user.id !== req.user!.id) // Don't notify self
              .map(user =>
                notifyCommentMention(
                  user.id,
                  req.user!.pseudonym,
                  employeeData.name,
                  comment.id,
                  employeeData.id
                )
              );

            await Promise.all(notifyPromises);
            logger.info(`Notified ${notifyPromises.length} mentioned users in comment ${comment.id}`);
          }
        }
      }
    } catch (mentionError) {
      // Log error but don't fail the request if mention notifications fail
      logger.error('Mention notification error:', mentionError);
    }

    // Track mission progress for reviews (only for parent comments, not replies)
    if (!parent_comment_id) {
      try {
        const reviewLength = content?.length || 0;
        // TODO Phase 3: Check if comment has photos (via user_photo_uploads table)
        const hasPhotos = false; // Placeholder until Phase 3 photo tracking
        await missionTrackingService.onReviewCreated(req.user!.id, comment.id, reviewLength, hasPhotos);
      } catch (missionError) {
        // Log error but don't fail the request if mission tracking fails
        logger.error('Mission tracking error for review:', missionError);
      }
    }

    // 🏅 Check and award badges for review creation (only for parent comments, not replies)
    if (!parent_comment_id) {
      try {
        const newBadges = await badgeAwardService.checkAndAwardBadges(req.user!.id, 'review_created');
        if (newBadges.length > 0) {
          logger.info(`🎉 Awarded ${newBadges.length} badge(s) to user ${req.user!.id}: ${newBadges.join(', ')}`);
        }
      } catch (badgeError) {
        // Log error but don't fail the request if badge award fails
        logger.error('Badge award error for review:', badgeError);
      }
    }

    // ✅ Award XP for review creation (only for parent comments with content)
    // Replies don't award XP to avoid spam
    if (!parent_comment_id && content) {
      try {
        // Award 50 XP for creating a review
        await awardXP(
          req.user!.id,
          50,
          'review_created',
          'comment',
          comment.id
        );
        logger.info(`✅ XP awarded: +50 XP for review ${comment.id} by user ${req.user!.id}`);
      } catch (xpError) {
        // Log error but don't fail the request if XP attribution fails
        // This ensures comment creation succeeds even if gamification system has issues
        logger.error('XP attribution error (non-critical):', xpError);
      }
    }

    res.status(201).json({
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    logger.error('Create comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, rating } = req.body;

    // Check if user owns this comment or is moderator/admin
    const { data: comment } = await supabase
      .from('comments')
      .select('user_id, parent_comment_id')
      .eq('id', id)
      .single();

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user_id !== req.user!.id && !['admin', 'moderator'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Not authorized to update this comment' });
    }

    const updates: any = {};
    if (content) updates.content = content;
    if (rating && !comment.parent_comment_id) updates.rating = rating; // Only parent comments can have ratings

    const { data: updatedComment, error } = await supabase
      .from('comments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        user:users(pseudonym)
      `)
      .single();

    if (error) {
      logger.error('Update comment error:', error);
      return res.status(400).json({ error: sanitizeErrorForClient(error, 'update') });
    }

    res.json({
      message: 'Comment updated successfully',
      comment: updatedComment
    });
  } catch (error) {
    logger.error('Update comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check permissions
    const { data: comment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user_id !== req.user!.id && !['admin', 'moderator'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Delete comment error:', error);
      return res.status(400).json({ error: sanitizeErrorForClient(error, 'delete') });
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    logger.error('Delete comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const reportComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    // Check if comment exists and get details for notification
    const { data: comment } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        employee:employees(name)
      `)
      .eq('id', id)
      .single();

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user already reported this comment
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('comment_id', id)
      .eq('reported_by', req.user!.id)
      .single();

    if (existingReport) {
      return res.status(400).json({ error: 'You have already reported this comment' });
    }

    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        comment_id: id,
        reported_by: req.user!.id,
        reason,
        description,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      logger.error('Report comment error:', error);
      return res.status(400).json({ error: sanitizeErrorForClient(error, 'create') });
    }

    // 🔔 Notify moderators about the new report
    try {
      const employeeName = (comment.employee as any)?.name || 'Unknown';
      const commentPreview = comment.content.length > 50
        ? comment.content.substring(0, 50) + '...'
        : comment.content;

      const reportedContent = `comment on ${employeeName}: "${commentPreview}"`;

      await notifyModeratorsNewReport(
        reason,
        reportedContent,
        report.id
      );
    } catch (notifyError) {
      // Log error but don't fail the request if notification fails
      logger.error('Report notification error:', notifyError);
    }

    res.status(201).json({
      message: 'Comment reported successfully',
      report
    });
  } catch (error) {
    logger.error('Report comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEmployeeRatings = async (req: AuthRequest, res: Response) => {
  try {
    const { employee_id } = req.params;

    const { data: ratings, error } = await supabase
      .from('comments')
      .select('rating, created_at')
      .eq('employee_id', employee_id)
      .eq('status', 'approved')
      .not('rating', 'is', null);

    if (error) {
      logger.error('Get employee ratings error:', error);
      return res.status(400).json({ error: sanitizeErrorForClient(error, 'fetch') });
    }

    const validRatings = ratings?.map(r => r.rating).filter(r => r !== null) || [];
    const averageRating = validRatings.length > 0
      ? validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length
      : null;

    // Rating distribution
    const distribution = {
      1: validRatings.filter(r => r === 1).length,
      2: validRatings.filter(r => r === 2).length,
      3: validRatings.filter(r => r === 3).length,
      4: validRatings.filter(r => r === 4).length,
      5: validRatings.filter(r => r === 5).length,
    };

    res.json({
      average_rating: averageRating,
      total_ratings: validRatings.length,
      distribution,
      ratings: ratings
    });
  } catch (error) {
    logger.error('Get employee ratings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 🎯 NEW: Get user's rating for an employee
export const getUserRating = async (req: AuthRequest, res: Response) => {
  try {
    const { employee_id } = req.params;

    // 🔧 FIX: Handle multiple ratings (duplicates) by getting the most recent one
    const { data: userRatings, error } = await supabase
      .from('comments')
      .select('id, rating, content, created_at')
      .eq('user_id', req.user!.id)
      .eq('employee_id', employee_id)
      .not('rating', 'is', null)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .limit(1);

    const userRating = userRatings && userRatings.length > 0 ? userRatings[0] : null;

    // 🚨 DEBUG: Log if duplicates found
    if (userRatings && userRatings.length > 1) {
      logger.debug(`⚠️ WARNING: Found ${userRatings.length} ratings for user ${req.user!.id} and employee ${employee_id}`);
    }

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      logger.error('Get user rating error:', error);
      return res.status(400).json({ error: sanitizeErrorForClient(error, 'fetch') });
    }

    res.json({
      user_rating: userRating || null
    });
  } catch (error) {
    logger.error('Get user rating error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 🎯 NEW: Update user's rating for an employee
export const updateUserRating = async (req: AuthRequest, res: Response) => {
  try {
    const { employee_id } = req.params;
    const { rating, content } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Valid rating (1-5) is required' });
    }

    // Check if employee exists and is approved
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, status')
      .eq('id', employee_id)
      .eq('status', 'approved')
      .single();

    if (employeeError || !employee) {
      return res.status(404).json({ error: 'Employee not found or not approved' });
    }

    // Find existing rating comment
    const { data: existingRating, error: findError } = await supabase
      .from('comments')
      .select('id')
      .eq('user_id', req.user!.id)
      .eq('employee_id', employee_id)
      .not('rating', 'is', null)
      .is('parent_comment_id', null)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      return res.status(400).json({ error: findError.message });
    }

    let updatedComment;

    if (existingRating) {
      // Update existing rating
      const { data: updated, error: updateError } = await supabase
        .from('comments')
        .update({
          rating,
          content: content || 'Rating updated',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRating.id)
        .select(`
          *,
          user:users(pseudonym)
        `)
        .single();

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }
      updatedComment = updated;
    } else {
      // Create new rating comment
      const { data: newComment, error: createError } = await supabase
        .from('comments')
        .insert({
          employee_id,
          user_id: req.user!.id,
          content: content || 'User rating',
          rating,
          status: 'approved'
        })
        .select(`
          *,
          user:users(pseudonym)
        `)
        .single();

      if (createError) {
        return res.status(400).json({ error: createError.message });
      }
      updatedComment = newComment;
    }

    res.json({
      message: existingRating ? 'Rating updated successfully' : 'Rating added successfully',
      comment: updatedComment
    });
  } catch (error) {
    logger.error('Update user rating error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};