import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { uploadMultiple, uploadSingle } from '../middleware/upload';
import {
  uploadImages,
  uploadSingleImage,
  uploadEstablishmentLogo,
  deleteImage,
  getImageInfo
} from '../controllers/uploadController';

const router = Router();

// Upload establishment logo (CSRF-exempt for session sync issues)
router.post('/establishment-logo', authenticateToken, uploadSingle, uploadEstablishmentLogo);

// All other upload routes require authentication and CSRF protection
router.use(authenticateToken);
router.use(csrfProtection);

// Upload multiple images (for employee profiles)
router.post('/images', uploadMultiple, uploadImages);

// Upload single image
router.post('/image', uploadSingle, uploadSingleImage);

// Delete image
router.delete('/image', deleteImage);

// Get image information
router.get('/image/:public_id', getImageInfo);

export default router;