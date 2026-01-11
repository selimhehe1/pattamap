import { Response } from 'express';
import cloudinary, { ensureConfigured } from '../config/cloudinary';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';
import { asyncHandler, BadRequestError, NotFoundError } from '../middleware/asyncHandler';
import { missionTrackingService } from '../services/missionTrackingService';

/**
 * Upload user avatar
 * POST /api/upload/avatar
 */
export const uploadAvatar = asyncHandler(async (req: AuthRequest, res: Response) => {
  ensureConfigured();

  if (!req.user) {
    throw BadRequestError('Authentication required');
  }

  if (!req.file) {
    throw BadRequestError('No avatar image provided');
  }

  // Convert buffer to base64
  const b64 = Buffer.from(req.file.buffer).toString('base64');
  const dataURI = `data:${req.file.mimetype};base64,${b64}`;

  // Upload to Cloudinary with avatar-specific transformations
  const result = await cloudinary.uploader.upload(dataURI, {
    folder: 'pattaya-directory/avatars',
    public_id: `avatar_${req.user.id}_${Date.now()}`,
    transformation: [
      { width: 256, height: 256, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good', format: 'auto' }
    ]
  });

  // Update user avatar_url in database
  const { error } = await supabase
    .from('users')
    .update({
      avatar_url: result.secure_url,
      updated_at: new Date().toISOString()
    })
    .eq('id', req.user.id);

  if (error) {
    logger.error('Failed to update avatar in database:', error);
    throw BadRequestError('Failed to update avatar');
  }

  // Track photo upload for gamification missions
  try {
    await missionTrackingService.onPhotoUploaded(
      req.user.id,
      result.secure_url,
      'avatar',
      req.user.id
    );
  } catch (trackingError) {
    // Don't fail the upload if mission tracking fails
    logger.error('Failed to track avatar upload for missions:', trackingError);
  }

  logger.info('User avatar uploaded successfully', {
    userId: req.user.id,
    avatarUrl: result.secure_url
  });

  res.json({
    message: 'Avatar uploaded successfully',
    avatar: {
      url: result.secure_url,
      public_id: result.public_id
    }
  });
});

/**
 * Delete user avatar
 * DELETE /api/upload/avatar
 */
export const deleteAvatar = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw BadRequestError('Authentication required');
  }

  // Get current avatar URL to extract public_id for Cloudinary deletion
  const { data: userData, error: fetchError } = await supabase
    .from('users')
    .select('avatar_url')
    .eq('id', req.user.id)
    .single();

  if (fetchError) {
    logger.error('Failed to fetch user avatar:', fetchError);
    throw BadRequestError('Failed to fetch user data');
  }

  // If user has an avatar, try to delete it from Cloudinary
  if (userData?.avatar_url) {
    try {
      ensureConfigured();
      // Extract public_id from Cloudinary URL
      const urlParts = userData.avatar_url.split('/');
      const uploadIndex = urlParts.findIndex((part: string) => part === 'upload');
      if (uploadIndex !== -1) {
        // Get path after 'upload/v{version}/' and remove extension
        const pathParts = urlParts.slice(uploadIndex + 2);
        const publicId = pathParts.join('/').replace(/\.[^/.]+$/, '');
        await cloudinary.uploader.destroy(publicId);
        logger.info('Avatar deleted from Cloudinary', { publicId });
      }
    } catch (cloudinaryError) {
      // Log but don't fail - continue with database update
      logger.error('Failed to delete avatar from Cloudinary:', cloudinaryError);
    }
  }

  // Clear avatar_url in database
  const { error } = await supabase
    .from('users')
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', req.user.id);

  if (error) {
    logger.error('Failed to delete avatar from database:', error);
    throw BadRequestError('Failed to delete avatar');
  }

  logger.info('User avatar deleted successfully', { userId: req.user.id });

  res.json({ message: 'Avatar deleted successfully' });
});

/**
 * Get user public profile
 * GET /api/users/:userId
 */
export const getUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  const { data: user, error } = await supabase
    .from('users')
    .select('id, pseudonym, account_type, avatar_url, created_at')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw NotFoundError('User not found');
  }

  res.json({
    user: {
      id: user.id,
      username: user.pseudonym,
      account_type: user.account_type,
      avatar_url: user.avatar_url,
      created_at: user.created_at
    }
  });
});

/**
 * Delete user account (GDPR right to erasure)
 * DELETE /api/users/me
 *
 * This endpoint:
 * 1. Deletes user's favorites
 * 2. Deletes user's reviews
 * 3. Anonymizes employee profiles linked to user
 * 4. Deletes notifications
 * 5. Deletes user from Supabase Auth
 * 6. Deletes user record from database
 */
export const deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw BadRequestError('Authentication required');
  }

  const userId = req.user.id;
  logger.info('Starting account deletion process', { userId });

  try {
    // 1. Delete user's favorites
    const { error: favoritesError } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId);

    if (favoritesError) {
      logger.warn('Failed to delete favorites:', favoritesError);
    }

    // 2. Delete user's reviews
    const { error: reviewsError } = await supabase
      .from('reviews')
      .delete()
      .eq('user_id', userId);

    if (reviewsError) {
      logger.warn('Failed to delete reviews:', reviewsError);
    }

    // 3. Anonymize employee profiles linked to user (don't delete, just unlink)
    const { error: employeesError } = await supabase
      .from('employees')
      .update({
        user_id: null,
        claim_status: 'unclaimed',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (employeesError) {
      logger.warn('Failed to anonymize employee profiles:', employeesError);
    }

    // 4. Delete notifications
    const { error: notificationsError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (notificationsError) {
      logger.warn('Failed to delete notifications:', notificationsError);
    }

    // 5. Delete XP history (gamification)
    const { error: xpHistoryError } = await supabase
      .from('user_xp_history')
      .delete()
      .eq('user_id', userId);

    if (xpHistoryError) {
      logger.warn('Failed to delete XP history:', xpHistoryError);
    }

    // 6. Delete user achievements
    const { error: achievementsError } = await supabase
      .from('user_achievements')
      .delete()
      .eq('user_id', userId);

    if (achievementsError) {
      logger.warn('Failed to delete achievements:', achievementsError);
    }

    // 7. Delete ownership requests
    const { error: ownershipError } = await supabase
      .from('ownership_requests')
      .delete()
      .eq('user_id', userId);

    if (ownershipError) {
      logger.warn('Failed to delete ownership requests:', ownershipError);
    }

    // 8. Delete employee claim requests
    const { error: claimError } = await supabase
      .from('employee_claim_requests')
      .delete()
      .eq('user_id', userId);

    if (claimError) {
      logger.warn('Failed to delete claim requests:', claimError);
    }

    // 9. Delete user record from database
    const { error: userDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (userDeleteError) {
      logger.error('Failed to delete user record:', userDeleteError);
      throw BadRequestError('Failed to delete user account');
    }

    // 10. Delete from Supabase Auth
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      logger.error('Failed to delete from Supabase Auth:', authDeleteError);
      // The user record is already deleted, so we log but don't fail
    }

    logger.info('Account deleted successfully', { userId });

    res.json({
      message: 'Account deleted successfully',
      deleted_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Account deletion failed:', error);
    throw BadRequestError('Failed to delete account. Please try again or contact support.');
  }
});
