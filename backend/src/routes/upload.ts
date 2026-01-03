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
import { uploadAvatar, deleteAvatar } from '../controllers/userController';

const router = Router();

// ========================================
// ROUTES WITHOUT CSRF (FormData uploads)
// ========================================
// These routes are CSRF-exempt because:
// 1. FormData is parsed by multer AFTER any CSRF middleware would check req.body
// 2. CSRF tokens cannot be included in multipart/form-data easily
// 3. Security is maintained via JWT authentication token
// ========================================

// Upload establishment logo (auth required, no CSRF)
router.post('/establishment-logo', authenticateToken, uploadSingle, uploadEstablishmentLogo);

// Upload multiple images (auth required, no CSRF)
router.post('/images', authenticateToken, uploadMultiple, uploadImages);

// Upload user avatar (auth required, no CSRF)
router.post('/avatar', authenticateToken, uploadSingle, uploadAvatar);

// ========================================
// ROUTES WITH CSRF (JSON/form requests)
// ========================================

// Delete user avatar (auth + CSRF required)
router.delete('/avatar', authenticateToken, csrfProtection, deleteAvatar);

// Upload single image (auth + CSRF required)
router.post('/image', authenticateToken, csrfProtection, uploadSingle, uploadSingleImage);

// Delete image (auth + CSRF required)
router.delete('/image', authenticateToken, csrfProtection, deleteImage);

// Get image information (auth only, GET is safe)
router.get('/image/:public_id', authenticateToken, getImageInfo);

export default router;
