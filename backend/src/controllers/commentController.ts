import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { CreateCommentRequest } from '../types';
import { logger } from '../utils/logger';
import { sanitizeErrorForClient, escapeLikeWildcards } from '../utils/validation';
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
    // Include photos from comment_photos table
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:users(pseudonym),
        photos:comment_photos(id, photo_url, cloudinary_public_id, display_order)
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
    // Photos are now included from the Supabase query (comment_photos join)
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

    const { employee_id, content, rating, parent_comment_id, photo_urls }: CreateCommentRequest = req.body;

    if (!employee_id || !content) {
      logger.debug('❌ Validation failed: missing employee_id or content');
      return res.status(400).json({ error: 'Employee ID and content are required' });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // 📸 v10.4 - Validate photo URLs (max 3, only for parent comments)
    if (photo_urls && photo_urls.length > 3) {
      return res.status(400).json({ error: 'Maximum 3 photos allowed per review' });
    }
    if (photo_urls && parent_comment_id) {
      return res.status(400).json({ error: 'Photos can only be added to reviews, not replies' });
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

    // 📸 v10.4 - Insert photos if provided
    let insertedPhotos: any[] = [];
    if (photo_urls && photo_urls.length > 0) {
      const photosToInsert = photo_urls.map((url, index) => {
        // Extract cloudinary public_id from URL
        // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
        const urlParts = url.split('/');
        const filenameWithExt = urlParts[urlParts.length - 1];
        const publicId = filenameWithExt.split('.')[0];

        return {
          comment_id: comment.id,
          photo_url: url,
          cloudinary_public_id: publicId,
          display_order: index
        };
      });

      const { data: photos, error: photosError } = await supabase
        .from('comment_photos')
        .insert(photosToInsert)
        .select();

      if (photosError) {
        logger.error('Insert comment photos error:', photosError);
        // Don't fail the entire request, just log the error
        // The comment was already created successfully
      } else {
        insertedPhotos = photos || [];
        logger.info(`📸 Inserted ${insertedPhotos.length} photos for comment ${comment.id}`);
      }
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
          // 🔧 FIX S1: Escape LIKE wildcards to prevent mention injection
          const orConditions = mentions
            .map(m => `pseudonym.ilike.${escapeLikeWildcards(m.toLowerCase())}`)
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
        // 📸 v10.4 - Now using actual photo count
        const hasPhotos = insertedPhotos.length > 0;
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

    // 📸 v10.4 - Include photos in response
    const commentWithPhotos = {
      ...comment,
      photos: insertedPhotos.sort((a: any, b: any) => a.display_order - b.display_order)
    };

    res.status(201).json({
      message: 'Comment added successfully',
      comment: commentWithPhotos
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

// 🏢 v10.4 - Create establishment response to a review
export const createEstablishmentResponse = async (req: AuthRequest, res: Response) => {
  try {
    const { id: commentId } = req.params;
    const { content, establishment_id } = req.body;

    if (!content || !establishment_id) {
      return res.status(400).json({ error: 'Content and establishment_id are required' });
    }

    if (content.trim().length < 10) {
      return res.status(400).json({ error: 'Response must be at least 10 characters' });
    }

    // Verify the original comment exists and get employee info
    const { data: originalComment, error: commentError } = await supabase
      .from('comments')
      .select(`
        id,
        employee_id,
        user_id,
        content,
        employee:employees(id, name)
      `)
      .eq('id', commentId)
      .is('parent_comment_id', null) // Only parent comments (reviews) can have establishment responses
      .single();

    if (commentError || !originalComment) {
      logger.error('Original comment not found:', commentError);
      return res.status(404).json({ error: 'Review not found or is a reply' });
    }

    // Verify user is an owner/manager of the establishment
    const { data: ownership, error: ownershipError } = await supabase
      .from('establishment_owners')
      .select('id, owner_role')
      .eq('user_id', req.user!.id)
      .eq('establishment_id', establishment_id)
      .single();

    if (ownershipError || !ownership) {
      logger.warn(`User ${req.user!.id} attempted to respond as establishment ${establishment_id} without ownership`);
      return res.status(403).json({ error: 'You are not authorized to respond on behalf of this establishment' });
    }

    // Check if establishment already responded to this review
    const { data: existingResponse } = await supabase
      .from('comments')
      .select('id')
      .eq('parent_comment_id', commentId)
      .eq('is_establishment_response', true)
      .eq('responding_establishment_id', establishment_id)
      .single();

    if (existingResponse) {
      return res.status(400).json({ error: 'This establishment has already responded to this review' });
    }

    // Create the establishment response
    const { data: response, error: insertError } = await supabase
      .from('comments')
      .insert({
        employee_id: originalComment.employee_id,
        user_id: req.user!.id,
        parent_comment_id: commentId,
        content: content.trim(),
        is_establishment_response: true,
        responding_establishment_id: establishment_id,
        status: 'approved' // Establishment responses are auto-approved
      })
      .select(`
        *,
        user:users(pseudonym),
        establishment:establishments!responding_establishment_id(id, name)
      `)
      .single();

    if (insertError) {
      logger.error('Create establishment response error:', insertError);
      return res.status(400).json({ error: sanitizeErrorForClient(insertError, 'create') });
    }

    // 🔔 Notify the original reviewer
    try {
      const employeeName = (originalComment.employee as any)?.name || 'Employee';

      // Get establishment name
      const { data: establishment } = await supabase
        .from('establishments')
        .select('name')
        .eq('id', establishment_id)
        .single();

      const establishmentName = establishment?.name || 'An establishment';

      await notifyCommentReply(
        originalComment.user_id,
        establishmentName, // Responder name (establishment name)
        employeeName,
        response.id,
        originalComment.employee_id
      );

      logger.info(`Notified user ${originalComment.user_id} of establishment response from ${establishmentName}`);
    } catch (notifyError) {
      // Don't fail the request if notification fails
      logger.error('Establishment response notification error:', notifyError);
    }

    res.status(201).json({
      message: 'Establishment response added successfully',
      response
    });
  } catch (error) {
    logger.error('Create establishment response error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 🏢 v10.4 - Get reviews for an establishment's employees (for owner panel)
export const getEstablishmentReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { establishment_id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Verify user is an owner/manager of the establishment
    const { data: ownership, error: ownershipError } = await supabase
      .from('establishment_owners')
      .select('id')
      .eq('user_id', req.user!.id)
      .eq('establishment_id', establishment_id)
      .single();

    if (ownershipError || !ownership) {
      return res.status(403).json({ error: 'You are not authorized to view reviews for this establishment' });
    }

    // Get employees currently working at this establishment
    const { data: employments } = await supabase
      .from('employment_history')
      .select('employee_id')
      .eq('establishment_id', establishment_id)
      .eq('is_current', true);

    const employeeIds = employments?.map(e => e.employee_id) || [];

    if (employeeIds.length === 0) {
      return res.json({ reviews: [], total: 0, page: Number(page), limit: Number(limit) });
    }

    // Get reviews for these employees
    const offset = (Number(page) - 1) * Number(limit);

    const { data: reviews, error: reviewsError, count } = await supabase
      .from('comments')
      .select(`
        *,
        user:users(pseudonym),
        employee:employees(id, name),
        photos:comment_photos(id, photo_url, display_order),
        responses:comments!parent_comment_id(
          id,
          content,
          created_at,
          is_establishment_response,
          user:users(pseudonym),
          establishment:establishments!responding_establishment_id(id, name)
        )
      `, { count: 'exact' })
      .in('employee_id', employeeIds)
      .is('parent_comment_id', null) // Only parent reviews
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (reviewsError) {
      logger.error('Get establishment reviews error:', reviewsError);
      return res.status(400).json({ error: sanitizeErrorForClient(reviewsError, 'fetch') });
    }

    // Check which reviews already have establishment responses
    const reviewsWithResponseStatus = reviews?.map(review => ({
      ...review,
      has_establishment_response: (review.responses || []).some(
        (r: any) => r.is_establishment_response
      )
    })) || [];

    res.json({
      reviews: reviewsWithResponseStatus,
      total: count || 0,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    logger.error('Get establishment reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};