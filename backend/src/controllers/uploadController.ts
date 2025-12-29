import { Response } from 'express';
import cloudinary, { ensureConfigured } from '../config/cloudinary';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';
import { missionTrackingService } from '../services/missionTrackingService';

export const uploadImages = async (req: AuthRequest, res: Response) => {
  try {
    // Ensure Cloudinary is configured (lazy init for Vercel serverless)
    ensureConfigured();

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    if (req.files.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 images allowed' });
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
              reject(error);
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    logger.error('Upload error:', { message: errorMessage, stack: errorStack });

    // Check if Cloudinary is configured
    const cloudinaryConfigured = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    res.status(500).json({
      error: 'Failed to upload images',
      details: errorMessage,
      cloudinaryConfigured
    });
  }
};

export const uploadSingleImage = async (req: AuthRequest, res: Response) => {
  try {
    // Ensure Cloudinary is configured (lazy init for Vercel serverless)
    ensureConfigured();

    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
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
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};

export const deleteImage = async (req: AuthRequest, res: Response) => {
  try {
    // Ensure Cloudinary is configured (lazy init for Vercel serverless)
    ensureConfigured();

    const { public_id } = req.body;

    if (!public_id) {
      return res.status(400).json({ error: 'Public ID is required' });
    }

    const result = await cloudinary.uploader.destroy(public_id);

    if (result.result === 'ok') {
      res.json({ message: 'Image deleted successfully' });
    } else {
      res.status(400).json({ error: 'Failed to delete image' });
    }
  } catch (error) {
    logger.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
};

export const uploadEstablishmentLogo = async (req: AuthRequest, res: Response) => {
  try {
    // Ensure Cloudinary is configured (lazy init for Vercel serverless)
    ensureConfigured();

    if (!req.file) {
      return res.status(400).json({ error: 'No logo image provided' });
    }

    // Verify user is admin or moderator
    if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin or moderator access required' });
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
  } catch (error) {
    logger.error('Logo upload error:', error);
    res.status(500).json({ error: 'Failed to upload establishment logo' });
  }
};

export const getImageInfo = async (req: AuthRequest, res: Response) => {
  try {
    // Ensure Cloudinary is configured (lazy init for Vercel serverless)
    ensureConfigured();

    const { public_id } = req.params;

    if (!public_id) {
      return res.status(400).json({ error: 'Public ID is required' });
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
  } catch (error) {
    logger.error('Get image info error:', error);
    res.status(500).json({ error: 'Failed to get image information' });
  }
};