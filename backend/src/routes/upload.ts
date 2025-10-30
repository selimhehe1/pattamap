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

// Upload multiple images (CSRF-exempt because FormData is parsed by multer AFTER CSRF check)
// Security: Still requires authentication via JWT token
router.post('/images', authenticateToken, uploadMultiple, uploadImages);

// All other upload routes require authentication and CSRF protection
router.use(authenticateToken);
router.use(csrfProtection);

// Upload single image
router.post('/image', uploadSingle, uploadSingleImage);

// Delete image
router.delete('/image', deleteImage);

// Get image information
router.get('/image/:public_id', getImageInfo);

export default router;