"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureConfigured = void 0;
const cloudinary_1 = require("cloudinary");
// Flag to track if Cloudinary has been configured this request cycle
let isConfigured = false;
/**
 * Lazy initialization for Cloudinary
 * Must be called before any Cloudinary operation to ensure env vars are available
 * This fixes the Vercel serverless timing issue where env vars aren't available
 * at module import time during cold starts
 */
const ensureConfigured = () => {
    // Skip if already configured in this process (optimization for warm starts)
    if (isConfigured && cloudinary_1.v2.config().cloud_name) {
        return;
    }
    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
    const api_key = process.env.CLOUDINARY_API_KEY;
    const api_secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud_name || !api_key || !api_secret) {
        const missing = [];
        if (!cloud_name)
            missing.push('CLOUDINARY_CLOUD_NAME');
        if (!api_key)
            missing.push('CLOUDINARY_API_KEY');
        if (!api_secret)
            missing.push('CLOUDINARY_API_SECRET');
        throw new Error(`Cloudinary configuration missing: ${missing.join(', ')}`);
    }
    cloudinary_1.v2.config({ cloud_name, api_key, api_secret });
    isConfigured = true;
};
exports.ensureConfigured = ensureConfigured;
exports.default = cloudinary_1.v2;
//# sourceMappingURL=cloudinary.js.map