"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const csrf_1 = require("../middleware/csrf");
const upload_1 = require("../middleware/upload");
const uploadController_1 = require("../controllers/uploadController");
const router = (0, express_1.Router)();
// Upload establishment logo (CSRF-exempt for session sync issues)
router.post('/establishment-logo', auth_1.authenticateToken, upload_1.uploadSingle, uploadController_1.uploadEstablishmentLogo);
// Upload multiple images (CSRF-exempt because FormData is parsed by multer AFTER CSRF check)
// Security: Still requires authentication via JWT token
router.post('/images', auth_1.authenticateToken, upload_1.uploadMultiple, uploadController_1.uploadImages);
// All other upload routes require authentication and CSRF protection
router.use(auth_1.authenticateToken);
router.use(csrf_1.csrfProtection);
// Upload single image
router.post('/image', upload_1.uploadSingle, uploadController_1.uploadSingleImage);
// Delete image
router.delete('/image', uploadController_1.deleteImage);
// Get image information
router.get('/image/:public_id', uploadController_1.getImageInfo);
exports.default = router;
//# sourceMappingURL=upload.js.map