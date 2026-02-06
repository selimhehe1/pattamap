import { Request, Response, NextFunction } from 'express';

/**
 * Magic bytes validators for each supported MIME type.
 * Checks the first bytes of a file to verify content matches its declared MIME type.
 * This prevents MIME spoofing attacks where a malicious file is renamed with a safe extension.
 */
const SIGNATURES: Record<string, (buffer: Buffer) => boolean> = {
  'image/jpeg': (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  'image/png': (buf) =>
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a,
  'image/webp': (buf) =>
    buf.length >= 12 &&
    buf[0] === 0x52 && // R
    buf[1] === 0x49 && // I
    buf[2] === 0x46 && // F
    buf[3] === 0x46 && // F
    buf[8] === 0x57 && // W
    buf[9] === 0x45 && // E
    buf[10] === 0x42 && // B
    buf[11] === 0x50, // P
  'image/gif': (buf) =>
    buf.length >= 6 &&
    buf[0] === 0x47 && // G
    buf[1] === 0x49 && // I
    buf[2] === 0x46 && // F
    buf[3] === 0x38 && // 8
    (buf[4] === 0x37 || buf[4] === 0x39) && // 7 or 9
    buf[5] === 0x61, // a
  'application/pdf': (buf) =>
    buf.length >= 4 &&
    buf[0] === 0x25 && // %
    buf[1] === 0x50 && // P
    buf[2] === 0x44 && // D
    buf[3] === 0x46, // F
};

/**
 * Validates that the file's magic bytes match its declared MIME type.
 * Must be used AFTER multer middleware (which populates req.file / req.files).
 */
export function validateMagicBytes(req: Request, res: Response, next: NextFunction): void {
  const files: Express.Multer.File[] = [];

  if (req.file) {
    files.push(req.file);
  }

  if (req.files) {
    if (Array.isArray(req.files)) {
      files.push(...req.files);
    } else {
      // req.files is a Record<string, File[]> when using .fields()
      for (const fieldFiles of Object.values(req.files)) {
        files.push(...fieldFiles);
      }
    }
  }

  // No files to validate - pass through
  if (files.length === 0) {
    next();
    return;
  }

  for (const file of files) {
    const validator = SIGNATURES[file.mimetype];

    // If we don't have a signature check for this MIME type, skip it
    if (!validator) {
      continue;
    }

    if (!file.buffer || !validator(file.buffer)) {
      res.status(400).json({
        error: 'Invalid file',
        message: `File "${file.originalname}" content does not match its declared type (${file.mimetype}). The file may be corrupted or spoofed.`,
      });
      return;
    }
  }

  next();
}
