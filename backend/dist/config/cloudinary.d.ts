import { v2 as cloudinary } from 'cloudinary';
/**
 * Lazy initialization for Cloudinary
 * Must be called before any Cloudinary operation to ensure env vars are available
 * This fixes the Vercel serverless timing issue where env vars aren't available
 * at module import time during cold starts
 */
export declare const ensureConfigured: () => void;
export default cloudinary;
//# sourceMappingURL=cloudinary.d.ts.map