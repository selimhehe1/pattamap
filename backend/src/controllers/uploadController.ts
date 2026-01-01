import { Response } from 'express';
import cloudinary, { ensureConfigured } from '../config/cloudinary';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';
import { missionTrackingService } from '../services/missionTrackingService';
import { asyncHandler, BadRequestError, ForbiddenError } from '../middleware/asyncHandler';

export const uploadImages = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Ensure Cloudinary is configured (lazy init for Vercel serverless)
    ensureConfigured();

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw BadRequestError('No images provided');
    }

    if (req.files.length > 5) {
      throw BadRequestError('Maximum 5 images allowed');
    }

    const uploadPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        // Convert buffer to base64
        const b64 = Buffer.from(file.buffer).toString('base64');
        const dataURI = `data:${file.mimetype};base64,${b64}`;

        cloudinary.uploader.upload(
          dataURI,
          {
            folder: 'pattaya-directory/employees',
            public_id: `employee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            transformation: [
              { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
              { format: 'auto' }
            ]
          },
          (error, result) => {
            if (error) {
              // Log detailed Cloudinary error for debugging
              const cloudinaryError = error as { http_code?: number; error?: { message?: string } };
              logger.error('Cloudinary upload callback error:', {
                message: error.message,
                name: error.name,
                http_code: cloudinaryError.http_code,
                error_obj: JSON.stringify(error, Object.getOwnPropertyNames(error))
              });
              // Wrap in Error for consistent handling
              const uploadError = new Error(
                error.message || cloudinaryError.error?.message || `Cloudinary error: ${JSON.stringify(error)}`
              );
              reject(uploadError);
            } else {
              resolve({
                url: result!.secure_url,
                public_id: result!.public_id,
                width: result!.width,
                height: result!.height
              });
            }
          }
        );
      });
    });

    const uploadResults = await Promise.all(uploadPromises);

    // Track photos for gamification (Phase 3)
    if (req.user?.id) {
      try {
        for (const result of uploadResults) {
          // Type guard: ensure result has expected properties
          if (typeof result === 'object' && result !== null && 'url' in result && 'width' in result && 'height' in result) {
            const uploadResult = result as { url: string; public_id: string; width: number; height: number };

            // Insert into user_photo_uploads table
            await supabase.from('user_photo_uploads').insert({
              user_id: req.user.id,
              photo_url: uploadResult.url,
              entity_type: 'employee',
              entity_id: null, // Will be set later when photo is attached to employee
              width: uploadResult.width,
              height: uploadResult.height,
              uploaded_at: new Date().toISOString()
            });

            // Trigger mission tracking (Photo Hunter, Photo Marathon, badges)
            await missionTrackingService.onPhotoUploaded(
              req.user.id,
              uploadResult.url,
              'employee',
              null
            );
          }
        }
        logger.info('Photo uploads tracked for gamification', { userId: req.user.id, count: uploadResults.length });
      } catch (trackingError) {
        // Don't fail the upload if tracking fails
        logger.error('Failed to track photo uploads for gamification:', trackingError);
      }
    }

    res.json({
      message: 'Images uploaded successfully',
      images: uploadResults
    });
});

export const uploadSingleImage = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Ensure Cloudinary is configured (lazy init for Vercel serverless)
    ensureConfigured();

    if (!req.file) {
      throw BadRequestError('No image provided');
    }

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'pattaya-directory/general',
      public_id: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transformation: [
        { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
        { format: 'auto' }
      ]
    });

    // Track photo for gamification (Phase 3)
    if (req.user?.id) {
      try {
        await supabase.from('user_photo_uploads').insert({
          user_id: req.user.id,
          photo_url: result.secure_url,
          entity_type: 'review', // Single images typically for reviews
          entity_id: null,
          width: result.width,
          height: result.height,
          uploaded_at: new Date().toISOString()
        });

        await missionTrackingService.onPhotoUploaded(
          req.user.id,
          result.secure_url,
          'review',
          null
        );

        logger.info('Single photo upload tracked for gamification', { userId: req.user.id });
      } catch (trackingError) {
        logger.error('Failed to track single photo upload:', trackingError);
      }
    }

    res.json({
      message: 'Image uploaded successfully',
      image: {
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height
      }
    });
});

export const deleteImage = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Ensure Cloudinary is configured (lazy init for Vercel serverless)
    ensureConfigured();

    const { public_id } = req.body;

    if (!public_id) {
      throw BadRequestError('Public ID is required');
    }

    const result = await cloudinary.uploader.destroy(public_id);

    if (result.result === 'ok') {
      res.json({ message: 'Image deleted successfully' });
    } else {
      throw BadRequestError('Failed to delete image');
    }
});

export const uploadEstablishmentLogo = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Ensure Cloudinary is configured (lazy init for Vercel serverless)
    ensureConfigured();

    if (!req.file) {
      throw BadRequestError('No logo image provided');
    }

    // Verify user is admin or moderator
    if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
      throw ForbiddenError('Admin or moderator access required');
    }

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'pattaya-directory/establishments',
      public_id: `establishment_logo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transformation: [
        { width: 64, height: 64, crop: 'fill', quality: 'auto:good' },
        { format: 'png' }
      ]
    });

    // Track photo for gamification (Phase 3)
    if (req.user?.id) {
      try {
        await supabase.from('user_photo_uploads').insert({
          user_id: req.user.id,
          photo_url: result.secure_url,
          entity_type: 'establishment',
          entity_id: null, // Will be set when logo is attached to establishment
          width: result.width,
          height: result.height,
          uploaded_at: new Date().toISOString()
        });

        await missionTrackingService.onPhotoUploaded(
          req.user.id,
          result.secure_url,
          'establishment',
          null
        );

        logger.info('Establishment logo tracked for gamification', { userId: req.user.id });
      } catch (trackingError) {
        logger.error('Failed to track establishment logo upload:', trackingError);
      }
    }

    res.json({
      message: 'Establishment logo uploaded successfully',
      logo: {
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height
      }
    });
});

export const getImageInfo = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Ensure Cloudinary is configured (lazy init for Vercel serverless)
    ensureConfigured();

    const { public_id } = req.params;

    if (!public_id) {
      throw BadRequestError('Public ID is required');
    }

    const result = await cloudinary.api.resource(public_id);

    res.json({
      image: {
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        created_at: result.created_at
      }
    });
});