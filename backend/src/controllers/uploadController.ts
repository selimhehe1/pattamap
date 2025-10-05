import { Response } from 'express';
import cloudinary from '../config/cloudinary';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export const uploadImages = async (req: AuthRequest, res: Response) => {
  try {
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

    res.json({
      message: 'Images uploaded successfully',
      images: uploadResults
    });
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
};

export const uploadSingleImage = async (req: AuthRequest, res: Response) => {
  try {
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