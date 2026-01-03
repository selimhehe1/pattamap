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
