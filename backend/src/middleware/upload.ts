import multer from 'multer';
import { Request } from 'express';

// Configure multer for memory storage (we'll upload to Cloudinary)
const storage = multer.memoryStorage();

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
const ALLOWED_ALL_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// File filter to only allow images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// File filter that also allows PDFs (for deletion requests with identity documents)
const fileFilterWithDocs = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_ALL_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WebP) and PDF documents are allowed!'));
  }
};

// Multer configuration
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 5 // Maximum 5 files
  }
});

// Middleware for single file upload
export const uploadSingle = upload.single('image');

// Middleware for multiple file upload (max 5)
export const uploadMultiple = upload.array('images', 5);

// 🆕 Upload config that also accepts PDFs (for identity documents)
export const uploadWithDocs = multer({
  storage: storage,
  fileFilter: fileFilterWithDocs,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 1 // Single file for proof documents
  }
});